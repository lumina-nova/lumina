"use client";

import { useState } from "react";

import { LocalDateTime } from "@/components/local-date-time";
import { MessageHeadersPreview } from "@/components/message-headers-preview";
import type { MessagePayload, TopicMessageRecord } from "@/lib/types";

type TopicMessagesTableProps = {
  records: TopicMessageRecord[];
};

export function TopicMessagesTable({ records }: TopicMessagesTableProps) {
  const [activeHeaderRecordId, setActiveHeaderRecordId] = useState<string | null>(null);

  return (
    <div
      className="overflow-hidden rounded-[24px] border"
      style={{ borderColor: "var(--surface-border)", background: "var(--surface-1)" }}
    >
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
          <thead>
            <tr
              className="border-b text-left text-[11px] uppercase tracking-[0.24em]"
              style={{ borderColor: "var(--surface-border)", color: "var(--text-muted)" }}
            >
              <th className="px-5 py-4 font-semibold">Offset</th>
              <th className="px-5 py-4 font-semibold">Timestamp</th>
              <th className="px-5 py-4 font-semibold">Key</th>
              <th className="px-5 py-4 font-semibold">Value</th>
              <th className="px-5 py-4 font-semibold">Headers</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => {
              const recordId = `${record.partition}-${record.offset}`;
              return (
                <tr
                  key={recordId}
                  className="border-t align-top text-sm"
                  style={{
                    borderColor: "color-mix(in srgb, var(--surface-border) 50%, transparent)",
                    color: "var(--text-secondary)"
                  }}
                >
                  <td className="px-5 py-4 font-mono">{record.offset}</td>
                  <td className="px-5 py-4 font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
                    <div className="space-y-1">
                      <div style={{ color: "var(--text-primary)" }}>
                        <LocalDateTime value={record.timestamp} />
                      </div>
                      <div style={{ color: "var(--text-muted)" }}>{record.timestamp}</div>
                    </div>
                  </td>
                  <td className="px-5 py-4">{renderPayload(record.key)}</td>
                  <td className="px-5 py-4">{renderPayload(record.value)}</td>
                  <td className="px-5 py-4">
                    {record.headers.length === 0 ? (
                      <span className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
                        None
                      </span>
                    ) : (
                      <MessageHeadersPreview
                        headers={record.headers}
                        open={activeHeaderRecordId === recordId}
                        onToggle={() =>
                          setActiveHeaderRecordId((current) =>
                            current === recordId ? null : recordId
                          )
                        }
                        onClose={() => setActiveHeaderRecordId(null)}
                      />
                    )}
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

function renderPayload(payload: MessagePayload) {
  const preview = payloadPreview(payload);
  const isBinary = payload.encoding === "base64";
  const isEmpty = payload.size === 0;

  return (
    <div className="max-w-[32rem] space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
        <span>{payload.encoding}</span>
        <span>{payload.size}b</span>
        {isEmpty ? (
          <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-slate-400">
            Empty
          </span>
        ) : null}
        {isBinary ? (
          <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-2 py-1 text-[10px] text-sky-100">
            Binary
          </span>
        ) : null}
        {payload.truncated ? (
          <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-[10px] text-amber-100">
            Truncated
          </span>
        ) : null}
      </div>
      <details
        className="group rounded-2xl border"
        style={{ borderColor: "var(--surface-border)", background: "var(--surface-2)" }}
      >
        <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] marker:content-none" style={{ color: "var(--text-muted)" }}>
          <span className="group-open:hidden">Show Payload</span>
          <span className="hidden group-open:inline">Hide Payload</span>
        </summary>
        <div className="border-t px-3 py-3" style={{ borderColor: "var(--surface-border)" }}>
          <p className="whitespace-pre-wrap break-all font-mono text-xs leading-6" style={{ color: "var(--text-primary)" }}>
            {preview}
          </p>
        </div>
      </details>
    </div>
  );
}

function payloadPreview(payload: MessagePayload) {
  if (payload.encoding === "base64") {
    return payload.base64 || "<binary>";
  }
  return payload.text ?? "<empty>";
}
