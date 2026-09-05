"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/Button";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Num } from "@/components/Num";
import { ResultShell } from "@/components/play/ResultShell";
import type { Option } from "@/lib/content/types";
import type { MatchResult } from "@/lib/engine";
import type { GameMeta } from "@/lib/games";
import { Stats } from "./Setup";

/** The big card (S05): a line above about whose turn it is, the body, a favourite heart. */
export function PlayCard({
  headline,
  cardId,
  body,
  children,
}: {
  headline: string;
  cardId: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="font-semibold text-ink-soft" aria-live="polite">
        {headline}
      </p>
      <div
        key={cardId}
        className="card-in flex min-h-44 flex-col gap-4 rounded-card bg-card p-6 shadow-[var(--shadow-deck)]"
      >
        <p className="flex-1 font-display font-semibold text-2xl leading-snug">{body}</p>
        <div className="flex items-end justify-between gap-3">
          <div className="flex-1">{children}</div>
          <FavoriteButton kind="card" id={cardId} />
        </div>
      </div>
    </div>
  );
}

/**
 * Secret-choice input (G02/G03/G04): options as aria-pressed buttons, Lock disabled until a
 * choice exists, Skip always available (FR-CORE-04).
 */
export function ChoiceInput({
  headline,
  cardId,
  body,
  options,
  selected,
  hue,
  onSelect,
  onLock,
  onSkip,
}: {
  headline: string;
  cardId: string;
  body: string;
  options: readonly Option[];
  selected: string | null;
  hue: string;
  onSelect: (id: string) => void;
  onLock: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <PlayCard headline={headline} cardId={cardId} body={body} />
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">الخيارات</legend>
        {options.map((o) => {
          const on = o.id === selected;
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={on}
              onClick={() => onSelect(o.id)}
              style={
                on
                  ? { borderColor: hue, backgroundColor: `color-mix(in srgb, ${hue} 18%, white)` }
                  : undefined
              }
              className={`flex min-h-14 items-center justify-between gap-3 rounded-2xl border-2 px-5 py-3 text-start font-medium text-lg transition-[color,background-color,border-color,transform] duration-200 active:scale-[0.98] ${
                on ? "text-ink" : "border-line bg-card text-ink hover:border-ink-faint"
              }`}
            >
              <span>{o.label}</span>
              <span aria-hidden="true" className={on ? "font-bold" : "invisible"}>
                ✓
              </span>
            </button>
          );
        })}
      </fieldset>
      <div className="mt-auto flex flex-col gap-2">
        {selected === null ? (
          <p className="text-center text-ink-soft text-sm">
            {options.length === 2 ? "اختر أحد الخيارَين أولاً." : "اختر أحد الخيارات أولاً."}
          </p>
        ) : null}
        <Button fullWidth disabled={selected === null} onClick={onLock}>
          تثبيت الاختيار
        </Button>
        <Button variant="ghost" fullWidth onClick={onSkip}>
          تخطّي
        </Button>
        <p className="text-center text-ink-faint text-sm">لا بأس بالتخطّي.</p>
      </div>
    </div>
  );
}

/** Reveal: both picks by name, a text badge (never colour only), an optional extra line, Next. */
export function ChoiceReveal({
  cardId,
  body,
  picks,
  badge,
  extra,
  onNext,
}: {
  cardId: string;
  body: string;
  picks: { id: string; name: string; label: string }[];
  badge: { text: string; match: boolean };
  extra?: ReactNode;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <PlayCard headline="النتيجة" cardId={cardId} body={body} />
      <div className="flex flex-col gap-3 rounded-card bg-card p-5">
        <p
          role="status"
          aria-live="polite"
          className={`self-start rounded-chip border px-4 py-1.5 font-bold ${
            badge.match ? "border-mint bg-mint-soft text-ink" : "border-line bg-ground text-ink"
          }`}
        >
          {badge.text}
        </p>
        <dl className="flex flex-col gap-2">
          {picks.map((p) => (
            <div key={p.id} className="flex items-baseline justify-between gap-4">
              <dt className="text-ink-soft">{p.name}</dt>
              <dd className="text-end font-semibold">{p.label}</dd>
            </div>
          ))}
        </dl>
        {extra ? <div className="border-line border-t pt-3 text-ink-soft">{extra}</div> : null}
      </div>
      <Button fullWidth className="mt-auto" onClick={onNext}>
        التالي
      </Button>
    </div>
  );
}

/** G02/G03 results (DATA-06): rounds, matches, skipped; the percentage only when defined. */
export function MatchResults({
  game,
  result: r,
  onReplay,
}: {
  game: GameMeta;
  result: MatchResult;
  onReplay: () => void;
}) {
  return (
    <ResultShell
      game={game}
      title="انتهت الجلسة"
      note={r.rounds === 0 ? "لم تُكتمل أي جولة بعد." : undefined}
      onReplay={onReplay}
    >
      <Stats
        rows={[
          { label: "جولات مكتملة", value: <Num value={r.rounds} /> },
          { label: "تطابقات", value: <Num value={r.matches} /> },
          { label: "جولات متخطّاة", value: <Num value={r.skipped} /> },
        ]}
      />
      {r.matchPercent !== null ? (
        <p className="mt-4 text-ink-soft">
          تطابق الاختيارات في هذه الجلسة:{" "}
          <span className="font-bold font-display text-2xl text-ink">
            <Num value={`${r.matchPercent}%`} />
          </span>
        </p>
      ) : null}
    </ResultShell>
  );
}
