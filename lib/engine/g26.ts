// G26 — Our Night Planner. Not a round game: pure plan-building over content cards
// (openers/closers) and the game catalogue, plus a trivial definition for the registry.
import type { G26Card } from "../content/types";
import type { GameMeta } from "../games.ts";
import type { BaseSetup, BaseState, GameDefinition, RoundRecord } from "./types.ts";
import { DEFAULT_ALIASES } from "./types.ts";
import { availableCount, baseState, endEarly, pickDeck } from "./util.ts";

export type PlanMood = "calm" | "fun" | "deep";
export type PlanBudget = 30 | 60 | 90;
export const PLAN_BUDGETS: readonly PlanBudget[] = [30, 60, 90];
export const PLAN_MOODS: readonly PlanMood[] = ["calm", "fun", "deep"];

/** Part ids only — this is also the saved shape (`useGameData("G26")`). */
export interface Plan {
  opener: string;
  game: string; // GameId
  closer: string;
}
export type PlanPart = keyof Plan;
export interface PlanContext {
  cards: G26Card[];
  games: readonly GameMeta[];
  budget: PlanBudget;
  mood: PlanMood;
}

const GAME_MOODS: Record<PlanMood, GameMeta["moods"]> = {
  calm: ["talk", "activity"],
  fun: ["laugh", "challenge"],
  deep: ["talk"],
};

const partCards = (ctx: PlanContext, category: G26Card["category"]) =>
  ctx.cards.filter(
    (c) => c.status === "published" && c.category === category && c.tags.includes(ctx.mood),
  );
/** Catalogue games that fit the mood; the planner itself and gated games are never suggested. */
export const gameCandidates = (ctx: PlanContext) =>
  ctx.games.filter(
    (g) =>
      g.id !== "G26" &&
      !g.gated &&
      g.moods.some((m) => GAME_MOODS[ctx.mood].includes(m)) &&
      (ctx.mood !== "deep" || g.depth !== "light"),
  );

const pick = <T>(list: T[], rng: () => number): T | undefined =>
  list[Math.floor(rng() * list.length)];
const min = (ns: number[]) => Math.min(...ns);

/** Opener + game + closer whose minutes sum to at most the budget; null when nothing fits. */
export function buildPlan(ctx: PlanContext, rng: () => number = Math.random): Plan | null {
  const openers = partCards(ctx, "opener");
  const closers = partCards(ctx, "closer");
  const games = gameCandidates(ctx);
  if (!openers.length || !closers.length || !games.length) return null;
  const minGame = min(games.map((g) => g.minutes));
  const minCloser = min(closers.map((c) => c.minutes));
  const opener = pick(
    openers.filter((o) => o.minutes + minGame + minCloser <= ctx.budget),
    rng,
  );
  if (!opener) return null;
  const closer = pick(
    closers.filter((c) => opener.minutes + minGame + c.minutes <= ctx.budget),
    rng,
  );
  if (!closer) return null;
  const game = pick(
    games.filter((g) => opener.minutes + g.minutes + closer.minutes <= ctx.budget),
    rng,
  );
  return game ? { opener: opener.id, game: game.id, closer: closer.id } : null;
}

export interface ResolvedPlan {
  opener: G26Card;
  game: GameMeta;
  closer: G26Card;
}
/** Cards/game behind a plan; null when an id no longer exists (stale saved plan). */
export function resolvePlan(
  plan: Plan,
  cards: G26Card[],
  games: readonly GameMeta[],
): ResolvedPlan | null {
  const opener = cards.find((c) => c.id === plan.opener);
  const closer = cards.find((c) => c.id === plan.closer);
  const game = games.find((g) => g.id === plan.game);
  return opener && closer && game ? { opener, game, closer } : null;
}

export const planMinutes = (r: ResolvedPlan) =>
  r.opener.minutes + r.game.minutes + r.closer.minutes;

/**
 * Swap one part for a different one that still fits the budget; the other two parts are
 * untouched. Returns the SAME reference when no alternative fits.
 */
export function replacePart(
  ctx: PlanContext,
  plan: Plan,
  part: PlanPart,
  rng: () => number = Math.random,
): Plan {
  const r = resolvePlan(plan, ctx.cards, ctx.games);
  if (!r) return plan;
  const room = ctx.budget - (planMinutes(r) - r[part].minutes);
  const options: { id: string; minutes: number }[] =
    part === "game" ? gameCandidates(ctx) : partCards(ctx, part);
  const next = pick(
    options.filter((o) => o.id !== plan[part] && o.minutes <= room),
    rng,
  );
  return next ? { ...plan, [part]: next.id } : plan;
}

// ---- Registry wrapper: the play screen never runs rounds; START simply ends the session. ----
export type G26Setup = BaseSetup;
export type G26State = BaseState<G26Card, RoundRecord>;
export const G26: GameDefinition<G26Card, G26Setup, G26State, { completed: number }> = {
  id: "G26",
  availableCount: (cards) => availableCount(cards, () => true),
  buildDeck: (cards, _setup, seen) => pickDeck(cards, () => true, seen),
  initialState: (deck) => baseState<G26Card, RoundRecord>("G26", deck, DEFAULT_ALIASES),
  reduce: (s, e) =>
    s.ended ? s : e.type === "END" ? endEarly(s) : e.type === "START" ? endEarly(s) : s,
  deriveResult: (s) => ({ completed: s.completedRounds.length }),
};
