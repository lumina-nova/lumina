import { EmptyState, ErrorState, PageFrame, StatCard } from "@/components/page-frame";
import { getConsumerGroup } from "@/lib/api";

export const dynamic = "force-dynamic";

type ConsumerGroupDetailPageProps = {
  params: Promise<{
    name: string;
  }>;
};

export default async function ConsumerGroupDetailPage({
  params
}: ConsumerGroupDetailPageProps) {
  const { name } = await params;

  const result = await getConsumerGroup(name)
    .then((group) => ({ group, error: null as string | null }))
    .catch((error: unknown) => ({
      group: null,
      error: error instanceof Error ? error.message : "Unknown error"
    }));

  if (result.error || !result.group) {
    return (
      <PageFrame
        eyebrow="Consumer Group Detail"
        title={decodeURIComponent(name)}
        description="Coordinator, member assignments, and lag-by-partition for a single consumer group."
      >
        <ErrorState
          title="Failed to load consumer group"
          copy={result.error ?? "Unknown error"}
        />
      </PageFrame>
    );
  }

  const group = result.group;
  const totalLag = group.lag.reduce((sum, row) => sum + row.lag, 0);

  return (
    <PageFrame
      eyebrow="Consumer Group Detail"
      title={group.groupId}
      description="Coordinator, member assignments, and lag-by-partition for a single consumer group."
    >
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="State" value={group.state} hint="Current group state from DescribeGroups." />
        <StatCard
          label="Coordinator"
          value={String(group.coordinator)}
          hint="Broker id of the group coordinator."
        />
        <StatCard
          label="Members"
          value={String(group.members.length)}
          hint="Consumers currently in the group."
        />
        <StatCard
          label="Total Lag"
          value={String(totalLag)}
          hint="Sum of lag across all returned partitions."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div
            className="overflow-hidden rounded-[28px] border"
            style={{ borderColor: "var(--surface-border)", background: "var(--surface-1)" }}
          >
            <div className="border-b px-5 py-4" style={{ borderColor: "var(--surface-border)" }}>
              <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                Members
              </h3>
              <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-muted)" }}>
                Client identity, host, and topic-partition assignments.
              </p>
            </div>
            {group.members.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="No members returned"
                  copy="Kafka returned the group but there are no active members in the current response."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr
                      className="border-b text-left text-[11px] uppercase tracking-[0.24em]"
                      style={{ borderColor: "var(--surface-border)", color: "var(--text-muted)" }}
                    >
                      <th className="px-5 py-4 font-semibold">Member ID</th>
                      <th className="px-5 py-4 font-semibold">Client</th>
                      <th className="px-5 py-4 font-semibold">Host</th>
                      <th className="px-5 py-4 font-semibold">Assignments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.members.map((member) => (
                      <tr
                        key={member.memberId}
                        className="border-t text-sm"
                        style={{
                          borderColor: "color-mix(in srgb, var(--surface-border) 50%, transparent)",
                          color: "var(--text-secondary)"
                        }}
                      >
                        <td className="px-5 py-4 font-mono">{member.memberId}</td>
                        <td className="px-5 py-4 font-mono">{member.clientId}</td>
                        <td className="px-5 py-4 font-mono">{member.host}</td>
                        <td className="px-5 py-4 font-mono">
                          {member.assignments.length === 0
                            ? "None"
                            : member.assignments
                                .map(
                                  (assignment) =>
                                    `${assignment.topic}[${assignment.partitions.join(", ")}]`
                                )
                                .join(" · ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div
            className="overflow-hidden rounded-[28px] border"
            style={{ borderColor: "var(--surface-border)", background: "var(--surface-1)" }}
          >
            <div className="border-b px-5 py-4" style={{ borderColor: "var(--surface-border)" }}>
              <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                Lag by Partition
              </h3>
              <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-muted)" }}>
                Committed offsets compared with log end offsets.
              </p>
            </div>
            {group.lag.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="No lag rows returned"
                  copy="The current response does not include partition lag rows for this group."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr
                      className="border-b text-left text-[11px] uppercase tracking-[0.24em]"
                      style={{ borderColor: "var(--surface-border)", color: "var(--text-muted)" }}
                    >
                      <th className="px-5 py-4 font-semibold">Topic</th>
                      <th className="px-5 py-4 font-semibold">Partition</th>
                      <th className="px-5 py-4 font-semibold">Current</th>
                      <th className="px-5 py-4 font-semibold">Log End</th>
                      <th className="px-5 py-4 font-semibold">Lag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.lag.map((row) => (
                      <tr
                        key={`${row.topic}-${row.partition}`}
                        className="border-t text-sm"
                        style={{
                          borderColor: "color-mix(in srgb, var(--surface-border) 50%, transparent)",
                          color: "var(--text-secondary)"
                        }}
                      >
                        <td className="px-5 py-4 font-mono">{row.topic}</td>
                        <td className="px-5 py-4 font-mono">{row.partition}</td>
                        <td className="px-5 py-4 font-mono">{row.currentOffset}</td>
                        <td className="px-5 py-4 font-mono">{row.logEndOffset}</td>
                        <td className="px-5 py-4 font-mono">{row.lag}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div
          className="rounded-[28px] border p-5"
          style={{ borderColor: "var(--surface-border)", background: "var(--surface-1)" }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--text-muted)" }}>
            Summary
          </p>
          <dl className="mt-4 space-y-4">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
                Group ID
              </dt>
              <dd className="mt-2 font-mono text-sm" style={{ color: "var(--text-primary)" }}>{group.groupId}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
                State
              </dt>
              <dd className="mt-2 text-sm" style={{ color: "var(--text-primary)" }}>{group.state}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
                Coordinator
              </dt>
              <dd className="mt-2 font-mono text-sm" style={{ color: "var(--text-primary)" }}>{group.coordinator}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
                Members
              </dt>
              <dd className="mt-2 font-mono text-sm" style={{ color: "var(--text-primary)" }}>{group.members.length}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
                Total Lag
              </dt>
              <dd className="mt-2 font-mono text-sm" style={{ color: "var(--text-primary)" }}>{totalLag}</dd>
            </div>
          </dl>
        </div>
      </div>
    </PageFrame>
  );
}
