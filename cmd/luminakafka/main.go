package main

import (
	"log"
	nethttp "net/http"
	"os"
	"strings"

	apihttp "github.com/luminakafka/lumina/internal/api/http"
	"github.com/luminakafka/lumina/internal/kafka"
)

const version = "0.1.0"

func main() {
	brokers := splitAndTrim(os.Getenv("KAFKA_BROKERS"))
	if len(brokers) == 0 {
		log.Fatal("KAFKA_BROKERS is required")
	}
	kafkaClient, err := kafka.NewClient(brokers)
	if err != nil {
		log.Fatalf("init Kafka client: %v", err)
	}
	defer kafkaClient.Close()

	handler := apihttp.NewHandler(kafkaClient, version)
	router := apihttp.NewRouter(handler)

	log.Println("server listening on :9099")
	if err := nethttp.ListenAndServe(":9099", router); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}

func splitAndTrim(value string) []string {
	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))

	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			out = append(out, part)
		}
	}

	return out
}
