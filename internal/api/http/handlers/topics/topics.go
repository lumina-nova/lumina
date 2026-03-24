package topics

import (
	"context"
	nethttp "net/http"
	"strings"
	"time"

	"github.com/luminakafka/lumina/internal/api/http/handlers/shared"
	"github.com/luminakafka/lumina/internal/kafka"
)

type Service interface {
	ListTopics(ctx context.Context) ([]kafka.Topic, error)
	GetTopic(ctx context.Context, name string) (*kafka.Topic, error)
	BrowseTopicMessages(ctx context.Context, req kafka.BrowseMessagesRequest) (*kafka.BrowseMessagesResponse, error)
}

func List(w nethttp.ResponseWriter, r *nethttp.Request, kafka Service) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	result, err := kafka.ListTopics(ctx)
	if err != nil {
		shared.WriteJSON(w, nethttp.StatusServiceUnavailable, shared.ErrorResponse{
			Error: shared.APIError{
				Code:    "KAFKA_METADATA_FAILED",
				Message: "Failed to fetch topic metadata",
				Details: err.Error(),
			},
		})
		return
	}

	shared.WriteJSON(w, nethttp.StatusOK, shared.TopicsResponse{Data: result})
}

func Get(w nethttp.ResponseWriter, r *nethttp.Request, kafka Service) {
	topicName := strings.TrimSpace(r.PathValue("name"))
	if topicName == "" {
		shared.WriteJSON(w, nethttp.StatusBadRequest, shared.ErrorResponse{
			Error: shared.APIError{Code: "INVALID_TOPIC_NAME", Message: "Topic name is required"},
		})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	topic, err := kafka.GetTopic(ctx, topicName)
	if err != nil {
		statusCode := nethttp.StatusServiceUnavailable
		errorCode := "KAFKA_METADATA_FAILED"
		message := "Failed to fetch topic metadata"

		if strings.Contains(strings.ToLower(err.Error()), "not found") {
			statusCode = nethttp.StatusNotFound
			errorCode = "TOPIC_NOT_FOUND"
			message = "Topic not found"
		}

		shared.WriteJSON(w, statusCode, shared.ErrorResponse{
			Error: shared.APIError{Code: errorCode, Message: message, Details: err.Error()},
		})
		return
	}

	shared.WriteJSON(w, nethttp.StatusOK, shared.TopicResponse{Data: topic})
}

func BrowseMessages(w nethttp.ResponseWriter, r *nethttp.Request, kafka Service) {
	topicName := strings.TrimSpace(r.PathValue("name"))
	if topicName == "" {
		shared.WriteJSON(w, nethttp.StatusBadRequest, shared.ErrorResponse{
			Error: shared.APIError{Code: "INVALID_TOPIC_NAME", Message: "Topic name is required"},
		})
		return
	}

	req, err := shared.ParseBrowseMessagesRequest(topicName, r)
	if err != nil {
		shared.WriteJSON(w, nethttp.StatusBadRequest, shared.ErrorResponse{
			Error: shared.APIError{Code: "INVALID_MESSAGE_QUERY", Message: err.Error()},
		})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	response, err := kafka.BrowseTopicMessages(ctx, req)
	if err != nil {
		statusCode := nethttp.StatusServiceUnavailable
		errorCode := "KAFKA_MESSAGES_FETCH_FAILED"
		message := "Failed to fetch topic messages"

		lower := strings.ToLower(err.Error())
		switch {
		case strings.Contains(lower, "topic not found"):
			statusCode = nethttp.StatusNotFound
			errorCode = "TOPIC_NOT_FOUND"
			message = "Topic not found"
		case strings.Contains(lower, "partition") && strings.Contains(lower, "not found"):
			statusCode = nethttp.StatusBadRequest
			errorCode = "INVALID_PARTITION"
			message = "Partition does not exist for topic"
		case strings.Contains(lower, "out of range"), strings.Contains(lower, "unsupported browse mode"):
			statusCode = nethttp.StatusBadRequest
			errorCode = "INVALID_MESSAGE_QUERY"
			message = "Invalid topic message query"
		}

		shared.WriteJSON(w, statusCode, shared.ErrorResponse{
			Error: shared.APIError{Code: errorCode, Message: message, Details: err.Error()},
		})
		return
	}

	shared.WriteJSON(w, nethttp.StatusOK, shared.TopicMessagesResponse{Data: response})
}
