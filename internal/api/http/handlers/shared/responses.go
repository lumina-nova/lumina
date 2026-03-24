package shared

import (
	"encoding/json"
	nethttp "net/http"

	"github.com/luminakafka/lumina/internal/kafka"
)

type KafkaStatus struct {
	Connected bool `json:"connected"`
}

type HealthResponse struct {
	Status  string      `json:"status"`
	Kafka   KafkaStatus `json:"kafka"`
	Version string      `json:"version"`
}

type BrokersResponse struct {
	Data []kafka.Broker `json:"data"`
}

type TopicsResponse struct {
	Data []kafka.Topic `json:"data"`
}

type TopicResponse struct {
	Data *kafka.Topic `json:"data"`
}

type TopicMessagesResponse struct {
	Data *kafka.BrowseMessagesResponse `json:"data"`
}

type ErrorResponse struct {
	Error APIError `json:"error"`
}

type APIError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

func WriteJSON(w nethttp.ResponseWriter, statusCode int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(payload)
}
