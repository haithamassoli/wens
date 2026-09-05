"use client";

import { type ReactNode, useState } from "react";
import { Button } from "@/components/Button";
import { Num } from "@/components/Num";

/** Today in the device's own time zone as "YYYY-MM-DD" (G28 anniversaries, G29 opening dates). */
export function todayISO(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** `n` days after `iso`, same format. Used for the earliest opening date a letter may carry. */
export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return todayISO(d);
}

/** "٥ سبتمبر ٢٠٢٦" with the digits kept LTR (NFR-UX-01): day and year go through <Num>. */
export function DateText({ iso }: { iso: string }) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return <Num value={iso} />;
  return (
    <span>
      <Num value={d.getDate()} /> {d.toLocaleDateString("ar", { month: "long" })}{" "}
      <Num value={d.getFullYear()} />
    </span>
  );
}

export const INPUT_CLASS =
  "min-h-11 w-full rounded-xl border border-line bg-card px-4 text-base text-ink placeholder:text-ink-faint";

/** Labelled field with a live character counter (announced politely, never colour-only). */
export function Field({
  id,
  label,
  value,
  max,
  children,
}: {
  /** Must match the id of the control passed as `children`. */
  id: string;
  label: string;
  value?: string;
  max?: number;
  children: ReactNode;
}) {
  const over = value !== undefined && max !== undefined && value.length > max;
  return (
    <div className="flex flex-col gap-1 text-ink-soft text-sm">
      <label htmlFor={id} className="flex items-baseline justify-between gap-2">
        <span className="font-semibold text-ink">{label}</span>
        {value !== undefined && max !== undefined ? (
          <span className={over ? "font-semibold text-danger" : "text-ink-faint"}>
            <Num value={value.length} /> / <Num value={max} />
          </span>
        ) : null}
      </label>
      {children}
    </div>
  );
}

/**
 * Two-step delete: the first tap swaps the button for an explicit confirmation
 * (nothing the players saved is ever removed by a single tap).
 */
export function ConfirmDelete({
  question,
  onConfirm,
  label = "حذف",
}: {
  question: string;
  onConfirm: () => void;
  label?: string;
}) {
  const [asking, setAsking] = useState(false);

  if (!asking)
    return (
      <Button
        variant="ghost"
        className="!min-h-11 !px-3 text-danger text-sm"
        onClick={() => setAsking(true)}
      >
        {label}
      </Button>
    );

  return (
    <div role="alertdialog" aria-label={question} className="flex flex-col gap-2">
      <p className="text-ink-soft text-sm">{question}</p>
      <div className="flex gap-2">
        <Button
          variant="danger"
          className="!min-h-11 !px-4 text-sm"
          onClick={() => {
            setAsking(false);
            onConfirm();
          }}
        >
          نعم، احذف
        </Button>
        <Button
          variant="secondary"
          className="!min-h-11 !px-4 text-sm"
          autoFocus
          onClick={() => setAsking(false)}
        >
          تراجع
        </Button>
      </div>
    </div>
  );
}

/** Small text badge (never colour-only) for a saved item's state. */
export function StateBadge({ tone, children }: { tone: "quiet" | "open"; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-chip border px-2.5 py-0.5 text-sm leading-relaxed ${
        tone === "open"
          ? "border-line bg-mint-soft text-ink"
          : "border-line bg-ground text-ink-soft"
      }`}
    >
      {children}
    </span>
  );
}

/** Shared notice: everything these three games save stays on this device. */
export function PrivacyNote({ children }: { children: ReactNode }) {
  return <p className="text-ink-faint text-sm">{children}</p>;
}
