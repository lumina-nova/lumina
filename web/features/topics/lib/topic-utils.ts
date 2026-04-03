import {
  BrowsePosition,
  PartitionHealth,
  TopicHealth,
  TopicsHealthSummary,
} from "@/features/topics/lib/topic.types";
import { getTopicMessages } from "@/lib/api";
import { Partition, Topic } from "@/lib/types";

export const getTopicStats = (topics: Topic[] | null = []): TopicsHealthSummary => {
  if (!topics)
    return {
      totalTopics: "0",
      totalPartitions: "0",
      totalLeaders: "0",
      unhealthyTopics: "0",
      underReplicatedPartitions: "0",
      offlinePartitions: "0",
    };

  const partitionCount = topics.reduce(
    (sum, t) => sum + t.partitions.length,
    0,
  );

  const uniqueLeaders = new Set(
    topics.flatMap((t) => t.partitions.map((p) => p.leader)),
  ).size;

  const healthByTopic = topics.map(getTopicHealth);
  const underReplicatedPartitions = healthByTopic.reduce(
    (sum, health) => sum + health.underReplicatedPartitions,
    0,
  );
  const offlinePartitions = healthByTopic.reduce(
    (sum, health) => sum + health.offlinePartitions,
    0,
  );
  const unhealthyTopics = healthByTopic.filter(
    (health) => health.status !== "healthy",
  ).length;

  return {
    totalTopics: String(topics.length),
    totalPartitions: String(partitionCount),
    totalLeaders: String(uniqueLeaders),
    unhealthyTopics: String(unhealthyTopics),
    underReplicatedPartitions: String(underReplicatedPartitions),
    offlinePartitions: String(offlinePartitions),
  };
};

export function getPartitionHealth(partition: Partition): PartitionHealth {
  const isOffline = partition.leader < 0;
  const isUnderReplicated = partition.isr.length < partition.replicas.length;

  if (isOffline) {
    return {
      status: "offline",
      isOffline,
      isUnderReplicated,
    };
  }

  if (isUnderReplicated) {
    return {
      status: "under-replicated",
      isOffline,
      isUnderReplicated,
    };
  }

  return {
    status: "healthy",
    isOffline,
    isUnderReplicated,
  };
}

export function getTopicHealth(topic: Topic): TopicHealth {
  const partitionHealth = topic.partitions.map(getPartitionHealth);
  const offlinePartitions = partitionHealth.filter(
    (health) => health.isOffline,
  ).length;
  const underReplicatedPartitions = partitionHealth.filter(
    (health) => health.isUnderReplicated,
  ).length;

  return {
    status:
      offlinePartitions > 0
        ? "offline"
        : underReplicatedPartitions > 0
          ? "under-replicated"
          : "healthy",
    partitionCount: topic.partitions.length,
    underReplicatedPartitions,
    offlinePartitions,
  };
}

/**
 * Fetches messages for a specific topic with flexible search criteria
 */
export const browseTopicMessages = async (
  topic: Topic,
  config: {
    selectedPartition: number;
    selectedPosition: BrowsePosition;
    selectedOffset: number | null;
    selectedTimestamp: number | null;
    selectedLimit: number;
  },
) => {
  const {
    selectedPartition,
    selectedPosition,
    selectedOffset,
    selectedTimestamp,
    selectedLimit,
  } = config;

  // Handle case with no partitions immediately
  if (topic.partitions.length === 0) {
    return { messages: null, error: null };
  }

  try {
    const messages = await getTopicMessages(topic.name, {
      partition: selectedPartition,
      position:
        selectedOffset === null && selectedTimestamp === null
          ? selectedPosition
          : undefined,
      offset: selectedOffset ?? undefined,
      timestamp: selectedTimestamp ?? undefined,
      limit: selectedLimit,
    });

    return { messages, error: null };
  } catch (error: unknown) {
    return {
      messages: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export function parsePartition(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

export function parseLimit(value: string | undefined) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return 50;
  return Math.min(parsed, 100);
}

export function parseOffset(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function parseTimestamp(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function parsePosition(
  value: string | undefined,
): "earliest" | "latest" {
  return value === "earliest" ? "earliest" : "latest";
}

export function buildBrowseHref(
  basePath: string,
  query: {
    partition: number;
    position?: "earliest" | "latest";
    offset?: number;
    limit: number;
  },
) {
  const params = new URLSearchParams({
    partition: String(query.partition),
    limit: String(query.limit),
  });

  if (query.offset !== undefined) {
    params.set("offset", String(query.offset));
  } else if (query.position) {
    params.set("position", query.position);
  }

  return `${basePath}?${params.toString()}`;
}

export function parseTopicQuery(
  query: Record<string, string | string[] | undefined>,
  defaultPartition: number,
) {
  return {
    selectedPartition: parsePartition(
      query.partition as string,
      defaultPartition,
    ),
    selectedPosition: parsePosition(query.position as string),
    selectedLimit: parseLimit(query.limit as string),
    selectedOffset: parseOffset(query.offset as string),
    selectedTimestamp: parseTimestamp(query.timestamp as string),
  };
}
