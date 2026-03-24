package handlers

import (
	nethttp "net/http"

	consumergroupshandler "github.com/luminakafka/lumina/internal/api/http/handlers/consumergroups"
)

func (h *Handler) GetConsumerGroups(w nethttp.ResponseWriter, r *nethttp.Request) {
	consumergroupshandler.List(w, r, h.kafka)
}

func (h *Handler) GetConsumerGroup(w nethttp.ResponseWriter, r *nethttp.Request) {
	consumergroupshandler.Get(w, r, h.kafka)
}
