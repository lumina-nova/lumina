package kafka

import (
	"fmt"

	"github.com/twmb/franz-go/pkg/kmsg"
)

func decodeMembers(raw []kmsg.DescribeGroupsResponseGroupMember) ([]ConsumerGroupMember, error) {
	members := make([]ConsumerGroupMember, 0, len(raw))

	for _, member := range raw {
		assignments := make([]ConsumerGroupAssignment, 0)
		if len(member.MemberAssignment) > 0 {
			assignment := kmsg.NewConsumerMemberAssignment()
			if err := assignment.ReadFrom(member.MemberAssignment); err != nil {
				return nil, fmt.Errorf("failed to decode member assignment for member %q: %w", member.MemberID, err)
			}

			assignments = make([]ConsumerGroupAssignment, 0, len(assignment.Topics))
			for _, topic := range assignment.Topics {
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

	return members, nil
}
