package shared

import (
	"fmt"
	nethttp "net/http"
	"strconv"
	"strings"

	"github.com/luminakafka/lumina/internal/kafka"
)

func ParseBrowseMessagesRequest(topicName string, r *nethttp.Request) (kafka.BrowseMessagesRequest, error) {
	query := r.URL.Query()

	partitionValue := strings.TrimSpace(query.Get("partition"))
	if partitionValue == "" {
		return kafka.BrowseMessagesRequest{}, fmt.Errorf("partition is required")
	}

	partition, err := strconv.ParseInt(partitionValue, 10, 32)
	if err != nil || partition < 0 {
		return kafka.BrowseMessagesRequest{}, fmt.Errorf("partition must be a non-negative integer")
	}

	limit := kafka.NormalizeBrowseLimit(parseIntDefault(query.Get("limit"), 0))

	position := strings.TrimSpace(query.Get("position"))
	offsetValue := strings.TrimSpace(query.Get("offset"))
	timestampValue := strings.TrimSpace(query.Get("timestamp"))

	modeCount := 0
	if position != "" {
		modeCount++
	}
	if offsetValue != "" {
		modeCount++
	}
	if timestampValue != "" {
		modeCount++
	}
	if modeCount != 1 {
		return kafka.BrowseMessagesRequest{}, fmt.Errorf("exactly one of position, offset, or timestamp must be provided")
	}

	req := kafka.BrowseMessagesRequest{
		Topic:     topicName,
		Partition: int32(partition),
		Limit:     limit,
	}

	if offsetValue != "" {
		offset, err := strconv.ParseInt(offsetValue, 10, 64)
		if err != nil || offset < 0 {
			return kafka.BrowseMessagesRequest{}, fmt.Errorf("offset must be a non-negative integer")
		}
		req.Mode = kafka.MessageBrowseModeOffset
		req.Offset = offset
		return req, nil
	}

	if timestampValue != "" {
		timestamp, err := strconv.ParseInt(timestampValue, 10, 64)
		if err != nil || timestamp < 0 {
			return kafka.BrowseMessagesRequest{}, fmt.Errorf("timestamp must be a non-negative integer representing milliseconds since epoch")
		}
		req.Mode = kafka.MessageBrowseModeTimestamp
		req.Timestamp = timestamp
		return req, nil
	}

	switch kafka.MessageBrowseMode(position) {
	case kafka.MessageBrowseModeEarliest, kafka.MessageBrowseModeLatest:
		req.Mode = kafka.MessageBrowseMode(position)
		return req, nil
	default:
		return kafka.BrowseMessagesRequest{}, fmt.Errorf("position must be earliest or latest")
	}
}

func parseIntDefault(value string, fallback int) int {
	value = strings.TrimSpace(value)
	if value == "" {
		return fallback
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}

	return parsed
}

func ParseTailMessagesRequest(topicName string, r *nethttp.Request) (kafka.TailMessagesRequest, error) {
	query := r.URL.Query()

	partitionValue := strings.TrimSpace(query.Get("partition"))
	if partitionValue == "" {
		return kafka.TailMessagesRequest{}, fmt.Errorf("partition is required")
	}

	partition, err := strconv.ParseInt(partitionValue, 10, 32)

	if err != nil || partition < 0 {
		return kafka.TailMessagesRequest{}, fmt.Errorf("partition must be a non-negative integer")
	}

	return kafka.TailMessagesRequest{
		Topic:     topicName,
		Partition: int32(partition),
	}, nil
}
