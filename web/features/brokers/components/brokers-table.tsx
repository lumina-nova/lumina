import { BrokerHealthBadge } from "@/features/brokers/components/broker-health-badge";
import { getBrokerMetadataHint } from "@/features/brokers/lib/broker-utils";
import type { Broker } from "@/lib/types";

type BrokersTableProps = {
  brokers: Broker[];
};

export function BrokersTable({ brokers }: BrokersTableProps) {
  return (
    <div
      className="overflow-hidden rounded-[28px] border"
      style={{ borderColor: "var(--surface-border)", background: "var(--surface-1)" }}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr
              className="border-b text-left text-[11px] uppercase tracking-[0.24em]"
              style={{ borderColor: "var(--surface-border)", color: "var(--text-muted)" }}
            >
              <th className="px-5 py-4 font-semibold">Status</th>
              <th className="px-5 py-4 font-semibold">ID</th>
              <th className="px-5 py-4 font-semibold">Host</th>
              <th className="px-5 py-4 font-semibold">Port</th>
              <th className="px-5 py-4 font-semibold">Rack</th>
              <th className="px-5 py-4 font-semibold">Hints</th>
            </tr>
          </thead>
          <tbody>
            {brokers.map((broker) => {
              const metadataHint = getBrokerMetadataHint(broker, brokers);

              return (
                <tr
                  key={broker.id}
                  className="border-t text-sm"
                  style={{
                    borderColor: "color-mix(in srgb, var(--surface-border) 50%, transparent)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <td className="px-5 py-4">
                    <BrokerHealthBadge status={metadataHint.status} />
                  </td>
                  <td className="px-5 py-4 font-mono">{broker.id}</td>
                  <td className="px-5 py-4 font-mono">
                    {broker.host || "Unavailable"}
                  </td>
                  <td className="px-5 py-4 font-mono">{broker.port}</td>
                  <td className="px-5 py-4">{broker.rack || "Unavailable"}</td>
                  <td className="px-5 py-4">
                    <div className="space-y-1 text-xs leading-5" style={{ color: "var(--text-muted)" }}>
                      {metadataHint.hints.map((hint) => (
                        <div key={`${broker.id}-${hint}`}>{hint}</div>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
