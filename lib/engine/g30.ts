// G30 — Our First-Time Album (FR-G30). 30 suggestions, a private log on this device via
// useGameData("G30", { entries: [] }). Badges count experiences and nothing else: they never
// grade the relationship, and nothing is ever published or shared.
// ponytail: text impressions only — private cloud photos (upload, EXIF stripping, per-item
// permissions) are the R3 upgrade, same album model as G28.
import type { G30Card } from "../content/types";
import type { BaseSetup, BaseState, GameDefinition, RoundRecord } from "./types.ts";
import { withDefaultAliases } from "./types.ts";
import {
  availableCount,
  baseState,
  endEarly,
  pickDeck,
  shuffle,
  skipRound,
  toRound,
} from "./util.ts";

export type G30Category = "home" | "outside" | "food" | "creative";

export interface Entry {
  id: string;
  cardId: string;
  impression: string; // ≤200
  date: string; // "YYYY-MM-DD"
}

export const IMPRESSION_MAX = 200;

/** Count-based and neutral: never a judgement of the relationship (Result rule). */
export const BADGES: readonly { at: number; label: string }[] = [
  { at: 1, label: "أوّل تجربة" },
  { at: 5, label: "5 تجارب" },
  { at: 10, label: "10 تجارب" },
];

export const badgesFor = (count: number): string[] =>
  BADGES.filter((b) => count >= b.at).map((b) => b.label);

/** The next badge and how many experiences remain, or null once every badge is earned. */
export function nextBadge(count: number): { label: string; remaining: number } | null {
  const b = BADGES.find((x) => count < x.at);
  return b ? { label: b.label, remaining: b.at - count } : null;
}

export function entryError(impression: string): "impression" | null {
  const t = impression.trim();
  return t.length === 0 || t.length > IMPRESSION_MAX ? "impression" : null;
}

/** Prepends a trimmed entry. Returns the same list when the impression is invalid. */
export function addEntry(list: Entry[], cardId: string, impression: string, date: string): Entry[] {
  if (entryError(impression) !== null) return list;
  return [
    {
      id: crypto.randomUUID(),
      cardId,
      impression: impression.trim().slice(0, IMPRESSION_MAX),
      date,
    },
    ...list,
  ];
}

/** Removes exactly one entry; every other experience stays in the log (Acceptance). */
export const removeEntry = (list: Entry[], id: string): Entry[] => list.filter((e) => e.id !== id);

export const triedIds = (list: Entry[]): string[] => [...new Set(list.map((e) => e.cardId))];

/** A random suggestion that has not been logged yet; falls back to the whole deck. */
export function suggest(deck: G30Card[], tried: string[], rng: () => number = Math.random) {
  const fresh = deck.filter((c) => !tried.includes(c.id));
  return shuffle(fresh.length > 0 ? fresh : deck, rng)[0];
}

/* ------------------------------------------------------------------ */
/* Registry entry — the deck of suggestions the album screen browses    */
/* ------------------------------------------------------------------ */

export interface G30Setup extends BaseSetup {
  categories: G30Category[]; // empty = every category
  costTier: "free" | "low" | "any";
}
export type G30State = BaseState<G30Card>;
export interface G30Result {
  completed: number;
  skipped: number;
}

export const g30Matches = (setup: G30Setup) => (c: G30Card) =>
  (setup.categories.length === 0 || setup.categories.includes(c.category as G30Category)) &&
  (setup.costTier === "any" || c.costTier === setup.costTier);

const begin = (s: G30State, i: number): G30State => ({ ...s, roundIndex: i, phase: "card" });

export const G30: GameDefinition<G30Card, G30Setup, G30State, G30Result> = {
  id: "G30",
  availableCount: (cards, setup) => availableCount(cards, g30Matches(setup)),
  buildDeck: (cards, setup, seen) => pickDeck(cards, g30Matches(setup), seen),
  initialState: (deck, setup) => baseState("G30", deck, withDefaultAliases(setup.aliases)),
  reduce(s, e) {
    if (s.ended) return s;
    if (e.type === "END") return endEarly(s);
    if (e.type === "START") return s.phase === "instructions" ? toRound(s, 0, begin) : s;
    if (s.phase !== "card") return s;
    if (e.type === "NEXT")
      return toRound(
        {
          ...s,
          completedRounds: [
            ...s.completedRounds,
            { roundIndex: s.roundIndex, cardId: s.deck[s.roundIndex].id } as RoundRecord,
          ],
        },
        s.roundIndex + 1,
        begin,
      );
    if (e.type === "SKIP") return skipRound(s, begin);
    return s;
  },
  deriveResult: (s) => ({ completed: s.completedRounds.length, skipped: s.skippedRounds.length }),
};
