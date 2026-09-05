// G32 — Our Weekly Team Mission (FR-G32). One mission at a time, kept in localStorage by the
// play screen via `useGameData("G32", { mission })`. Pure helpers, no round loop.
// Shared progress only: the two steps belong to the mission, not to a per-partner scoreboard.
// ponytail: no notifications and no reminders — the doc's "optional notifications" needs a
// server and a permission prompt; Convex sync + web push is the R3 upgrade.
import type { G32Card } from "../content/types";
import { stubGame } from "./stub.ts";

export type MissionState = "active" | "done" | "postponed";
export type StepKey = "stepA" | "stepB";

export interface MissionStep {
  text: string;
  done: boolean;
}
export interface Mission {
  cardId: string | null; // null when the couple wrote their own title
  title: string;
  stepA: MissionStep;
  stepB: MissionStep;
  reviewDate?: string; // ISO date from <input type="date">, optional
  state: MissionState;
}

export const MISSION_TITLE_MAX = 60;
export const MISSION_STEP_MAX = 80;

const clean = (v: string, max: number) => v.trim().slice(0, max);

export const missionFromCard = (card: G32Card): Mission => ({
  cardId: card.id,
  title: card.body,
  stepA: { text: card.steps[0], done: false },
  stepB: { text: card.steps[1], done: false },
  state: "active",
});

export const customMission = (title: string): Mission => ({
  cardId: null,
  title: clean(title, MISSION_TITLE_MAX),
  stepA: { text: "", done: false },
  stepB: { text: "", done: false },
  state: "active",
});

export const canStartMission = (m: Mission) => m.title.length > 0;

export const setMissionStepText = (m: Mission, key: StepKey, text: string): Mission => ({
  ...m,
  [key]: { ...m[key], text: clean(text, MISSION_STEP_MAX) },
});

/** Who does which: swapping the two texts keeps the done flags with their step. */
export const swapMissionSteps = (m: Mission): Mission => ({
  ...m,
  stepA: { ...m.stepA, text: m.stepB.text },
  stepB: { ...m.stepB, text: m.stepA.text },
});

export const setMissionReviewDate = (m: Mission, date: string): Mission => {
  const { reviewDate: _drop, ...rest } = m;
  return date ? { ...rest, reviewDate: date } : rest;
};

export const missionProgress = (m: Mission) => Number(m.stepA.done) + Number(m.stepB.done);

/** Ticking the second step finishes the mission; unticking one reopens it. Postponed is frozen. */
export function toggleMissionStep(m: Mission, key: StepKey): Mission {
  if (m.state === "postponed") return m;
  const next: Mission = { ...m, [key]: { ...m[key], done: !m[key].done } };
  return { ...next, state: missionProgress(next) === 2 ? "done" : "active" };
}

export const postponeMission = (m: Mission): Mission =>
  m.state === "postponed" ? m : { ...m, state: "postponed" };

/** Back from postponed; the step flags decide whether it is active or already done. */
export const resumeMission = (m: Mission): Mission =>
  m.state === "postponed" ? { ...m, state: missionProgress(m) === 2 ? "done" : "active" } : m;

// ponytail: G32 has no round loop, but the registry types every game id. The card-only stub is
// the smallest definition that satisfies it; the play screen never calls it.
export const G32 = stubGame("G32");
