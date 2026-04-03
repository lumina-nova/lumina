"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import logo from "@/img/logo-removebg-preview.png";

const navigation = [
  {
    href: "/topics",
    title: "Topics",
    description: "Partitions, leaders, ISR"
  },
  {
    href: "/brokers",
    title: "Brokers",
    description: "Cluster nodes and racks"
  },
  {
    href: "/consumer-groups",
    title: "Consumer Groups",
    description: "Lag, members, coordinator"
  }
];

type AppShellProps = {
  healthLabel: string;
  children: React.ReactNode;
};

const themes = [
  { id: "aurora", label: "Aurora" },
  { id: "daybreak", label: "Daybreak" },
  { id: "ember", label: "Ember" },
  { id: "glacier", label: "Glacier" }
] as const;

type ThemeId = (typeof themes)[number]["id"];

const themeStyles: Record<ThemeId, CSSProperties> = {
  aurora: {
    "--background": "#08111f",
    "--foreground": "#edf4ff",
    "--app-background":
      "radial-gradient(circle at top left, rgba(31, 214, 163, 0.16), transparent 24%), radial-gradient(circle at top right, rgba(74, 144, 226, 0.14), transparent 22%), linear-gradient(180deg, #08111f 0%, #050b13 100%)",
    "--surface-0": "rgba(5, 11, 19, 0.85)",
    "--surface-1": "rgba(9, 16, 29, 0.62)",
    "--surface-2": "rgba(10, 18, 30, 0.78)",
    "--surface-3": "rgba(255, 255, 255, 0.03)",
    "--surface-border": "rgba(255, 255, 255, 0.1)",
    "--surface-border-strong": "rgba(255, 255, 255, 0.16)",
    "--text-primary": "#f8fbff",
    "--text-secondary": "#d5e2f2",
    "--text-muted": "#8da0b8",
    "--accent": "#6ee7b7",
    "--accent-strong": "#1fd6a3",
    "--accent-soft": "rgba(110, 231, 183, 0.12)",
    "--accent-border": "rgba(110, 231, 183, 0.22)",
    "--accent-contrast": "#d8fff0",
    "--shadow-elevated": "0 24px 80px rgba(0, 0, 0, 0.28)"
  } as CSSProperties,
  daybreak: {
    "--background": "#eef4f8",
    "--foreground": "#10202f",
    "--app-background":
      "radial-gradient(circle at top left, rgba(71, 189, 159, 0.16), transparent 22%), radial-gradient(circle at top right, rgba(87, 141, 214, 0.16), transparent 24%), linear-gradient(180deg, #f6fafc 0%, #e7eef5 100%)",
    "--surface-0": "rgba(255, 255, 255, 0.84)",
    "--surface-1": "rgba(255, 255, 255, 0.68)",
    "--surface-2": "rgba(244, 248, 251, 0.95)",
    "--surface-3": "rgba(255, 255, 255, 0.62)",
    "--surface-border": "rgba(16, 32, 47, 0.12)",
    "--surface-border-strong": "rgba(16, 32, 47, 0.18)",
    "--text-primary": "#0f2233",
    "--text-secondary": "#28445d",
    "--text-muted": "#61788c",
    "--accent": "#0f9d7d",
    "--accent-strong": "#0b7e65",
    "--accent-soft": "rgba(15, 157, 125, 0.12)",
    "--accent-border": "rgba(15, 157, 125, 0.24)",
    "--accent-contrast": "#0b4337",
    "--shadow-elevated": "0 24px 80px rgba(30, 56, 85, 0.12)"
  } as CSSProperties,
  ember: {
    "--background": "#1a0f0c",
    "--foreground": "#fff2eb",
    "--app-background":
      "radial-gradient(circle at top left, rgba(255, 133, 82, 0.2), transparent 24%), radial-gradient(circle at top right, rgba(255, 193, 120, 0.14), transparent 22%), linear-gradient(180deg, #1a0f0c 0%, #100705 100%)",
    "--surface-0": "rgba(20, 9, 7, 0.88)",
    "--surface-1": "rgba(29, 15, 11, 0.66)",
    "--surface-2": "rgba(34, 17, 13, 0.82)",
    "--surface-3": "rgba(255, 244, 238, 0.04)",
    "--surface-border": "rgba(255, 224, 211, 0.12)",
    "--surface-border-strong": "rgba(255, 224, 211, 0.18)",
    "--text-primary": "#fff8f5",
    "--text-secondary": "#f0d7ca",
    "--text-muted": "#b89484",
    "--accent": "#ffb067",
    "--accent-strong": "#ff8552",
    "--accent-soft": "rgba(255, 176, 103, 0.12)",
    "--accent-border": "rgba(255, 176, 103, 0.24)",
    "--accent-contrast": "#fff2e3",
    "--shadow-elevated": "0 24px 80px rgba(0, 0, 0, 0.28)"
  } as CSSProperties,
  glacier: {
    "--background": "#06131c",
    "--foreground": "#eef9ff",
    "--app-background":
      "radial-gradient(circle at top left, rgba(94, 234, 212, 0.15), transparent 22%), radial-gradient(circle at top right, rgba(96, 165, 250, 0.18), transparent 24%), linear-gradient(180deg, #06131c 0%, #040b12 100%)",
    "--surface-0": "rgba(4, 12, 19, 0.86)",
    "--surface-1": "rgba(8, 22, 34, 0.62)",
    "--surface-2": "rgba(9, 26, 40, 0.8)",
    "--surface-3": "rgba(240, 249, 255, 0.03)",
    "--surface-border": "rgba(207, 250, 254, 0.11)",
    "--surface-border-strong": "rgba(207, 250, 254, 0.17)",
    "--text-primary": "#f2fbff",
    "--text-secondary": "#d4ecf6",
    "--text-muted": "#86aab8",
    "--accent": "#67e8f9",
    "--accent-strong": "#38bdf8",
    "--accent-soft": "rgba(103, 232, 249, 0.12)",
    "--accent-border": "rgba(103, 232, 249, 0.22)",
    "--accent-contrast": "#dffcff",
    "--shadow-elevated": "0 24px 80px rgba(0, 0, 0, 0.28)"
  } as CSSProperties
};

