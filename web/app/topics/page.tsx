import { EmptyState, ErrorState, PageFrame, StatCard } from "@/components/page-frame";
import { TopicsTable } from "@/components/topics-table";
import { getTopics } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function TopicsPage() {
  const result = await getTopics()
    .then((topics) => ({ topics, error: null as string | null }))
    .catch((error: unknown) => ({
      topics: null,
      error: error instanceof Error ? error.message : "Unknown error"
    }));

  if (result.error || !result.topics) {
    return (
      <PageFrame
        eyebrow="Primary View"
        title="Topics"
        description="The central inspection screen for topic metadata."
      >
        <ErrorState
          title="Failed to load topics"
          copy={result.error ?? "Unknown error"}
        />
      </PageFrame>
    );
  }

  const topics = result.topics;
  const partitionCount = topics.reduce((sum, topic) => sum + topic.partitions.length, 0);

  return (
    <PageFrame
      eyebrow="Primary View"
      title="Topics"
      description="The central inspection screen for topic metadata. Open a topic to inspect leaders, replicas, and ISR placement."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Topics" value={String(topics.length)} hint="Backed by GET /api/topics." />
        <StatCard
          label="Partitions"
          value={String(partitionCount)}
          hint="Aggregate partition count across the cluster."
        />
        <StatCard
          label="Unique Leaders"
          value={String(
            new Set(
              topics.flatMap((topic) => topic.partitions.map((partition) => partition.leader))
            ).size
          )}
          hint="Distinct broker leaders represented in topic metadata."
        />
      </div>

      {topics.length === 0 ? (
        <EmptyState
          title="No topics returned"
          copy="Kafka responded but there are no topics visible to this connection."
        />
      ) : (
        <TopicsTable topics={topics} />
      )}
    </PageFrame>
  );
}
