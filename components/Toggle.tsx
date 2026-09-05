"use client";

import { useId } from "react";

interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}

export function Toggle({ label, description, checked, onChange, disabled }: ToggleProps) {
  const id = useId();
  const descId = `${id}-desc`;
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex flex-col">
        <span id={id} className="font-medium text-ink">
          {label}
        </span>
        {description ? (
          <span id={descId} className="text-ink-soft text-sm leading-relaxed">
            {description}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        aria-describedby={description ? descId : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-chip border transition-colors before:absolute before:-inset-2 before:content-[""] disabled:opacity-50 ${
          checked ? "border-mint bg-mint" : "border-line bg-ground-deep"
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-0.5 size-6 rounded-full bg-white shadow-sm transition-[inset-inline-start] ${
            checked ? "start-[calc(100%-1.625rem)]" : "start-0.5"
          }`}
        />
      </button>
    </div>
  );
}
