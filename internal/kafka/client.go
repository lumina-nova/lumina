package kafka

import (
	"context"
	"fmt"
	"sort"
	"time"

	"github.com/twmb/franz-go/pkg/kerr"
	"github.com/twmb/franz-go/pkg/kgo"
	"github.com/twmb/franz-go/pkg/kmsg"
)

type Client struct {
	raw *kgo.Client
}

type Broker struct {
	ID   int32  `json:"id"`
	Host string `json:"host"`
	Port int32  `json:"port"`
	Rack string `json:"rack"`
}

type Topic struct {
	Name       string      `json:"name"`
	Partitions []Partition `json:"partitions"`
}

type Partition struct {
	ID       int32   `json:"id"`
	Leader   int32   `json:"leader"`
	Replicas []int32 `json:"replicas"`
	Isr      []int32 `json:"isr"`
}

type ConsumerGroup struct {
	Group        string `json:"group"`
	ProtocolType string `json:"protocol_type"`
	State        string `json:"state"`
}

type ConsumerGroupResponse struct {
	Data []ConsumerGroup `json:"data"`
}

type ConsumerGroupAssignment struct {
	Topic      string  `json:"topic"`
	Partitions []int32 `json:"partitions"`
}

type ConsumerGroupMember struct {
	MemberID    string                    `json:"memberId"`
	ClientID    string                    `json:"clientId"`
	Host        string                    `json:"host"`
	Assignments []ConsumerGroupAssignment `json:"assignments"`
}

type ConsumerGroupLag struct {
	Topic         string `json:"topic"`
	Partition     int32  `json:"partition"`
	CurrentOffset int64  `json:"currentOffset"`
	LogEndOffset  int64  `json:"logEndOffset"`
	Lag           int64  `json:"lag"`
}

type ConsumerGroupDetail struct {
	GroupID     string                `json:"groupId"`
	State       string                `json:"state"`
	Coordinator int32                 `json:"coordinator"`
	Members     []ConsumerGroupMember `json:"members"`
	Lag         []ConsumerGroupLag    `json:"lag"`
}

func NewClient(brokers []string) (*Client, error) {
	raw, err := kgo.NewClient(
		kgo.SeedBrokers(brokers...),
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create producer client: %w", err)
	}

	return &Client{raw: raw}, nil
}

func (c *Client) Close() {
	c.raw.Close()
}

func (c *Client) HealthCheck(ctx context.Context) error {
	checkCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	return c.raw.Ping(checkCtx)
}

func (c *Client) ListBrokers(ctx context.Context) ([]Broker, error) {
	req := kmsg.NewPtrMetadataRequest()

	resp, err := req.RequestWith(ctx, c.raw)
	if err != nil {
		return nil, fmt.Errorf("failed to list brokers: %w", err)
	}

	brokers := make([]Broker, 0, len(resp.Brokers))

	for _, broker := range resp.Brokers {
		rack := ""
		if broker.Rack != nil {
			rack = *broker.Rack
		}
		brokers = append(brokers, Broker{
			ID:   broker.NodeID,
			Host: broker.Host,
			Port: broker.Port,
			Rack: rack,
		})
	}
	return brokers, nil
}

func (c *Client) ListTopics(ctx context.Context) ([]Topic, error) {
	req := kmsg.NewPtrMetadataRequest()

	resp, err := req.RequestWith(ctx, c.raw)
	if err != nil {
		return nil, fmt.Errorf("failed to list topics: %w", err)
	}

	topics := make([]Topic, 0, len(resp.Topics))

	for _, topic := range resp.Topics {
		name := ""
		if topic.Topic != nil {
			name = *topic.Topic
		}

		partitions := make([]Partition, 0, len(topic.Partitions))
		for _, partition := range topic.Partitions {
			partitions = append(partitions, Partition{
				ID:       partition.Partition,
				Leader:   partition.Leader,
				Replicas: partition.Replicas,
				Isr:      partition.ISR,
			})
		}
		topics = append(topics, Topic{
			Name:       name,
			Partitions: partitions,
		})
	}
	return topics, nil
}

func (c *Client) GetTopic(ctx context.Context, name string) (*Topic, error) {
	req := kmsg.NewPtrMetadataRequest()
	req.Topics = []kmsg.MetadataRequestTopic{
		{
			Topic: &name,
		},
	}

	resp, err := req.RequestWith(ctx, c.raw)
	if err != nil {
		return nil, fmt.Errorf("failed to list topic: %w", err)
	}

	if len(resp.Topics) == 0 {
		return nil, fmt.Errorf("topic not found")
	}

	topicData := resp.Topics[0]
	if topicData.Topic == nil {
		return nil, fmt.Errorf("topic metadata missing topic name")
	}

	partitions := make([]Partition, 0, len(topicData.Partitions))
	for _, partition := range topicData.Partitions {
		partitions = append(partitions, Partition{
			ID:       partition.Partition,
			Leader:   partition.Leader,
			Replicas: partition.Replicas,
			Isr:      partition.ISR,
		})
	}
	return &Topic{
		Name:       *topicData.Topic,
		Partitions: partitions,
	}, nil
}

