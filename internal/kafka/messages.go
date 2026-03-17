package kafka

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"time"
	"unicode/utf8"

	"github.com/twmb/franz-go/pkg/kgo"
)

const (
	defaultBrowseLimit    = 50
	maxBrowseLimit        = 100
	messagePreviewMaxSize = 2048
)

func NormalizeBrowseLimit(limit int) int {
	switch {
	case limit <= 0:
		return defaultBrowseLimit
	case limit > maxBrowseLimit:
		return maxBrowseLimit
	default:
		return limit
	}
}

func (c *Client) BrowseTopicMessages(ctx context.Context, req BrowseMessagesRequest) (*BrowseMessagesResponse, error) {
	topic, err := c.GetTopic(ctx, req.Topic)
	if err != nil {
		return nil, err
	}

	if !topicHasPartition(topic, req.Partition) {
		return nil, fmt.Errorf("partition %d not found for topic %q", req.Partition, req.Topic)
	}

	req.Limit = NormalizeBrowseLimit(req.Limit)

	earliest, latest, err := c.getPartitionOffsetBounds(ctx, req.Topic, req.Partition)
	if err != nil {
		return nil, err
	}

	startOffset, err := c.resolveBrowseStartOffset(ctx, req, earliest, latest)
	if err != nil {
		return nil, err
	}

	records, highWatermark, err := c.fetchTopicMessages(ctx, req.Topic, req.Partition, startOffset, req.Limit)
	if err != nil {
		return nil, err
	}

	nextOffset := startOffset
	if len(records) > 0 {
		nextOffset = records[len(records)-1].Offset + 1
	}

	summary := BrowseMessagesRequestSummary{
		Mode:  req.Mode,
		Limit: req.Limit,
	}
	if req.Mode == MessageBrowseModeOffset {
		summary.Offset = &req.Offset
	}
	if req.Mode == MessageBrowseModeTimestamp {
		summary.Timestamp = &req.Timestamp
	}

	return &BrowseMessagesResponse{
		Topic:               req.Topic,
		Partition:           req.Partition,
		Request:             summary,
		ResolvedStartOffset: startOffset,
		NextOffset:          nextOffset,
		HighWatermark:       highWatermark,
		Records:             records,
	}, nil
}

func topicHasPartition(topic *Topic, partitionID int32) bool {
	for _, partition := range topic.Partitions {
		if partition.ID == partitionID {
			return true
		}
	}

	return false
}

func (c *Client) resolveBrowseStartOffset(ctx context.Context, req BrowseMessagesRequest, earliest int64, latest int64) (int64, error) {
	switch req.Mode {
	case MessageBrowseModeEarliest:
		return earliest, nil
	case MessageBrowseModeLatest:
		start := latest - int64(req.Limit)
		if start < earliest {
			start = earliest
		}
		return start, nil
	case MessageBrowseModeOffset:
		if req.Offset < earliest || req.Offset > latest {
			return 0, fmt.Errorf(
				"offset %d is out of range for %s[%d]; valid range is %d to %d",
				req.Offset,
				req.Topic,
				req.Partition,
				earliest,
				latest,
			)
		}
		return req.Offset, nil
	case MessageBrowseModeTimestamp:
		timestampOffset, err := c.lookupPartitionOffset(ctx, req.Topic, req.Partition, req.Timestamp)
		if err != nil {
			return 0, fmt.Errorf("failed to resolve timestamp %d to offset: %w", req.Timestamp, err)
		}
		if timestampOffset < earliest {
			timestampOffset = earliest
		}
		return timestampOffset, nil
	default:

		return 0, fmt.Errorf("unsupported browse mode %q", req.Mode)
	}
}

func (c *Client) getPartitionOffsetBounds(ctx context.Context, topic string, partition int32) (int64, int64, error) {
	earliest, err := c.lookupPartitionOffset(ctx, topic, partition, -2)
	if err != nil {
		return 0, 0, err
	}

	latest, err := c.lookupPartitionOffset(ctx, topic, partition, -1)
	if err != nil {
		return 0, 0, err
	}

	return earliest, latest, nil
}

func (c *Client) fetchTopicMessages(ctx context.Context, topic string, partition int32, offset int64, limit int) ([]MessageRecord, int64, error) {
	browseClient, err := kgo.NewClient(
		kgo.SeedBrokers(c.brokers...),
		kgo.ConsumePartitions(map[string]map[int32]kgo.Offset{
			topic: {partition: kgo.NewOffset().At(offset)},
		}),
		kgo.FetchMaxWait(1500*time.Millisecond),
		kgo.FetchMaxBytes(5<<20),
		kgo.FetchMaxPartitionBytes(1<<20),
	)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to create browse client: %w", err)
	}
	defer browseClient.Close()

	fetchCtx, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()

	fetches := browseClient.PollRecords(fetchCtx, limit)
	if err := firstFatalFetchError(fetches.Errors()); err != nil {
		return nil, 0, fmt.Errorf("failed to fetch topic messages: %w", err)
	}

	records := make([]MessageRecord, 0, fetches.NumRecords())
	highWatermark := int64(offset)
	fetches.EachPartition(func(partitionFetch kgo.FetchTopicPartition) {
		if partitionFetch.HighWatermark > highWatermark {
			highWatermark = partitionFetch.HighWatermark
		}

		partitionFetch.EachRecord(func(record *kgo.Record) {
			records = append(records, mapMessageRecord(record))
		})
	})

	return records, highWatermark, nil
}

func firstFatalFetchError(fetchErrors []kgo.FetchError) error {
	for _, fetchErr := range fetchErrors {
		if fetchErr.Err == nil {
			continue
		}
		if errors.Is(fetchErr.Err, context.Canceled) || errors.Is(fetchErr.Err, context.DeadlineExceeded) {
			continue
		}
		return fetchErr.Err
	}
	return nil
}

func mapMessageRecord(record *kgo.Record) MessageRecord {
	headers := make([]MessageHeader, 0, len(record.Headers))
	for _, header := range record.Headers {
		headers = append(headers, MessageHeader{
			Key:   header.Key,
			Value: newMessagePayload(header.Value),
		})
	}

	return MessageRecord{
		Offset:      record.Offset,
		Timestamp:   record.Timestamp.UTC().Format(time.RFC3339Nano),
		Partition:   record.Partition,
		LeaderEpoch: record.LeaderEpoch,
		Key:         newMessagePayload(record.Key),
		Value:       newMessagePayload(record.Value),
		Headers:     headers,
	}
}

func newMessagePayload(data []byte) MessagePayload {
	payload := MessagePayload{
		Encoding: "utf-8",
		Size:     len(data),
	}

	if len(data) == 0 {
		payload.Text = ""
		return payload
	}

	preview := data
	if len(preview) > messagePreviewMaxSize {
		preview = preview[:messagePreviewMaxSize]
		payload.Truncated = true
	}

	if utf8.Valid(data) {
		payload.Text = string(preview)
		return payload
	}

	payload.Encoding = "base64"
	payload.Base64 = base64.StdEncoding.EncodeToString(preview)
	return payload
}
