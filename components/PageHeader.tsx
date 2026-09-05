import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  lede?: ReactNode;
  /** Optional colour identity shown as a small dot beside the title. */
  hue?: string;
  children?: ReactNode; // actions row
}

export function PageHeader({ title, lede, hue, children }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {hue ? (
          <span
            aria-hidden="true"
            className="inline-block size-3.5 shrink-0 rounded-full"
            style={{ backgroundColor: hue }}
          />
        ) : null}
        <h1 className="font-bold font-display text-3xl text-ink">{title}</h1>
      </div>
      {lede ? <p className="text-ink-soft text-lg leading-relaxed">{lede}</p> : null}
      {children ? <div className="mt-2 flex flex-wrap gap-2">{children}</div> : null}
    </header>
  );
}
