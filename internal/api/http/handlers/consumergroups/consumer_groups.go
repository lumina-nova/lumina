package consumergroups

import (
	"context"
	nethttp "net/http"
	"strings"
	"time"

	"github.com/luminakafka/lumina/internal/api/http/handlers/shared"
	"github.com/luminakafka/lumina/internal/kafka"
)

type Service interface {
	GetConsumerGroups(ctx context.Context) (kafka.ConsumerGroupResponse, error)
	GetConsumerGroup(ctx context.Context, name string) (*kafka.ConsumerGroupDetail, error)
}

func List(w nethttp.ResponseWriter, r *nethttp.Request, kafka Service) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	result, err := kafka.GetConsumerGroups(ctx)
	if err != nil {
		shared.WriteJSON(w, nethttp.StatusServiceUnavailable, shared.ErrorResponse{
			Error: shared.APIError{
				Code:    "KAFKA_CONSUMER_GROUPS_FAILED",
				Message: "Failed to fetch consumer groups",
				Details: err.Error(),
			},
		})
		return
	}

	shared.WriteJSON(w, nethttp.StatusOK, result)
}

func Get(w nethttp.ResponseWriter, r *nethttp.Request, kafka Service) {
	groupID := strings.TrimSpace(r.PathValue("name"))
	if groupID == "" {
		shared.WriteJSON(w, nethttp.StatusBadRequest, shared.ErrorResponse{
			Error: shared.APIError{Code: "INVALID_GROUP_ID", Message: "Consumer group ID is required"},
		})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	group, err := kafka.GetConsumerGroup(ctx, groupID)
	if err != nil {
		status := nethttp.StatusServiceUnavailable
		code := "KAFKA_CONSUMER_GROUP_FAILED"
		msg := "Failed to fetch consumer group details"

		if strings.Contains(strings.ToLower(err.Error()), "not found") {
			status = nethttp.StatusNotFound
			code = "CONSUMER_GROUP_NOT_FOUND"
			msg = "Consumer group not found"
		}

		shared.WriteJSON(w, status, shared.ErrorResponse{
			Error: shared.APIError{Code: code, Message: msg, Details: err.Error()},
		})
		return
	}

	shared.WriteJSON(w, nethttp.StatusOK, map[string]any{"data": group})
}
