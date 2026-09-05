import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addMemory,
  citiesOf,
  daysToAnniversary,
  groupByYear,
  isAnniversarySoon,
  type Memory,
  memoryError,
  removeMemory,
} from "./g28.ts";

const draft = (over: Partial<Memory> = {}) => ({
  title: "أوّل رحلة",
  date: "2024-03-10",
  city: "العقبة",
  ...over,
});

const album = (): Memory[] =>
  [
    { title: "أوّل بيت", date: "2023-11-02", city: "عمّان" },
    { title: "المقهى", date: "2024-01-20", city: "إربد" },
    { title: "أوّل رحلة", date: "2024-03-10", city: "العقبة" },
  ].reduce<Memory[]>((list, d, i) => addMemory(list, d, 1_000 + i), []);

test("a draft needs a title, a real date and a city; long text is clipped", () => {
  assert.equal(memoryError(draft()), null);
  assert.equal(memoryError(draft({ title: "   " })), "title");
  assert.equal(memoryError(draft({ date: "10-03-2024" })), "date");
  assert.equal(memoryError(draft({ city: "" })), "city");
  assert.equal(memoryError({ ...draft(), note: "ن".repeat(201) }), "note");

  const saved = addMemory([], { ...draft({ title: "ع".repeat(80) }), note: " مساء جميل " }, 5)[0];
  assert.equal(saved.title.length, 60);
  assert.equal(saved.note, "مساء جميل");
  assert.equal(saved.at, 5);
  assert.deepEqual(addMemory([], draft({ title: "" })), []); // invalid drafts change nothing
});

test("deleting one memory leaves the rest intact", () => {
  const list = album();
  assert.equal(list.length, 3);
  const target = list[1];
  const after = removeMemory(list, target.id);
  assert.equal(after.length, 2);
  assert.ok(!after.some((m) => m.id === target.id));
  assert.deepEqual(
    after.map((m) => m.title),
    list.filter((m) => m.id !== target.id).map((m) => m.title),
  );
  assert.deepEqual(removeMemory(list, "لا-يوجد"), list.slice()); // unknown id removes nothing
});

test("browsing: grouped by year (newest first) and filtered by the cities that exist", () => {
  const groups = groupByYear(album());
  assert.deepEqual(
    groups.map((g) => g.year),
    ["2024", "2023"],
  );
  assert.deepEqual(
    groups[0].items.map((m) => m.title),
    ["أوّل رحلة", "المقهى"],
  );
  assert.deepEqual(
    groups[1].items.map((m) => m.city),
    ["عمّان"],
  );
  assert.deepEqual(citiesOf(album()).length, 3);
  assert.deepEqual(citiesOf([]), []);
});

test("anniversary hint: within 7 days of the month-day, in either direction and across the year end", () => {
  assert.equal(daysToAnniversary("2020-03-10", "2026-03-10"), 0);
  assert.equal(daysToAnniversary("2020-03-17", "2026-03-10"), 7);
  assert.equal(daysToAnniversary("2020-03-03", "2026-03-10"), -7);
  assert.equal(isAnniversarySoon("2020-03-18", "2026-03-10"), false);
  assert.equal(isAnniversarySoon("2020-03-02", "2026-03-10"), false);
  // 28 Dec is five days from 2 Jan even though the years differ.
  assert.equal(daysToAnniversary("2019-12-28", "2026-01-02"), -5);
  assert.equal(isAnniversarySoon("2019-12-28", "2026-01-02"), true);
});
