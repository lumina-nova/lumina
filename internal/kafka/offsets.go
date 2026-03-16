package kafka

import (
	"context"
	"fmt"
	"sort"

	"github.com/twmb/franz-go/pkg/kmsg"
)

type partitionOffset struct {
	Partition int32
	Offset    int64
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
