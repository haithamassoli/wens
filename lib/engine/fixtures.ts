// Inline test fixtures — the engine tests never read content/*.json.
import type { BaseCard, GameId } from "../content/types";

export function card<C extends BaseCard>(gameId: GameId, id: string, extra?: Partial<C>): C {
  return {
    id,
    gameId,
    locale: "ar",
    version: 1,
    status: "published",
    category: "light",
    depth: "light",
    body: id,
    tags: [],
    requiresMovement: false,
    requiresTools: false,
    estimatedMinutes: 1,
    reviewedAt: "2026-01-01",
    ...extra,
  } as C;
}

export const ids = (n: number, prefix: string) =>
  Array.from({ length: n }, (_, i) => `${prefix}-${String(i + 1).padStart(3, "0")}`);

/** Apply events in order. */
export const run = <S>(reduce: (s: S, e: never) => S, s: S, events: unknown[]) =>
  events.reduce<S>((acc, e) => reduce(acc, e as never), s);
