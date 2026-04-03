import {
  EmptyState,
  ErrorState,
  PageFrame,
  StatCard,
} from "@/components/layout/page-frame";
import { TopicMessageModes } from "@/features/topics/components/topic-message-modes";
import { TopicHealthBadge } from "@/features/topics/components/topic-health-badge";
import { TopicDetailPageProps } from "@/features/topics/lib/topic.types";
import {
  browseTopicMessages,
  getPartitionHealth,
  getTopicHealth,
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
  const topicHealth = getTopicHealth(topic);

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
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
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
        <StatCard
          label="Topic Health"
          value={
            topicHealth.status === "healthy"
              ? "Healthy"
              : topicHealth.status === "offline"
                ? "Offline Risk"
                : "Under-Replicated"
          }
          hint="Derived from leader presence and ISR coverage across partitions."
        />
        <StatCard
          label="Under-Replicated"
          value={String(topicHealth.underReplicatedPartitions)}
          hint="Partitions where ISR is smaller than the replica set."
        />
        <StatCard
          label="Offline"
          value={String(topicHealth.offlinePartitions)}
          hint="Partitions with no active leader in the returned metadata."
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
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">Partition</th>
                    <th className="px-5 py-4 font-semibold">Leader</th>
                    <th className="px-5 py-4 font-semibold">Replicas</th>
                    <th className="px-5 py-4 font-semibold">ISR</th>
                  </tr>
                </thead>
                <tbody>
                  {topic.partitions.map((partition) => {
                    const partitionHealth = getPartitionHealth(partition);

                    return (
                      <tr
                        key={partition.id}
                        className="border-t text-sm"
                        style={{
                          borderColor:
                            "color-mix(in srgb, var(--surface-border) 50%, transparent)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        <td className="px-5 py-4">
                          <div className="space-y-2">
                            <TopicHealthBadge
                              status={partitionHealth.status}
                              compact
                            />
                            {partitionHealth.status !== "healthy" ? (
                              <div
                                className="text-xs leading-5"
                                style={{ color: "var(--text-muted)" }}
                              >
                                {partitionHealth.isOffline ? (
                                  <div>No active leader</div>
                                ) : null}
                                {partitionHealth.isUnderReplicated ? (
                                  <div>ISR smaller than replicas</div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-5 py-4 font-mono">{partition.id}</td>
                        <td className="px-5 py-4 font-mono">
                          {partition.leader < 0 ? "Unavailable" : partition.leader}
                        </td>
                        <td className="px-5 py-4 font-mono">
                          {partition.replicas.join(", ")}
                        </td>
                        <td className="px-5 py-4 font-mono">
                          {partition.isr.join(", ")}
                        </td>
                      </tr>
                    );
                  })}
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
