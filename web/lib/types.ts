export type HealthResponse = {
  status: string;
  kafka: {
    connected: boolean;
  };
  version: string;
};

export type Broker = {
  id: number;
  host: string;
  port: number;
  rack: string;
};

export type Partition = {
  id: number;
  leader: number;
  replicas: number[];
  isr: number[];
};

export type Topic = {
  name: string;
  partitions: Partition[];
};

export type MessagePayload = {
  encoding: string;
  size: number;
  text?: string;
  base64?: string;
  truncated?: boolean;
};

export type MessageHeader = {
  key: string;
  value: MessagePayload;
};

export type TopicMessageRecord = {
  offset: number;
  timestamp: string;
  partition: number;
  leaderEpoch: number;
  key: MessagePayload;
  value: MessagePayload;
  headers: MessageHeader[];
};

export type TopicMessagesResponse = {
  topic: string;
  partition: number;
  request: {
    mode: "earliest" | "latest" | "offset";
    offset?: number;
    limit: number;
  };
  resolvedStartOffset: number;
  nextOffset: number;
  highWatermark: number;
  records: TopicMessageRecord[];
};

export type ConsumerGroup = {
  groupId: string;
  state: string;
  members: number;
  lag: number;
};

export type ConsumerGroupAssignment = {
  topic: string;
  partitions: number[];
};

export type ConsumerGroupMember = {
  memberId: string;
  clientId: string;
  host: string;
  assignments: ConsumerGroupAssignment[];
};

export type ConsumerGroupLag = {
  topic: string;
  partition: number;
  currentOffset: number;
  logEndOffset: number;
  lag: number;
};

export type ConsumerGroupDetail = {
  groupId: string;
  state: string;
  coordinator: number;
  members: ConsumerGroupMember[];
  lag: ConsumerGroupLag[];
};
