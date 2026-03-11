package http

import (
	"context"
	"encoding/json"
	nethttp "net/http"
	"time"
)

type KafkaHealthCheck interface {
	HealthCheck(ctx context.Context) error
}

type Handler struct {
	kafka   KafkaHealthCheck
	version string
}

func NewHandler(kafka KafkaHealthCheck, version string) *Handler {
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

func (h *Handler) health(w nethttp.ResponseWriter, r *nethttp.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	resp := healthResponse{
		Status: "healthy",
		Kafka: kafkaStatus{
			Connected: true,
		},
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

func writeJSON(w nethttp.ResponseWriter, statusCode int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(payload)
}
