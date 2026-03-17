package kafka

import (
	"context"
	"fmt"
	"sort"
)

type partitionOffset struct {
	Partition int32
	Offset    int64
}

func (c *Client) fetchGroupOffsets(ctx context.Context, groupID string) (map[string][]partitionOffset, error) {
	resp, err := c.admin.FetchOffsets(ctx, groupID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch offsets for group %q: %w", groupID, err)
	}

	offsets := make(map[string][]partitionOffset)
	for topicName, topicOffsets := range resp {
		rows := make([]partitionOffset, 0, len(topicOffsets))
		for partitionID, offsetResponse := range topicOffsets {
			if offsetResponse.Err != nil {
				return nil, fmt.Errorf(
					"failed to fetch offset for %s[%d]: %w",
					topicName,
					partitionID,
					offsetResponse.Err,
				)
			}

			rows = append(rows, partitionOffset{
				Partition: partitionID,
				Offset:    offsetResponse.Offset.At,
			})
		}

		if len(rows) > 0 {
			offsets[topicName] = rows
		}
	}

	return offsets, nil
}

func (c *Client) fetchLatestOffsets(ctx context.Context, committed map[string][]partitionOffset) (map[string]map[int32]int64, error) {
	if len(committed) == 0 {
		return map[string]map[int32]int64{}, nil
	}

	topics := make([]string, 0, len(committed))
	for topic := range committed {
		topics = append(topics, topic)
	}

	resp, err := c.admin.ListEndOffsets(ctx, topics...)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch latest offsets: %w", err)
	}

	latest := make(map[string]map[int32]int64, len(resp))
	for topicName, topicOffsets := range resp {
		partitions := make(map[int32]int64, len(topicOffsets))
		for partitionID, listedOffset := range topicOffsets {
			if partitionID < 0 {
				continue
			}
			if listedOffset.Err != nil {
				return nil, fmt.Errorf(
					"failed to fetch latest offset for %s[%d]: %w",
					topicName,
					partitionID,
					listedOffset.Err,
				)
			}

			partitions[partitionID] = listedOffset.Offset
		}

		latest[topicName] = partitions
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
