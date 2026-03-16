package kafka

import (
	"fmt"

	"github.com/twmb/franz-go/pkg/kerr"
)

func kafkaError(prefix string, code int16, message *string) error {
	err := kerr.ErrorForCode(code)
	if err == nil {
		if message != nil && *message != "" {
			return fmt.Errorf("%s: %s", prefix, *message)
		}

		return fmt.Errorf("%s: kafka error code %d", prefix, code)
	}

	if message != nil && *message != "" {
		return fmt.Errorf("%s: %w: %s", prefix, err, *message)
	}

	return fmt.Errorf("%s: %w", prefix, err)
}
