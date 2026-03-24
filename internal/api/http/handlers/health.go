package handlers

import (
	nethttp "net/http"

	healthhandler "github.com/luminakafka/lumina/internal/api/http/handlers/health"
)

func (h *Handler) Health(w nethttp.ResponseWriter, r *nethttp.Request) {
	healthhandler.Handle(w, r, h.kafka, h.version)
}
