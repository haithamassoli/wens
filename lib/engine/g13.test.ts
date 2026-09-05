import assert from "node:assert/strict";
import { test } from "node:test";
import type { G13Card } from "../content/types";
import { card, ids, run } from "./fixtures.ts";
import { drawn, G13, G13_ROUNDS, type G13State } from "./g13.ts";
import { remainingMs } from "./perform.ts";

const pile = (slot: string, n: number, from: number) =>
  ids(n + from, "G13")
    .slice(from)
    .map((id) => card<G13Card>("G13", id, { category: slot, body: `${slot}-${id}` }));

const bank = [...pile("product", 20, 0), ...pile("style", 10, 20), ...pile("audience", 10, 30)];
const start = (): G13State =>
  G13.reduce(G13.initialState(G13.buildDeck(bank, {}, []), {}), { type: "START" });

test("four rounds, each frozen on one product, one style and one audience", () => {
  assert.equal(G13.availableCount(bank, {}), 10); // the smallest pile limits the session
  const s = start();
  assert.equal(s.deck.length, G13_ROUNDS);
  assert.equal(s.phase, "card");
  assert.equal(s.announcer, "A");
  const elements = drawn(s);
  if (!elements) throw new Error("round has no elements");
  assert.equal(elements.product.category, "product");
  assert.equal(elements.style.category, "style");
  assert.equal(elements.audience.category, "audience");
  // Frozen: the timer starting changes nothing about the three elements.
  assert.deepEqual(drawn(G13.reduce(s, { type: "READY", now: 0 })), elements);
});

test("exactly one element may be replaced, and only before the timer starts", () => {
  const s = start();
  const before = drawn(s);
  const swapped = G13.reduce(s, { type: "REPLACE", slot: "style" });
  const after = drawn(swapped);
  if (!before || !after) throw new Error("round has no elements");
  assert.notEqual(after.style.id, before.style.id);
  assert.equal(after.product.id, before.product.id);
  assert.equal(after.audience.id, before.audience.id);

  // A second swap, an unknown slot, and a swap after READY are all refused.
  assert.equal(G13.reduce(swapped, { type: "REPLACE", slot: "product" }), swapped);
  assert.equal(G13.reduce(s, { type: "REPLACE", slot: "colour" }), s);
  const running = G13.reduce(s, { type: "READY", now: 0 });
  assert.equal(G13.reduce(running, { type: "REPLACE", slot: "product" }), running);
});

test("30-second timer: DONE opens the review, NEXT records the performance", () => {
  const s = start();
  assert.equal(remainingMs(s, 5_000), 30_000);
  let t = G13.reduce(s, { type: "READY", now: 0 });
  assert.equal(remainingMs(t, 10_000), 20_000);
  assert.equal(G13.reduce(t, { type: "TICK", now: 29_999 }), t);
  t = G13.reduce(t, { type: "TICK", now: 30_000 });
  assert.equal(t.phase, "timer_expired");
  t = G13.reduce(t, { type: "DONE" });
  assert.equal(t.phase, "review");
  assert.equal(t.completedRounds.length, 0); // nothing is recorded until the partner is done
  const next = G13.reduce(t, { type: "NEXT" });
  assert.equal(next.completedRounds.length, 1);
  assert.equal(next.roundIndex, 1);
  assert.equal(next.phase, "card");
  assert.equal(next.announcer, "B");
  assert.equal(next.replaced, null);
});

test("completed performances are counted per announcer, with no ranking", () => {
  const s = run<G13State>(G13.reduce, start(), [
    { type: "REPLACE", slot: "audience" },
    { type: "READY", now: 0 },
    { type: "DONE" },
    { type: "NEXT" }, // A
    { type: "READY", now: 0 },
    { type: "DONE" },
    { type: "NEXT" }, // B
    { type: "SKIP" }, // A, before the timer
    { type: "READY", now: 0 },
    { type: "DONE" },
    { type: "NEXT" }, // B
  ]);
  assert.equal(s.phase, "results");
  assert.deepEqual(G13.deriveResult(s), {
    completed: 3,
    skipped: 1,
    performances: { A: 1, B: 2 },
  });
  assert.equal(G13.reduce(s, { type: "NEXT" }), s);
});
