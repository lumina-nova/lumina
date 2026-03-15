package http

import nethttp "net/http"

func NewRouter(handler *Handler) nethttp.Handler {
	mux := nethttp.NewServeMux()
	mux.HandleFunc("/health", handler.Health)
	mux.HandleFunc("/api/brokers", handler.GetBrokers)
	mux.HandleFunc("/api/topics", handler.GetTopics)
	mux.HandleFunc("/api/topics/{name}", handler.getTopic)

	mux.HandleFunc("/api/consumer-groups", handler.getConsumerGroups)
	return mux
}
