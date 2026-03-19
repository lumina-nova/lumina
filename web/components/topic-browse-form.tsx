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
  const initialTimestampFields = splitTimestampForInputs(selectedTimestamp);
  const [timeValue, setTimeValue] = useState(initialTimestampFields.time);
  const [dateValue, setDateValue] = useState(initialTimestampFields.date);
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const nextMode = String(formData.get("mode") || "latest");
    const partition = String(formData.get("partition") || selectedPartition);
    const limit = String(formData.get("limit") || selectedLimit);
    const offset = String(formData.get("offset") || "").trim();
    const timestampDate = String(formData.get("timestampDate") || "").trim();
    const timestampTime = String(formData.get("timestampTime") || "").trim();

    const params = new URLSearchParams({
      partition,
      limit
    });

    if (nextMode === "offset" && offset !== "") {
      setValidationError(null);
      params.set("offset", offset);
    } else if (nextMode === "timestamp" && timestampDate !== "") {
      const millis = parseLocalDateTimeToMillis(timestampDate, timestampTime);
      if (Number.isNaN(millis)) {
        setValidationError(
          "Enter time as 04:30 PM, 04:30:00 PM, 16:30, or 16:30:00."
        );
        return;
      }
      setValidationError(null);
      params.set("timestamp", String(millis));
    } else {
      setValidationError(null);
      params.set("position", nextMode === "earliest" ? "earliest" : "latest");
    }

    startTransition(() => {
      router.push(`${actionPath}?${params.toString()}`);
      router.refresh();
    });
  }

  return (
    <form className="grid w-full gap-3 md:grid-cols-6" onSubmit={handleSubmit}>
      <label className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
        Partition
        <select
          name="partition"
          defaultValue={String(selectedPartition)}
          className="mt-2 w-full rounded-2xl border px-3 py-2 text-sm"
          style={{ borderColor: "var(--surface-border)", background: "var(--surface-2)", color: "var(--text-primary)" }}
        >
          {partitions.map((partition) => (
            <option key={partition} value={partition}>
              {partition}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
        Start From
        <select
          name="mode"
          value={mode}
          onChange={(event) => {
            setValidationError(null);
            setMode(event.target.value as "latest" | "earliest" | "offset" | "timestamp");
          }}
          className="mt-2 w-full rounded-2xl border px-3 py-2 text-sm"
          style={{ borderColor: "var(--surface-border)", background: "var(--surface-2)", color: "var(--text-primary)" }}
        >
          <option value="latest">Latest</option>
          <option value="earliest">Earliest</option>
          <option value="offset">Offset</option>
          <option value="timestamp">Timestamp</option>
        </select>
      </label>
      <label className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
        Offset
        <input
          name="offset"
          type="number"
          min="0"
          defaultValue={selectedOffset ?? ""}
          disabled={mode !== "offset"}
          placeholder="Used for offset mode"
          className="mt-2 w-full rounded-2xl border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
          style={{ borderColor: "var(--surface-border)", background: "var(--surface-2)", color: "var(--text-primary)" }}
        />
      </label>
      <label className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
        Timestamp
        <input
          name="timestampDate"
          type="date"
          value={dateValue}
          onChange={(event) => {
            setValidationError(null);
            setDateValue(event.target.value);
          }}
          disabled={mode !== "timestamp"}
          className="mt-2 w-full rounded-2xl border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
          style={{ borderColor: "var(--surface-border)", background: "var(--surface-2)", color: "var(--text-primary)" }}
        />
      </label>
      <label className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
        Time
        <input
          name="timestampTime"
          type="text"
          value={timeValue}
          onChange={(event) => {
            setValidationError(null);
            setTimeValue(event.target.value);
          }}
          placeholder="04:30 PM or 16:30"
          disabled={mode !== "timestamp"}
          className="mt-2 w-full rounded-2xl border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
          style={{ borderColor: "var(--surface-border)", background: "var(--surface-2)", color: "var(--text-primary)" }}
        />
      </label>
      <label className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
        Limit
        <input
          name="limit"
          type="number"
          min="1"
          max="100"
          defaultValue={String(selectedLimit)}
          className="mt-2 w-full rounded-2xl border px-3 py-2 text-sm"
          style={{ borderColor: "var(--surface-border)", background: "var(--surface-2)", color: "var(--text-primary)" }}
        />
      </label>
      <button
        type="submit"
        className="rounded-2xl border px-4 py-2 text-sm font-semibold transition md:col-span-6"
        style={{ borderColor: "var(--accent-border)", background: "var(--accent-soft)", color: "var(--accent-contrast)" }}
      >
        Fetch Records
      </button>
      {validationError ? (
        <p className="text-sm text-rose-300 md:col-span-6">{validationError}</p>
      ) : null}
      <p className="text-xs leading-6 md:col-span-6" style={{ color: "var(--text-muted)" }}>
        Use <span className="font-semibold" style={{ color: "var(--text-secondary)" }}>Latest</span> for recent records,
        <span className="font-semibold" style={{ color: "var(--text-secondary)" }}> Earliest</span> for retained history,
        <span className="font-semibold" style={{ color: "var(--text-secondary)" }}> Offset</span> for exact navigation, or
        <span className="font-semibold" style={{ color: "var(--text-secondary)" }}> Timestamp</span> to jump to the first
        record at or after a local date and time. Time accepts both 12-hour and 24-hour formats.
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

function splitTimestampForInputs(timestamp: number | null) {
  if (timestamp === null) {
    return { date: "", time: "" };
  }

  const date = new Date(timestamp);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  const local = new Date(date.getTime() - timezoneOffset);
  const iso = local.toISOString();
  return {
    date: iso.slice(0, 10),
    time: iso.slice(11, 16)
  };
}

function parseLocalDateTimeToMillis(dateValue: string, timeValue: string) {
  const parsedTime = parseTimeParts(timeValue);
  if (!parsedTime) {
    return Number.NaN;
  }

  const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return Number.NaN;
  }

  const [, year, month, day] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    parsedTime.hour,
    parsedTime.minute,
    parsedTime.second
  ).getTime();
}

function parseTimeParts(value: string) {
  const normalized = value.trim();
  if (normalized === "") {
    return { hour: 0, minute: 0, second: 0 };
  }

  const twelveHourMatch = normalized.match(
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])$/
  );
  if (twelveHourMatch) {
    let hour = Number(twelveHourMatch[1]);
    const minute = Number(twelveHourMatch[2]);
    const second = Number(twelveHourMatch[3] || "0");
    const meridiem = twelveHourMatch[4].toUpperCase();

    if (hour < 1 || hour > 12 || minute > 59 || second > 59) {
      return null;
    }
    if (meridiem === "AM") {
      hour = hour === 12 ? 0 : hour;
    } else {
      hour = hour === 12 ? 12 : hour + 12;
    }

    return { hour, minute, second };
  }

  const twentyFourHourMatch = normalized.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!twentyFourHourMatch) {
    return null;
  }

  const hour = Number(twentyFourHourMatch[1]);
  const minute = Number(twentyFourHourMatch[2]);
  const second = Number(twentyFourHourMatch[3] || "0");

  if (hour > 23 || minute > 59 || second > 59) {
    return null;
  }

  return { hour, minute, second };
}
