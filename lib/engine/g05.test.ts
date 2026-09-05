import assert from "node:assert/strict";
import { test } from "node:test";
import type { G05Card } from "../content/types";
import { card, ids, run } from "./fixtures.ts";
import { G05, G05_ROUNDS, g05RemainingMs } from "./g05.ts";

const bank = [
  ...ids(8, "D").map((id) => card<G05Card>("G05", id, { category: "daily" })),
  ...ids(3, "F").map((id) => card<G05Card>("G05", id, { category: "feelings" })),
];
const timed = { packs: ["daily" as const], timerSeconds: 30 };
const untimed = { packs: ["daily" as const], timerSeconds: null };
const start = (setup: typeof timed | typeof untimed) =>
  G05.reduce(G05.initialState(G05.buildDeck(bank, setup, []), setup), { type: "START" });

test("six cards from the chosen packs; three answers per person", () => {
  const s = start(timed);
  assert.equal(G05.availableCount(bank, timed), 8);
  assert.equal(s.deck.length, G05_ROUNDS);
  assert.equal(new Set(s.deck.map((c) => c.id)).size, G05_ROUNDS);
  assert.ok(s.deck.every((c) => c.category === "daily"));
  const done = run(G05.reduce, s, [
    { type: "READY", now: 0 },
    { type: "DONE" },
    { type: "NEXT" },
    { type: "READY", now: 0 },
    { type: "DONE" },
    { type: "NEXT" },
    { type: "READY", now: 0 },
    { type: "DONE" },
    { type: "NEXT" },
    { type: "READY", now: 0 },
    { type: "DONE" },
    { type: "NEXT" },
    { type: "READY", now: 0 },
    { type: "DONE" },
    { type: "NEXT" },
    { type: "READY", now: 0 },
    { type: "DONE" },
    { type: "NEXT" },
  ]);
  assert.equal(done.phase, "results");
  assert.deepEqual(
    done.completedRounds.map((r) => r.speaker),
    ["A", "B", "A", "B", "A", "B"],
  );
  assert.deepEqual(G05.deriveResult(done), { completed: 6, skipped: 0 });
});

test("the timer starts on READY only, and DONE moves to the partner's restatement", () => {
  const s = start(timed);
  assert.equal(s.phase, "timer_ready");
  assert.equal(s.timer, null);
  assert.equal(g05RemainingMs(s, 9_999), 30_000);
  assert.equal(G05.reduce(s, { type: "TICK", now: 999_999 }), s); // no timer yet
  const running = G05.reduce(s, { type: "READY", now: 1_000 });
  assert.equal(running.phase, "timer_running");
  assert.equal(g05RemainingMs(running, 11_000), 20_000);
  const expired = G05.reduce(running, { type: "TICK", now: 31_000 });
  assert.equal(expired.phase, "timer_expired");
  assert.equal(g05RemainingMs(expired, 99_000), 0);
  const review = G05.reduce(expired, { type: "DONE" });
  assert.equal(review.phase, "review");
  assert.equal(review.completedRounds.length, 0); // recorded only on NEXT
  const next = G05.reduce(review, { type: "NEXT" });
  assert.equal(next.roundIndex, 1);
  assert.equal(next.phase, "timer_ready");
  assert.equal(next.speaker, "B");
  assert.deepEqual(next.completedRounds, [
    { roundIndex: 0, cardId: next.deck[0].id, speaker: "A" },
  ]);
});

test("skip stays available while the timer is paused (FR-G05 acceptance)", () => {
  const paused = run(G05.reduce, start(timed), [
    { type: "READY", now: 0 },
    { type: "PAUSE", now: 10_000 },
  ]);
  assert.equal(paused.phase, "timer_paused");
  assert.equal(g05RemainingMs(paused, 60_000), 20_000); // the pause froze the clock
  const skipped = G05.reduce(paused, { type: "SKIP" });
  assert.equal(skipped.roundIndex, 1);
  assert.deepEqual(skipped.skippedRounds, [0]);
  assert.equal(skipped.speaker, "B"); // the skipped slot still passes the turn
  assert.equal(skipped.timer, null);
  const resumed = G05.reduce(paused, { type: "RESUME", now: 40_000 });
  assert.equal(g05RemainingMs(resumed, 45_000), 15_000);
});

test("with the timer disabled the round runs without one, and END summarizes early", () => {
  const s = start(untimed);
  assert.equal(s.phase, "card");
  assert.equal(G05.reduce(s, { type: "READY", now: 0 }), s); // nothing to start
  const review = G05.reduce(s, { type: "DONE" });
  assert.equal(review.phase, "review");
  const ended = run(G05.reduce, review, [{ type: "NEXT" }, { type: "DONE" }, { type: "END" }]);
  assert.equal(ended.phase, "results");
  assert.equal(ended.endedEarly, true);
  assert.deepEqual(G05.deriveResult(ended), { completed: 1, skipped: 0 });
  assert.equal(G05.reduce(ended, { type: "NEXT" }), ended);
});
