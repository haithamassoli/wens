// G27 — Our Wish Jar (FR-G27). A list, not a deck: these pure helpers own the rules and the
// play screen keeps the list in localStorage via `useGameData("G27", …)`.
// Wishes are never obligations: no reminders, no due dates, no "overdue" state.
// ponytail: one device, one list — a concurrent edit cannot exist, so nothing merges. Convex
// sync (two devices editing the same jar, additions never overwriting each other) is the R3 upgrade.
import type { G27Card } from "../content/types";
import { stubGame } from "./stub.ts";
import type { Player } from "./types.ts";

export type WishCost = "free" | "low" | "medium";
export type WishWhen = "soon" | "someday" | "date";
export type WishState = "idea" | "planned" | "tried";

export interface Wish {
  id: string;
  by: Player;
  title: string;
  cost: WishCost;
  when: WishWhen;
  date?: string; // ISO date, only meaningful when when === "date"
  state: WishState;
  step?: string; // the first step agreed when the wish was planned
}

export const WISH_TITLE_MAX = 60;

export interface WishDraft {
  by: Player;
  title: string;
  cost: WishCost;
  when: WishWhen;
  date?: string;
}

/** Trimmed, capped title. Empty after trimming → the draft is not addable. */
export const cleanTitle = (title: string) => title.trim().slice(0, WISH_TITLE_MAX);

export const canAddWish = (draft: WishDraft) => cleanTitle(draft.title).length > 0;

export function newWish(draft: WishDraft, id: string = crypto.randomUUID()): Wish {
  const wish: Wish = {
    id,
    by: draft.by,
    title: cleanTitle(draft.title),
    cost: draft.cost,
    when: draft.when,
    state: "idea",
  };
  if (draft.when === "date" && draft.date) wish.date = draft.date;
  return wish;
}

/** Newest first, so a just-added wish is visible without scrolling. */
export const addWish = (wishes: Wish[], draft: WishDraft, id?: string): Wish[] =>
  canAddWish(draft) ? [newWish(draft, id), ...wishes] : wishes;

export const removeWish = (wishes: Wish[], id: string): Wish[] => wishes.filter((w) => w.id !== id);

const patch = (wishes: Wish[], id: string, f: (w: Wish) => Wish): Wish[] =>
  wishes.map((w) => (w.id === id ? f(w) : w));

/** Agreeing the first step is what turns an idea into a plan. An empty step changes nothing. */
export function planWish(wishes: Wish[], id: string, step: string): Wish[] {
  const text = step.trim();
  if (!text) return wishes;
  return patch(wishes, id, (w) => ({ ...w, state: "planned", step: text }));
}

export const markWishTried = (wishes: Wish[], id: string): Wish[] =>
  patch(wishes, id, (w) => (w.state === "tried" ? w : { ...w, state: "tried" }));

export interface WishFilter {
  state: WishState | "all";
  cost: WishCost | "all";
}
export const ALL_WISHES: WishFilter = { state: "all", cost: "all" };

export const filterWishes = (wishes: Wish[], f: WishFilter): Wish[] =>
  wishes.filter(
    (w) => (f.state === "all" || w.state === f.state) && (f.cost === "all" || w.cost === f.cost),
  );

/** "نختار واحدة معاً": a random wish still in the idea state, or null when there is none. */
export function pickTogether(wishes: Wish[], rng: () => number = Math.random): Wish | null {
  const ideas = wishes.filter((w) => w.state === "idea");
  return ideas.length ? ideas[Math.floor(rng() * ideas.length)] : null;
}

export const wishCounts = (wishes: Wish[]): Record<WishState, number> => ({
  idea: wishes.filter((w) => w.state === "idea").length,
  planned: wishes.filter((w) => w.state === "planned").length,
  tried: wishes.filter((w) => w.state === "tried").length,
});

/** Seed suggestions shown when the jar is empty. */
export const exampleWishes = (cards: G27Card[]): G27Card[] =>
  cards.filter((c) => c.status === "published" && c.category === "example");

// ponytail: G27 has no round loop, but the registry types every game id. The card-only stub is
// the smallest definition that satisfies it; the play screen never calls it.
export const G27 = stubGame("G27");
