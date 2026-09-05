"use client";

import { useCallback, useEffect, useState } from "react";
import type { BaseCard } from "@/lib/content/types";
import type { BaseState, Event, GameDefinition, RoundRecord } from "@/lib/engine";
import { markSeen, readSeen } from "@/lib/storage";

/** Cards actually shown: the consumed slots of the deck (override for pool-style games). */
const consumed = <S extends BaseState<BaseCard, RoundRecord>>(s: S) =>
  s.deck.slice(0, s.completedRounds.length + s.skippedRounds.length).map((c) => c.id);

/**
 * Page-memory session state (DATA-01). `send` ignores events the reducer rejects (same
 * reference), so double taps are no-ops. `restart` deals a fresh deck for Replay, reading the
 * seen list again so the cards just marked go last. On session end the dealt ids are recorded.
 */
export function useSession<C extends BaseCard, Setup, S extends BaseState<C, RoundRecord>, R>(
  def: GameDefinition<C, Setup, S, R>,
  cards: C[],
  setup: Setup,
  seenIds: string[],
  dealtIds: (s: S) => string[] = consumed,
) {
  const deal = useCallback(
    (seen: string[]) => def.initialState(def.buildDeck(cards, setup, seen), setup),
    [def, cards, setup],
  );
  const [state, setState] = useState<S>(() => deal(seenIds));
  const send = useCallback((e: Event) => setState((s) => def.reduce(s, e)), [def]);
  const restart = useCallback(() => setState(deal(readSeen(def.id))), [deal, def.id]);

  // Once ended the reducer keeps returning the same reference, so this runs once per session.
  useEffect(() => {
    if (state.ended) markSeen(def.id, dealtIds(state));
  }, [state, def.id, dealtIds]);

  return { state, send, restart };
}
