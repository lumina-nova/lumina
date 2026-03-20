"use client";

import type { MessageHeader, MessagePayload } from "@/lib/types";

type MessageHeadersPreviewProps = {
  headers: MessageHeader[];
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
};

export function MessageHeadersPreview({
  headers,
  open,
  onToggle,
  onClose
}: MessageHeadersPreviewProps) {
  const previewKeys = headers.slice(0, 2).map((header) => header.key).join(", ");

  return (
    <>
      <div className="flex min-w-[12rem] items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
            {headers.length} {headers.length === 1 ? "header" : "headers"}
          </p>
          <p className="truncate text-xs text-slate-500">
            {previewKeys}
            {headers.length > 2 ? ", ..." : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="shrink-0 rounded-full border border-white/10 bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 transition hover:border-white/20 hover:bg-slate-900"
        >
          {open ? "Close" : "Inspect"}
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close header inspector"
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/70"
          />
          <aside className="absolute right-0 top-0 h-full w-full max-w-xl border-l border-white/10 bg-slate-950 shadow-2xl">
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Header Inspector
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-white">
                    {headers.length} {headers.length === 1 ? "header" : "headers"}
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Full header values without expanding the table row.
                  </p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <div className="space-y-3">
                  {headers.map((header, index) => (
                    <div
                      key={`${index}-${header.key}`}
                      className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3"
                    >
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        {header.key}
                      </p>
                      <div className="mt-2">{renderPayload(header.value)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function renderPayload(payload: MessagePayload) {
  const preview = payloadPreview(payload);
  const isBinary = payload.encoding === "base64";
  const isEmpty = payload.size === 0;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
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
      <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-3">
        <p className="whitespace-pre-wrap break-all font-mono text-xs leading-6 text-slate-100">
          {preview}
        </p>
      </div>
    </div>
  );
}

function payloadPreview(payload: MessagePayload) {
  if (payload.encoding === "base64") {
    return payload.base64 || "<binary>";
  }
  return payload.text ?? "<empty>";
}
