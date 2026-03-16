type StatCardProps = {
  label: string;
  value: string;
  hint: string;
};

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-slate-950/50 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{hint}</p>
    </div>
  );
}

type EmptyStateProps = {
  title: string;
  copy: string;
};

export function EmptyState({ title, copy }: EmptyStateProps) {
  return (
    <div className="rounded-[28px] border border-dashed border-white/10 bg-slate-950/35 p-8">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-400">{copy}</p>
    </div>
  );
}

type ErrorStateProps = {
  title: string;
  copy: string;
};

export function ErrorState({ title, copy }: ErrorStateProps) {
  return (
    <div className="rounded-[28px] border border-rose-400/20 bg-rose-500/10 p-8">
      <h3 className="text-lg font-semibold text-rose-100">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-rose-100/80">{copy}</p>
    </div>
  );
}

type PageFrameProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export function PageFrame({
  eyebrow,
  title,
  description,
  children
}: PageFrameProps) {
  return (
    <section className="space-y-6">
      <div className="rounded-[30px] border border-white/10 bg-slate-950/40 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
          {title}
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400">
          {description}
        </p>
      </div>

      {children}
    </section>
  );
}
