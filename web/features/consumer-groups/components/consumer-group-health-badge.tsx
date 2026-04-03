"use client";

import type {
  ConsumerGroupHealth,
  ConsumerGroupLagSeverity,
} from "@/features/consumer-groups/lib/consumer-group-utils";

type ConsumerGroupHealthBadgeProps = {
  health: ConsumerGroupHealth;
};

export function ConsumerGroupHealthBadge({
  health,
}: ConsumerGroupHealthBadgeProps) {
  if (health.isInactive) {
    return (
      <Badge
        label="Inactive"
        style={{
          borderColor: "rgba(148, 163, 184, 0.22)",
          background: "rgba(148, 163, 184, 0.1)",
          color: "var(--text-secondary)",
        }}
      />
    );
  }

  if (health.lagSeverity !== "healthy") {
    return (
      <Badge
        label={health.lagSeverity === "critical" ? "High Lag" : "Lag Watch"}
        style={getLagSeverityStyles(health.lagSeverity)}
      />
    );
  }

  if (health.isUnstable) {
    return (
      <Badge
        label="Unstable"
        style={{
          borderColor: "rgba(245, 158, 11, 0.24)",
          background: "rgba(245, 158, 11, 0.12)",
          color: "#fcd34d",
        }}
      />
    );
  }

  return (
    <Badge
      label="Healthy"
      style={{
        borderColor: "var(--accent-border)",
        background: "var(--accent-soft)",
        color: "var(--accent-contrast)",
      }}
    />
  );
}

function Badge({
  label,
  style,
}: {
  label: string;
  style: React.CSSProperties;
}) {
  return (
    <span
      className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]"
      style={style}
    >
      {label}
    </span>
  );
}

function getLagSeverityStyles(severity: ConsumerGroupLagSeverity) {
  if (severity === "critical") {
    return {
      borderColor: "rgba(239, 68, 68, 0.26)",
      background: "rgba(239, 68, 68, 0.12)",
      color: "#fecaca",
    };
  }

  return {
    borderColor: "rgba(245, 158, 11, 0.24)",
    background: "rgba(245, 158, 11, 0.12)",
    color: "#fcd34d",
  };
}
