"use client";

import { startTransition, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type TopicBrowseFormProps = {
  actionPath: string;
  partitions: number[];
  selectedPartition: number;
  selectedPosition: "earliest" | "latest";
  selectedOffset: number | null;
  selectedTimestamp: number | null;
  selectedLimit: number;
};

export function TopicBrowseForm({
  actionPath,
  partitions,
  selectedPartition,
  selectedPosition,
  selectedOffset,
  selectedTimestamp,
  selectedLimit
}: TopicBrowseFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState(defaultModeForBrowseForm(selectedPosition, selectedOffset, selectedTimestamp));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const nextMode = String(formData.get("mode") || "latest");
    const partition = String(formData.get("partition") || selectedPartition);
    const limit = String(formData.get("limit") || selectedLimit);
    const offset = String(formData.get("offset") || "").trim();
    const timestamp = String(formData.get("timestamp") || "").trim();

    const params = new URLSearchParams({
      partition,
      limit
    });

    if (nextMode === "offset" && offset !== "") {
      params.set("offset", offset);
    } else if (nextMode === "timestamp" && timestamp !== "") {
      const millis = parseLocalDateTimeToMillis(timestamp);
      if (Number.isNaN(millis)) {
        return;
      }
      params.set("timestamp", String(millis));
    } else {
      params.set("position", nextMode === "earliest" ? "earliest" : "latest");
    }

    startTransition(() => {
      router.push(`${actionPath}?${params.toString()}`);
      router.refresh();
    });
  }

  return (
    <form className="grid w-full gap-3 md:grid-cols-5" onSubmit={handleSubmit}>
      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        Partition
        <select
          name="partition"
          defaultValue={String(selectedPartition)}
          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        >
          {partitions.map((partition) => (
            <option key={partition} value={partition}>
              {partition}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        Start From
        <select
          name="mode"
          value={mode}
          onChange={(event) =>
            setMode(event.target.value as "latest" | "earliest" | "offset" | "timestamp")
          }
          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        >
          <option value="latest">Latest</option>
          <option value="earliest">Earliest</option>
          <option value="offset">Offset</option>
          <option value="timestamp">Timestamp</option>
        </select>
      </label>
      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        Offset
        <input
          name="offset"
          type="number"
          min="0"
          defaultValue={selectedOffset ?? ""}
          disabled={mode !== "offset"}
          placeholder="Used for offset mode"
          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
        />
      </label>
      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        Timestamp
        <input
          name="timestamp"
          type="datetime-local"
          defaultValue={formatTimestampForInput(selectedTimestamp)}
          disabled={mode !== "timestamp"}
          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        />
      </label>
      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        Limit
        <input
          name="limit"
          type="number"
          min="1"
          max="100"
          defaultValue={String(selectedLimit)}
          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        />
      </label>
      <button
        type="submit"
        className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/15 md:col-span-5"
      >
        Fetch Records
      </button>
      <p className="text-xs leading-6 text-slate-500 md:col-span-5">
        Use <span className="font-semibold text-slate-300">Latest</span> for recent records,
        <span className="font-semibold text-slate-300"> Earliest</span> for retained history,
        <span className="font-semibold text-slate-300"> Offset</span> for exact navigation, or
        <span className="font-semibold text-slate-300"> Timestamp</span> to jump to the first
        record at or after a local date and time.
      </p>
    </form>
  );
}

function defaultModeForBrowseForm(
  selectedPosition: "earliest" | "latest",
  selectedOffset: number | null,
  selectedTimestamp: number | null
) {
  if (selectedOffset !== null) {
    return "offset";
  }
  if (selectedTimestamp !== null) {
    return "timestamp";
  }
  return selectedPosition;
}

function formatTimestampForInput(timestamp: number | null) {
  if (timestamp === null) {
    return "";
  }

  const date = new Date(timestamp);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  const local = new Date(date.getTime() - timezoneOffset);
  return local.toISOString().slice(0, 16);
}

function parseLocalDateTimeToMillis(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    return Number.NaN;
  }

  const [, year, month, day, hour, minute, second = "0"] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  ).getTime();
}
