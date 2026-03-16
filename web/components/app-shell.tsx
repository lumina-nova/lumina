"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

export function AppShell({ healthLabel, children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(31,214,163,0.16),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(74,144,226,0.14),_transparent_22%),linear-gradient(180deg,_#08111f_0%,_#050b13_100%)] text-slate-100">
      <div className="grid min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-white/10 bg-slate-950/85 px-5 py-6 backdrop-blur lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-b-0 lg:px-6 lg:py-8">
          <div className="space-y-4">
            <span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300">
              LuminaKafka
            </span>

            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-white">
                Kafka inspection
              </h1>
              <p className="max-w-xs text-sm leading-6 text-slate-400">
                A dense operational console for brokers, topics, and consumer groups.
              </p>
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
                  className={[
                    "rounded-2xl border px-4 py-4 transition",
                    isActive
                      ? "border-emerald-300/20 bg-emerald-300/10 text-white"
                      : "border-transparent bg-white/[0.02] text-slate-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
                  ].join(" ")}
                >
                  <div className="text-sm font-semibold">{item.title}</div>
                  <div className="mt-1 text-sm leading-5 text-inherit/80">
                    {item.description}
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Phase 1
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Read-only metadata views first. Streaming comes after the HTTP contract is stable.
            </p>
          </div>
        </aside>

        <main className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <header className="mb-6 flex flex-col gap-4 rounded-[28px] border border-white/10 bg-slate-950/40 px-5 py-5 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Operational Console
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                Metadata-first UI foundation
              </h2>
            </div>

            <div className="inline-flex items-center gap-3 self-start rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-sm text-emerald-200">
              <span className="size-2 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.9)]" />
              {healthLabel}
            </div>
          </header>

          {children}
        </main>
      </div>
    </div>
  );
}
