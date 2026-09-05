import type { BaseCard, GameId } from "../content/types";
import type { Aliases, BaseState, RoundRecord } from "./types.ts";

/** Fisher–Yates; returns a new array. */
export function shuffle<T>(arr: readonly T[], rng: () => number = Math.random): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const newSessionId = (): string => crypto.randomUUID();

const matching = <C extends BaseCard>(cards: C[], filter: (c: C) => boolean) =>
  cards.filter((c) => c.status === "published" && filter(c));

export const availableCount = <C extends BaseCard>(cards: C[], filter: (c: C) => boolean) =>
  matching(cards, filter).length;

/** Published + filter, unseen first, shuffled within each group, cut to `count`. */
export function pickDeck<C extends BaseCard>(
  cards: C[],
  filter: (c: C) => boolean,
  seen: string[],
  count = Number.POSITIVE_INFINITY,
  rng: () => number = Math.random,
): C[] {
  const seenSet = new Set(seen);
  const pool = matching(cards, filter);
  const fresh = shuffle(
    pool.filter((c) => !seenSet.has(c.id)),
    rng,
  );
  const old = shuffle(
    pool.filter((c) => seenSet.has(c.id)),
    rng,
  );
  return fresh.concat(old).slice(0, count);
}

export function baseState<C, R extends RoundRecord>(
  gameId: GameId,
  deck: C[],
  aliases: Aliases,
): BaseState<C, R> {
  return {
    sessionId: newSessionId(),
    gameId,
    roundIndex: 0,
    phase: "instructions",
    aliases,
    deck,
    completedRounds: [],
    skippedRounds: [],
    ended: false,
    endedEarly: false,
  };
}

type AnyState = BaseState<unknown, RoundRecord>;

/** Enter round `index` via `begin`, or finish naturally when every slot is consumed. */
export function toRound<S extends AnyState>(s: S, index: number, begin: (s: S, i: number) => S): S {
  return index >= s.deck.length
    ? { ...s, phase: "results", ended: true, endedEarly: false }
    : begin(s, index);
}

export function skipRound<S extends AnyState>(s: S, begin: (s: S, i: number) => S): S {
  return toRound(
    { ...s, skippedRounds: [...s.skippedRounds, s.roundIndex] },
    s.roundIndex + 1,
    begin,
  );
}

/** END: summarize what is complete so far (FR-CORE-06). */
export function endEarly<S extends AnyState>(s: S): S {
  const consumed = s.completedRounds.length + s.skippedRounds.length;
  return { ...s, phase: "results", ended: true, endedEarly: consumed < s.deck.length };
}
