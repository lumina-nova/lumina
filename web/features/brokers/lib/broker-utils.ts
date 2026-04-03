import type { Broker } from "@/lib/types";

export type BrokerHealthStatus = "healthy" | "warning" | "critical";

export type BrokerMetadataHint = {
  status: BrokerHealthStatus;
  hints: string[];
};

export type BrokerSummary = {
  brokerCount: string;
  rackCount: string;
  unrackedBrokers: string;
  metadataWarnings: string;
  duplicateEndpoints: string;
  invalidEndpoints: string;
};

export function getBrokerSummary(brokers: Broker[]): BrokerSummary {
  const rackCount = new Set(
    brokers.map((broker) => broker.rack.trim()).filter(Boolean),
  ).size;
  const duplicateEndpoints = getDuplicateEndpointCount(brokers);
  const invalidEndpoints = brokers.filter(hasInvalidEndpoint).length;
  const unrackedBrokers = brokers.filter((broker) => broker.rack.trim() === "").length;
  const metadataWarnings = brokers.filter(
    (broker) => getBrokerMetadataHint(broker, brokers).status !== "healthy",
  ).length;

  return {
    brokerCount: String(brokers.length),
    rackCount: String(rackCount),
    unrackedBrokers: String(unrackedBrokers),
    metadataWarnings: String(metadataWarnings),
    duplicateEndpoints: String(duplicateEndpoints),
    invalidEndpoints: String(invalidEndpoints),
  };
}

export function getBrokerMetadataHint(
  broker: Broker,
  brokers: Broker[],
): BrokerMetadataHint {
  const hints: string[] = [];

  if (broker.rack.trim() === "") {
    hints.push("Rack metadata missing");
  }

  if (hasInvalidEndpoint(broker)) {
    hints.push("Host or port looks invalid");
  }

  if (hasDuplicateEndpoint(broker, brokers)) {
    hints.push("Host:port duplicates another broker");
  }

  if (hints.some((hint) => hint.includes("invalid") || hint.includes("duplicates"))) {
    return { status: "critical", hints };
  }

  if (hints.length > 0) {
    return { status: "warning", hints };
  }

  return {
    status: "healthy",
    hints: ["Metadata looks consistent"],
  };
}

function hasInvalidEndpoint(broker: Broker) {
  return broker.host.trim() === "" || broker.port <= 0;
}

function hasDuplicateEndpoint(broker: Broker, brokers: Broker[]) {
  const endpoint = normalizeEndpoint(broker);
  return (
    brokers.filter((candidate) => normalizeEndpoint(candidate) === endpoint).length > 1
  );
}

function getDuplicateEndpointCount(brokers: Broker[]) {
  const endpointCounts = new Map<string, number>();

  brokers.forEach((broker) => {
    const endpoint = normalizeEndpoint(broker);
    endpointCounts.set(endpoint, (endpointCounts.get(endpoint) ?? 0) + 1);
  });

  return Array.from(endpointCounts.values()).filter((count) => count > 1).length;
}

function normalizeEndpoint(broker: Broker) {
  return `${broker.host.trim()}:${broker.port}`;
}
