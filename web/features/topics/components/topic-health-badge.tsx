"use client";

import type { PartitionHealthStatus } from "@/features/topics/lib/topic.types";

type TopicHealthBadgeProps = {
  status: PartitionHealthStatus;
  compact?: boolean;
};

const topicHealthBadgeCopy: Record<PartitionHealthStatus, string> = {
  healthy: "Healthy",
  "under-replicated": "Under-Replicated",
  offline: "Offline",
};

export function TopicHealthBadge({
  status,
  compact = false,
}: TopicHealthBadgeProps) {
  const tones = getTopicHealthTones(status);

  return (
    <span
      className={`inline-flex rounded-full border font-semibold uppercase tracking-[0.16em] ${
        compact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1 text-xs"
      }`}
      style={tones}
    >
      {topicHealthBadgeCopy[status]}
    </span>
  );
}

function getTopicHealthTones(status: PartitionHealthStatus) {
  switch (status) {
    case "offline":
      return {
        borderColor: "rgba(239, 68, 68, 0.26)",
        background: "rgba(239, 68, 68, 0.12)",
        color: "#fecaca",
      };
    case "under-replicated":
      return {
        borderColor: "rgba(245, 158, 11, 0.26)",
        background: "rgba(245, 158, 11, 0.12)",
        color: "#fcd34d",
      };
    default:
      return {
        borderColor: "var(--accent-border)",
        background: "var(--accent-soft)",
        color: "var(--accent-contrast)",
      };
  }
}
