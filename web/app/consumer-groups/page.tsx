import { EmptyState, ErrorState, PageFrame, StatCard } from "@/components/layout/page-frame";
import { ConsumerGroupsTable } from "@/features/consumer-groups/components/consumer-groups-table";
import { getConsumerGroupSummary } from "@/features/consumer-groups/lib/consumer-group-utils";
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
  const summary = getConsumerGroupSummary(groups);

  return (
    <PageFrame
      eyebrow="Operational View"
      title="Consumer Groups"
      description="Group-level state, membership, and aggregate lag from Kafka. Open a group to inspect coordinator, member assignments, and lag per partition."
    >
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Groups"
          value={String(groups.length)}
          hint="Backed by GET /api/consumer-groups."
        />
        <StatCard
          label="Stable"
          value={summary.stableGroups}
          hint="Groups currently reporting Stable state."
        />
        <StatCard
          label="Members"
          value={summary.totalMembers}
          hint="Total active members across returned groups."
        />
        <StatCard
          label="Lag"
          value={summary.totalLag}
          hint="Aggregate lag across all returned groups."
        />
        <StatCard
          label="Inactive"
          value={summary.inactiveGroups}
          hint="Groups with zero active members in the returned snapshot."
        />
        <StatCard
          label="Lag Watch"
          value={summary.highLagGroups}
          hint="Groups crossing warning or critical lag thresholds."
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
