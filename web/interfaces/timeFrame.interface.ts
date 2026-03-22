export interface PageFrameProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly children: React.ReactNode;
}

export interface ErrorStateProps {
  readonly title: string;
  readonly copy: string;
}

export interface EmptyStateProps {
  readonly title: string;
  readonly copy: string;
}

export interface StatCardProps {
  readonly label: string;
  readonly value: string;
  readonly hint: string;
}
