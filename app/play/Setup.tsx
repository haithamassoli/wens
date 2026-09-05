"use client";

import { type ReactNode, useState } from "react";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { Num } from "@/components/Num";
import { AliasFields } from "@/components/play/AliasFields";
import type { Aliases } from "@/lib/engine";
import { countNoun, ROUND_FORMS } from "@/lib/filters";
import type { GameMeta } from "@/lib/games";

/** Setup screen (S04): aliases, game-specific fields, real card count, temporary-answers note. */
export function SetupShell({
  game,
  available,
  requested,
  onStart,
  children,
}: {
  game: GameMeta;
  /** Matching published cards (FR-CORE-03). */
  available: number;
  /** Cards the settings ask for; a lower `available` is shown to the players. */
  requested: number;
  onStart: (aliases: Aliases) => void;
  children?: ReactNode;
}) {
  const [aliases, setAliases] = useState<Aliases>({ A: "", B: "" });
  return (
    <form
      className="flex flex-1 flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (available > 0) onStart(aliases);
      }}
    >
      <p className="text-ink-soft">{game.tagline}</p>
      <AliasFields value={aliases} onChange={setAliases} />
      {children}
      {available === 0 ? (
        <p role="status" className="text-danger">
          لا توجد بطاقات متاحة لهذه الإعدادات. جرّبا تغيير الاختيار.
        </p>
      ) : available < requested ? (
        <p role="status" className="text-ink-soft">
          متاح <Num value={available} /> بطاقات فقط.
        </p>
      ) : null}
      <div className="mt-auto flex flex-col gap-3">
        <p className="text-center text-ink-soft text-sm">إجابات الجولات مؤقّتة وتُمسح عند الخروج.</p>
        <Button type="submit" fullWidth disabled={available === 0}>
          ابدأ
        </Button>
      </div>
    </form>
  );
}

/** 5 / 10 round picker (S04). */
export function RoundsPicker({
  value,
  onChange,
  hue,
}: {
  value: 5 | 10;
  onChange: (v: 5 | 10) => void;
  hue: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 font-semibold">عدد الجولات</legend>
      <div className="flex gap-2">
        {([5, 10] as const).map((n) => (
          <Chip key={n} pressed={value === n} onToggle={() => onChange(n)} hue={hue}>
            <Num value={n} /> {countNoun(n, ROUND_FORMS)}
          </Chip>
        ))}
      </div>
    </fieldset>
  );
}

/** Instructions phase: the three steps from the catalogue, then «مستعدّان؟» → START. */
export function Instructions({ game, onStart }: { game: GameMeta; onStart: () => void }) {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <ol className="flex flex-col gap-3">
        {game.steps.map((step, i) => (
          <li key={step} className="flex items-start gap-3 rounded-card bg-card p-4">
            <span
              aria-hidden="true"
              className="grid size-8 shrink-0 place-items-center rounded-full font-bold text-white"
              style={{ backgroundColor: game.hue }}
            >
              <Num value={i + 1} />
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
      <Button fullWidth className="mt-auto" onClick={onStart}>
        مستعدّان؟
      </Button>
    </div>
  );
}

/** Aggregate results rows (S06). Never the answer sequence itself. */
export function Stats({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="flex flex-col divide-y divide-line">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-4 py-2.5">
          <dt className="text-ink-soft">{r.label}</dt>
          <dd className="font-semibold">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
