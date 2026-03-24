package handlers

import (
	nethttp "net/http"

	brokershandler "github.com/luminakafka/lumina/internal/api/http/handlers/brokers"
)

func (h *Handler) GetBrokers(w nethttp.ResponseWriter, r *nethttp.Request) {
	brokershandler.Handle(w, r, h.kafka)
}
