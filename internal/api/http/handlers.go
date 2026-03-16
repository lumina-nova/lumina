package http

import (
	"context"
	"encoding/json"
	nethttp "net/http"
	"strings"
	"time"

	"github.com/luminakafka/lumnia/internal/kafka"
)

type KafkaService interface {
	HealthCheck(ctx context.Context) error
	ListBrokers(ctx context.Context) ([]kafka.Broker, error)
	ListTopics(ctx context.Context) ([]kafka.Topic, error)
	GetTopic(ctx context.Context, name string) (*kafka.Topic, error)
	GetConsumerGroups(ctx context.Context) (kafka.ConsumerGroupResponse, error)
	GetConsumerGroup(ctx context.Context, name string) (*kafka.ConsumerGroupDetail, error)
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

type kafkaStatus struct {
	Connected bool `json:"connected"`
}

type healthResponse struct {
	Status  string      `json:"status"`
	Kafka   kafkaStatus `json:"kafka"`
	Version string      `json:"version"`
}

type brokersResponse struct {
	Data []kafka.Broker `json:"data"`
}

type topicsResponse struct {
	Data []kafka.Topic `json:"data"`
}

type topicResponse struct {
	Data *kafka.Topic `json:"data"`
}

type errorResponse struct {
	Error apiError `json:"error"`
}

type apiError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

func (h *Handler) Health(w nethttp.ResponseWriter, r *nethttp.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	resp := healthResponse{
		Status:  "healthy",
		Kafka:   kafkaStatus{Connected: true},
		Version: h.version,
	}

	statusCode := nethttp.StatusOK

	if err := h.kafka.HealthCheck(ctx); err != nil {
		resp.Kafka.Connected = false
		resp.Status = "unhealthy"
		statusCode = nethttp.StatusServiceUnavailable
	}

	writeJSON(w, statusCode, resp)
}

func (h *Handler) GetBrokers(w nethttp.ResponseWriter, r *nethttp.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	brokers, err := h.kafka.ListBrokers(ctx)
	if err != nil {
		writeJSON(w, nethttp.StatusServiceUnavailable, errorResponse{
			Error: apiError{
				Code:    "KAFKA_METADATA_FAILED",
				Message: "Failed to fetch broker metadata",
				Details: err.Error(),
			},
		})
		return
	}

	writeJSON(w, nethttp.StatusOK, brokersResponse{
		Data: brokers,
	})
}

func (h *Handler) GetTopics(w nethttp.ResponseWriter, r *nethttp.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	topics, err := h.kafka.ListTopics(ctx)
	if err != nil {
		writeJSON(w, nethttp.StatusServiceUnavailable, errorResponse{
			Error: apiError{
				Code:    "KAFKA_METADATA_FAILED",
				Message: "Failed to fetch topic metadata",
				Details: err.Error(),
			},
		})
		return
	}

	writeJSON(w, nethttp.StatusOK, topicsResponse{
		Data: topics,
	})
}

func (h *Handler) GetTopic(w nethttp.ResponseWriter, r *nethttp.Request) {
	topicName := strings.TrimSpace(r.PathValue("name"))
	if topicName == "" {
		writeJSON(w, nethttp.StatusBadRequest, errorResponse{
			Error: apiError{
				Code:    "INVALID_TOPIC_NAME",
				Message: "Topic name is required",
			},
		})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	topic, err := h.kafka.GetTopic(ctx, topicName)
	if err != nil {
		statusCode := nethttp.StatusServiceUnavailable
		errorCode := "KAFKA_METADATA_FAILED"
		message := "Failed to fetch topic metadata"

		if strings.Contains(strings.ToLower(err.Error()), "not found") {
			statusCode = nethttp.StatusNotFound
			errorCode = "TOPIC_NOT_FOUND"
			message = "Topic not found"
		}

		writeJSON(w, statusCode, errorResponse{
			Error: apiError{
				Code:    errorCode,
				Message: message,
				Details: err.Error(),
			},
		})
		return
	}

	writeJSON(w, nethttp.StatusOK, topicResponse{
		Data: topic,
	})
}

func (h *Handler) GetConsumerGroups(w nethttp.ResponseWriter, r *nethttp.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	consumerGroupResponse, err := h.kafka.GetConsumerGroups(ctx)
	if err != nil {
		writeJSON(w, nethttp.StatusServiceUnavailable, errorResponse{
			Error: apiError{
				Code:    "KAFKA_CONSUMER_GROUPS_FAILED",
				Message: "Failed to fetch consumer groups",
				Details: err.Error(),
			},
		})
		return
	}
	writeJSON(w, nethttp.StatusOK, consumerGroupResponse)

}

func (h *Handler) GetConsumerGroup(w nethttp.ResponseWriter, r *nethttp.Request) {
	groupID := strings.TrimSpace(r.PathValue("name"))

	if groupID == "" {
		writeJSON(w, nethttp.StatusBadRequest, errorResponse{
			Error: apiError{Code: "INVALID_GROUP_ID", Message: "Consumer group ID is required"},
		})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	group, err := h.kafka.GetConsumerGroup(ctx, groupID)
	if err != nil {
		status := nethttp.StatusServiceUnavailable
		code := "KAFKA_CONSUMER_GROUP_FAILED"
		msg := "Failed to fetch consumer group details"

		if strings.Contains(strings.ToLower(err.Error()), "not found") {
			status = nethttp.StatusNotFound
			code = "CONSUMER_GROUP_NOT_FOUND"
			msg = "Consumer group not found"
		}

		writeJSON(w, status, errorResponse{
			Error: apiError{Code: code, Message: msg, Details: err.Error()},
		})
		return
	}

	writeJSON(w, nethttp.StatusOK, map[string]any{"data": group})

}
func writeJSON(w nethttp.ResponseWriter, statusCode int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(payload)
}
