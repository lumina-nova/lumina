import { EmptyState, ErrorState, PageFrame, StatCard } from "@/components/page-frame";
import { ConsumerGroupsTable } from "@/components/consumer-groups-table";
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
        <ConsumerGroupsTable groups={groups} />
      )}
    </PageFrame>
  );
}
