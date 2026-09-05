import assert from "node:assert/strict";
import { test } from "node:test";
import type { WheelCard } from "../content/types";
import { card, run } from "./fixtures.ts";
import { G25, type G25Setup, matchingPool } from "./g25.ts";

const w = (id: string, extra: Partial<WheelCard>) =>
  card<WheelCard>("G25", id, { minMinutes: 10, maxMinutes: 30, materials: [], ...extra });
const bank = [
  w("in-free", { location: "indoor", costTier: "free" }),
  w("in-low", { location: "indoor", costTier: "low" }),
  w("in-flex", { location: "indoor", costTier: "flexible" }),
  w("out-free", { location: "outdoor", costTier: "free" }),
  w("any-free", { location: "any", costTier: "free" }),
  w("any-free-tools", { location: "any", costTier: "free", requiresTools: true }),
  w("any-free-long", { location: "any", costTier: "free", minMinutes: 90, maxMinutes: 120 }),
  w("draft", { location: "indoor", costTier: "free", status: "draft" }),
];
const all: G25Setup = { location: "any", costTier: "any", maxMinutes: null, noTools: false };
const idsOf = (setup: G25Setup) =>
  matchingPool(bank, setup)
    .map((c) => c.id)
    .sort();
const begin = (setup: G25Setup) =>
  G25.reduce(G25.initialState(G25.buildDeck(bank, setup, []), setup), { type: "START" });

test("filters: indoor + free excludes paid and outdoor; tiers nest; time and tools", () => {
  assert.deepEqual(idsOf({ ...all, location: "indoor", costTier: "free" }), [
    "any-free",
    "any-free-long",
    "any-free-tools",
    "in-free",
  ]);
  assert.deepEqual(idsOf({ ...all, location: "indoor", costTier: "low" }).includes("in-low"), true);
  assert.deepEqual(
    idsOf({ ...all, location: "indoor", costTier: "low" }).includes("in-flex"),
    false,
  );
  assert.equal(idsOf(all).length, 7); // draft excluded
  assert.deepEqual(idsOf({ ...all, maxMinutes: 30 }).includes("any-free-long"), false);
  assert.deepEqual(idsOf({ ...all, noTools: true }).includes("any-free-tools"), false);
  assert.equal(G25.availableCount(bank, { ...all, location: "outdoor" }), 4);
});

test("SPIN picks before animation; NEXT finishes; SPIN during spinning rejected", () => {
  const s0 = begin(all);
  assert.equal(s0.phase, "wheel_idle");
  assert.equal(s0.pool.length, 7);
  const spinning = G25.reduce(s0, { type: "SPIN", seed: 3 });
  assert.equal(spinning.phase, "wheel_spinning");
  assert.equal(spinning.selectedId, s0.pool[3]);
  assert.deepEqual(spinning.shown, [spinning.selectedId]);
  assert.equal(G25.reduce(spinning, { type: "SPIN" }), spinning);
  assert.equal(G25.reduce(spinning, { type: "DONE" }), spinning);
  const result = G25.reduce(spinning, { type: "NEXT" });
  assert.equal(result.phase, "wheel_result");
  assert.equal(result.selectedId, spinning.selectedId);
  const done = G25.reduce(result, { type: "DONE" });
  assert.deepEqual(G25.deriveResult(done), { selectedId: result.selectedId, done: true });
  assert.equal(G25.reduce(done, { type: "DONE" }), done);
});

test("sole match is shown directly (no spinning phase)", () => {
  const setup: G25Setup = { location: "indoor", costTier: "free", maxMinutes: 30, noTools: true };
  const only = G25.reduce(G25.initialState(G25.buildDeck(bank.slice(0, 2), setup, []), setup), {
    type: "START",
  });
  assert.deepEqual(only.pool, ["in-free"]);
  const shown = G25.reduce(only, { type: "SPIN" });
  assert.equal(shown.phase, "wheel_result");
  assert.equal(shown.selectedId, "in-free");
});

test("zero matches → exhausted flag, no selection, filters never relaxed", () => {
  const s0 = begin({ location: "outdoor", costTier: "free", maxMinutes: 5, noTools: true });
  assert.equal(s0.pool.length, 0);
  const s = G25.reduce(s0, { type: "SPIN" });
  assert.equal(s.phase, "wheel_idle");
  assert.equal(s.exhausted, true);
  assert.equal(s.selectedId, null);
  assert.equal(G25.reduce(s, { type: "SPIN" }), s);
});

test("shown results are excluded until exhausted; RESET_POOL clears them", () => {
  let s = begin(all);
  const seen: string[] = [];
  for (let i = 0; i < 7; i++) {
    s = run(G25.reduce, s, [{ type: "SPIN", seed: 0 }, { type: "NEXT" }]);
    assert.ok(!seen.includes(s.selectedId as string));
    seen.push(s.selectedId as string);
  }
  assert.equal(s.shown.length, 7);
  const exhausted = G25.reduce(s, { type: "SPIN" });
  assert.equal(exhausted.exhausted, true);
  assert.equal(exhausted.phase, "wheel_idle");
  const reset = G25.reduce(exhausted, { type: "RESET_POOL" });
  assert.deepEqual(reset.shown, []);
  assert.equal(reset.exhausted, false);
  assert.equal(G25.reduce(reset, { type: "SPIN", seed: 1 }).phase, "wheel_spinning");
  assert.equal(G25.reduce(reset, { type: "RESET_POOL" }), reset);
});
