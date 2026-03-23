import Link from "next/link";

import { LocalDateTime } from "@/components/local-date-time";
import {
  EmptyState,
  ErrorState,
  PageFrame,
  StatCard,
} from "@/components/page-frame";
import { TopicBrowseForm } from "@/components/topic-browse-form";
import { TopicMessagesTable } from "@/components/topic-messages-table";
import { getTopic } from "@/lib/api";
import { TopicDetailPageProps } from "@/interfaces/topic.interface";
import {
  browseTopicMessages,
  buildBrowseHref,
  parseTopicQuery,
} from "@/utils/topicsUtils";

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

          <div
            className="rounded-[28px] border p-5"
            style={{
              borderColor: "var(--surface-border)",
              background: "var(--surface-1)",
            }}
          >
            <div>
              <h3
                className="text-lg font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Browse Messages
              </h3>
              <p
                className="mt-2 max-w-3xl text-sm leading-6"
                style={{ color: "var(--text-muted)" }}
              >
                Read a bounded slice of records for one partition without
                joining a consumer group. Use latest for recent activity, offset
                for exact navigation, and timestamp to jump to the first record
                at or after a chosen moment.
              </p>
            </div>
            <div
              className="mt-5 rounded-3xl border p-4"
              style={{
                borderColor: "var(--surface-border)",
                background: "var(--surface-2)",
              }}
            >
              <TopicBrowseForm
                key={`${selectedPartition}:${selectedPosition}:${selectedOffset ?? "none"}:${selectedTimestamp ?? "none"}:${selectedLimit}`}
                actionPath={baseTopicPath}
                partitions={topic.partitions.map((partition) => partition.id)}
                selectedPartition={selectedPartition}
                selectedPosition={selectedPosition}
                selectedOffset={selectedOffset}
                selectedTimestamp={selectedTimestamp}
                selectedLimit={selectedLimit}
              />
            </div>

            {browseResult.error ? (
              <div className="mt-5">
                <ErrorState
                  title="Failed to load topic messages"
                  copy={browseResult.error}
                />
              </div>
            ) : browseResult.messages ? (
              <div className="mt-5 space-y-4">
                <div className="grid gap-4 md:grid-cols-4">
                  <StatCard
                    label="Partition"
                    value={String(browseResult.messages.partition)}
                    hint="Partition selected for browsing."
                  />
                  <StatCard
                    label="Start Offset"
                    value={String(browseResult.messages.resolvedStartOffset)}
                    hint="Resolved fetch start after applying your browse mode."
                  />
                  <StatCard
                    label="Next Offset"
                    value={String(browseResult.messages.nextOffset)}
                    hint="Use this offset to continue paging forward."
                  />
                  <StatCard
                    label="High Watermark"
                    value={String(browseResult.messages.highWatermark)}
                    hint="Latest durable offset seen during this fetch."
                  />
                </div>

                <div
                  className="rounded-[24px] border px-4 py-3 text-sm"
                  style={{
                    borderColor: "var(--surface-border)",
                    background: "var(--surface-2)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <span
                    className="font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Browse Mode:
                  </span>{" "}
                  <span className="capitalize">
                    {browseResult.messages.request.mode}
                  </span>
                  {typeof browseResult.messages.request.offset === "number" ? (
                    <span
                      className="ml-4"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Requested offset{" "}
                      <span
                        className="font-mono"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {browseResult.messages.request.offset}
                      </span>
                    </span>
                  ) : null}
                  {typeof browseResult.messages.request.timestamp ===
                  "number" ? (
                    <span
                      className="ml-4"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Requested time{" "}
                      <span
                        className="font-mono"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <LocalDateTime
                          value={browseResult.messages.request.timestamp}
                        />
                      </span>
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={buildBrowseHref(baseTopicPath, {
                      partition: browseResult.messages.partition,
                      position: "earliest",
                      limit: browseResult.messages.request.limit,
                    })}
                    className="rounded-2xl border px-4 py-2 text-sm font-semibold transition"
                    style={{
                      borderColor: "var(--surface-border)",
                      background: "var(--surface-2)",
                      color: "var(--text-primary)",
                    }}
                  >
                    Restart From Earliest
                  </Link>
                  <Link
                    href={buildBrowseHref(baseTopicPath, {
                      partition: browseResult.messages.partition,
                      offset: browseResult.messages.nextOffset,
                      limit: browseResult.messages.request.limit,
                    })}
                    className="rounded-2xl border px-4 py-2 text-sm font-semibold transition"
                    style={{
                      borderColor: "var(--accent-border)",
                      background: "var(--accent-soft)",
                      color: "var(--accent-contrast)",
                    }}
                  >
                    Load Next {browseResult.messages.request.limit}
                  </Link>
                  <p
                    className="text-xs uppercase tracking-[0.18em]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Next page starts at offset{" "}
                    {browseResult.messages.nextOffset}
                  </p>
                </div>

                {browseResult.messages.records.length === 0 ? (
                  <EmptyState
                    title="No messages returned"
                    copy="The request completed successfully, but no records were returned for this partition and offset window."
                  />
                ) : (
                  <TopicMessagesTable records={browseResult.messages.records} />
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </PageFrame>
  );
}
