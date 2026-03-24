package http

import (
	nethttp "net/http"

	"github.com/luminakafka/lumina/internal/api/http/handlers"
	"github.com/luminakafka/lumina/internal/api/http/router"
)

type Handler = handlers.Handler
type KafkaService = handlers.KafkaService

func NewHandler(kafka KafkaService, version string) *Handler {
	return handlers.NewHandler(kafka, version)
}

func NewRouter(handler *Handler) nethttp.Handler {
	return router.NewRouter(handler)
}
