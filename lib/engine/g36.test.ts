import assert from "node:assert/strict";
import { test } from "node:test";
import type { G36Card } from "../content/types";
import { card, run } from "./fixtures.ts";
import { G36, type G36Setup, matchingIdeas } from "./g36.ts";

const idea = (id: string, extra: Partial<G36Card>) =>
  card<G36Card>("G36", id, { minutes: 10, materials: [], costTier: "free", ...extra });
const bank = [
  idea("free-1", { category: "family" }),
  idea("free-2", { category: "home" }),
  idea("free-3", { category: "neighbours" }),
  idea("low-1", { costTier: "low", category: "community" }),
  idea("low-2", { costTier: "low", category: "neighbours" }),
  idea("draft", { status: "draft" }),
];
const any: G36Setup = { freeOnly: false };
const free: G36Setup = { freeOnly: true };
const begin = (setup: G36Setup) =>
  G36.reduce(G36.initialState(G36.buildDeck(bank, setup, []), setup), { type: "START" });

test("«بدون تكلفة» keeps only free ideas; drafts never appear", () => {
  assert.deepEqual(
    matchingIdeas(bank, free).map((c) => c.id),
    ["free-1", "free-2", "free-3"],
  );
  assert.equal(matchingIdeas(bank, any).length, 5);
  assert.equal(G36.availableCount(bank, free), 3);
  assert.equal(begin(free).pool.length, 3);
});

test("«فكرة أخرى» never repeats an idea until the pool is used up, and never relaxes the filter", () => {
  let s = begin(free);
  assert.equal(s.phase, "wheel_idle");
  const seen: string[] = [];
  for (let i = 0; i < 3; i++) {
    s = G36.reduce(s, { type: "SPIN", seed: i });
    assert.equal(s.phase, "wheel_result");
    assert.ok(s.selectedId);
    seen.push(s.selectedId as string);
  }
  assert.equal(new Set(seen).size, 3);
  for (const id of seen) assert.ok(["free-1", "free-2", "free-3"].includes(id));
  // nothing left: the empty state is explained, not filled with a paid idea
  s = G36.reduce(s, { type: "SPIN", seed: 0 });
  assert.equal(s.exhausted, true);
  assert.equal(s.selectedId, null);
  assert.equal(s.phase, "wheel_idle");
  const reset = G36.reduce(s, { type: "RESET_POOL" });
  assert.deepEqual(reset.shown, []);
  assert.equal(reset.exhausted, false);
});

test("«نقبل» is a session-only state and resets when another idea is drawn", () => {
  let s = run(G36.reduce, begin(any), [{ type: "SPIN", seed: 1 }, { type: "DONE" }]);
  assert.equal(s.accepted, true);
  assert.deepEqual(G36.deriveResult(s), { selectedId: s.selectedId, accepted: true });
  assert.equal(G36.reduce(s, { type: "DONE" }), s);
  s = G36.reduce(s, { type: "SPIN", seed: 2 });
  assert.equal(s.accepted, false);
  // DONE before any idea is drawn does nothing
  const idle = begin(any);
  assert.equal(G36.reduce(idle, { type: "DONE" }), idle);
});

test("END closes the session and later events are ignored", () => {
  const s = G36.reduce(run(G36.reduce, begin(any), [{ type: "SPIN", seed: 3 }]), { type: "END" });
  assert.equal(s.phase, "results");
  assert.equal(s.ended, true);
  assert.equal(G36.reduce(s, { type: "SPIN", seed: 4 }), s);
});
