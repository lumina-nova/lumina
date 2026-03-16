package http

import nethttp "net/http"

func NewRouter(handler *Handler) nethttp.Handler {
	mux := nethttp.NewServeMux()
	mux.HandleFunc("/health", handler.Health)
	mux.HandleFunc("/api/brokers", handler.GetBrokers)
	mux.HandleFunc("/api/topics", handler.GetTopics)
	mux.HandleFunc("/api/topics/{name}", handler.GetTopic)

	mux.HandleFunc("/api/consumer-groups", handler.GetConsumerGroups)
	mux.HandleFunc("/api/consumer-groups/{name}", handler.GetConsumerGroup)

	return mux
}
