package kafka

type Broker struct {
	ID   int32  `json:"id"`
	Host string `json:"host"`
	Port int32  `json:"port"`
	Rack string `json:"rack"`
}

type Topic struct {
	Name       string      `json:"name"`
	Partitions []Partition `json:"partitions"`
}

type MessageBrowseMode string

const (
	MessageBrowseModeEarliest MessageBrowseMode = "earliest"
	MessageBrowseModeLatest   MessageBrowseMode = "latest"
	MessageBrowseModeOffset   MessageBrowseMode = "offset"
)

type Partition struct {
	ID       int32   `json:"id"`
	Leader   int32   `json:"leader"`
	Replicas []int32 `json:"replicas"`
	Isr      []int32 `json:"isr"`
}

type ConsumerGroup struct {
	Group        string `json:"group"`
	ProtocolType string `json:"protocol_type"`
	State        string `json:"state"`
}

type ConsumerGroupResponse struct {
	Data []ConsumerGroupListItem `json:"data"`
}

type ConsumerGroupAssignment struct {
	Topic      string  `json:"topic"`
	Partitions []int32 `json:"partitions"`
}

type ConsumerGroupMember struct {
	MemberID    string                    `json:"memberId"`
	ClientID    string                    `json:"clientId"`
	Host        string                    `json:"host"`
	Assignments []ConsumerGroupAssignment `json:"assignments"`
}

type ConsumerGroupLag struct {
	Topic         string `json:"topic"`
	Partition     int32  `json:"partition"`
	CurrentOffset int64  `json:"currentOffset"`
	LogEndOffset  int64  `json:"logEndOffset"`
	Lag           int64  `json:"lag"`
}

type ConsumerGroupDetail struct {
	GroupID     string                `json:"groupId"`
	State       string                `json:"state"`
	Coordinator int32                 `json:"coordinator"`
	Members     []ConsumerGroupMember `json:"members"`
	Lag         []ConsumerGroupLag    `json:"lag"`
}

type ConsumerGroupListItem struct {
	GroupID string `json:"groupId"`
	State   string `json:"state"`
	Members int    `json:"members"`
	Lag     int64  `json:"lag"`
}

type BrowseMessagesRequest struct {
	Topic     string
	Partition int32
	Mode      MessageBrowseMode
	Offset    int64
	Limit     int
}

type BrowseMessagesRequestSummary struct {
	Mode   MessageBrowseMode `json:"mode"`
	Offset *int64            `json:"offset,omitempty"`
	Limit  int               `json:"limit"`
}

type MessagePayload struct {
	Encoding  string `json:"encoding"`
	Size      int    `json:"size"`
	Text      string `json:"text,omitempty"`
	Base64    string `json:"base64,omitempty"`
	Truncated bool   `json:"truncated,omitempty"`
}

type MessageHeader struct {
	Key   string         `json:"key"`
	Value MessagePayload `json:"value"`
}

type MessageRecord struct {
	Offset      int64           `json:"offset"`
	Timestamp   string          `json:"timestamp"`
	Partition   int32           `json:"partition"`
	LeaderEpoch int32           `json:"leaderEpoch"`
	Key         MessagePayload  `json:"key"`
	Value       MessagePayload  `json:"value"`
	Headers     []MessageHeader `json:"headers"`
}

type BrowseMessagesResponse struct {
	Topic               string                       `json:"topic"`
	Partition           int32                        `json:"partition"`
	Request             BrowseMessagesRequestSummary `json:"request"`
	ResolvedStartOffset int64                        `json:"resolvedStartOffset"`
	NextOffset          int64                        `json:"nextOffset"`
	HighWatermark       int64                        `json:"highWatermark"`
	Records             []MessageRecord              `json:"records"`
}
