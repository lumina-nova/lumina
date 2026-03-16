import {
  Broker,
  ConsumerGroup,
  ConsumerGroupDetail,
  HealthResponse,
  Topic
} from "@/lib/types";

type Envelope<T> = {
  data: T;
};

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: string;
  };
};

const apiBase = process.env.INTERNAL_API_BASE_URL || "http://127.0.0.1:9099";

async function fetchFromAPI<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    let details = `Request failed with status ${response.status}`;

    try {
      const payload = (await response.json()) as ApiErrorPayload;
      details = payload.error?.message || payload.error?.details || details;
    } catch {}

    throw new Error(details);
  }

  return response.json() as Promise<T>;
}

export async function getHealth() {
  return fetchFromAPI<HealthResponse>("/health");
}

export async function getBrokers() {
  const response = await fetchFromAPI<Envelope<Broker[]>>("/api/brokers");
  return response.data;
}

export async function getTopics() {
  const response = await fetchFromAPI<Envelope<Topic[]>>("/api/topics");
  return response.data;
}

export async function getTopic(name: string) {
  const response = await fetchFromAPI<Envelope<Topic>>(
    `/api/topics/${encodeURIComponent(name)}`
  );
  return response.data;
}

export async function getConsumerGroups() {
  const response = await fetchFromAPI<Envelope<ConsumerGroup[]>>(
    "/api/consumer-groups"
  );
  return response.data;
}

export async function getConsumerGroup(name: string) {
  const response = await fetchFromAPI<Envelope<ConsumerGroupDetail>>(
    `/api/consumer-groups/${encodeURIComponent(name)}`
  );
  return response.data;
}