export function AppShell({ healthLabel, children }: AppShellProps) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<ThemeId>("aurora");

  function applyTheme(nextTheme: ThemeId) {
    document.documentElement.dataset.theme = nextTheme;
    document.body.dataset.theme = nextTheme;
    try {
      localStorage.setItem("lumina-theme", nextTheme);
    } catch {}
  }

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      try {
        const savedTheme = localStorage.getItem("lumina-theme");
        if (
          savedTheme === "aurora" ||
          savedTheme === "daybreak" ||
          savedTheme === "ember" ||
          savedTheme === "glacier"
        ) {
          setTheme(savedTheme);
          applyTheme(savedTheme);
          return;
        }
      } catch {}

      applyTheme(theme);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [theme]);

  return (
    <div
      className="min-h-screen"
      style={{
        ...themeStyles[theme],
        background: "var(--app-background)",
        color: "var(--text-primary)"
      }}
    >
      <div className="grid min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside
          className="border-b px-5 py-6 backdrop-blur lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-b-0 lg:px-6 lg:py-8"
          style={{
            borderColor: "var(--surface-border)",
            background: "var(--surface-0)"
          }}
        >
          <div className="space-y-4">
            <div
              className="rounded-[28px] border p-4"
              style={{
                borderColor: "var(--surface-border)",
                background: "var(--surface-3)"
              }}
            >
              <Image
                src={logo}
                alt="LuminaKafka"
                priority
                className="h-auto w-[120px]"
              />
              <div className="mt-3 space-y-1.5">
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.24em]"
                  style={{ color: "var(--accent)" }}
                >
                  Operational Console
                </p>
                <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
                  Inspect Kafka fast
                </h1>
                <p className="max-w-[11rem] text-xs leading-5" style={{ color: "var(--text-muted)" }}>
                  Topics, brokers, messages, and groups.
                </p>
              </div>
            </div>

          </div>

          <nav className="mt-8 grid gap-3" aria-label="Primary">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-2xl border px-4 py-4 transition"
                  style={{
                    borderColor: isActive ? "var(--accent-border)" : "transparent",
                    background: isActive ? "var(--accent-soft)" : "var(--surface-3)",
                    color: isActive ? "var(--text-primary)" : "var(--text-muted)"
                  }}
                >
                  <div className="text-sm font-semibold">{item.title}</div>
                  <div className="mt-1 text-sm leading-5 text-inherit/80">
                    {item.description}
                  </div>
                </Link>
              );
            })}
          </nav>

          <div
            className="mt-8 rounded-3xl border p-4"
            style={{
              borderColor: "var(--surface-border)",
              background: "var(--surface-3)"
            }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--text-muted)" }}>
              Phase 1
            </p>
            <p className="mt-3 text-sm leading-6" style={{ color: "var(--text-muted)" }}>
              Read-only metadata views first. Streaming comes after the HTTP contract is stable.
            </p>
          </div>
        </aside>

        <main className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <header
            className="mb-6 flex flex-col gap-4 rounded-[28px] border px-5 py-5 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6"
            style={{
              borderColor: "var(--surface-border)",
              background: "var(--surface-1)"
            }}
          >
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--text-muted)" }}>
                Operational Console
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
                Metadata-first UI foundation
              </h2>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div
                className="inline-flex items-center gap-3 self-start rounded-full border px-4 py-2 text-sm"
                style={{
                  borderColor: "var(--accent-border)",
                  background: "var(--accent-soft)",
                  color: "var(--accent-contrast)"
                }}
              >
                <span
                  className="size-2 rounded-full"
                  style={{
                    background: "var(--accent)",
                    boxShadow: "0 0 18px color-mix(in srgb, var(--accent) 90%, transparent)"
                  }}
                />
                {healthLabel}
              </div>
              <label className="inline-flex items-center gap-2  sm:self-auto">
                <span
                  className="text-[11px] font-semibold uppercase tracking-[0.24em]"
                  style={{ color: "var(--text-muted)" }}
                >
                  Theme
                </span>
                <div className="relative min-w-[10rem]">
                  <select
                    aria-label="Select theme"
                    value={theme}
                    onChange={(event) => {
                      const nextTheme = event.target.value as ThemeId;
                      applyTheme(nextTheme);
                      setTheme(nextTheme);
                    }}
                    className="w-full appearance-none rounded-full border px-3 py-2 pr-8 text-sm font-medium outline-none transition"
                    style={{
                      borderColor: "var(--surface-border)",
                      background: "var(--surface-3)",
                      color: "var(--text-primary)"
                    }}
                  >
                    {themes.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                </div>
              </label>
            </div>
          </header>

          {children}
        </main>
      </div>
    </div>
  );
}
