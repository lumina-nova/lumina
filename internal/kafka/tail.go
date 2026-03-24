package kafka

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/twmb/franz-go/pkg/kgo"
)

// Reserved for live tail functionality so streaming logic does not bloat
// browse-oriented message handlers in messages.go.

func (c *Client) TailTopicMessages(ctx context.Context, req TailMessagesRequest, onRecord func(record MessageRecord) error) error {
	// todo: here we might need to attach schema registry during optimizations
	topic, err := c.GetTopic(ctx, req.Topic)
	if err != nil {
		return err
	}

	if !topicHasPartition(topic, req.Partition) {
		return fmt.Errorf("Partition %d not found for topic %q", req.Partition, req.Topic)
	}

	latest, err := c.lookupPartitionOffset(ctx, req.Topic, req.Partition, -1)
	if err != nil {
		return fmt.Errorf("failed to resolve latest offset: %w", err)
	}

	tailClient, err := kgo.NewClient(
		kgo.SeedBrokers(c.brokers...),
		kgo.ConsumePartitions(map[string]map[int32]kgo.Offset{
			req.Topic: {
				req.Partition: kgo.NewOffset().At(latest),
			},
		}),
		kgo.FetchMaxWait(1500*time.Millisecond),
		kgo.FetchMaxBytes(5<<20),
		kgo.FetchMaxPartitionBytes(1<<20),
	)

	if err != nil {
		return fmt.Errorf("failed to create tail client: %w", err)
	}
	defer tailClient.Close()

	for {
		if err := ctx.Err(); err != nil {
			return nil
		}

		fetches := tailClient.PollFetches(ctx)

		if err := firstFatalFetchError(fetches.Errors()); err != nil {
			if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
				return nil
			}
			return fmt.Errorf("failed to tail topic messages: %w", err)
		}

		var callbackErr error

		fetches.EachPartition(func(partitionFetch kgo.FetchTopicPartition) {
			if callbackErr != nil {
				return
			}

			partitionFetch.EachRecord(func(record *kgo.Record) {
				if callbackErr != nil {
					return
				}

				callbackErr = onRecord(mapMessageRecord(record))
			})
		})

		if callbackErr != nil {
			return callbackErr
		}
	}
}
