import Link from "next/link";

import { EmptyState, ErrorState, PageFrame, StatCard } from "@/components/page-frame";
import { getConsumerGroups } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ConsumerGroupsPage() {
  const result = await getConsumerGroups()
    .then((groups) => ({ groups, error: null as string | null }))
    .catch((error: unknown) => ({
      groups: null,
      error: error instanceof Error ? error.message : "Unknown error"
    }));

  if (result.error || !result.groups) {
    return (
      <PageFrame
        eyebrow="Operational View"
        title="Consumer Groups"
        description="Group-level metadata from Kafka."
      >
        <ErrorState
          title="Failed to load consumer groups"
          copy={result.error ?? "Unknown error"}
        />
      </PageFrame>
    );
  }

  const groups = result.groups;
  const stable = groups.filter((group) => group.state.toLowerCase() === "stable");
  const totalLag = groups.reduce((sum, group) => sum + group.lag, 0);
  const totalMembers = groups.reduce((sum, group) => sum + group.members, 0);

  return (
    <PageFrame
      eyebrow="Operational View"
      title="Consumer Groups"
      description="Group-level state, membership, and aggregate lag from Kafka. Open a group to inspect coordinator, member assignments, and lag per partition."
    >
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Groups"
          value={String(groups.length)}
          hint="Backed by GET /api/consumer-groups."
        />
        <StatCard
          label="Stable"
          value={String(stable.length)}
          hint="Groups currently reporting Stable state."
        />
        <StatCard
          label="Members"
          value={String(totalMembers)}
          hint="Total active members across returned groups."
        />
        <StatCard
          label="Lag"
          value={String(totalLag)}
          hint="Aggregate lag across all returned groups."
        />
      </div>

      {groups.length === 0 ? (
        <EmptyState
          title="No consumer groups returned"
          copy="Kafka responded but there are no visible consumer groups for this cluster."
        />
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/45">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  <th className="px-5 py-4 font-semibold">Group</th>
                  <th className="px-5 py-4 font-semibold">State</th>
                  <th className="px-5 py-4 font-semibold">Members</th>
                  <th className="px-5 py-4 font-semibold">Lag</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.groupId} className="border-t border-white/5 text-sm text-slate-200">
                    <td className="px-5 py-4">
                      <Link
                        href={`/consumer-groups/${encodeURIComponent(group.groupId)}`}
                        className="font-mono text-emerald-300 transition hover:text-emerald-200"
                      >
                        {group.groupId}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                          group.state.toLowerCase() === "stable"
                            ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
                            : "border-amber-300/20 bg-amber-300/10 text-amber-200"
                        }`}
                      >
                        {group.state}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono">{group.members}</td>
                    <td className="px-5 py-4 font-mono">{group.lag}</td>
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
