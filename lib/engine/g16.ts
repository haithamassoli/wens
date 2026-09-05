// G16 — Random Cooking Challenge (FR-G16). Suggestion loop, not a scored deck:
// instructions → card (a matching recipe) ⇄ SKIP (اقتراح آخر) → DONE → reveal (تقييم العرض) → results.
// Matching is strict: every ingredient must be ticked as available AND none may be excluded.
// Exclusions are never relaxed — `relaxHints` only ever proposes ingredients to add.
import type { G16Card } from "../content/types";
import type { BaseSetup, BaseState, GameDefinition, RoundRecord } from "./types.ts";
import { withDefaultAliases } from "./types.ts";
import { availableCount, baseState, endEarly, pickDeck, skipRound, toRound } from "./util.ts";

/** The canonical ingredient list the setup chips and every recipe draw from. */
export const G16_INGREDIENTS = [
  "خبز",
  "جبن",
  "بيض",
  "طماطم",
  "خيار",
  "زيتون",
  "بطاطا",
  "أرز",
  "دجاج",
  "بصل",
  "ثوم",
  "زيت",
  "ليمون",
  "شوفان",
  "حليب",
  "موز",
  "تفاح",
  "عسل",
  "طحين",
  "سكر",
] as const;

/** Playful presentation labels. No comparisons between the two cooks, no scores. */
export const G16_PRESENTATION = [
  { id: "chef", emoji: "👨‍🍳", label: "عرض المطاعم" },
  { id: "cozy", emoji: "🕯️", label: "دافئ وبيتي" },
  { id: "funny", emoji: "😄", label: "شكله يُضحك" },
  { id: "art", emoji: "🎨", label: "لوحة فنّية" },
  { id: "fast", emoji: "⚡", label: "سريع ولذيذ" },
] as const;

export type G16Presentation = (typeof G16_PRESENTATION)[number]["id"];

export interface G16Setup extends BaseSetup {
  available: string[]; // ticked ingredients
  excluded: string[]; // ticked exclusions; always win over `available`
}
export interface G16State extends BaseState<G16Card, RoundRecord> {
  presentation: G16Presentation | null;
}
export interface G16Result {
  cardId: string | null;
  cooked: boolean;
  rejected: number;
  presentation: G16Presentation | null;
}

/** Strict match: all ingredients available, none excluded. */
export const recipeMatches = (setup: G16Setup) => {
  const have = new Set(setup.available);
  const out = new Set(setup.excluded);
  return (c: G16Card) => c.ingredients.every((i) => have.has(i) && !out.has(i));
};

export interface G16Hints {
  /** Ingredients worth ticking, most unlocking first. Never contains an excluded ingredient. */
  suggest: { ingredient: string; recipes: number }[];
  /** Every recipe contains something excluded: only the couple may lift an exclusion. */
  blockedByExclusions: boolean;
  /** Fewest ingredients missing from any recipe that is not blocked by an exclusion. */
  closestMissing: number;
}

/**
 * What to relax when nothing matches. Recipes containing an excluded ingredient are dropped
 * first, so no suggestion can ever come from one — the exclusions stay absolute.
 */
export function relaxHints(cards: G16Card[], setup: G16Setup): G16Hints {
  const have = new Set(setup.available);
  const out = new Set(setup.excluded);
  const open = cards.filter(
    (c) => c.status === "published" && !c.ingredients.some((i) => out.has(i)),
  );
  const counts = new Map<string, number>();
  let closest = Number.POSITIVE_INFINITY;
  for (const c of open) {
    const missing = c.ingredients.filter((i) => !have.has(i));
    if (missing.length === 0) continue; // already matching
    closest = Math.min(closest, missing.length);
    for (const i of missing) counts.set(i, (counts.get(i) ?? 0) + 1);
  }
  return {
    suggest: [...counts]
      .map(([ingredient, recipes]) => ({ ingredient, recipes }))
      .sort((a, b) => b.recipes - a.recipes || a.ingredient.localeCompare(b.ingredient, "ar"))
      .slice(0, 4),
    blockedByExclusions: open.length === 0,
    closestMissing: Number.isFinite(closest) ? closest : 0,
  };
}

const isPresentation = (v: unknown): v is G16Presentation =>
  G16_PRESENTATION.some((p) => p.id === v);

const begin = (s: G16State, i: number): G16State => ({ ...s, roundIndex: i, phase: "card" });

export const G16: GameDefinition<G16Card, G16Setup, G16State, G16Result> = {
  id: "G16",
  availableCount: (cards, setup) => availableCount(cards, recipeMatches(setup)),
  // Every matching recipe, shuffled: SKIP walks the list until the couple keeps one.
  buildDeck: (cards, setup, seen) => pickDeck(cards, recipeMatches(setup), seen),
  initialState: (deck, setup) => ({
    ...baseState<G16Card, RoundRecord>("G16", deck, withDefaultAliases(setup.aliases)),
    presentation: null,
  }),
  reduce(s, e) {
    if (s.ended) return s;
    if (e.type === "END") return endEarly(s);
    switch (e.type) {
      case "START":
        return s.phase === "instructions" ? toRound(s, 0, begin) : s;
      case "SKIP": // "اقتراح آخر" — either player, never penalised
        return s.phase === "card" ? skipRound(s, begin) : s;
      case "DONE": // "أنجزنا الطبق"
        return s.phase === "card"
          ? {
              ...s,
              phase: "reveal",
              completedRounds: [{ roundIndex: s.roundIndex, cardId: s.deck[s.roundIndex].id }],
            }
          : s;
      case "SET":
        return s.phase === "reveal" && e.key === "presentation" && isPresentation(e.value)
          ? { ...s, presentation: e.value }
          : s;
      case "NEXT":
        return s.phase === "reveal" ? { ...s, phase: "results", ended: true } : s;
      default:
        return s;
    }
  },
  deriveResult: (s) => ({
    cardId: s.completedRounds[0]?.cardId ?? null,
    cooked: s.completedRounds.length > 0,
    rejected: s.skippedRounds.length,
    presentation: s.presentation,
  }),
};
