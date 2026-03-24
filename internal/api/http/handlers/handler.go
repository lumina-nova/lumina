package handlers

import (
	"context"

	"github.com/luminakafka/lumina/internal/kafka"
)

type KafkaService interface {
	HealthCheck(ctx context.Context) error
	ListBrokers(ctx context.Context) ([]kafka.Broker, error)
	ListTopics(ctx context.Context) ([]kafka.Topic, error)
	GetTopic(ctx context.Context, name string) (*kafka.Topic, error)
	BrowseTopicMessages(ctx context.Context, req kafka.BrowseMessagesRequest) (*kafka.BrowseMessagesResponse, error)
	GetConsumerGroups(ctx context.Context) (kafka.ConsumerGroupResponse, error)
	GetConsumerGroup(ctx context.Context, name string) (*kafka.ConsumerGroupDetail, error)

	TailTopicMessages(ctx context.Context, req kafka.TailMessagesRequest, onRecord func(record kafka.MessageRecord) error) error
}

type Handler struct {
	kafka   KafkaService
	version string
}

func NewHandler(kafka KafkaService, version string) *Handler {
	return &Handler{
		kafka:   kafka,
		version: version,
	}
}
