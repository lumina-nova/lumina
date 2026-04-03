import type { ConsumerGroup } from "@/lib/types";

export type ConsumerGroupLagSeverity = "healthy" | "warning" | "critical";

export type ConsumerGroupHealth = {
  lagSeverity: ConsumerGroupLagSeverity;
  isStable: boolean;
  isInactive: boolean;
  isUnstable: boolean;
};

export type ConsumerGroupSummary = {
  totalLag: string;
  totalMembers: string;
  stableGroups: string;
  unstableGroups: string;
  inactiveGroups: string;
  highLagGroups: string;
};

const warningLagThreshold = 1_000;
const criticalLagThreshold = 10_000;

export function getConsumerGroupHealth(group: ConsumerGroup): ConsumerGroupHealth {
  const isStable = group.state.trim().toLowerCase() === "stable";
  const isInactive = group.members === 0;
  const lagSeverity = getConsumerGroupLagSeverity(group.lag);

  return {
    lagSeverity,
    isStable,
    isInactive,
    isUnstable: !isStable,
  };
}

export function getConsumerGroupLagSeverity(
  lag: number,
): ConsumerGroupLagSeverity {
  if (lag >= criticalLagThreshold) {
    return "critical";
  }
  if (lag >= warningLagThreshold) {
    return "warning";
  }
  return "healthy";
}

export function getConsumerGroupSummary(
  groups: ConsumerGroup[],
): ConsumerGroupSummary {
  const health = groups.map(getConsumerGroupHealth);

  return {
    totalLag: String(groups.reduce((sum, group) => sum + group.lag, 0)),
    totalMembers: String(groups.reduce((sum, group) => sum + group.members, 0)),
    stableGroups: String(health.filter((group) => group.isStable).length),
    unstableGroups: String(health.filter((group) => group.isUnstable).length),
    inactiveGroups: String(health.filter((group) => group.isInactive).length),
    highLagGroups: String(
      health.filter((group) => group.lagSeverity !== "healthy").length,
    ),
  };
}

export function sortConsumerGroupsByLag(groups: ConsumerGroup[]) {
  return [...groups].sort((left, right) => {
    if (right.lag !== left.lag) {
      return right.lag - left.lag;
    }

    if (left.members !== right.members) {
      return left.members - right.members;
    }

    return left.groupId.localeCompare(right.groupId);
  });
}
