import assert from "node:assert/strict";
import { test } from "node:test";
import type { G32Card } from "../content/types";
import { card } from "./fixtures.ts";
import {
  canStartMission,
  customMission,
  MISSION_TITLE_MAX,
  missionFromCard,
  missionProgress,
  postponeMission,
  resumeMission,
  setMissionReviewDate,
  setMissionStepText,
  swapMissionSteps,
  toggleMissionStep,
} from "./g32.ts";

const suggestion = card<G32Card>("G32", "G32-001", {
  category: "home",
  body: "نرتّب رفّاً واحداً",
  steps: ["يُفرغ الرفّ ويمسحه.", "يعيد الترتيب ويُخرج الزائد."],
});

test("a suggestion or a custom title both give one active mission with two steps", () => {
  const m = missionFromCard(suggestion);
  assert.equal(m.cardId, "G32-001");
  assert.equal(m.title, "نرتّب رفّاً واحداً");
  assert.deepEqual(m.stepA, { text: "يُفرغ الرفّ ويمسحه.", done: false });
  assert.equal(m.state, "active");

  const own = customMission("  ننظّف الشرفة  ");
  assert.equal(own.cardId, null);
  assert.equal(own.title, "ننظّف الشرفة");
  assert.equal(canStartMission(own), true);
  assert.equal(canStartMission(customMission("   ")), false);
  assert.equal(customMission("ط".repeat(90)).title.length, MISSION_TITLE_MAX);
});

test("editing the two steps and swapping who does which keeps the done flags in place", () => {
  let m = missionFromCard(suggestion);
  m = setMissionStepText(m, "stepB", "  يرتّب الكتب  ");
  assert.equal(m.stepB.text, "يرتّب الكتب");
  m = toggleMissionStep(m, "stepA");
  const swapped = swapMissionSteps(m);
  assert.equal(swapped.stepA.text, "يرتّب الكتب");
  assert.equal(swapped.stepB.text, "يُفرغ الرفّ ويمسحه.");
  assert.equal(swapped.stepA.done, true);
  assert.equal(swapped.stepB.done, false);
});

test("shared progress only: the mission is done when both steps are, and reopens if unticked", () => {
  let m = missionFromCard(suggestion);
  assert.equal(missionProgress(m), 0);
  m = toggleMissionStep(m, "stepA");
  assert.equal(m.state, "active");
  assert.equal(missionProgress(m), 1);
  m = toggleMissionStep(m, "stepB");
  assert.equal(m.state, "done");
  m = toggleMissionStep(m, "stepB");
  assert.equal(m.state, "active");
  assert.equal(missionProgress(m), 1);
});

test("an optional review date can be set and cleared; postponing freezes the steps", () => {
  let m = setMissionReviewDate(missionFromCard(suggestion), "2026-09-20");
  assert.equal(m.reviewDate, "2026-09-20");
  assert.equal(setMissionReviewDate(m, "").reviewDate, undefined);

  m = postponeMission(m);
  assert.equal(m.state, "postponed");
  assert.equal(toggleMissionStep(m, "stepA"), m); // no progress while postponed
  assert.equal(postponeMission(m), m);
  assert.equal(resumeMission(m).state, "active");

  const half = toggleMissionStep(missionFromCard(suggestion), "stepA");
  const bothDone = postponeMission(toggleMissionStep(half, "stepB"));
  assert.equal(resumeMission(bothDone).state, "done");
});
