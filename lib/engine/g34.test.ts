import assert from "node:assert/strict";
import { test } from "node:test";
import type { G34Card } from "../content/types";
import { card, ids, run } from "./fixtures.ts";
import { G34, G34_TIMER_MS, type G34Setup, remaining, themesFor } from "./g34.ts";

const bank = ids(10, "G34").map((id, i) =>
  card<G34Card>("G34", id, {
    category: i < 4 ? "home" : "outside",
    hint: "تلميح",
  }),
);
const setup: G34Setup = { categories: [] };
const start = (s: G34Setup = setup) =>
  G34.reduce(G34.initialState(G34.buildDeck(bank, s, []), s), { type: "START" });

test("three rounds, two themes each; the category filter narrows the pool", () => {
  const s = start();
  assert.equal(s.deck.length, 6);
  assert.equal(s.phase, "card");
  assert.equal(s.timer, null);
  const [a, b] = themesFor(s, 0);
  assert.notEqual(a.id, b.id);
  assert.equal(G34.availableCount(bank, setup), 10);
  assert.equal(G34.availableCount(bank, { categories: ["home"] }), 4);
  assert.equal(start({ categories: ["home"] }).deck.length, 4); // only two rounds available
});

test("the timer is optional: DONE straight from the card reaches the pick", () => {
  const s = G34.reduce(start(), { type: "DONE" });
  assert.equal(s.phase, "reveal");
  assert.equal(s.timer, null);
  assert.equal(G34.reduce(s, { type: "READY", now: 0 }), s);
});

test("when used, the 15-minute timer pauses and expires like G09", () => {
  let s = G34.reduce(start(), { type: "READY", now: 1_000 });
  assert.equal(s.phase, "timer_running");
  assert.equal(remaining(s, 1_000 + 60_000), G34_TIMER_MS - 60_000);
  s = G34.reduce(s, { type: "PAUSE", now: 61_000 });
  assert.equal(s.phase, "timer_paused");
  assert.equal(remaining(s, 999_999), G34_TIMER_MS - 60_000);
  s = G34.reduce(s, { type: "RESUME", now: 121_000 });
  assert.equal(G34.reduce(s, { type: "TICK", now: 121_000 }), s);
  s = G34.reduce(s, { type: "TICK", now: 1_000 + G34_TIMER_MS + 60_000 });
  assert.equal(s.phase, "timer_expired");
  assert.equal(G34.reduce(s, { type: "DONE" }).phase, "reveal");
});

test("the funniest photo is picked together; NEXT waits for that pick", () => {
  const s = G34.reduce(start(), { type: "DONE" });
  assert.equal(G34.reduce(s, { type: "NEXT" }), s); // nothing chosen yet
  assert.equal(G34.reduce(s, { type: "SET", key: "funniest", value: "C" }), s);
  const picked = G34.reduce(s, { type: "SET", key: "funniest", value: "both" });
  assert.equal(picked.choice, "both");
  const next = G34.reduce(picked, { type: "NEXT" });
  assert.equal(next.roundIndex, 1);
  assert.equal(next.phase, "card");
  assert.equal(next.choice, null);
  const [a, b] = themesFor(picked, 0);
  assert.deepEqual(next.completedRounds, [
    { roundIndex: 0, cardId: a.id, cardIdB: b.id, funniest: "both" },
  ]);
});

test("2 played + 1 skipped ends the session and the result keeps no tally", () => {
  const s = run(G34.reduce, start(), [
    { type: "DONE" },
    { type: "SET", key: "funniest", value: "A" },
    { type: "NEXT" },
    { type: "SKIP" },
    { type: "READY", now: 0 },
    { type: "DONE" },
    { type: "SET", key: "funniest", value: "A" },
    { type: "NEXT" },
  ]);
  assert.equal(s.phase, "results");
  assert.equal(s.endedEarly, false);
  const result = G34.deriveResult(s);
  assert.equal(result.completed, 2);
  assert.equal(result.skipped, 1);
  assert.deepEqual(
    result.rounds.map((r) => r.funniest),
    ["A", "A"],
  );
  assert.equal("winner" in result, false); // no automated scoring
});
