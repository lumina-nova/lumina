package kafka

import (
	"context"
	"fmt"

	"github.com/twmb/franz-go/pkg/kadm"
)

func (c *Client) ListBrokers(ctx context.Context) ([]Broker, error) {
	metadata, err := c.admin.BrokerMetadata(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list brokers: %w", err)
	}

	brokers := make([]Broker, 0, len(metadata.Brokers))
	for _, broker := range metadata.Brokers {
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
	details, err := c.admin.ListTopics(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list topics: %w", err)
	}

	topics := make([]Topic, 0, len(details))
	for _, topicDetail := range details.Sorted() {
		topics = append(topics, mapTopicDetail(topicDetail))
	}

	return topics, nil
}

func (c *Client) GetTopic(ctx context.Context, name string) (*Topic, error) {
	details, err := c.admin.ListTopics(ctx, name)
	if err != nil {
		return nil, fmt.Errorf("failed to list topic: %w", err)
	}

	topicDetail, ok := details[name]
	if !ok || topicDetail.Err != nil {
		return nil, fmt.Errorf("topic not found")
	}

	topic := mapTopicDetail(topicDetail)
	return &topic, nil
}

func mapTopicDetail(topic kadm.TopicDetail) Topic {
	partitions := make([]Partition, 0, len(topic.Partitions))
	for _, partition := range topic.Partitions.Sorted() {
		partitions = append(partitions, Partition{
			ID:       partition.Partition,
			Leader:   partition.Leader,
			Replicas: partition.Replicas,
			Isr:      partition.ISR,
		})
	}

	return Topic{
		Name:       topic.Topic,
		Partitions: partitions,
	}
}

func (c *Client) lookupPartitionOffset(ctx context.Context, topic string, partition int32, timestamp int64) (int64, error) {
	var (
		listed kadm.ListedOffsets
		err    error
	)

	switch timestamp {
	case -2:
		listed, err = c.admin.ListStartOffsets(ctx, topic)
	case -1:
		listed, err = c.admin.ListEndOffsets(ctx, topic)
	default:
		if timestamp < 0 {
			return 0, fmt.Errorf("unsupported offset timestamp %d", timestamp)
		}
		listed, err = c.admin.ListOffsetsAfterMilli(ctx, timestamp, topic)
	}
	if err != nil {
		return 0, fmt.Errorf("failed to lookup offsets for %s[%d]: %w", topic, partition, err)
	}

	offset, ok := listed.Lookup(topic, partition)
	if !ok {
		return 0, fmt.Errorf("offset metadata missing for %s[%d]", topic, partition)
	}
	if offset.Err != nil {
		return 0, fmt.Errorf("failed to lookup offsets for %s[%d]: %w", topic, partition, offset.Err)
	}

	return offset.Offset, nil
}
