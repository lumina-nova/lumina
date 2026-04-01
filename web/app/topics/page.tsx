import {
  EmptyState,
  ErrorState,
  PageFrame,
  StatCard,
} from "@/components/layout/page-frame";
import { TopicsTable } from "@/features/topics/components/topics-table";
import {
  PAGE_FRAME_PROPS_DATA,
  PAGE_FRAME_PROPS_FOR_ERROR_STATE,
} from "@/features/topics/lib/topic-page.constants";
import { getTopicStats } from "@/features/topics/lib/topic-utils";
import { getTopics } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function TopicsPage() {
  const result = await getTopics()
    .then((topics) => ({ topics, error: null as string | null }))
    .catch((error: unknown) => ({
      topics: null,
      error: error instanceof Error ? error.message : "Unknown error",
    }));

  if (result.error) {
    return (
      <PageFrame {...PAGE_FRAME_PROPS_FOR_ERROR_STATE}>
        <ErrorState
          title="Failed to load topics"
          copy={result.error ?? "Unknown error"}
        />
      </PageFrame>
    );
  }

  const topics = result.topics;

  if (topics?.length === 0) {
    return (
      <PageFrame {...PAGE_FRAME_PROPS_DATA}>
        <EmptyState
          title="No topics returned"
          copy="Kafka responded but there are no topics visible to this connection."
        />
      </PageFrame>
    );
  }

  const { totalTopics, totalPartitions, totalLeaders } = getTopicStats(topics);

  return (
    <PageFrame {...PAGE_FRAME_PROPS_DATA}>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Topics"
          value={totalTopics}
          hint="Backed by GET /api/topics."
        />
        <StatCard
          label="Partitions"
          value={totalPartitions}
          hint="Aggregate partition count across the cluster."
        />
        <StatCard
          label="Unique Leaders"
          value={totalLeaders}
          hint="Distinct broker leaders represented in topic metadata."
        />
      </div>
      <TopicsTable topics={topics} />
    </PageFrame>
  );
}
