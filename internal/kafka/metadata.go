package kafka

import (
	"context"
	"fmt"

	"github.com/twmb/franz-go/pkg/kerr"
	"github.com/twmb/franz-go/pkg/kmsg"
)

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
		topics = append(topics, mapTopicMetadata(topic))
	}

	return topics, nil
}

func (c *Client) GetTopic(ctx context.Context, name string) (*Topic, error) {
	req := kmsg.NewPtrMetadataRequest()
	req.Topics = []kmsg.MetadataRequestTopic{
		{Topic: &name},
	}

	resp, err := req.RequestWith(ctx, c.raw)
	if err != nil {
		return nil, fmt.Errorf("failed to list topic: %w", err)
	}

	if len(resp.Topics) == 0 {
		return nil, fmt.Errorf("topic not found")
	}

	topic := mapTopicMetadata(resp.Topics[0])
	if topic.Name == "" {
		return nil, fmt.Errorf("topic metadata missing topic name")
	}

	return &topic, nil
}

func mapTopicMetadata(topic kmsg.MetadataResponseTopic) Topic {
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

	return Topic{
		Name:       name,
		Partitions: partitions,
	}
}

func (c *Client) lookupPartitionOffset(ctx context.Context, topic string, partition int32, timestamp int64) (int64, error) {
	req := kmsg.NewPtrListOffsetsRequest()
	req.ReplicaID = -1

	reqTopic := kmsg.NewListOffsetsRequestTopic()
	reqTopic.Topic = topic

	reqPartition := kmsg.NewListOffsetsRequestTopicPartition()
	reqPartition.Partition = partition
	reqPartition.Timestamp = timestamp
	reqTopic.Partitions = append(reqTopic.Partitions, reqPartition)
	req.Topics = append(req.Topics, reqTopic)

	resp, err := req.RequestWith(ctx, c.raw)
	if err != nil {
		return 0, fmt.Errorf("failed to lookup offsets for %s[%d]: %w", topic, partition, err)
	}

	if len(resp.Topics) == 0 || len(resp.Topics[0].Partitions) == 0 {
		return 0, fmt.Errorf("offset metadata missing for %s[%d]", topic, partition)
	}

	partitionResp := resp.Topics[0].Partitions[0]
	if partitionResp.ErrorCode != 0 {
		err := kerr.ErrorForCode(partitionResp.ErrorCode)
		if err == nil {
			return 0, fmt.Errorf("failed to lookup offsets for %s[%d]: kafka error code %d", topic, partition, partitionResp.ErrorCode)
		}
		return 0, fmt.Errorf("failed to lookup offsets for %s[%d]: %w", topic, partition, err)
	}

	return partitionResp.Offset, nil
}
