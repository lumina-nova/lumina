"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";

import type { Topic } from "@/lib/types";
import { EmptyState } from "@/components/layout/page-frame";
import { TopicHealthBadge } from "@/features/topics/components/topic-health-badge";
import { getTopicHealth } from "@/features/topics/lib/topic-utils";

type TopicsTableProps = {
  readonly topics: Topic[] | null;
};

export function TopicsTable({ topics }: TopicsTableProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();

  const filteredTopics = normalizedQuery
    ? topics?.filter((topic) =>
        topic.name.toLowerCase().includes(normalizedQuery),
      )
    : topics;

  return (
    <div className="space-y-4">
      <div
        className="rounded-3xl border p-4"
        style={{
          borderColor: "var(--surface-border)",
          background: "var(--surface-1)",
        }}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <label className="block w-full md:max-w-md">
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.24em]"
              style={{ color: "var(--text-muted)" }}
            >
              Search Topics
            </span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by topic name"
              className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2"
              style={{
                borderColor: "var(--surface-border)",
                background: "var(--surface-2)",
                color: "var(--text-primary)",
                caretColor: "var(--accent)",
                boxShadow: "none",
              }}
            />
          </label>
          <p
            className="text-xs uppercase tracking-[0.18em]"
            style={{ color: "var(--text-muted)" }}
          >
            Showing {filteredTopics?.length} of {topics?.length}
          </p>
        </div>
      </div>

      {filteredTopics?.length === 0 ? (
        <EmptyState
          title="No topics match this search"
          copy="Try a different topic name or clear the current filter."
        />
      ) : (
        <div
          className="overflow-hidden rounded-[28px] border"
          style={{
            borderColor: "var(--surface-border)",
            background: "var(--surface-1)",
          }}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr
                  className="border-b text-left text-[11px] uppercase tracking-[0.24em]"
                  style={{
                    borderColor: "var(--surface-border)",
                    color: "var(--text-muted)",
                  }}
                >
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Topic</th>
                  <th className="px-5 py-4 font-semibold">Partitions</th>
                  <th className="px-5 py-4 font-semibold">Leaders</th>
                  <th className="px-5 py-4 font-semibold">ISR Slots</th>
                </tr>
              </thead>
              <tbody>
                {filteredTopics?.map((topic) => {
                  const health = getTopicHealth(topic);

                  return (
                    <tr
                      key={topic.name}
                      className="border-t text-sm"
                      style={{
                        borderColor:
                          "color-mix(in srgb, var(--surface-border) 50%, transparent)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <td className="px-5 py-4">
                        <div className="space-y-2">
                          <TopicHealthBadge status={health.status} compact />
                          {health.status !== "healthy" ? (
                            <div
                              className="text-xs leading-5"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {health.offlinePartitions > 0 ? (
                                <div>
                                  {health.offlinePartitions} offline partition
                                  {health.offlinePartitions === 1 ? "" : "s"}
                                </div>
                              ) : null}
                              {health.underReplicatedPartitions > 0 ? (
                                <div>
                                  {health.underReplicatedPartitions} under-replicated
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/topics/${encodeURIComponent(topic.name)}`}
                          className="font-mono transition"
                          style={{ color: "var(--accent)" }}
                        >
                          {topic.name}
                        </Link>
                      </td>
                      <td className="px-5 py-4 font-mono">
                        {topic.partitions.length}
                      </td>
                      <td className="px-5 py-4 font-mono">
                        {Array.from(
                          new Set(
                            topic.partitions.map((partition) => partition.leader),
                          ),
                        ).join(", ")}
                      </td>
                      <td className="px-5 py-4 font-mono">
                        {topic.partitions.reduce(
                          (sum, partition) => sum + partition.isr.length,
                          0,
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
