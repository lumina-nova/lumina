import Link from "next/link";

import { EmptyState, ErrorState, PageFrame, StatCard } from "@/components/page-frame";
import { getTopic, getTopicMessages } from "@/lib/api";
import { MessagePayload } from "@/lib/types";

export const dynamic = "force-dynamic";

type TopicDetailPageProps = {
  params: Promise<{
    name: string;
  }>;
  searchParams?: Promise<{
    partition?: string;
    position?: string;
    offset?: string;
    limit?: string;
  }>;
};

export default async function TopicDetailPage({
  params,
  searchParams
}: TopicDetailPageProps) {
  const { name } = await params;
  const query = (await searchParams) ?? {};

  const result = await getTopic(name)
    .then((topic) => ({ topic, error: null as string | null }))
    .catch((error: unknown) => ({
      topic: null,
      error: error instanceof Error ? error.message : "Unknown error"
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
  const selectedPartition = parsePartition(query.partition, defaultPartition);
  const selectedPosition = parsePosition(query.position);
  const selectedLimit = parseLimit(query.limit);
  const selectedOffset = parseOffset(query.offset);
  const baseTopicPath = `/topics/${encodeURIComponent(topic.name)}`;

  const browseResult =
    topic.partitions.length === 0
      ? { messages: null, error: null as string | null }
      : await getTopicMessages(topic.name, {
          partition: selectedPartition,
          position: selectedOffset === null ? selectedPosition : undefined,
          offset: selectedOffset ?? undefined,
          limit: selectedLimit
        })
          .then((messages) => ({ messages, error: null as string | null }))
          .catch((error: unknown) => ({
            messages: null,
            error: error instanceof Error ? error.message : "Unknown error"
          }));

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
          value={String(new Set(topic.partitions.map((partition) => partition.leader)).size)}
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
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/45">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-[0.24em] text-slate-500">
                    <th className="px-5 py-4 font-semibold">Partition</th>
                    <th className="px-5 py-4 font-semibold">Leader</th>
                    <th className="px-5 py-4 font-semibold">Replicas</th>
                    <th className="px-5 py-4 font-semibold">ISR</th>
                  </tr>
                </thead>
                <tbody>
                  {topic.partitions.map((partition) => (
                    <tr key={partition.id} className="border-t border-white/5 text-sm text-slate-200">
                      <td className="px-5 py-4 font-mono">{partition.id}</td>
                      <td className="px-5 py-4 font-mono">{partition.leader}</td>
                      <td className="px-5 py-4 font-mono">{partition.replicas.join(", ")}</td>
                      <td className="px-5 py-4 font-mono">{partition.isr.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-slate-950/45 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Browse Messages</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Read a bounded slice of records for one partition without joining a consumer group.
                </p>
              </div>
              <form className="grid gap-3 md:grid-cols-4" method="get">
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Partition
                  <select
                    name="partition"
                    defaultValue={String(selectedPartition)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  >
                    {topic.partitions.map((partition) => (
                      <option key={partition.id} value={partition.id}>
                        {partition.id}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Position
                  <select
                    name="position"
                    defaultValue={selectedOffset === null ? selectedPosition : "offset"}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  >
                    <option value="latest">Latest</option>
                    <option value="earliest">Earliest</option>
                    <option value="offset">Offset</option>
                  </select>
                </label>
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Offset
                  <input
                    name="offset"
                    type="number"
                    min="0"
                    defaultValue={selectedOffset ?? ""}
                    placeholder="Optional"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Limit
                  <input
                    name="limit"
                    type="number"
                    min="1"
                    max="100"
                    defaultValue={String(selectedLimit)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/15 md:col-span-4"
                >
                  Fetch Records
                </button>
              </form>
            </div>

            {browseResult.error ? (
              <div className="mt-5">
                <ErrorState title="Failed to load topic messages" copy={browseResult.error} />
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

                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={buildBrowseHref(baseTopicPath, {
                      partition: browseResult.messages.partition,
                      position: "earliest",
                      limit: browseResult.messages.request.limit
                    })}
                    className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/20 hover:bg-slate-900"
                  >
                    Restart From Earliest
                  </Link>
                  <Link
                    href={buildBrowseHref(baseTopicPath, {
                      partition: browseResult.messages.partition,
                      offset: browseResult.messages.nextOffset,
                      limit: browseResult.messages.request.limit
                    })}
                    className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/15"
                  >
                    Load Next {browseResult.messages.request.limit}
                  </Link>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Next page starts at offset {browseResult.messages.nextOffset}
                  </p>
                </div>

                {browseResult.messages.records.length === 0 ? (
                  <EmptyState
                    title="No messages returned"
                    copy="The request completed successfully, but no records were returned for this partition and offset window."
                  />
                ) : (
                  <div className="overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/60">
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse">
                        <thead>
                          <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-[0.24em] text-slate-500">
                            <th className="px-5 py-4 font-semibold">Offset</th>
                            <th className="px-5 py-4 font-semibold">Timestamp</th>
                            <th className="px-5 py-4 font-semibold">Key</th>
                            <th className="px-5 py-4 font-semibold">Value</th>
                            <th className="px-5 py-4 font-semibold">Headers</th>
                          </tr>
                        </thead>
                        <tbody>
                          {browseResult.messages.records.map((record) => (
                            <tr
                              key={`${record.partition}-${record.offset}`}
                              className="border-t border-white/5 align-top text-sm text-slate-200"
                            >
                              <td className="px-5 py-4 font-mono">{record.offset}</td>
                              <td className="px-5 py-4 font-mono text-xs text-slate-300">
                                {record.timestamp}
                              </td>
                              <td className="px-5 py-4">{renderPayload(record.key)}</td>
                              <td className="px-5 py-4">{renderPayload(record.value)}</td>
                              <td className="px-5 py-4 font-mono text-xs text-slate-300">
                                {record.headers.length === 0
                                  ? "None"
                                  : record.headers
                                      .map((header) => `${header.key}: ${payloadPreview(header.value)}`)
                                      .join(" · ")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </PageFrame>
  );
}

function parsePartition(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseLimit(value: string | undefined) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 50;
  }
  return Math.min(parsed, 100);
}

function parseOffset(value: string | undefined) {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function parsePosition(value: string | undefined): "earliest" | "latest" {
  return value === "earliest" ? "earliest" : "latest";
}

function renderPayload(payload: MessagePayload) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
        {payload.encoding} · {payload.size}b
      </p>
      <p className="max-w-[32rem] whitespace-pre-wrap break-all font-mono text-xs text-slate-100">
        {payloadPreview(payload)}
      </p>
    </div>
  );
}

function payloadPreview(payload: MessagePayload) {
  if (payload.encoding === "base64") {
    return payload.base64 || "<binary>";
  }
  return payload.text ?? "<empty>";
}

function buildBrowseHref(
  basePath: string,
  query: {
    partition: number;
    position?: "earliest" | "latest";
    offset?: number;
    limit: number;
  }
) {
  const searchParams = new URLSearchParams({
    partition: String(query.partition),
    limit: String(query.limit)
  });

  if (typeof query.offset === "number") {
    searchParams.set("offset", String(query.offset));
  } else if (query.position) {
    searchParams.set("position", query.position);
  }

  return `${basePath}?${searchParams.toString()}`;
}
