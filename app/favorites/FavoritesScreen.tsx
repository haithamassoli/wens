"use client";

import Link from "next/link";
import { type KeyboardEvent, useId, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { DeckGlyph } from "@/components/GameCard";
import { findCard } from "@/lib/content";
import { gameById } from "@/lib/games";
import { useFavorites } from "@/lib/storage";

const TABS = [
  { key: "games", label: "الألعاب" },
  { key: "cards", label: "البطاقات" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export function FavoritesScreen() {
  const { favorites, toggleGame, toggleCard, hydrated } = useFavorites();
  const [tab, setTab] = useState<TabKey>("games");
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    // RTL: ArrowLeft moves to the next tab, ArrowRight to the previous.
    const delta = e.key === "ArrowLeft" ? 1 : e.key === "ArrowRight" ? -1 : 0;
    if (delta === 0 && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? TABS.length - 1
          : (index + delta + TABS.length) % TABS.length;
    setTab(TABS[next].key);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="نوع المفضّلة" className="flex gap-2">
        {TABS.map((t, i) => {
          const selected = tab === t.key;
          const count = t.key === "games" ? favorites.games.length : favorites.cards.length;
          return (
            <button
              key={t.key}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${t.key}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${t.key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTab(t.key)}
              onKeyDown={(e) => onTabKey(e, i)}
              className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-chip border px-4 font-semibold transition-colors ${
                selected ? "border-ink bg-ink text-ground" : "border-line bg-card text-ink"
              }`}
            >
              {t.label}
              {hydrated && count > 0 ? (
                <span
                  className={`ltr inline-flex min-w-6 justify-center rounded-chip px-1.5 text-sm ${
                    selected ? "bg-ground/20" : "bg-ground"
                  }`}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel-${tab}`}
        aria-labelledby={`${baseId}-tab-${tab}`}
        className="flex flex-col gap-3"
      >
        {!hydrated ? null : tab === "games" ? (
          <GamesTab ids={favorites.games} onRemove={toggleGame} />
        ) : (
          <CardsTab ids={favorites.cards} onRemove={toggleCard} />
        )}
      </div>

      <p className="text-ink-soft text-sm">
        المفضّلة محفوظة على هذا المتصفح فقط ولا يتم نسخها احتياطياً.
      </p>
    </div>
  );
}

function GamesTab({ ids, onRemove }: { ids: string[]; onRemove: (id: string) => void }) {
  if (ids.length === 0) {
    return (
      <EmptyState
        title="لا ألعاب مفضّلة بعد"
        description="افتحا صفحة أي لعبة واضغطا على القلب لتجداها هنا."
        action={<Button href="/games">تصفّح الألعاب</Button>}
      />
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {ids.map((id) => {
        const game = gameById(id);
        if (!game) {
          return (
            <li key={id}>
              <UnavailableRow text="هذه اللعبة لم تعد متاحة" onRemove={() => onRemove(id)} />
            </li>
          );
        }
        return (
          <li
            key={id}
            className="flex items-center gap-3 rounded-card border border-line bg-card p-3 pe-4"
            style={{ borderInlineStartWidth: 6, borderInlineStartColor: game.hue }}
          >
            <DeckGlyph hue={game.hue} size={44} />
            <div className="min-w-0 flex-1">
              <h3 className="font-bold font-display text-ink text-lg leading-tight">{game.name}</h3>
              <p className="truncate text-ink-soft text-sm">{game.tagline}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button href={`/games/${game.slug}`} variant="secondary" className="px-3">
                افتح
              </Button>
              <Button
                variant="ghost"
                onClick={() => onRemove(id)}
                aria-label={`أزل ${game.name} من المفضّلة`}
                className="px-3"
              >
                إزالة
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function CardsTab({ ids, onRemove }: { ids: string[]; onRemove: (id: string) => void }) {
  if (ids.length === 0) {
    return (
      <EmptyState
        title="لا بطاقات مفضّلة بعد"
        description="أثناء اللعب، اضغطا على القلب فوق أي بطاقة أعجبتكما لتعودا إليها لاحقاً."
        action={<Button href="/games">ابدآ لعبة</Button>}
      />
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {ids.map((id) => {
        const card = findCard(id);
        const game = gameById(card?.gameId ?? id.split("-")[0]);

        if (card?.status !== "published") {
          return (
            <li key={id}>
              <UnavailableRow text="هذه البطاقة لم تعد متاحة" onRemove={() => onRemove(id)} />
            </li>
          );
        }

        return (
          <li
            key={id}
            className="flex flex-col gap-2 rounded-card border border-line bg-card p-4"
            style={
              game ? { borderInlineStartWidth: 6, borderInlineStartColor: game.hue } : undefined
            }
          >
            {game ? (
              <Link href={`/games/${game.slug}`} className="text-ink-soft text-sm hover:text-ink">
                {game.name}
              </Link>
            ) : null}
            <p className="text-ink text-lg leading-relaxed">{card.body}</p>
            <div className="flex justify-end">
              <Button variant="ghost" onClick={() => onRemove(id)} className="px-3">
                إزالة
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function UnavailableRow({ text, onRemove }: { text: string; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-card border border-line border-dashed bg-card/60 p-4">
      <p className="text-ink-soft">{text}</p>
      <Button variant="ghost" onClick={onRemove} className="px-3">
        إزالة
      </Button>
    </div>
  );
}
