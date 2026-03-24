package handlers

import (
	nethttp "net/http"
	"strings"

	"github.com/gorilla/websocket"
	"github.com/luminakafka/lumina/internal/api/http/handlers/shared"
	topichandler "github.com/luminakafka/lumina/internal/api/http/handlers/topics"
	"github.com/luminakafka/lumina/internal/kafka"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *nethttp.Request) bool {
		return true
	},
}

func (h *Handler) GetTopics(w nethttp.ResponseWriter, r *nethttp.Request) {
	topichandler.List(w, r, h.kafka)
}

func (h *Handler) GetTopic(w nethttp.ResponseWriter, r *nethttp.Request) {
	topichandler.Get(w, r, h.kafka)
}

func (h *Handler) GetTopicMessages(w nethttp.ResponseWriter, r *nethttp.Request) {
	topichandler.BrowseMessages(w, r, h.kafka)
}

func (h *Handler) TailTopicMessages(w nethttp.ResponseWriter, r *nethttp.Request) {
	topicName := strings.TrimSpace(r.PathValue("name"))
	if topicName == "" {
		shared.WriteJSON(w, nethttp.StatusBadRequest, shared.ErrorResponse{
			Error: shared.APIError{
				Code:    "INVALID_TOPIC_NAME",
				Message: "Topic name is required",
			},
		})
		return
	}

	req, err := shared.ParseTailMessagesRequest(topicName, r)

	if err != nil {
		shared.WriteJSON(w, nethttp.StatusBadRequest, shared.ErrorResponse{
			Error: shared.APIError{
				Code:    "INVALID_TAIL_QUERY",
				Message: err.Error(),
			},
		})
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	err = h.kafka.TailTopicMessages(r.Context(), req, func(record kafka.MessageRecord) error {
		return conn.WriteJSON(kafka.TailEvent{
			Type:   "record",
			Record: &record,
		})
	})
	if err != nil {
		_ = conn.WriteJSON(kafka.TailEvent{
			Type:    "error",
			Message: err.Error(),
		})
	}
}
