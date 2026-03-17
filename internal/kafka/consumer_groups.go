package kafka

import (
	"context"
	"fmt"

	"github.com/twmb/franz-go/pkg/kadm"
)

func (c *Client) GetConsumerGroups(ctx context.Context) (ConsumerGroupResponse, error) {
	listed, err := c.admin.ListGroups(ctx)
	if err != nil {
		return ConsumerGroupResponse{}, fmt.Errorf("failed to list consumer groups: %w", err)
	}

	groupIDs := listed.Groups()
	described, err := c.admin.DescribeGroups(ctx, groupIDs...)
	if err != nil {
		return ConsumerGroupResponse{}, fmt.Errorf("failed to describe consumer groups: %w", err)
	}

	items := make([]ConsumerGroupListItem, 0, len(groupIDs))
	for _, groupID := range groupIDs {
		detail, ok := described[groupID]
		if !ok {
			return ConsumerGroupResponse{}, fmt.Errorf("described consumer group %q missing from response", groupID)
		}
		if detail.Err != nil {
			return ConsumerGroupResponse{}, fmt.Errorf("failed to describe consumer group %q: %w", groupID, detail.Err)
		}

		committed, err := c.fetchGroupOffsets(ctx, groupID)
		if err != nil {
			return ConsumerGroupResponse{}, fmt.Errorf("failed to fetch consumer group offsets for %q: %w", groupID, err)
		}

		latest, err := c.fetchLatestOffsets(ctx, committed)
		if err != nil {
			return ConsumerGroupResponse{}, fmt.Errorf("failed to fetch latest offsets for %q: %w", groupID, err)
		}

		lagRows := buildLagRows(committed, latest)
		var totalLag int64
		for _, row := range lagRows {
			totalLag += row.Lag
		}

		items = append(items, ConsumerGroupListItem{
			GroupID: groupID,
			State:   detail.State,
			Members: len(detail.Members),
			Lag:     totalLag,
		})
	}

	return ConsumerGroupResponse{Data: items}, nil
}

func (c *Client) GetConsumerGroup(ctx context.Context, groupID string) (*ConsumerGroupDetail, error) {
	group, err := c.describeGroup(ctx, groupID)
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
		Coordinator: group.Coordinator.NodeID,
		Members:     decodeDescribedMembers(group),
		Lag:         buildLagRows(committed, latest),
	}, nil
}

func (c *Client) describeGroup(ctx context.Context, groupID string) (*kadm.DescribedGroup, error) {
	resp, err := c.admin.DescribeGroups(ctx, groupID)
	if err != nil {
		return nil, fmt.Errorf("failed to describe group %q: %w", groupID, err)
	}

	group, ok := resp[groupID]
	if !ok {
		return nil, fmt.Errorf("consumer group %q not found", groupID)
	}
	if group.Err != nil {
		return nil, fmt.Errorf("failed to describe consumer group %q: %w", groupID, group.Err)
	}

	return &group, nil
}

func decodeDescribedMembers(group *kadm.DescribedGroup) []ConsumerGroupMember {
	members := make([]ConsumerGroupMember, 0, len(group.Members))
	for _, member := range group.Members {
		assignments := make([]ConsumerGroupAssignment, 0)
		if assigned, ok := member.Assigned.AsConsumer(); ok {
			assignments = make([]ConsumerGroupAssignment, 0, len(assigned.Topics))
			for _, topic := range assigned.Topics {
				assignments = append(assignments, ConsumerGroupAssignment{
					Topic:      topic.Topic,
					Partitions: topic.Partitions,
				})
			}
		}

		members = append(members, ConsumerGroupMember{
			MemberID:    member.MemberID,
			ClientID:    member.ClientID,
			Host:        member.ClientHost,
			Assignments: assignments,
		})
	}

	return members
}
