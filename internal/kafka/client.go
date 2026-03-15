package kafka

import (
	"context"
	"fmt"
	"time"

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

func (c *Client) GetConsumerGroup(ctx context.Context) (ConsumerGroupResponse, error) {

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
