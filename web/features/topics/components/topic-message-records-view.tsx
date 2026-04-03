"use client";

import { type RefObject, useMemo, useState } from "react";

import { EmptyState } from "@/components/layout/page-frame";
import { TopicMessagesTable } from "@/features/topics/components/topic-messages-table";
import type { TopicMessageRecord } from "@/lib/types";

type TopicMessageRecordsViewProps = {
  records: TopicMessageRecord[];
  emptyTitle: string;
  emptyCopy: string;
  tableViewportRef?: RefObject<HTMLDivElement | null>;
  tableViewportClassName?: string;
};

export function TopicMessageRecordsView({
  records,
  emptyTitle,
  emptyCopy,
  tableViewportRef,
  tableViewportClassName,
}: TopicMessageRecordsViewProps) {
  const [keyFilter, setKeyFilter] = useState("");
  const [valueFilter, setValueFilter] = useState("");

  const filteredRecords = useMemo(() => {
    const normalizedKeyFilter = keyFilter.trim().toLowerCase();
    const normalizedValueFilter = valueFilter.trim().toLowerCase();

    if (!normalizedKeyFilter && !normalizedValueFilter) {
      return records;
    }

    return records.filter((record) => {
      const keyPreview = payloadSearchText(record.key);
      const valuePreview = payloadSearchText(record.value);

      const keyMatches = normalizedKeyFilter
        ? keyPreview.includes(normalizedKeyFilter)
        : true;
      const valueMatches = normalizedValueFilter
        ? valuePreview.includes(normalizedValueFilter)
        : true;

      return keyMatches && valueMatches;
    });
  }, [keyFilter, records, valueFilter]);

  const hasFilters = keyFilter.trim().length > 0 || valueFilter.trim().length > 0;

  return (
    <div className="space-y-4">
      <div
        className="rounded-[24px] border p-4"
        style={{
          borderColor: "var(--surface-border)",
          background: "var(--surface-2)",
        }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: "var(--text-muted)" }}
            >
              Filters
            </p>
            <p
              className="mt-2 text-sm leading-6"
              style={{ color: "var(--text-secondary)" }}
            >
              Narrow records by key or value text without re-running the fetch.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span style={{ color: "var(--text-muted)" }}>Showing</span>
            <span
              className="font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {filteredRecords.length}
            </span>
            <span style={{ color: "var(--text-muted)" }}>of</span>
            <span
              className="font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {records.length}
            </span>
            <span style={{ color: "var(--text-muted)" }}>records</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <label className="space-y-2">
            <span
              className="block text-[11px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: "var(--text-muted)" }}
            >
              Key Contains
            </span>
            <input
              type="text"
              value={keyFilter}
              onChange={(event) => setKeyFilter(event.target.value)}
              placeholder="payment-42"
              className="h-[42px] w-full rounded-2xl border px-3 text-sm outline-none transition"
              style={{
                borderColor: "var(--surface-border)",
                background: "var(--surface-1)",
                color: "var(--text-primary)",
              }}
            />
          </label>

          <label className="space-y-2">
            <span
              className="block text-[11px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: "var(--text-muted)" }}
            >
              Value Contains
            </span>
            <input
              type="text"
              value={valueFilter}
              onChange={(event) => setValueFilter(event.target.value)}
              placeholder="error"
              className="h-[42px] w-full rounded-2xl border px-3 text-sm outline-none transition"
              style={{
                borderColor: "var(--surface-border)",
                background: "var(--surface-1)",
                color: "var(--text-primary)",
              }}
            />
          </label>

          <button
            type="button"
            onClick={() => {
              setKeyFilter("");
              setValueFilter("");
            }}
            disabled={!hasFilters}
            className="h-[42px] self-end rounded-2xl border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              borderColor: "var(--surface-border)",
              background: "transparent",
              color: "var(--text-primary)",
            }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div ref={tableViewportRef} className={tableViewportClassName}>
        {filteredRecords.length === 0 ? (
          <EmptyState
            title={hasFilters ? "No matching records" : emptyTitle}
            copy={
              hasFilters
                ? "No records matched the current key/value filters. Adjust or clear them to inspect the full result set."
                : emptyCopy
            }
          />
        ) : (
          <TopicMessagesTable records={filteredRecords} />
        )}
      </div>
    </div>
  );
}

function payloadSearchText(payload: TopicMessageRecord["value"]) {
  if (payload.encoding === "base64") {
    return (payload.base64 || "").toLowerCase();
  }

  return (payload.text || "").toLowerCase();
}
