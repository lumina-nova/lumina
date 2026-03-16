package kafka

import (
	"context"
	"fmt"
	"time"

	"github.com/twmb/franz-go/pkg/kgo"
)

type Client struct {
	raw     *kgo.Client
	brokers []string
}

func NewClient(brokers []string) (*Client, error) {
	raw, err := kgo.NewClient(
		kgo.SeedBrokers(brokers...),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create producer client: %w", err)
	}

	return &Client{
		raw:     raw,
		brokers: append([]string(nil), brokers...),
	}, nil
}

func (c *Client) Close() {
	c.raw.Close()
}

func (c *Client) HealthCheck(ctx context.Context) error {
	checkCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	return c.raw.Ping(checkCtx)
}