func (c *Client) GetConsumerGroups(ctx context.Context) (ConsumerGroupResponse, error) {

	req := kmsg.NewPtrListGroupsRequest()

	resp, err := req.RequestWith(ctx, c.raw)
	if err != nil {
		return ConsumerGroupResponse{}, fmt.Errorf("failed to list consumer groups: %w", err)
	}

	groups := make([]ConsumerGroup, 0, len(resp.Groups))

	for _, group := range resp.Groups {
		groups = append(groups, ConsumerGroup{
			Group:        group.Group,
			ProtocolType: group.ProtocolType,
			State:        group.GroupState,
		})
	}

	consumerGroupResponse := ConsumerGroupResponse{
		Data: groups,
	}

	return consumerGroupResponse, nil

}

func (c *Client) GetConsumerGroup(ctx context.Context, groupID string) (*ConsumerGroupDetail, error) {
	coordinatorID, err := c.findGroupCoordinator(ctx, groupID)
	if err != nil {
		return nil, err
	}

	group, err := c.describeGroup(ctx, groupID)
	if err != nil {
		return nil, err
	}

	members, err := decodeMembers(group.Members)
	if err != nil {
		return nil, err
	}

	committed, err := c.fetchGroupOffsets(ctx, groupID)
	if err != nil {
		return nil, err
	}

	latest, err := c.fetchLatestOffsets(ctx, committed)
	if err != nil {
		return nil, err
	}

	return &ConsumerGroupDetail{
		GroupID:     group.Group,
		State:       group.State,
		Coordinator: coordinatorID,
		Members:     members,
		Lag:         buildLagRows(committed, latest),
	}, nil
}

func (c *Client) findGroupCoordinator(ctx context.Context, groupID string) (int32, error) {
	req := kmsg.NewPtrFindCoordinatorRequest()
	req.CoordinatorKey = groupID
	req.CoordinatorType = 0

	resp, err := req.RequestWith(ctx, c.raw)
	if err != nil {
		return 0, fmt.Errorf("failed to find coordinator for group %q: %w", groupID, err)
	}

	if len(resp.Coordinators) > 0 {
		coordinator := resp.Coordinators[0]
		if coordinator.ErrorCode != 0 {
			return 0, kafkaError("failed to find coordinator", coordinator.ErrorCode, coordinator.ErrorMessage)
		}
		return coordinator.NodeID, nil
	}

	if resp.ErrorCode != 0 {
		return 0, kafkaError("failed to find coordinator", resp.ErrorCode, resp.ErrorMessage)
	}

	return resp.NodeID, nil
}

func (c *Client) describeGroup(ctx context.Context, groupID string) (*kmsg.DescribeGroupsResponseGroup, error) {
	req := kmsg.NewPtrDescribeGroupsRequest()
	req.Groups = []string{groupID}

	resp, err := req.RequestWith(ctx, c.raw)
	if err != nil {
		return nil, fmt.Errorf("failed to describe group %q: %w", groupID, err)
	}

	if len(resp.Groups) == 0 {
		return nil, fmt.Errorf("consumer group %q not found", groupID)
	}

	group := resp.Groups[0]
	if group.ErrorCode != 0 {
		return nil, kafkaError("failed to describe consumer group", group.ErrorCode, group.ErrorMessage)
	}

	return &group, nil
}

func (c *Client) fetchGroupOffsets(ctx context.Context, groupID string) (map[string][]partitionOffset, error) {
	req := kmsg.NewPtrOffsetFetchRequest()
	req.Group = groupID

	resp, err := req.RequestWith(ctx, c.raw)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch offsets for group %q: %w", groupID, err)
	}

	if resp.ErrorCode != 0 {
		return nil, kafkaError("failed to fetch consumer group offsets", resp.ErrorCode, nil)
	}

	offsets := make(map[string][]partitionOffset)
	for _, topic := range resp.Topics {
		rows := make([]partitionOffset, 0, len(topic.Partitions))
		for _, partition := range topic.Partitions {
			if partition.ErrorCode != 0 {
				return nil, kafkaError(
					fmt.Sprintf("failed to fetch offset for %s[%d]", topic.Topic, partition.Partition),
					partition.ErrorCode,
					nil,
				)
			}
			rows = append(rows, partitionOffset{
				Partition: partition.Partition,
				Offset:    partition.Offset,
			})
		}
		if len(rows) > 0 {
			offsets[topic.Topic] = rows
		}
	}

	return offsets, nil
}

