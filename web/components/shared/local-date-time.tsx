"use client";

type LocalDateTimeProps = {
  value: number | string;
};

export function LocalDateTime({ value }: LocalDateTimeProps) {
  return <>{new Date(value).toLocaleString()}</>;
}
