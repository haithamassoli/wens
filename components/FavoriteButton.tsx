"use client";

import { useFavorites, useStorageAvailable } from "@/lib/storage";

interface FavoriteButtonProps {
  kind: "game" | "card";
  id: string;
  /** Show the text label beside the heart (details page). Icon-only otherwise. */
  withLabel?: boolean;
  className?: string;
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 20.5s-7.5-4.6-7.5-10A4.5 4.5 0 0 1 12 8a4.5 4.5 0 0 1 7.5 2.5c0 5.4-7.5 10-7.5 10Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FavoriteButton({
  kind,
  id,
  withLabel = false,
  className = "",
}: FavoriteButtonProps) {
  const { isGameFavorite, isCardFavorite, toggleGame, toggleCard } = useFavorites();
  const available = useStorageAvailable();
  const active = kind === "game" ? isGameFavorite(id) : isCardFavorite(id);
  const noun = kind === "game" ? "اللعبة" : "البطاقة";
  const label = active ? `أزل ${noun} من المفضّلة` : `أضف ${noun} إلى المفضّلة`;

  return (
    <span className={`inline-flex flex-col items-start gap-1 ${className}`}>
      <button
        type="button"
        aria-pressed={active}
        aria-label={withLabel ? undefined : label}
        onClick={() => (kind === "game" ? toggleGame(id) : toggleCard(id))}
        className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-chip border px-3 font-medium text-base transition-colors ${
          active
            ? "border-rose bg-rose/10 text-rose"
            : "border-line bg-card text-ink-soft hover:border-rose hover:text-rose"
        }`}
      >
        <Heart filled={active} />
        {withLabel ? <span>{active ? "في المفضّلة" : "أضف إلى المفضّلة"}</span> : null}
      </button>
      {available ? null : (
        <span role="status" className="text-ink-soft text-sm">
          الحفظ غير متاح على هذا المتصفح
        </span>
      )}
    </span>
  );
}
