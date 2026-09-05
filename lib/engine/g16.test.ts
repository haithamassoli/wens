import assert from "node:assert/strict";
import { test } from "node:test";
import type { G16Card } from "../content/types";
import { card, run } from "./fixtures.ts";
import { G16, type G16Setup, relaxHints } from "./g16.ts";

const recipe = (n: number, ingredients: string[]): G16Card =>
  card<G16Card>("G16", `G16-00${n}`, {
    category: "salad",
    ingredients,
    tools: ["سكين"],
    minutes: 10,
    steps: ["أ", "ب", "ج"],
    tasks: ["يقطّع", "يخلط"],
  });

const bank = [
  recipe(1, ["خبز", "جبن"]),
  recipe(2, ["بيض", "طماطم"]),
  recipe(3, ["خبز", "جبن", "طماطم"]),
  recipe(4, ["أرز", "دجاج"]),
];

const setup = (available: string[], excluded: string[] = []): G16Setup => ({
  available,
  excluded,
});

const start = (s: G16Setup) =>
  G16.reduce(G16.initialState(G16.buildDeck(bank, s, []), s), {
    type: "START",
  });

test("matching is strict: every ingredient available and none excluded", () => {
  assert.equal(G16.availableCount(bank, setup(["خبز", "جبن"])), 1);
  assert.equal(G16.availableCount(bank, setup(["خبز", "جبن", "طماطم", "بيض"])), 3);
  // Everything available, but جبن is excluded → the two cheese recipes drop out.
  assert.equal(G16.availableCount(bank, setup(["خبز", "جبن", "طماطم", "بيض"], ["جبن"])), 1);
  // An ingredient ticked as both available and excluded stays excluded.
  assert.equal(G16.availableCount(bank, setup(["خبز", "جبن"], ["جبن"])), 0);
});

test("no-match hints propose ingredients to add and never touch an exclusion", () => {
  const s = setup(["خبز"], ["جبن"]);
  assert.equal(G16.availableCount(bank, s), 0);
  const hints = relaxHints(bank, s);
  assert.equal(hints.blockedByExclusions, false);
  assert.ok(hints.suggest.length > 0);
  assert.ok(!hints.suggest.some((h) => h.ingredient === "جبن"));
  // Suggestions may only come from recipes that contain nothing excluded.
  assert.deepEqual(hints.suggest.map((h) => h.ingredient).sort(), ["أرز", "بيض", "دجاج", "طماطم"]);
  assert.equal(hints.closestMissing, 2);
});

test("when every recipe is excluded the hint says so instead of ignoring the exclusions", () => {
  const s = setup([], ["جبن", "طماطم", "دجاج"]);
  const hints = relaxHints(bank, s);
  assert.equal(hints.blockedByExclusions, true);
  assert.deepEqual(hints.suggest, []);
  assert.equal(G16.availableCount(bank, s), 0);
});

test("rejecting suggestions walks the matching recipes and never scores the couple", () => {
  const s = setup(["خبز", "جبن", "طماطم"]);
  const first = start(s);
  assert.equal(first.deck.length, 2);
  assert.equal(first.phase, "card");
  const second = G16.reduce(first, { type: "SKIP" });
  assert.equal(second.phase, "card");
  assert.equal(second.roundIndex, 1);
  assert.notEqual(second.deck[1].id, first.deck[0].id);
  // Rejecting the last one ends the session without a dish and without blame.
  const none = G16.reduce(second, { type: "SKIP" });
  assert.equal(none.phase, "results");
  assert.deepEqual(G16.deriveResult(none), {
    cardId: null,
    cooked: false,
    rejected: 2,
    presentation: null,
  });
});

test("DONE then a playful presentation label; an unknown label is ignored", () => {
  const s = setup(["خبز", "جبن", "طماطم"]);
  const cooked = run(G16.reduce, start(s), [{ type: "SKIP" }, { type: "DONE" }]);
  assert.equal(cooked.phase, "reveal");
  assert.equal(G16.reduce(cooked, { type: "SET", key: "presentation", value: "nope" }), cooked);
  assert.equal(G16.reduce(cooked, { type: "SET", key: "other", value: "chef" }), cooked);
  const rated = G16.reduce(cooked, { type: "SET", key: "presentation", value: "art" });
  assert.equal(rated.presentation, "art");
  const done = G16.reduce(rated, { type: "NEXT" });
  assert.equal(done.phase, "results");
  assert.deepEqual(G16.deriveResult(done), {
    cardId: cooked.deck[1].id,
    cooked: true,
    rejected: 1,
    presentation: "art",
  });
});
