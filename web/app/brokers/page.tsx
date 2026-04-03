import { EmptyState, ErrorState, PageFrame, StatCard } from "@/components/layout/page-frame";
import { BrokersTable } from "@/features/brokers/components/brokers-table";
import { getBrokerSummary } from "@/features/brokers/lib/broker-utils";
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
  const summary = getBrokerSummary(brokers);

  return (
    <PageFrame
      eyebrow="Metadata View"
      title="Brokers"
      description="Live broker inventory from the connected cluster. Use this view to confirm node IDs, host mappings, and rack metadata."
    >
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Broker Count"
          value={summary.brokerCount}
          hint="Backed by GET /api/brokers."
        />
        <StatCard
          label="Rack Count"
          value={summary.rackCount}
          hint="Unique rack values present in broker metadata."
        />
        <StatCard
          label="Unracked"
          value={summary.unrackedBrokers}
          hint="Brokers without rack annotations."
        />
        <StatCard
          label="Metadata Warnings"
          value={summary.metadataWarnings}
          hint="Brokers with missing rack data or endpoint consistency issues."
        />
        <StatCard
          label="Duplicate Endpoints"
          value={summary.duplicateEndpoints}
          hint="Host:port entries reused by more than one broker in metadata."
        />
        <StatCard
          label="Invalid Endpoints"
          value={summary.invalidEndpoints}
          hint="Broker rows with missing host values or non-positive ports."
        />
      </div>

      {(Number(summary.unrackedBrokers) > 0 ||
        Number(summary.duplicateEndpoints) > 0 ||
        Number(summary.invalidEndpoints) > 0) ? (
        <div
          className="rounded-[24px] border px-5 py-4"
          style={{
            borderColor: "rgba(245, 158, 11, 0.26)",
            background: "rgba(245, 158, 11, 0.08)",
          }}
        >
          <h3
            className="text-sm font-semibold uppercase tracking-[0.18em]"
            style={{ color: "#fcd34d" }}
          >
            Metadata Hints
          </h3>
          <div className="mt-3 space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            {Number(summary.unrackedBrokers) > 0 ? (
              <p>
                {summary.unrackedBrokers} broker
                {summary.unrackedBrokers === "1" ? "" : "s"} missing rack metadata.
              </p>
            ) : null}
            {Number(summary.duplicateEndpoints) > 0 ? (
              <p>
                {summary.duplicateEndpoints} duplicate host:port endpoint group
                {summary.duplicateEndpoints === "1" ? "" : "s"} found in broker metadata.
              </p>
            ) : null}
            {Number(summary.invalidEndpoints) > 0 ? (
              <p>
                {summary.invalidEndpoints} broker endpoint
                {summary.invalidEndpoints === "1" ? "" : "s"} look invalid and should be checked.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {brokers.length === 0 ? (
        <EmptyState
          title="No brokers returned"
          copy="Kafka responded but did not return any broker metadata."
        />
      ) : (
        <BrokersTable brokers={brokers} />
      )}
    </PageFrame>
  );
}
