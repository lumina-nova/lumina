"use client";

import { useEffect, useRef, useState } from "react";

import { TopicMessagesTable } from "@/components/topic-messages-table";
import { topicTailSocketURL } from "@/lib/live-tail";
import type { TailEvent, TopicMessageRecord } from "@/lib/types";

type TopicLiveTailProps = {
  topicName: string;
  partitions: number[];
  defaultPartition: number;
};

const maxLiveRecords = 200;

export function TopicLiveTail({
  topicName,
  partitions,
  defaultPartition,
}: TopicLiveTailProps) {
  const [selectedPartition, setSelectedPartition] = useState(defaultPartition);
  const [isLive, setIsLive] = useState(false);
  const [status, setStatus] = useState<"idle" | "connecting" | "live" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<TopicMessageRecord[]>([]);

  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!isLive) {
      socketRef.current?.close();
      socketRef.current = null;
      return;
    }

    const socket = new WebSocket(topicTailSocketURL(topicName, selectedPartition));

    socketRef.current = socket;

    socket.onopen = () => {
      setStatus("live");
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as TailEvent;
        if (payload.type === "record" && payload.record) {
          const record = payload.record;
          setRecords((current) => {
            const next = [...current, record];
            if (next.length <= maxLiveRecords) {
              return next;
            }
            return next.slice(next.length - maxLiveRecords);
          });
          return;
        }

        if (payload.type === "error") {
          setStatus("error");
          setError(payload.message || "Live tail failed.");
        }
      } catch {
        setStatus("error");
        setError("Received an invalid live tail event.");
      }
    };

    socket.onerror = () => {
      setStatus("error");
      setError("Failed to connect to the live tail socket.");
    };

    socket.onclose = () => {
      socketRef.current = null;
      setIsLive(false);
      setStatus((current) => (current === "error" ? current : "idle"));
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [isLive, selectedPartition, topicName]);

  return (
    <div
      className="rounded-[28px] border p-5"
      style={{
        borderColor: "var(--surface-border)",
        background: "var(--surface-1)",
      }}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
          <h3
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Live Tail
          </h3>
          <p
            className="mt-2 max-w-3xl text-sm leading-6"
            style={{ color: "var(--text-muted)" }}
          >
            Stream new records from one partition starting at the latest offset.
            This first version is intentionally simple and only shows new
            records after the socket connects.
          </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="min-w-[11rem] space-y-2">
              <span
                className="block text-[11px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: "var(--text-muted)" }}
              >
                Partition
              </span>
              <select
                value={String(selectedPartition)}
                onChange={(event) => {
                  setSelectedPartition(Number(event.target.value));
                  setRecords([]);
                  setError(null);
                }}
                disabled={isLive}
                className="h-[42px] w-full rounded-2xl border px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  borderColor: "var(--surface-border)",
                  background: "var(--surface-2)",
                  color: "var(--text-primary)",
                }}
              >
                {partitions.map((partition) => (
                  <option key={partition} value={partition}>
                    Partition {partition}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => {
                setRecords([]);
                setError(null);
                setIsLive((current) => {
                  const next = !current;
                  if (next) {
                    setStatus("connecting");
                    setError(null);
                  }
                  if (!next) {
                    setStatus("idle");
                  }
                  return next;
                });
              }}
              className="h-[42px] rounded-2xl border px-4 text-sm font-semibold transition self-end"
              style={{
                borderColor: isLive ? "var(--surface-border)" : "var(--accent-border)",
                background: isLive ? "var(--surface-2)" : "var(--accent-soft)",
                color: isLive ? "var(--text-primary)" : "var(--accent-contrast)",
              }}
            >
              {isLive ? "Stop Stream" : "Start Live Tail"}
            </button>

            <button
              type="button"
              onClick={() => {
                setRecords([]);
                setError(null);
              }}
              className="h-[42px] rounded-2xl border px-4 text-sm font-semibold transition self-end"
              style={{
                borderColor: "var(--surface-border)",
                background: "transparent",
                color: "var(--text-primary)",
              }}
            >
              Clear Buffer
            </button>
          </div>
        </div>

        <div
          className="flex flex-wrap items-center gap-3 rounded-[22px] border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--surface-border)",
            background: "var(--surface-2)",
          }}
        >
          <span
            className="rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]"
            style={{
              borderColor:
                status === "live"
                  ? "var(--accent-border)"
                  : status === "error"
                    ? "color-mix(in srgb, #f87171 35%, var(--surface-border))"
                    : "var(--surface-border)",
              background:
                status === "live"
                  ? "var(--accent-soft)"
                  : status === "error"
                    ? "color-mix(in srgb, #f87171 10%, var(--surface-2))"
                    : "var(--surface-1)",
              color:
                status === "live"
                  ? "var(--accent-contrast)"
                  : "var(--text-primary)",
            }}
          >
            {status}
          </span>
          <span style={{ color: "var(--text-muted)" }}>Partition</span>
          <span
            className="font-mono text-sm"
            style={{ color: "var(--text-primary)" }}
          >
            {selectedPartition}
          </span>
          <span style={{ color: "var(--text-muted)" }}>Buffered</span>
          <span
            className="font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {records.length}
          </span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Keeps the last {maxLiveRecords} records in memory.
          </span>
        </div>
      </div>

      {error ? (
        <div
          className="mt-4 rounded-2xl border px-4 py-3 text-sm"
          style={{
            borderColor: "color-mix(in srgb, #f87171 35%, var(--surface-border))",
            background: "color-mix(in srgb, #f87171 10%, var(--surface-2))",
            color: "var(--text-primary)",
          }}
        >
          {error}
        </div>
      ) : null}

      <div className="mt-5">
        {records.length === 0 ? (
          <div
            className="rounded-[24px] border px-5 py-6"
            style={{
              borderColor: "var(--surface-border)",
              background: "var(--surface-2)",
            }}
          >
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {isLive ? "Waiting for new records" : "Live tail is stopped"}
            </p>
            <p
              className="mt-2 text-sm leading-6"
              style={{ color: "var(--text-muted)" }}
            >
              {isLive
                ? `The socket is connected. New records from partition ${selectedPartition} will appear here as they arrive.`
                : "Start live tail to open a socket and stream new records from the selected partition."}
            </p>
          </div>
        ) : (
          <TopicMessagesTable records={records} />
        )}
      </div>
    </div>
  );
}
