import assert from "node:assert/strict";
import { test } from "node:test";
import type { G10Card } from "../content/types";
import { card, ids, run } from "./fixtures.ts";
import { G10, G10_ROUNDS, type G10State } from "./g10.ts";
import { remainingMs } from "./perform.ts";

const LEVELS = ["easy", "medium", "hard"] as const;
const bank = ids(12, "G10").map((id, i) =>
  card<G10Card>("G10", id, { category: LEVELS[i % 3], body: `مشهد-${i}`, requiresMovement: true }),
);
const setup = { levels: ["easy", "medium"] as ("easy" | "medium" | "hard")[] };
const start = (): G10State =>
  G10.reduce(G10.initialState(G10.buildDeck(bank, setup, []), setup), { type: "START" });

test("difficulty filter cuts the deck; the round opens on the actor's private view", () => {
  assert.equal(G10.availableCount(bank, setup), 8);
  assert.equal(G10.availableCount(bank, { levels: ["hard"] }), 4);
  assert.equal(G10.availableCount(bank, { levels: [] }), 0);
  const s = start();
  assert.equal(s.deck.length, G10_ROUNDS);
  assert.ok(s.deck.every((c) => setup.levels.includes(c.category as "easy")));
  assert.equal(s.phase, "private_view");
  assert.equal(s.performer, "A");
  assert.equal(s.timer, null);
});

test("CORRECT before READY is rejected; READY starts the 60s timer", () => {
  const s = start();
  assert.equal(G10.reduce(s, { type: "CORRECT" }), s);
  assert.equal(G10.reduce(s, { type: "TICK", now: 999_999 }), s);
  assert.equal(remainingMs(s, 5_000), 60_000);
  const running = G10.reduce(s, { type: "READY", now: 1_000 });
  assert.equal(running.phase, "timer_running");
  assert.equal(remainingMs(running, 11_000), 50_000);
  assert.notEqual(G10.reduce(running, { type: "CORRECT" }), running);
});

test("the word never leaves the deck: rounds and results carry ids only", () => {
  const s = run<G10State>(G10.reduce, start(), [{ type: "READY", now: 0 }, { type: "CORRECT" }]);
  const round = s.completedRounds[0];
  assert.deepEqual(Object.keys(round).sort(), ["cardId", "correct", "performer", "roundIndex"]);
  const serialized = JSON.stringify({ round, result: G10.deriveResult(s), timer: s.timer });
  for (const c of s.deck) assert.ok(!serialized.includes(c.body), `leaked ${c.body}`);
});

test("PAUSE/RESUME keep the remaining time; TICK past zero expires the round", () => {
  let s = run<G10State>(G10.reduce, start(), [
    { type: "READY", now: 0 },
    { type: "PAUSE", now: 10_000 },
  ]);
  assert.equal(remainingMs(s, 40_000), 50_000);
  s = G10.reduce(s, { type: "RESUME", now: 40_000 });
  assert.equal(remainingMs(s, 45_000), 45_000);
  assert.equal(G10.reduce(s, { type: "TICK", now: 89_999 }), s);
  s = G10.reduce(s, { type: "TICK", now: 90_000 });
  assert.equal(s.phase, "timer_expired");
  assert.equal(remainingMs(s, 999_999), 0);
});

test("six turns alternate A/B; one point per correct word, skips are free", () => {
  const s = run<G10State>(G10.reduce, start(), [
    { type: "READY", now: 0 },
    { type: "CORRECT" }, // A
    { type: "READY", now: 0 },
    { type: "CORRECT" }, // B
    { type: "SKIP" }, // A, before the timer
    { type: "READY", now: 0 },
    { type: "TICK", now: 60_000 },
    { type: "SKIP" }, // B, after expiry
    { type: "READY", now: 0 },
    { type: "CORRECT" }, // A
    { type: "READY", now: 0 },
    { type: "CORRECT" }, // B
  ]);
  assert.equal(s.phase, "results");
  assert.deepEqual(G10.deriveResult(s), {
    completed: 4,
    skipped: 2,
    correct: 4,
    points: { A: 2, B: 2 },
    turns: { A: 2, B: 2 },
  });
  assert.equal(G10.reduce(s, { type: "CORRECT" }), s);
});

test("END mid-session summarises only what was completed", () => {
  const s = run<G10State>(G10.reduce, start(), [
    { type: "READY", now: 0 },
    { type: "CORRECT" },
    { type: "END" },
  ]);
  assert.equal(s.phase, "results");
  assert.equal(s.endedEarly, true);
  assert.deepEqual(G10.deriveResult(s).points, { A: 1, B: 0 });
});
