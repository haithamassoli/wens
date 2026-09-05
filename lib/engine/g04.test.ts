import assert from "node:assert/strict";
import { test } from "node:test";
import type { PredictionCard } from "../content/types";
import { card, ids, run } from "./fixtures.ts";
import { G04, roles } from "./g04.ts";

const bank = ids(12, "G04").map((id) =>
  card<PredictionCard>("G04", id, {
    options: [
      { id: "o1", label: "1" },
      { id: "o2", label: "2" },
      { id: "o3", label: "3" },
      { id: "o4", label: "4" },
    ],
  }),
);
const start = () =>
  G04.reduce(G04.initialState(G04.buildDeck(bank, {}, []), {}), { type: "START" });
/** One round: the current answerer gives `ref`, the predictor guesses `guess`. */
const round = (s: ReturnType<typeof start>, ref: string, guess: string) => {
  const { answerer, predictor } = roles(s);
  return run(G04.reduce, s, [
    { type: "SUBMIT", player: answerer, optionId: ref },
    { type: "LOCK", player: answerer },
    { type: "READY" },
    { type: "SUBMIT", player: predictor, optionId: guess },
    { type: "LOCK", player: predictor },
    { type: "NEXT" },
  ]);
};
const skip = (s: ReturnType<typeof start>) => G04.reduce(s, { type: "SKIP" });

test("deck is fixed at 10; roles alternate, answerer first", () => {
  let s = start();
  assert.equal(s.deck.length, 10);
  assert.deepEqual(roles(s), { answerer: "A", predictor: "B" });
  assert.equal(s.phase, "player_A_input");
  s = round(s, "o1", "o1");
  assert.deepEqual(roles(s), { answerer: "B", predictor: "A" });
  assert.equal(s.phase, "player_B_input");
  assert.deepEqual(s.completedRounds[0], {
    roundIndex: 0,
    cardId: s.deck[0].id,
    answerer: "A",
    reference: "o1",
    prediction: "o1",
    correct: true,
  });
});

test("A predicts right 3 times, B twice → 3–2, five opportunities each incl. skips", () => {
  // Even rounds: A answers (B predicts). Odd rounds: B answers (A predicts).
  const plan: Array<[string, string] | "skip"> = [
    ["o1", "o1"], // r0 B correct
    ["o1", "o1"], // r1 A correct
    ["o1", "o1"], // r2 B correct
    ["o1", "o1"], // r3 A correct
    ["o1", "o2"], // r4 B wrong
    ["o1", "o1"], // r5 A correct
    "skip", // r6 (B's slot)
    ["o1", "o2"], // r7 A wrong
    ["o1", "o2"], // r8 B wrong
    "skip", // r9 (A's slot)
  ];
  const s = plan.reduce((acc, p) => (p === "skip" ? skip(acc) : round(acc, p[0], p[1])), start());
  assert.equal(s.phase, "results");
  assert.deepEqual(G04.deriveResult(s), {
    points: { A: 3, B: 2 },
    completed: 8,
    skipped: 2,
    opportunities: { A: 5, B: 5 },
    complete: true,
    winner: "A",
  });
});

test("tie → no winner", () => {
  let s = start();
  for (let i = 0; i < 10; i++) s = round(s, "o1", i < 4 ? "o1" : "o2");
  const r = G04.deriveResult(s);
  assert.deepEqual(r.points, { A: 2, B: 2 });
  assert.equal(r.winner, "tie");
});

test("END early → incomplete, winner null", () => {
  let s = round(start(), "o1", "o1");
  s = round(s, "o1", "o2");
  s = G04.reduce(s, { type: "END" });
  assert.equal(s.endedEarly, true);
  const r = G04.deriveResult(s);
  assert.equal(r.complete, false);
  assert.equal(r.winner, null);
  assert.deepEqual(r.points, { A: 0, B: 1 });
});
