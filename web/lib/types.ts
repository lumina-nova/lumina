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

export type ConsumerGroup = {
  group: string;
  protocol_type: string;
  state: string;
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
