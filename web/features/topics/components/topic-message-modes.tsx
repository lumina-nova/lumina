"use client";

import { useState } from "react";

import { LocalDateTime } from "@/components/shared/local-date-time";
import { TopicBrowseForm } from "@/features/topics/components/topic-browse-form";
import { TopicLiveTail } from "@/features/topics/components/topic-live-tail";
import { TopicMessageRecordsView } from "@/features/topics/components/topic-message-records-view";
import {
  ErrorState,
  StatCard,
} from "@/components/layout/page-frame";
import type { TopicMessagesResponse } from "@/lib/types";

type TopicMessageModesProps = {
  baseTopicPath: string;
  partitions: number[];
  selectedPartition: number;
  selectedPosition: "earliest" | "latest";
  selectedOffset: number | null;
  selectedTimestamp: number | null;
  selectedLimit: number;
  browseError: string | null;
  browseMessages: TopicMessagesResponse | null;
  topicName: string;
};

export function TopicMessageModes({
  baseTopicPath,
  partitions,
  selectedPartition,
  selectedPosition,
  selectedOffset,
  selectedTimestamp,
  selectedLimit,
  browseError,
  browseMessages,
  topicName,
}: TopicMessageModesProps) {
  const [mode, setMode] = useState<"browse" | "live">("browse");

  return (
    <div
      className="rounded-[28px] border p-5"
      style={{
        borderColor: "var(--surface-border)",
        background: "var(--surface-1)",
      }}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Messages
          </h3>
          <p
            className="mt-2 max-w-3xl text-sm leading-6"
            style={{ color: "var(--text-muted)" }}
          >
            Browse a bounded slice of records or switch to live tail mode to
            watch new messages arrive on a partition.
          </p>
        </div>

        <div
          className="inline-flex rounded-[24px] border p-1"
          style={{
            borderColor: "var(--surface-border)",
            background: "var(--surface-2)",
          }}
        >
          <button
            type="button"
            onClick={() => setMode("browse")}
            className="rounded-[18px] px-4 py-2 text-sm font-semibold transition"
            style={{
              background: mode === "browse" ? "var(--surface-1)" : "transparent",
              color:
                mode === "browse" ? "var(--text-primary)" : "var(--text-muted)",
            }}
          >
            Browse Messages
          </button>
          <button
            type="button"
            onClick={() => setMode("live")}
            className="rounded-[18px] px-4 py-2 text-sm font-semibold transition"
            style={{
              background: mode === "live" ? "var(--surface-1)" : "transparent",
              color: mode === "live" ? "var(--text-primary)" : "var(--text-muted)",
            }}
          >
            Live Tail
          </button>
        </div>
      </div>

      <div className="mt-5">
        {mode === "browse" ? (
          <BrowseMessagesMode
            baseTopicPath={baseTopicPath}
            partitions={partitions}
            selectedPartition={selectedPartition}
            selectedPosition={selectedPosition}
            selectedOffset={selectedOffset}
            selectedTimestamp={selectedTimestamp}
            selectedLimit={selectedLimit}
            browseError={browseError}
            browseMessages={browseMessages}
          />
        ) : (
          <TopicLiveTail
            topicName={topicName}
            partitions={partitions}
            defaultPartition={selectedPartition}
          />
        )}
      </div>
    </div>
  );
}

type BrowseMessagesModeProps = Omit<TopicMessageModesProps, "topicName">;

function BrowseMessagesMode({
  baseTopicPath,
  partitions,
  selectedPartition,
  selectedPosition,
  selectedOffset,
  selectedTimestamp,
  selectedLimit,
  browseError,
  browseMessages,
}: BrowseMessagesModeProps) {
  return (
    <div className="space-y-5">
      <div
        className="rounded-3xl border p-4"
        style={{
          borderColor: "var(--surface-border)",
          background: "var(--surface-2)",
        }}
      >
        <TopicBrowseForm
          key={`${selectedPartition}:${selectedPosition}:${selectedOffset ?? "none"}:${selectedTimestamp ?? "none"}:${selectedLimit}`}
          actionPath={baseTopicPath}
          partitions={partitions}
          selectedPartition={selectedPartition}
          selectedPosition={selectedPosition}
          selectedOffset={selectedOffset}
          selectedTimestamp={selectedTimestamp}
          selectedLimit={selectedLimit}
        />
      </div>

      {browseError ? (
        <ErrorState
          title="Failed to load topic messages"
          copy={browseError}
        />
      ) : browseMessages ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard
              label="Partition"
              value={String(browseMessages.partition)}
              hint="Partition selected for browsing."
            />
            <StatCard
              label="Start Offset"
              value={String(browseMessages.resolvedStartOffset)}
              hint="Resolved fetch start after applying your browse mode."
            />
            <StatCard
              label="Next Offset"
              value={String(browseMessages.nextOffset)}
              hint="Use this offset to continue paging forward."
            />
            <StatCard
              label="High Watermark"
              value={String(browseMessages.highWatermark)}
              hint="Latest durable offset seen during this fetch."
            />
          </div>

          <div
            className="rounded-[24px] border px-4 py-3 text-sm"
            style={{
              borderColor: "var(--surface-border)",
              background: "var(--surface-2)",
              color: "var(--text-secondary)",
            }}
          >
            <span
              className="font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Browse Mode:
            </span>{" "}
            <span className="capitalize">{browseMessages.request.mode}</span>
            {typeof browseMessages.request.offset === "number" ? (
              <span className="ml-4" style={{ color: "var(--text-muted)" }}>
                Requested offset{" "}
                <span
                  className="font-mono"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {browseMessages.request.offset}
                </span>
              </span>
            ) : null}
            {typeof browseMessages.request.timestamp === "number" ? (
              <span className="ml-4" style={{ color: "var(--text-muted)" }}>
                Requested time{" "}
                <span
                  className="font-mono"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <LocalDateTime value={browseMessages.request.timestamp} />
                </span>
              </span>
            ) : null}
          </div>

          <TopicMessageRecordsView
            records={browseMessages.records}
            emptyTitle="No messages returned"
            emptyCopy="The request completed successfully, but no records were returned for this partition and offset window."
          />
        </div>
      ) : null}
    </div>
  );
}
