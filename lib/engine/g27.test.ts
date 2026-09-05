import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ALL_WISHES,
  addWish,
  canAddWish,
  filterWishes,
  markWishTried,
  pickTogether,
  planWish,
  removeWish,
  WISH_TITLE_MAX,
  type Wish,
  wishCounts,
} from "./g27.ts";

const draft = (title: string, by: Wish["by"] = "A") =>
  ({ by, title, cost: "free", when: "someday" }) as const;

const jar = (): Wish[] =>
  addWish(
    addWish(addWish([], draft("نرى الشروق"), "w1"), draft("رحلة قطار", "B"), "w2"),
    {
      ...draft("ورشة قصيرة"),
      cost: "medium",
      when: "date",
      date: "2026-10-01",
    },
    "w3",
  );

test("adding: newest first, title trimmed and capped, blank titles rejected", () => {
  const wishes = jar();
  assert.deepEqual(
    wishes.map((w) => w.id),
    ["w3", "w2", "w1"],
  );
  assert.equal(wishes[0].date, "2026-10-01");
  assert.equal(wishes[2].date, undefined); // "someday" carries no date
  assert.equal(
    wishes.every((w) => w.state === "idea"),
    true,
  );
  assert.equal(canAddWish(draft("   ")), false);
  assert.equal(addWish(wishes, draft("  ")).length, 3);
  const long = addWish([], draft("ا".repeat(120)), "long")[0];
  assert.equal(long.title.length, WISH_TITLE_MAX);
});

test("filtering by state and cost", () => {
  const wishes = jar();
  assert.equal(filterWishes(wishes, ALL_WISHES).length, 3);
  assert.deepEqual(
    filterWishes(wishes, { state: "all", cost: "free" }).map((w) => w.id),
    ["w2", "w1"],
  );
  const planned = planWish(wishes, "w1", "  نضبط المنبّه  ");
  assert.deepEqual(
    filterWishes(planned, { state: "planned", cost: "all" }).map((w) => w.id),
    ["w1"],
  );
});

test("choosing one together picks an idea and its first step makes it a plan", () => {
  const wishes = jar();
  const chosen = pickTogether(wishes, () => 0);
  assert.equal(chosen?.id, "w3");
  const planned = planWish(wishes, "w3", " نحجز مكاناً ");
  assert.equal(planned[0].state, "planned");
  assert.equal(planned[0].step, "نحجز مكاناً");
  // An empty step is not a plan; nothing changes.
  assert.equal(planWish(wishes, "w3", "   "), wishes);
  // Only ideas are drawn; when none is left the jar simply has nothing to pick.
  const allPlanned = planned.map((w) => ({ ...w, state: "planned" as const }));
  assert.equal(pickTogether(allPlanned), null);
});

test("marking tried and deleting one wish leave the others untouched", () => {
  const wishes = planWish(jar(), "w2", "نشتري التذكرتين");
  const tried = markWishTried(wishes, "w2");
  assert.deepEqual(wishCounts(tried), { idea: 2, planned: 0, tried: 1 });
  assert.equal(tried.find((w) => w.id === "w2")?.step, "نشتري التذكرتين");
  const left = removeWish(tried, "w2");
  assert.deepEqual(
    left.map((w) => w.id),
    ["w3", "w1"],
  );
  assert.equal(removeWish(left, "missing").length, 2);
});
