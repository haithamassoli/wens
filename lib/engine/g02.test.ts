import assert from "node:assert/strict";
import { test } from "node:test";
import type { ChoiceCard } from "../content/types";
import { card, ids, run } from "./fixtures.ts";
import { G02 } from "./g02.ts";

const bank = ids(8, "G02").map((id) =>
  card<ChoiceCard>("G02", id, {
    options: [
      { id: "sea", label: "بحر" },
      { id: "mountain", label: "جبل" },
    ],
  }),
);
const setup = { rounds: 5 as const };
const start = () =>
  G02.reduce(G02.initialState(G02.buildDeck(bank, setup, []), setup), { type: "START" });
const round = (a: string, b: string) => [
  { type: "SUBMIT", player: "A", optionId: a },
  { type: "LOCK", player: "A" },
  { type: "READY" },
  { type: "SUBMIT", player: "B", optionId: b },
  { type: "LOCK", player: "B" },
  { type: "NEXT" },
];

test("phases: A input → handoff → B input → reveal → next", () => {
  let s = start();
  assert.equal(s.phase, "player_A_input");
  s = run(G02.reduce, s, round("sea", "sea").slice(0, 2));
  assert.equal(s.phase, "handoff");
  s = G02.reduce(s, { type: "READY" });
  assert.equal(s.phase, "player_B_input");
  s = run(G02.reduce, s, round("sea", "sea").slice(3, 5));
  assert.equal(s.phase, "reveal");
  assert.deepEqual(s.completedRounds[0], {
    roundIndex: 0,
    cardId: s.deck[0].id,
    a: "sea",
    b: "sea",
    match: true,
  });
  s = G02.reduce(s, { type: "NEXT" });
  assert.equal(s.phase, "player_A_input");
  assert.equal(s.roundIndex, 1);
  assert.deepEqual(s.currentInputs, { A: null, B: null });
});

test("3 matches of 5 → 60%; different ids no match", () => {
  const s = run(G02.reduce, start(), [
    ...round("sea", "sea"),
    ...round("sea", "mountain"),
    ...round("mountain", "mountain"),
    ...round("mountain", "sea"),
    ...round("sea", "sea"),
  ]);
  assert.equal(s.phase, "results");
  assert.deepEqual(G02.deriveResult(s), { rounds: 5, matches: 3, skipped: 0, matchPercent: 60 });
});

test("zero completed rounds → null percent", () => {
  const s = run(G02.reduce, start(), [{ type: "SKIP" }, { type: "END" }]);
  assert.deepEqual(G02.deriveResult(s), { rounds: 0, matches: 0, skipped: 1, matchPercent: null });
  assert.equal(s.endedEarly, true);
});

test("LOCK without a choice is rejected; choice can change before lock, not after", () => {
  const s = start();
  assert.equal(G02.reduce(s, { type: "LOCK", player: "A" }), s);
  const changed = run(G02.reduce, s, [
    { type: "SUBMIT", player: "A", optionId: "sea" },
    { type: "SUBMIT", player: "A", optionId: "mountain" },
  ]);
  assert.equal(changed.currentInputs.A, "mountain");
  const locked = G02.reduce(changed, { type: "LOCK", player: "A" });
  assert.equal(G02.reduce(locked, { type: "SUBMIT", player: "A", optionId: "sea" }), locked);
  assert.equal(G02.reduce(s, { type: "SUBMIT", player: "A", optionId: "bogus" }), s);
  assert.equal(G02.reduce(s, { type: "SUBMIT", player: "B", optionId: "sea" }), s);
});

test("SKIP after A input discards the input and consumes the slot", () => {
  const s = run(G02.reduce, start(), [
    { type: "SUBMIT", player: "A", optionId: "sea" },
    { type: "LOCK", player: "A" },
    { type: "SKIP" },
  ]);
  assert.equal(s.roundIndex, 1);
  assert.deepEqual(s.currentInputs, { A: null, B: null });
  assert.deepEqual(s.skippedRounds, [0]);
  assert.equal(s.completedRounds.length, 0);
});

test("double LOCK / double NEXT are no-ops (same reference)", () => {
  const afterLock = run(G02.reduce, start(), [
    { type: "SUBMIT", player: "A", optionId: "sea" },
    { type: "LOCK", player: "A" },
  ]);
  assert.equal(G02.reduce(afterLock, { type: "LOCK", player: "A" }), afterLock);
  const reveal = run(G02.reduce, afterLock, [
    { type: "READY" },
    { type: "SUBMIT", player: "B", optionId: "sea" },
    { type: "LOCK", player: "B" },
  ]);
  assert.equal(G02.reduce(reveal, { type: "LOCK", player: "B" }), reveal);
  assert.equal(G02.reduce(reveal, { type: "SKIP" }), reveal);
  assert.equal(G02.reduce(reveal, { type: "READY" }), reveal);
  const next = G02.reduce(reveal, { type: "NEXT" });
  assert.equal(G02.reduce(next, { type: "NEXT" }), next);
  assert.equal(next.completedRounds.length, 1);
});
