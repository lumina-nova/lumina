import { EmptyState, ErrorState, PageFrame, StatCard } from "@/components/page-frame";
import { getTopic } from "@/lib/api";

export const dynamic = "force-dynamic";

type TopicDetailPageProps = {
  params: Promise<{
    name: string;
  }>;
};

export default async function TopicDetailPage({ params }: TopicDetailPageProps) {
  const { name } = await params;

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

  return (
    <PageFrame
      eyebrow="Topic Detail"
      title={topic.name}
      description="Partition layout for a single topic. This reflects the current backend contract: partition id, leader, replicas, and ISR."
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
      )}
    </PageFrame>
  );
}
