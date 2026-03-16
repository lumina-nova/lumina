import Link from "next/link";

import { EmptyState, ErrorState, PageFrame, StatCard } from "@/components/page-frame";
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
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/45">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  <th className="px-5 py-4 font-semibold">Topic</th>
                  <th className="px-5 py-4 font-semibold">Partitions</th>
                  <th className="px-5 py-4 font-semibold">Leaders</th>
                  <th className="px-5 py-4 font-semibold">ISR Slots</th>
                </tr>
              </thead>
              <tbody>
                {topics.map((topic) => (
                  <tr key={topic.name} className="border-t border-white/5 text-sm text-slate-200">
                    <td className="px-5 py-4">
                      <Link
                        href={`/topics/${encodeURIComponent(topic.name)}`}
                        className="font-mono text-emerald-300 transition hover:text-emerald-200"
                      >
                        {topic.name}
                      </Link>
                    </td>
                    <td className="px-5 py-4 font-mono">{topic.partitions.length}</td>
                    <td className="px-5 py-4 font-mono">
                      {Array.from(
                        new Set(topic.partitions.map((partition) => partition.leader))
                      ).join(", ")}
                    </td>
                    <td className="px-5 py-4 font-mono">
                      {topic.partitions.reduce((sum, partition) => sum + partition.isr.length, 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageFrame>
  );
}
