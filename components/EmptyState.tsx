import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-line border-dashed bg-card/60 px-6 py-10 text-center">
      {icon ? <div className="text-ink-faint">{icon}</div> : null}
      <h2 className="font-bold font-display text-ink text-xl">{title}</h2>
      {description ? <p className="max-w-prose text-ink-soft">{description}</p> : null}
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
