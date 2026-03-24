package health

import (
	"context"
	nethttp "net/http"
	"time"

	"github.com/luminakafka/lumina/internal/api/http/handlers/shared"
)

type Service interface {
	HealthCheck(ctx context.Context) error
}

func Handle(w nethttp.ResponseWriter, r *nethttp.Request, kafka Service, version string) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	resp := shared.HealthResponse{
		Status:  "healthy",
		Kafka:   shared.KafkaStatus{Connected: true},
		Version: version,
	}

	statusCode := nethttp.StatusOK

	if err := kafka.HealthCheck(ctx); err != nil {
		resp.Kafka.Connected = false
		resp.Status = "unhealthy"
		statusCode = nethttp.StatusServiceUnavailable
	}

	shared.WriteJSON(w, statusCode, resp)
}
