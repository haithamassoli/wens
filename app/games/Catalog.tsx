"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { EmptyState } from "@/components/EmptyState";
import { GameCard } from "@/components/GameCard";
import { Num } from "@/components/Num";
import {
  countNoun,
  DURATIONS,
  EMPTY_FILTERS,
  filterGames,
  type GameFilters,
  hasActiveFilters,
  MINUTE_FORMS,
} from "@/lib/filters";
import { GAMES, MOOD_LABEL, type Mood } from "@/lib/games";

const MOODS = Object.keys(MOOD_LABEL) as Mood[];

export function Catalog() {
  const [filters, setFilters] = useState<GameFilters>(EMPTY_FILTERS);
  const shown = filterGames(GAMES, filters);
  const active = hasActiveFilters(filters);

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="الفلاتر" className="flex flex-col gap-3">
        <fieldset className="flex min-w-0 flex-wrap gap-2">
          <legend className="sr-only">المزاج</legend>
          {MOODS.map((m) => (
            <Chip
              key={m}
              pressed={filters.mood === m}
              onToggle={() => setFilters((f) => ({ ...f, mood: f.mood === m ? null : m }))}
            >
              {MOOD_LABEL[m]}
            </Chip>
          ))}
        </fieldset>
        <fieldset className="flex min-w-0 flex-wrap gap-2">
          <legend className="sr-only">الوقت</legend>
          {DURATIONS.map((d) => (
            <Chip
              key={d}
              pressed={filters.duration === d}
              onToggle={() => setFilters((f) => ({ ...f, duration: f.duration === d ? null : d }))}
            >
              <Num value={d} /> {countNoun(d, MINUTE_FORMS)}
            </Chip>
          ))}
        </fieldset>
        <fieldset className="flex min-w-0 flex-wrap items-center gap-2">
          <legend className="sr-only">المتطلبات</legend>
          <Chip
            pressed={filters.noTools}
            onToggle={() => setFilters((f) => ({ ...f, noTools: !f.noTools }))}
          >
            بدون أدوات
          </Chip>
          <Chip
            pressed={filters.noMovement}
            onToggle={() => setFilters((f) => ({ ...f, noMovement: !f.noMovement }))}
          >
            بدون حركة
          </Chip>
          {active ? (
            <Button variant="ghost" onClick={() => setFilters(EMPTY_FILTERS)}>
              مسح الفلاتر
            </Button>
          ) : null}
        </fieldset>
      </section>

      <p className="text-ink-soft text-sm" role="status">
        {shown.length === GAMES.length ? (
          <>
            كل الألعاب: <Num value={GAMES.length} />
          </>
        ) : (
          <>
            <Num value={shown.length} /> من <Num value={GAMES.length} />
          </>
        )}
      </p>

      {shown.length === 0 ? (
        <EmptyState
          title="لا توجد لعبة تطابق هذه الاختيارات"
          description="جرّبا تغيير أحد الفلاتر. معظم الألعاب لا تحتاج أدوات ولا حركة، والفلتران «بدون أدوات» و«بدون حركة» يخفيان أيضاً الألعاب التي قد تتضمّن ذلك في بعض بطاقاتها."
          action={
            <Button variant="secondary" onClick={() => setFilters(EMPTY_FILTERS)}>
              مسح الفلاتر
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {shown.map((g) => (
            <li key={g.id}>
              <GameCard game={g} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
