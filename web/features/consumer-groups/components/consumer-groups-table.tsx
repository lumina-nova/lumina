"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";

import { EmptyState } from "@/components/layout/page-frame";
import { ConsumerGroupHealthBadge } from "@/features/consumer-groups/components/consumer-group-health-badge";
import {
  getConsumerGroupHealth,
  sortConsumerGroupsByLag,
} from "@/features/consumer-groups/lib/consumer-group-utils";
import type { ConsumerGroup } from "@/lib/types";

type ConsumerGroupsTableProps = {
  groups: ConsumerGroup[];
};

export function ConsumerGroupsTable({ groups }: ConsumerGroupsTableProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();

  const filteredGroups = normalizedQuery
    ? groups.filter((group) => group.groupId.toLowerCase().includes(normalizedQuery))
    : groups;
  const sortedGroups = sortConsumerGroupsByLag(filteredGroups);

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border p-4" style={{ borderColor: "var(--surface-border)", background: "var(--surface-1)" }}>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <label className="block w-full md:max-w-md">
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--text-muted)" }}>
              Search Groups
            </span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by consumer group id"
              className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2"
              style={{
                borderColor: "var(--surface-border)",
                background: "var(--surface-2)",
                color: "var(--text-primary)",
                caretColor: "var(--accent)"
              }}
            />
          </label>
          <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
            Sorted by lag · showing {sortedGroups.length} of {groups.length}
          </p>
        </div>
      </div>

      {sortedGroups.length === 0 ? (
        <EmptyState
          title="No consumer groups match this search"
          copy="Try a different group id or clear the current filter."
        />
      ) : (
        <div className="overflow-hidden rounded-[28px] border" style={{ borderColor: "var(--surface-border)", background: "var(--surface-1)" }}>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b text-left text-[11px] uppercase tracking-[0.24em]" style={{ borderColor: "var(--surface-border)", color: "var(--text-muted)" }}>
                  <th className="px-5 py-4 font-semibold">Health</th>
                  <th className="px-5 py-4 font-semibold">Group</th>
                  <th className="px-5 py-4 font-semibold">State</th>
                  <th className="px-5 py-4 font-semibold">Members</th>
                  <th className="px-5 py-4 font-semibold">Lag</th>
                  <th className="px-5 py-4 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {sortedGroups.map((group) => {
                  const health = getConsumerGroupHealth(group);

                  return (
                    <tr key={group.groupId} className="border-t text-sm" style={{ borderColor: "color-mix(in srgb, var(--surface-border) 50%, transparent)", color: "var(--text-secondary)" }}>
                      <td className="px-5 py-4">
                        <ConsumerGroupHealthBadge health={health} />
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/consumer-groups/${encodeURIComponent(group.groupId)}`}
                          className="font-mono transition"
                          style={{ color: "var(--accent)" }}
                        >
                          {group.groupId}
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]"
                          style={
                            health.isStable
                              ? {
                                  borderColor: "var(--accent-border)",
                                  background: "var(--accent-soft)",
                                  color: "var(--accent-contrast)"
                                }
                              : {
                                  borderColor: "rgba(245, 158, 11, 0.24)",
                                  background: "rgba(245, 158, 11, 0.12)",
                                  color: "#fcd34d"
                                }
                          }
                        >
                          {group.state}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono">
                        <span
                          style={{
                            color: health.isInactive
                              ? "var(--text-muted)"
                              : "var(--text-primary)",
                          }}
                        >
                          {group.members}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono">
                        <span
                          style={{
                            color:
                              health.lagSeverity === "critical"
                                ? "#fecaca"
                                : health.lagSeverity === "warning"
                                  ? "#fcd34d"
                                  : "var(--text-primary)",
                          }}
                        >
                          {group.lag}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-1 text-xs leading-5" style={{ color: "var(--text-muted)" }}>
                          {health.isInactive ? <div>No active members</div> : null}
                          {health.isUnstable ? <div>State needs attention</div> : null}
                          {health.lagSeverity === "warning" ? <div>Lag above watch threshold</div> : null}
                          {health.lagSeverity === "critical" ? <div>Lag above critical threshold</div> : null}
                          {!health.isInactive &&
                          !health.isUnstable &&
                          health.lagSeverity === "healthy" ? (
                            <div>Healthy group state</div>
                          ) : null}
                        </div>
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
