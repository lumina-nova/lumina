package http

import nethttp "net/http"

func NewRouter(handler *Handler) nethttp.Handler {
	mux := nethttp.NewServeMux()
	mux.HandleFunc("/health", handler.health)
	return mux
}
