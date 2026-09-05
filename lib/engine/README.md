# Engine contract (PRD §5, §10)

Pure, DOM-free. One module per game in `lib/engine/<gameId>.ts`, shared types in `lib/engine/types.ts`.

```ts
export interface GameDefinition<Card, Setup, State, Result> {
  id: GameId;
  buildDeck(cards: Card[], setup: Setup, seen: string[]): Card[]; // published only, filter, shuffle w/o replacement, seen last
  initialState(deck: Card[], setup: Setup): State;                 // sessionId random, roundIndex 0, phase "instructions"
  reduce(state: State, event: Event): State;                        // returns SAME reference when event invalid for phase
  deriveResult(state: State): Result;                               // recompute from completedRounds[], never from counters
}
```

Common events: `START`, `READY`, `SUBMIT{player, optionId}` (may be re-submitted before lock), `LOCK`,
`NEXT`, `SKIP`, `PAUSE`, `RESUME`, `TICK{now}`, `END`, plus game-specific (`SPIN`, `DONE`, `RESET_POOL`).

Common state fields (DATA-01): `sessionId, gameId, roundIndex, phase, aliases:{A,B}, deck, currentInputs,
completedRounds, skippedRounds, ended`. Skipped rounds consume the slot, keep no inputs, count separately.

Tests: `node --test lib/engine/*.test.ts` (Node 26 strips types natively; no runner dependency).

## Implementation notes (lib/engine)

- `GameDefinition` also exposes `availableCount(cards, setup)` — matching published cards before the
  deck is cut, so setup can show the real count (FR-CORE-03). `BaseState` adds `endedEarly` (END before
  every slot was consumed). `READY` carries an optional `now` (G09 uses it to start the timer).
- Imports inside `lib/engine` use explicit `.ts` extensions so `node --test` resolves them;
  `allowImportingTsExtensions` is enabled in `tsconfig.json` (valid because `noEmit` is on).
- `util.ts`: `shuffle`, `newSessionId`, `pickDeck(cards, filter, seen, count)` (published → filter →
  unseen shuffled first, seen shuffled last → cut), `toRound`/`skipRound`/`endEarly` helpers.
- `choice.ts`: `makeChoiceGame(config)` powers G02/G03/G04 (`player_<first>_input → handoff →
  player_<second>_input → reveal`). State adds `currentInputs: {A,B}` and `firstPlayer`;
  `activePlayer(phase)` tells the UI whose input a phase waits for. SUBMIT is accepted only from the
  player whose input phase it is; LOCK needs a choice; SKIP is valid in input/handoff phases only.
- Per-game state extras: G01 `speaker`; G04 `firstPlayer` is the answerer (`roles(state)` gives
  `{answerer, predictor}`); G09 `timer: {durationMs, startedAt, pausedAt, pausedTotalMs} | null` with
  `remainingMs(state, now)`; G25 `pool`, `shown`, `selectedId`, `done`, `exhausted` (SPIN on an
  exhausted pool sets the flag and waits — filters are never relaxed; `RESET_POOL`/`RESHUFFLE` clear `shown`).
- `index.ts` exports everything plus `DEFINITIONS` keyed by `GameId`.
- Tests use inline fixtures (`fixtures.ts`) and never read `content/*.json`.
