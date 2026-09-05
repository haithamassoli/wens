import assert from "node:assert/strict";
import { test } from "node:test";
import type { G30Card } from "../content/types";
import { card, ids } from "./fixtures.ts";
import {
  addEntry,
  badgesFor,
  type Entry,
  entryError,
  G30,
  type G30Setup,
  nextBadge,
  removeEntry,
  suggest,
  triedIds,
} from "./g30.ts";

const CATS = ["home", "outside", "food", "creative"] as const;
const bank = ids(12, "G30").map((id, i) =>
  card<G30Card>("G30", id, {
    category: CATS[i % 4],
    minutes: 20 + i,
    costTier: i % 3 === 0 ? "low" : "free",
  }),
);
const setup = (over: Partial<G30Setup> = {}): G30Setup => ({
  categories: [],
  costTier: "any",
  ...over,
});

const log = (): Entry[] =>
  [
    ["G30-001", "أضحكنا الدقيق أكثر من البيتزا."],
    ["G30-004", "الشروق كان يستحقّ الاستيقاظ."],
    ["G30-007", "اخترنا كتابين لم نتوقّعهما."],
  ].reduce<Entry[]>((l, [id, text]) => addEntry(l, id, text, "2026-09-05"), []);

test("filters cut the suggestion deck by category and cost", () => {
  assert.equal(G30.availableCount(bank, setup()), 12);
  assert.equal(G30.availableCount(bank, setup({ categories: ["food"] })), 3);
  assert.equal(G30.availableCount(bank, setup({ costTier: "low" })), 4);
  assert.equal(G30.availableCount(bank, setup({ categories: ["food"], costTier: "low" })), 1);
  const deck = G30.buildDeck(bank, setup({ categories: ["home", "food"] }), []);
  assert.equal(deck.length, 6);
  assert.ok(deck.every((c) => c.category === "home" || c.category === "food"));
});

test("an impression is required and capped at 200 characters", () => {
  assert.equal(entryError("جرّبناها وأعجبتنا"), null);
  assert.equal(entryError("   "), "impression");
  assert.equal(entryError("ط".repeat(201)), "impression");
  assert.deepEqual(addEntry([], "G30-001", "  ", "2026-09-05"), []);
  const saved = addEntry([], "G30-001", "  ليلة لطيفة  ", "2026-09-05")[0];
  assert.equal(saved.impression, "ليلة لطيفة");
  assert.equal(saved.cardId, "G30-001");
  assert.equal(saved.date, "2026-09-05");
});

test("deleting one experience leaves the other memories intact", () => {
  const list = log();
  assert.equal(list.length, 3);
  const target = list[1];
  const after = removeEntry(list, target.id);
  assert.equal(after.length, 2);
  assert.ok(!after.some((e) => e.id === target.id));
  assert.deepEqual(
    after.map((e) => e.impression),
    list.filter((e) => e.id !== target.id).map((e) => e.impression),
  );
  assert.deepEqual(triedIds(after).sort(), ["G30-001", "G30-007"]);
});

test("badges are count-based, cumulative and say nothing about the relationship", () => {
  assert.deepEqual(badgesFor(0), []);
  assert.deepEqual(badgesFor(1), ["أوّل تجربة"]);
  assert.deepEqual(badgesFor(4), ["أوّل تجربة"]);
  assert.deepEqual(badgesFor(10), ["أوّل تجربة", "5 تجارب", "10 تجارب"]);
  assert.deepEqual(badgesFor(30), badgesFor(10)); // no badge beyond the last one
  assert.deepEqual(nextBadge(3), { label: "5 تجارب", remaining: 2 });
  assert.equal(nextBadge(10), null);
});

test("a suggestion prefers something untried, and never stalls once all are tried", () => {
  const deck = G30.buildDeck(bank, setup(), []);
  const tried = deck.slice(0, 11).map((c) => c.id);
  assert.equal(suggest(deck, tried).id, deck[11].id);
  const allTried = deck.map((c) => c.id);
  const fallback = suggest(deck, allTried);
  assert.ok(allTried.includes(fallback.id));
});
