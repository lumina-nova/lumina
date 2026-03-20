"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";

import { EmptyState } from "@/components/page-frame";
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
            Showing {filteredGroups.length} of {groups.length}
          </p>
        </div>
      </div>

      {filteredGroups.length === 0 ? (
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
                  <th className="px-5 py-4 font-semibold">Group</th>
                  <th className="px-5 py-4 font-semibold">State</th>
                  <th className="px-5 py-4 font-semibold">Members</th>
                  <th className="px-5 py-4 font-semibold">Lag</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroups.map((group) => (
                  <tr key={group.groupId} className="border-t text-sm" style={{ borderColor: "color-mix(in srgb, var(--surface-border) 50%, transparent)", color: "var(--text-secondary)" }}>
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
                          group.state.toLowerCase() === "stable"
                            ? {
                                borderColor: "var(--accent-border)",
                                background: "var(--accent-soft)",
                                color: "var(--accent-contrast)"
                              }
                            : {
                                borderColor: "rgba(245, 158, 11, 0.24)",
                                background: "rgba(245, 158, 11, 0.12)",
                                color: "rgb(146, 64, 14)"
                              }
                        }
                      >
                        {group.state}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono">{group.members}</td>
                    <td className="px-5 py-4 font-mono">{group.lag}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
