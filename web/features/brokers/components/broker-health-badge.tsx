"use client";

import type { BrokerHealthStatus } from "@/features/brokers/lib/broker-utils";

type BrokerHealthBadgeProps = {
  status: BrokerHealthStatus;
};

const brokerHealthLabel: Record<BrokerHealthStatus, string> = {
  healthy: "Metadata OK",
  warning: "Warning",
  critical: "Critical",
};

export function BrokerHealthBadge({ status }: BrokerHealthBadgeProps) {
  const tones = getBrokerHealthTones(status);

  return (
    <span
      className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]"
      style={tones}
    >
      {brokerHealthLabel[status]}
    </span>
  );
}

function getBrokerHealthTones(status: BrokerHealthStatus) {
  switch (status) {
    case "critical":
      return {
        borderColor: "rgba(239, 68, 68, 0.26)",
        background: "rgba(239, 68, 68, 0.12)",
        color: "#fecaca",
      };
    case "warning":
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
