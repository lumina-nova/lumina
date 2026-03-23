import { BrowsePosition } from "@/interfaces/topic.interface";
import { getTopicMessages } from "@/lib/api";
import { Topic } from "@/lib/types";

export const getTopicStats = (topics: Topic[] | null = []) => {
  if (!topics)
    return {
      totalTopics: "0",
      totalPartitions: "0",
      totalLeaders: "0",
    };

  const partitionCount = topics.reduce(
    (sum, t) => sum + t.partitions.length,
    0,
  );

  const uniqueLeaders = new Set(
    topics.flatMap((t) => t.partitions.map((p) => p.leader)),
  ).size;

  return {
    totalTopics: String(topics.length),
    totalPartitions: String(partitionCount),
    totalLeaders: String(uniqueLeaders),
  };
};

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
