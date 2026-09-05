import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addLetter,
  canDelete,
  countByState,
  type Letter,
  type LetterDraft,
  letterError,
  removeLetter,
  sortLetters,
  stateOf,
} from "./g29.ts";

const TODAY = "2026-09-05";
const draft = (over: Partial<LetterDraft> = {}): LetterDraft => ({
  from: "A",
  to: "B",
  openAt: "2027-01-01",
  body: "أكثر ما أقدّره فيك هذه السنة هو صبرك.",
  ...over,
});
const letter = (openAt: string): Letter =>
  addLetter([], draft({ openAt }), TODAY, 1_000)[0] ?? assert.fail(`rejected ${openAt}`);

test("a letter is never available before its opening date, not even one day early", () => {
  const l = letter("2026-09-06");
  assert.equal(stateOf(l, "2026-09-04"), "locked");
  assert.equal(stateOf(l, "2026-09-05"), "locked"); // written today, opens tomorrow
  assert.equal(stateOf(l, "2026-09-06"), "available"); // the day itself
  assert.equal(stateOf(l, "2026-12-31"), "available");
  // Year boundaries are just string order — no Date maths, no time-zone drift.
  assert.equal(stateOf(letter("2027-01-01"), "2026-12-31"), "locked");
});

test("validation: the opening date must be after today and the body fits 1000 chars", () => {
  assert.equal(letterError(draft(), TODAY), null);
  assert.equal(letterError(draft({ body: "   " }), TODAY), "body");
  assert.equal(letterError(draft({ body: "ح".repeat(1001) }), TODAY), "body");
  assert.equal(letterError(draft({ openAt: "01/01/2027" }), TODAY), "openAt");
  assert.equal(letterError(draft({ openAt: TODAY }), TODAY), "openAtPast");
  assert.equal(letterError(draft({ openAt: "2026-09-04" }), TODAY), "openAtPast");
  assert.deepEqual(addLetter([], draft({ openAt: TODAY }), TODAY), []); // nothing is saved
});

test("the author may delete only while the letter is still locked", () => {
  const l = letter("2026-09-06");
  assert.equal(canDelete(l, TODAY), true);
  assert.equal(canDelete(l, "2026-09-06"), false);

  const list = [letter("2026-09-10"), letter("2026-10-10"), letter("2026-11-10")];
  const after = removeLetter(list, list[1].id);
  assert.equal(after.length, 2);
  assert.deepEqual(
    after.map((x) => x.openAt),
    ["2026-09-10", "2026-11-10"],
  );
});

test("the list shows available letters first, then the ones opening soonest", () => {
  const list = [letter("2027-05-01"), letter("2026-12-01"), letter("2026-09-30")];
  const sorted = sortLetters(list, "2026-12-15");
  assert.deepEqual(
    sorted.map((l) => l.openAt),
    ["2026-12-01", "2026-09-30", "2027-05-01"],
  );
  assert.deepEqual(countByState(list, "2026-12-15"), { available: 2, locked: 1 });
  assert.deepEqual(countByState(list, TODAY), { available: 0, locked: 3 });
});
