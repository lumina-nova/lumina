type PageFrameProps = {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly children: React.ReactNode;
};

type ErrorStateProps = {
  readonly title: string;
  readonly copy: string;
};

type EmptyStateProps = {
  readonly title: string;
  readonly copy: string;
};

type StatCardProps = {
  readonly label: string;
  readonly value: string;
  readonly hint: string;
};

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div
      className="rounded-3xl border p-5"
      style={{
        borderColor: "var(--surface-border)",
        background: "var(--surface-1)",
        boxShadow: "var(--shadow-elevated)",
      }}
    >
      <p
        className="text-[11px] font-semibold uppercase tracking-[0.24em]"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </p>
      <p
        className="mt-3 text-3xl font-semibold tracking-tight"
        style={{ color: "var(--text-primary)" }}
      >
        {value}
      </p>
      <p
        className="mt-2 text-sm leading-6"
        style={{ color: "var(--text-muted)" }}
      >
        {hint}
      </p>
    </div>
  );
}

export function EmptyState({ title, copy }: EmptyStateProps) {
  return (
    <div
      className="rounded-[28px] border border-dashed p-8"
      style={{
        borderColor: "var(--surface-border)",
        background: "var(--surface-1)",
      }}
    >
      <h3
        className="text-lg font-semibold"
        style={{ color: "var(--text-primary)" }}
      >
        {title}
      </h3>
      <p
        className="mt-3 text-sm leading-7"
        style={{ color: "var(--text-muted)" }}
      >
        {copy}
      </p>
    </div>
  );
}

export function ErrorState({ title, copy }: ErrorStateProps) {
  return (
    <div className="rounded-[28px] border border-rose-400/20 bg-rose-500/10 p-8">
      <h3 className="text-lg font-semibold text-rose-100">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-rose-100/80">{copy}</p>
    </div>
  );
}

export function PageFrame({
  eyebrow,
  title,
  description,
  children,
}: PageFrameProps) {
  return (
    <section className="space-y-6">
      <div
        className="rounded-[30px] border p-6"
        style={{
          borderColor: "var(--surface-border)",
          background: "var(--surface-1)",
          boxShadow: "var(--shadow-elevated)",
        }}
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.24em]"
          style={{ color: "var(--text-muted)" }}
        >
          {eyebrow}
        </p>
        <h1
          className="mt-3 text-4xl font-semibold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </h1>
        <p
          className="mt-4 max-w-3xl text-sm leading-7"
          style={{ color: "var(--text-muted)" }}
        >
          {description}
        </p>
      </div>

      {children}
    </section>
  );
}
