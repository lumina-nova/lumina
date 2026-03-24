package brokers

import (
	"context"
	nethttp "net/http"
	"time"

	"github.com/luminakafka/lumina/internal/api/http/handlers/shared"
	"github.com/luminakafka/lumina/internal/kafka"
)

type Service interface {
	ListBrokers(ctx context.Context) ([]kafka.Broker, error)
}

func Handle(w nethttp.ResponseWriter, r *nethttp.Request, kafka Service) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	result, err := kafka.ListBrokers(ctx)
	if err != nil {
		shared.WriteJSON(w, nethttp.StatusServiceUnavailable, shared.ErrorResponse{
			Error: shared.APIError{
				Code:    "KAFKA_METADATA_FAILED",
				Message: "Failed to fetch broker metadata",
				Details: err.Error(),
			},
		})
		return
	}

	shared.WriteJSON(w, nethttp.StatusOK, shared.BrokersResponse{Data: result})
}
