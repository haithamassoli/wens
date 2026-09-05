"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { EmptyState } from "@/components/EmptyState";
import { GameCard } from "@/components/GameCard";
import { Logo } from "@/components/Logo";
import { Num } from "@/components/Num";
import {
  countNoun,
  DURATIONS,
  type Duration,
  EMPTY_FILTERS,
  filterGames,
  type GameFilters,
  hasActiveFilters,
  MINUTE_FORMS,
  pickRandom,
  visibleGames,
} from "@/lib/filters";
import { GAMES, MOOD_LABEL, type Mood } from "@/lib/games";
import { useSettings } from "@/lib/storage";

const MOODS = Object.keys(MOOD_LABEL) as Mood[];

function DeckHero() {
  return (
    <section aria-labelledby="home-title" className="relative mx-auto mt-2 w-full max-w-sm px-3">
      <div
        aria-hidden="true"
        className="deck-card absolute inset-x-4 top-2 bottom-2 rounded-card border border-line bg-ground-deep"
        style={{ "--deck-rotate": "-6deg" } as React.CSSProperties}
      />
      <div
        aria-hidden="true"
        className="deck-card absolute inset-x-4 top-2 bottom-2 rounded-card border border-line bg-card"
        style={{ "--deck-rotate": "6deg" } as React.CSSProperties}
      />
      <div className="deck-card relative flex min-h-56 flex-col items-center justify-center gap-3 rounded-card border border-line bg-card px-6 py-8 text-center shadow-deck">
        <span aria-hidden="true" className="absolute end-4 top-4 size-3 rounded-full bg-marigold" />
        <Logo size={64} animate />
        <h1 id="home-title" className="font-bold font-display text-3xl text-ink leading-tight">
          ماذا تحبّان أن تفعلا اليوم؟
        </h1>
        <p className="text-ink-soft">ألعاب قصيرة لكما، على هاتف واحد.</p>
      </div>
    </section>
  );
}

export function HomeScreen() {
  const router = useRouter();
  const [filters, setFilters] = useState<GameFilters>(EMPTY_FILTERS);
  const { settings } = useSettings();
  const all = visibleGames(GAMES, settings.showReligious);
  const shown = filterGames(all, filters);

  const surprise = () => {
    const pool = shown.length > 0 ? shown : all;
    const game = pickRandom(pool);
    if (game) router.push(`/games/${game.slug}`);
  };

  return (
    <div className="flex flex-col gap-8">
      <DeckHero />

      <div className="rise flex flex-col gap-3" style={{ "--d": "120ms" } as React.CSSProperties}>
        <Button onClick={surprise} fullWidth className="text-lg">
          فاجئنا
        </Button>
        <p className="text-center text-ink-soft text-sm">
          لا يحتاج التطبيق إلى حساب، والإجابات لا تخرج من الهاتف.
        </p>
      </div>

      <section
        aria-labelledby="mood-title"
        className="rise flex flex-col gap-2"
        style={{ "--d": "200ms" } as React.CSSProperties}
      >
        <h2 id="mood-title" className="font-display font-semibold text-ink text-lg">
          ما مزاجكما؟
        </h2>
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <Chip
              key={m}
              pressed={filters.mood === m}
              onToggle={() => setFilters((f) => ({ ...f, mood: f.mood === m ? null : m }))}
            >
              {MOOD_LABEL[m]}
            </Chip>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="time-title"
        className="rise flex flex-col gap-2"
        style={{ "--d": "260ms" } as React.CSSProperties}
      >
        <h2 id="time-title" className="font-display font-semibold text-ink text-lg">
          كم لديكما من الوقت؟
        </h2>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((d: Duration) => (
            <Chip
              key={d}
              pressed={filters.duration === d}
              onToggle={() => setFilters((f) => ({ ...f, duration: f.duration === d ? null : d }))}
            >
              <Num value={d} /> {countNoun(d, MINUTE_FORMS)}
            </Chip>
          ))}
        </div>
      </section>

      <section aria-labelledby="games-title" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 id="games-title" className="font-display font-semibold text-ink text-lg">
            الألعاب
          </h2>
          {hasActiveFilters(filters) ? (
            <Button variant="ghost" onClick={() => setFilters(EMPTY_FILTERS)} className="text-base">
              مسح الفلاتر
            </Button>
          ) : null}
        </div>
        {shown.length === 0 ? (
          <EmptyState
            title="لا توجد لعبة تطابق هذه الاختيارات"
            description="جرّبا تغيير أحد الفلاتر، أو اضغطا «فاجئنا» ليختار التطبيق لكما."
            action={
              <Button variant="secondary" onClick={() => setFilters(EMPTY_FILTERS)}>
                مسح الفلاتر
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {shown.map((g, i) => (
              // Stagger caps at 6 cards so a long list never waits on the animation.
              <li
                key={g.id}
                className="rise"
                style={{ "--d": `${Math.min(i, 6) * 45 + 320}ms` } as React.CSSProperties}
              >
                <GameCard game={g} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
