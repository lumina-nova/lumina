package kafka

import (
	"context"
	"fmt"

	"github.com/twmb/franz-go/pkg/kmsg"
)

func (c *Client) GetConsumerGroups(ctx context.Context) (ConsumerGroupResponse, error) {
	req := kmsg.NewPtrListGroupsRequest()

	resp, err := req.RequestWith(ctx, c.raw)
	if err != nil {
		return ConsumerGroupResponse{}, fmt.Errorf("failed to list consumer groups: %w", err)
	}

	items := make([]ConsumerGroupListItem, 0, len(resp.Groups))
	for _, group := range resp.Groups {
		detail, err := c.describeGroup(ctx, group.Group)
		if err != nil {
			return ConsumerGroupResponse{}, fmt.Errorf("failed to describe consumer group: %w", err)
		}

		committed, err := c.fetchGroupOffsets(ctx, group.Group)
		if err != nil {
			return ConsumerGroupResponse{}, fmt.Errorf("failed to fetch consumer group offsets: %w", err)
		}

		latest, err := c.fetchLatestOffsets(ctx, committed)
		if err != nil {
			return ConsumerGroupResponse{}, fmt.Errorf("failed to fetch latest offsets: %w", err)
		}

		lagRows := buildLagRows(committed, latest)
		var totalLag int64
		for _, row := range lagRows {
			totalLag += row.Lag
		}

		items = append(items, ConsumerGroupListItem{
			GroupID: group.Group,
			State:   detail.State,
			Members: len(detail.Members),
			Lag:     totalLag,
		})
	}

	return ConsumerGroupResponse{Data: items}, nil
}

func (c *Client) GetConsumerGroup(ctx context.Context, groupID string) (*ConsumerGroupDetail, error) {
	coordinatorID, err := c.findGroupCoordinator(ctx, groupID)
	if err != nil {
		return nil, err
	}

	group, err := c.describeGroup(ctx, groupID)
	if err != nil {
		return nil, err
	}

	members, err := decodeMembers(group.Members)
	if err != nil {
		return nil, err
	}

	committed, err := c.fetchGroupOffsets(ctx, groupID)
	if err != nil {
		return nil, err
	}

	latest, err := c.fetchLatestOffsets(ctx, committed)
	if err != nil {
		return nil, err
	}

	return &ConsumerGroupDetail{
		GroupID:     group.Group,
		State:       group.State,
		Coordinator: coordinatorID,
		Members:     members,
		Lag:         buildLagRows(committed, latest),
	}, nil
}

func (c *Client) findGroupCoordinator(ctx context.Context, groupID string) (int32, error) {
	req := kmsg.NewPtrFindCoordinatorRequest()
	req.CoordinatorKey = groupID
	req.CoordinatorType = 0

	resp, err := req.RequestWith(ctx, c.raw)
	if err != nil {
		return 0, fmt.Errorf("failed to find coordinator for group %q: %w", groupID, err)
	}

	if len(resp.Coordinators) > 0 {
		coordinator := resp.Coordinators[0]
		if coordinator.ErrorCode != 0 {
			return 0, kafkaError("failed to find coordinator", coordinator.ErrorCode, coordinator.ErrorMessage)
		}

		return coordinator.NodeID, nil
	}

	if resp.ErrorCode != 0 {
		return 0, kafkaError("failed to find coordinator", resp.ErrorCode, resp.ErrorMessage)
	}

	return resp.NodeID, nil
}

func (c *Client) describeGroup(ctx context.Context, groupID string) (*kmsg.DescribeGroupsResponseGroup, error) {
	req := kmsg.NewPtrDescribeGroupsRequest()
	req.Groups = []string{groupID}

	resp, err := req.RequestWith(ctx, c.raw)
	if err != nil {
		return nil, fmt.Errorf("failed to describe group %q: %w", groupID, err)
	}

	if len(resp.Groups) == 0 {
		return nil, fmt.Errorf("consumer group %q not found", groupID)
	}

	group := resp.Groups[0]
	if group.ErrorCode != 0 {
		return nil, kafkaError("failed to describe consumer group", group.ErrorCode, group.ErrorMessage)
	}

	return &group, nil
}
