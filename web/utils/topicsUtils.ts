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
