package router

import (
	nethttp "net/http"

	"github.com/luminakafka/lumina/internal/api/http/handlers"
)

func NewRouter(handler *handlers.Handler) nethttp.Handler {
	mux := nethttp.NewServeMux()
	mux.HandleFunc("/health", handler.Health)
	mux.HandleFunc("/api/brokers", handler.GetBrokers)
	mux.HandleFunc("/api/topics", handler.GetTopics)
	mux.HandleFunc("/api/topics/{name}", handler.GetTopic)
	mux.HandleFunc("/api/topics/{name}/messages", handler.GetTopicMessages)

	mux.HandleFunc("/api/consumer-groups", handler.GetConsumerGroups)
	mux.HandleFunc("/api/consumer-groups/{name}", handler.GetConsumerGroup)

	mux.HandleFunc("/api/topics/{name}/tail", handler.TailTopicMessages)
	return mux
}
