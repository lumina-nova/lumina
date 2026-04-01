import { EmptyState, ErrorState, PageFrame, StatCard } from "@/components/layout/page-frame";
import { getBrokers } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function BrokersPage() {
  const result = await getBrokers()
    .then((brokers) => ({ brokers, error: null as string | null }))
    .catch((error: unknown) => ({
      brokers: null,
      error: error instanceof Error ? error.message : "Unknown error"
    }));

  if (result.error || !result.brokers) {
    return (
      <PageFrame
        eyebrow="Metadata View"
        title="Brokers"
        description="Live broker inventory from the connected cluster."
      >
        <ErrorState
          title="Failed to load brokers"
          copy={result.error ?? "Unknown error"}
        />
      </PageFrame>
    );
  }

  const brokers = result.brokers;
  const racks = new Set(
    brokers.map((broker) => broker.rack).filter((rack) => rack !== "")
  ).size;

  return (
    <PageFrame
      eyebrow="Metadata View"
      title="Brokers"
      description="Live broker inventory from the connected cluster. Use this view to confirm node IDs, host mappings, and rack metadata."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Broker Count"
          value={String(brokers.length)}
          hint="Backed by GET /api/brokers."
        />
        <StatCard
          label="Rack Count"
          value={String(racks)}
          hint="Unique rack values present in broker metadata."
        />
        <StatCard
          label="Unracked"
          value={String(brokers.filter((broker) => broker.rack === "").length)}
          hint="Brokers without rack annotations."
        />
      </div>

      {brokers.length === 0 ? (
        <EmptyState
          title="No brokers returned"
          copy="Kafka responded but did not return any broker metadata."
        />
      ) : (
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
                  <th className="px-5 py-4 font-semibold">ID</th>
                  <th className="px-5 py-4 font-semibold">Host</th>
                  <th className="px-5 py-4 font-semibold">Port</th>
                  <th className="px-5 py-4 font-semibold">Rack</th>
                </tr>
              </thead>
              <tbody>
                {brokers.map((broker) => (
                  <tr
                    key={broker.id}
                    className="border-t text-sm"
                    style={{
                      borderColor: "color-mix(in srgb, var(--surface-border) 50%, transparent)",
                      color: "var(--text-secondary)"
                    }}
                  >
                    <td className="px-5 py-4 font-mono">{broker.id}</td>
                    <td className="px-5 py-4 font-mono">{broker.host}</td>
                    <td className="px-5 py-4 font-mono">{broker.port}</td>
                    <td className="px-5 py-4">{broker.rack || "Unavailable"}</td>
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