func (c *Client) fetchLatestOffsets(ctx context.Context, committed map[string][]partitionOffset) (map[string]map[int32]int64, error) {
	if len(committed) == 0 {
		return map[string]map[int32]int64{}, nil
	}

	req := kmsg.NewPtrListOffsetsRequest()
	req.ReplicaID = -1

	for topic, partitions := range committed {
		reqTopic := kmsg.NewListOffsetsRequestTopic()
		reqTopic.Topic = topic

		for _, partition := range partitions {
			reqPartition := kmsg.NewListOffsetsRequestTopicPartition()
			reqPartition.Partition = partition.Partition
			reqPartition.Timestamp = -1
			reqTopic.Partitions = append(reqTopic.Partitions, reqPartition)
		}

		req.Topics = append(req.Topics, reqTopic)
	}

	resp, err := req.RequestWith(ctx, c.raw)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch latest offsets: %w", err)
	}

	latest := make(map[string]map[int32]int64, len(resp.Topics))
	for _, topic := range resp.Topics {
		partitions := make(map[int32]int64, len(topic.Partitions))
		for _, partition := range topic.Partitions {
			if partition.ErrorCode != 0 {
				return nil, kafkaError(
					fmt.Sprintf("failed to fetch latest offset for %s[%d]", topic.Topic, partition.Partition),
					partition.ErrorCode,
					nil,
				)
			}
			partitions[partition.Partition] = partition.Offset
		}
		latest[topic.Topic] = partitions
	}

	return latest, nil
}

type partitionOffset struct {
	Partition int32
	Offset    int64
}

func decodeMembers(raw []kmsg.DescribeGroupsResponseGroupMember) ([]ConsumerGroupMember, error) {
	members := make([]ConsumerGroupMember, 0, len(raw))

	for _, member := range raw {
		assignments := make([]ConsumerGroupAssignment, 0)

		if len(member.MemberAssignment) > 0 {
			assignment := kmsg.NewConsumerMemberAssignment()
			if err := assignment.ReadFrom(member.MemberAssignment); err != nil {
				return nil, fmt.Errorf("failed to decode member assignment for member %q: %w", member.MemberID, err)
			}

			assignments = make([]ConsumerGroupAssignment, 0, len(assignment.Topics))
			for _, topic := range assignment.Topics {
				assignments = append(assignments, ConsumerGroupAssignment{
					Topic:      topic.Topic,
					Partitions: topic.Partitions,
				})
			}
		}

		members = append(members, ConsumerGroupMember{
			MemberID:    member.MemberID,
			ClientID:    member.ClientID,
			Host:        member.ClientHost,
			Assignments: assignments,
		})
	}

	return members, nil
}

func buildLagRows(committed map[string][]partitionOffset, latest map[string]map[int32]int64) []ConsumerGroupLag {
	rows := make([]ConsumerGroupLag, 0)

	topics := make([]string, 0, len(committed))
	for topic := range committed {
		topics = append(topics, topic)
	}
	sort.Strings(topics)

	for _, topic := range topics {
		partitions := committed[topic]
		sort.Slice(partitions, func(i, j int) bool {
			return partitions[i].Partition < partitions[j].Partition
		})

		for _, partition := range partitions {
			logEndOffset := int64(-1)
			if topicLatest, ok := latest[topic]; ok {
				if offset, ok := topicLatest[partition.Partition]; ok {
					logEndOffset = offset
				}
			}

			lag := int64(0)
			if partition.Offset >= 0 && logEndOffset >= 0 {
				lag = logEndOffset - partition.Offset
				if lag < 0 {
					lag = 0
				}
			}

			rows = append(rows, ConsumerGroupLag{
				Topic:         topic,
				Partition:     partition.Partition,
				CurrentOffset: partition.Offset,
				LogEndOffset:  logEndOffset,
				Lag:           lag,
			})
		}
	}

	return rows
}

func kafkaError(prefix string, code int16, message *string) error {
	err := kerr.ErrorForCode(code)
	if err == nil {
		if message != nil && *message != "" {
			return fmt.Errorf("%s: %s", prefix, *message)
		}
		return fmt.Errorf("%s: kafka error code %d", prefix, code)
	}

	if message != nil && *message != "" {
		return fmt.Errorf("%s: %w: %s", prefix, err, *message)
	}

	return fmt.Errorf("%s: %w", prefix, err)
}
