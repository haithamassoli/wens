import type { ReactNode } from "react";

interface ChipProps {
  pressed: boolean;
  onToggle: () => void;
  children: ReactNode;
  /** Optional colour identity (CSS colour). Tints the pressed state. */
  hue?: string;
}

/** Toggle filter chip. Parent owns the state; exposes aria-pressed. */
export function Chip({ pressed, onToggle, children, hue }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      style={hue && pressed ? { backgroundColor: hue, borderColor: hue } : undefined}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-chip border px-4 font-medium text-base leading-none transition-colors ${
        pressed
          ? "border-ink bg-ink text-ground"
          : "border-line bg-card text-ink hover:border-ink-faint"
      }`}
    >
      {children}
    </button>
  );
}

/** Static, non-interactive small label (meta on cards). */
export function Tag({ children, hue }: { children: ReactNode; hue?: string }) {
  return (
    <span
      className="inline-flex items-center rounded-chip border border-line bg-ground px-2.5 py-0.5 text-ink-soft text-sm leading-relaxed"
      style={hue ? { borderColor: `color-mix(in srgb, ${hue} 45%, white)` } : undefined}
    >
      {children}
    </span>
  );
}
