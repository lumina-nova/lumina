import {
  EmptyState,
  ErrorState,
  PageFrame,
  StatCard,
} from "@/components/layout/page-frame";
import { TopicMessageModes } from "@/features/topics/components/topic-message-modes";
import { TopicDetailPageProps } from "@/features/topics/lib/topic.types";
import {
  browseTopicMessages,
  parseTopicQuery,
} from "@/features/topics/lib/topic-utils";
import { getTopic } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function TopicDetailPage({
  params,
  searchParams,
}: TopicDetailPageProps) {
  const { name } = await params;
  const query = (await searchParams) ?? {};

  const result = await getTopic(name)
    .then((topic) => ({ topic, error: null as string | null }))
    .catch((error: unknown) => ({
      topic: null,
      error: error instanceof Error ? error.message : "Unknown error",
    }));

  if (result.error || !result.topic) {
    return (
      <PageFrame
        eyebrow="Topic Detail"
        title={decodeURIComponent(name)}
        description="Partition layout for a single topic."
      >
        <ErrorState
          title="Failed to load topic"
          copy={result.error ?? "Unknown error"}
        />
      </PageFrame>
    );
  }

  const topic = result.topic;
  const replicationFactor = topic.partitions[0]?.replicas.length ?? 0;
  const defaultPartition = topic.partitions[0]?.id ?? 0;

  const {
    selectedPartition,
    selectedPosition,
    selectedLimit,
    selectedOffset,
    selectedTimestamp,
  } = parseTopicQuery(query, defaultPartition);

  const baseTopicPath = `/topics/${encodeURIComponent(topic.name)}`;

  const browseResult = await browseTopicMessages(topic, {
    selectedPartition,
    selectedPosition,
    selectedOffset,
    selectedTimestamp,
    selectedLimit,
  });
  return (
    <PageFrame
      eyebrow="Topic Detail"
      title={topic.name}
      description="Partition layout plus bounded message browsing for a single topic. Use the browse panel to inspect recent or offset-based records without committing offsets."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Partitions"
          value={String(topic.partitions.length)}
          hint="Total partitions in the topic."
        />
        <StatCard
          label="Replication"
          value={String(replicationFactor)}
          hint="Derived from the first partition replica set."
        />
        <StatCard
          label="Leaders"
          value={String(
            new Set(topic.partitions.map((partition) => partition.leader)).size,
          )}
          hint="Distinct broker leaders for this topic."
        />
      </div>

      {topic.partitions.length === 0 ? (
        <EmptyState
          title="No partitions returned"
          copy="Kafka returned the topic but there are no partitions in the response."
        />
      ) : (
        <div className="space-y-6">
          <div
            className="overflow-hidden rounded-[28px] border"
            style={{
              borderColor: "var(--surface-border)",
              background: "var(--surface-1)",
            }}
          >
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr
                    className="border-b text-left text-[11px] uppercase tracking-[0.24em]"
                    style={{
                      borderColor: "var(--surface-border)",
                      color: "var(--text-muted)",
                    }}
                  >
                    <th className="px-5 py-4 font-semibold">Partition</th>
                    <th className="px-5 py-4 font-semibold">Leader</th>
                    <th className="px-5 py-4 font-semibold">Replicas</th>
                    <th className="px-5 py-4 font-semibold">ISR</th>
                  </tr>
                </thead>
                <tbody>
                  {topic.partitions.map((partition) => (
                    <tr
                      key={partition.id}
                      className="border-t text-sm"
                      style={{
                        borderColor:
                          "color-mix(in srgb, var(--surface-border) 50%, transparent)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <td className="px-5 py-4 font-mono">{partition.id}</td>
                      <td className="px-5 py-4 font-mono">
                        {partition.leader}
                      </td>
                      <td className="px-5 py-4 font-mono">
                        {partition.replicas.join(", ")}
                      </td>
                      <td className="px-5 py-4 font-mono">
                        {partition.isr.join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <TopicMessageModes
            baseTopicPath={baseTopicPath}
            partitions={topic.partitions.map((partition) => partition.id)}
            selectedPartition={selectedPartition}
            selectedPosition={selectedPosition}
            selectedOffset={selectedOffset}
            selectedTimestamp={selectedTimestamp}
            selectedLimit={selectedLimit}
            browseError={browseResult.error}
            browseMessages={browseResult.messages}
            topicName={topic.name}
          />
        </div>
      )}
    </PageFrame>
  );
}
