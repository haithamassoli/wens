import assert from "node:assert/strict";
import { test } from "node:test";
import type { G07Card } from "../content/types";
import { card, ids, run } from "./fixtures.ts";
import { G07, G07_ROUNDS, isValidForm } from "./g07.ts";

const bank = ids(2, "G07").map((id) => card<G07Card>("G07", id, { category: "prompt" }));
const start = (cards = bank) =>
  G07.reduce(G07.initialState(G07.buildDeck(cards, {}, []), {}), { type: "START" });
const fill = [
  { type: "INPUT", field: "s1", value: "جرّبت التخييم" },
  { type: "INPUT", field: "s2", value: "كنت أحب الرياضيات" },
  { type: "INPUT", field: "s3", value: "مثّلت في مسرحية" },
  { type: "SET", key: "fiction", value: 2 },
];

test("six fixed rounds even with two (or zero) prompts; writer alternates A/B", () => {
  const s = start();
  assert.equal(s.phase, "player_A_input");
  assert.equal(s.deck.length, G07_ROUNDS);
  assert.equal(start([]).deck.length, 0);
  assert.equal(start([]).phase, "player_A_input");
  assert.equal(s.writer, "A");
});

test("LOCK is rejected until three distinct non-empty statements and exactly one fiction", () => {
  let s = start();
  assert.equal(G07.reduce(s, { type: "LOCK", player: "A" }), s);
  s = run(G07.reduce, s, fill.slice(0, 3));
  assert.equal(G07.reduce(s, { type: "LOCK", player: "A" }), s); // no fiction yet
  const dup = G07.reduce(s, { type: "INPUT", field: "s3", value: "جرّبت التخييم " });
  assert.equal(
    G07.reduce(G07.reduce(dup, { type: "SET", key: "fiction", value: 1 }), {
      type: "LOCK",
      player: "A",
    }).phase,
    "player_A_input",
  );
  assert.equal(G07.reduce(s, { type: "INPUT", field: "s1", value: "x".repeat(81) }), s);
  assert.equal(G07.reduce(s, { type: "SET", key: "fiction", value: 3 }), s);
  assert.equal(isValidForm(["أ", "ب", "ج"], 0), true);
  assert.equal(isValidForm(["أ", "أ", "ج"], 0), false);
  s = G07.reduce(s, { type: "SET", key: "fiction", value: 2 });
  assert.equal(G07.reduce(s, { type: "LOCK", player: "B" }), s); // only the writer locks
  s = G07.reduce(s, { type: "LOCK", player: "A" });
  assert.equal(s.phase, "handoff");
});

test("guesser picks one; a correct guess scores for the guesser; roles swap; equal turns", () => {
  let s = run(G07.reduce, start(), [...fill, { type: "LOCK", player: "A" }, { type: "READY" }]);
  assert.equal(s.phase, "player_B_input");
  assert.equal(s.fiction, 2); // still in state (never rendered), needed for the reveal
  assert.equal(G07.reduce(s, { type: "LOCK", player: "B" }), s);
  assert.equal(G07.reduce(s, { type: "SUBMIT", player: "A", optionId: "2" }), s);
  s = run(G07.reduce, s, [
    { type: "SUBMIT", player: "B", optionId: "2" },
    { type: "LOCK", player: "B" },
  ]);
  assert.equal(s.phase, "reveal");
  assert.equal(s.completedRounds[0].correct, true);
  assert.deepEqual(G07.deriveResult(s).points, { A: 0, B: 1 });
  s = G07.reduce(s, { type: "NEXT" });
  assert.equal(s.writer, "B");
  assert.equal(s.phase, "player_B_input");
  assert.deepEqual(s.statements, ["", "", ""]);
  assert.equal(s.fiction, null);
});

test("skips consume slots; the session ends after six; END summarises early", () => {
  let s = start();
  for (let i = 0; i < G07_ROUNDS; i++) s = G07.reduce(s, { type: "SKIP" });
  assert.equal(s.phase, "results");
  assert.equal(s.endedEarly, false);
  assert.deepEqual(G07.deriveResult(s), {
    points: { A: 0, B: 0 },
    completed: 0,
    skipped: 6,
    complete: true,
    winner: "tie",
  });
  const early = run(G07.reduce, start(), [{ type: "SKIP" }, { type: "END" }]);
  assert.equal(early.endedEarly, true);
  assert.equal(G07.deriveResult(early).winner, null);
});
