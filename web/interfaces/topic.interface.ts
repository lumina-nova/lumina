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

export interface TopicDetailPageProps {
  readonly params: Promise<{
    name: string;
  }>;
  readonly searchParams?: Promise<{
    partition?: string;
    position?: string;
    offset?: string;
    timestamp?: string;
    limit?: string;
  }>;
}

export type BrowsePosition = "earliest" | "latest";
