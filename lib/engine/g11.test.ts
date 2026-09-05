import assert from "node:assert/strict";
import { test } from "node:test";
import type { G11Card } from "../content/types";
import { card, ids, run } from "./fixtures.ts";
import { G11, type G11State } from "./g11.ts";
import { remainingMs } from "./perform.ts";

const bank = ids(14, "G11").map((id, i) =>
  card<G11Card>("G11", id, {
    category: "food",
    body: `هدف-${i}`,
    forbidden: [`ممنوع-${i}-أ`, `ممنوع-${i}-ب`, `ممنوع-${i}-ج`],
  }),
);
const setup = { rounds: 6 } as const;
const start = (rounds: 6 | 10 = 6): G11State =>
  G11.reduce(G11.initialState(G11.buildDeck(bank, { rounds }, []), { rounds }), { type: "START" });

test("the chosen round count cuts the deck; the explainer alternates", () => {
  assert.equal(G11.availableCount(bank, setup), 14);
  assert.equal(start(6).deck.length, 6);
  const s = start(10);
  assert.equal(s.deck.length, 10);
  assert.equal(s.phase, "private_view");
  assert.equal(s.performer, "A");
  const second = run<G11State>(G11.reduce, s, [{ type: "READY", now: 0 }, { type: "CORRECT" }]);
  assert.equal(second.performer, "B");
  assert.equal(second.phase, "private_view");
});

test("CORRECT before READY is rejected; READY starts the 60s timer", () => {
  const s = start();
  assert.equal(G11.reduce(s, { type: "CORRECT" }), s);
  assert.equal(remainingMs(s, 1_000), 60_000);
  const running = G11.reduce(s, { type: "READY", now: 2_000 });
  assert.equal(running.phase, "timer_running");
  assert.equal(remainingMs(running, 32_000), 30_000);
});

test("neither the target nor its forbidden words reach the round record or the result", () => {
  const s = run<G11State>(G11.reduce, start(), [
    { type: "READY", now: 0 },
    { type: "CORRECT" },
    { type: "READY", now: 0 },
    { type: "SKIP" },
  ]);
  const serialized = JSON.stringify({
    rounds: s.completedRounds,
    skipped: s.skippedRounds,
    result: G11.deriveResult(s),
    timer: s.timer,
  });
  for (const c of s.deck) {
    assert.ok(!serialized.includes(c.body), `leaked target ${c.body}`);
    for (const w of c.forbidden) assert.ok(!serialized.includes(w), `leaked forbidden ${w}`);
  }
});

test("one point per correct guess, credited to the explainer; skips never score", () => {
  const s = run<G11State>(G11.reduce, start(), [
    { type: "READY", now: 0 },
    { type: "CORRECT" }, // A
    { type: "READY", now: 0 },
    { type: "SKIP" }, // B
    { type: "READY", now: 0 },
    { type: "CORRECT" }, // A
    { type: "READY", now: 0 },
    { type: "CORRECT" }, // B
    { type: "SKIP" }, // A
    { type: "READY", now: 0 },
    { type: "CORRECT" }, // B
  ]);
  assert.equal(s.phase, "results");
  assert.deepEqual(G11.deriveResult(s), {
    completed: 4,
    skipped: 2,
    correct: 4,
    points: { A: 2, B: 2 },
    turns: { A: 2, B: 2 },
  });
});
