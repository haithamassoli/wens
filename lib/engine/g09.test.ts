import assert from "node:assert/strict";
import { test } from "node:test";
import type { TimerCard } from "../content/types";
import { card, ids, run } from "./fixtures.ts";
import { G09, remainingMs } from "./g09.ts";

const bank = ids(7, "G09").map((id, i) =>
  card<TimerCard>("G09", id, {
    durationSeconds: 60,
    steps: ["x"],
    alternative: "",
    requiresTools: i === 5,
    requiresMovement: i === 6,
  }),
);
const setup = { noTools: true, noMovement: true };
const start = () =>
  G09.reduce(G09.initialState(G09.buildDeck(bank, setup, []), setup), { type: "START" });

test("filters exclude tool/movement cards; drawing does not start the timer, READY does", () => {
  assert.equal(G09.availableCount(bank, setup), 5);
  assert.equal(G09.availableCount(bank, { noTools: false, noMovement: false }), 7);
  const s = start();
  assert.equal(s.deck.length, 5);
  assert.equal(s.phase, "timer_ready");
  assert.equal(s.timer, null);
  assert.equal(remainingMs(s, 5_000), 60_000);
  assert.equal(G09.reduce(s, { type: "TICK", now: 999_999 }), s);
  assert.equal(G09.reduce(s, { type: "DONE" }), s);
  const running = G09.reduce(s, { type: "READY", now: 1_000 });
  assert.equal(running.phase, "timer_running");
  assert.deepEqual(running.timer, {
    durationMs: 60_000,
    startedAt: 1_000,
    pausedAt: null,
    pausedTotalMs: 0,
  });
  assert.equal(remainingMs(running, 11_000), 50_000);
});

test("PAUSE preserves remaining time; RESUME continues from it", () => {
  let s = run(G09.reduce, start(), [
    { type: "READY", now: 0 },
    { type: "PAUSE", now: 10_000 },
  ]);
  assert.equal(s.phase, "timer_paused");
  assert.equal(remainingMs(s, 40_000), 50_000);
  assert.equal(G09.reduce(s, { type: "TICK", now: 999_999 }), s);
  s = G09.reduce(s, { type: "RESUME", now: 40_000 });
  assert.equal(s.phase, "timer_running");
  assert.equal(remainingMs(s, 45_000), 45_000);
  assert.equal(G09.reduce(s, { type: "RESUME", now: 46_000 }), s);
});

test("expiry via TICK; DONE/SKIP available after expiry", () => {
  let s = run(G09.reduce, start(), [{ type: "READY", now: 0 }]);
  assert.equal(G09.reduce(s, { type: "TICK", now: 59_999 }), s);
  s = G09.reduce(s, { type: "TICK", now: 60_000 });
  assert.equal(s.phase, "timer_expired");
  assert.equal(remainingMs(s, 90_000), 0);
  assert.equal(G09.reduce(s, { type: "READY", now: 1 }), s);
  const done = G09.reduce(s, { type: "DONE" });
  assert.equal(done.roundIndex, 1);
  assert.equal(done.phase, "timer_ready");
  assert.equal(done.timer, null);
  assert.equal(done.completedRounds.length, 1);
});

test("3 done + 2 skipped → completed 3, skipped 2", () => {
  const s = run(G09.reduce, start(), [
    { type: "READY", now: 0 },
    { type: "DONE" },
    { type: "READY", now: 0 },
    { type: "TICK", now: 60_000 },
    { type: "SKIP" },
    { type: "READY", now: 0 },
    { type: "PAUSE", now: 5 },
    { type: "DONE" },
    { type: "SKIP" }, // skip before starting the timer
    { type: "READY", now: 0 },
    { type: "DONE" },
  ]);
  assert.equal(s.phase, "results");
  assert.deepEqual(G09.deriveResult(s), { completed: 3, skipped: 2 });
  assert.equal(G09.reduce(s, { type: "DONE" }), s);
});
