import type { GameMeta, Mood } from "./games";

export type Duration = 5 | 10 | 15;
export const DURATIONS: readonly Duration[] = [5, 10, 15];

export interface GameFilters {
  mood: Mood | null;
  duration: Duration | null; // "we have up to N minutes"
  noTools: boolean;
  noMovement: boolean;
}

export const EMPTY_FILTERS: GameFilters = {
  mood: null,
  duration: null,
  noTools: false,
  noMovement: false,
};

export function hasActiveFilters(f: GameFilters): boolean {
  return f.mood !== null || f.duration !== null || f.noTools || f.noMovement;
}

/** Games allowed to appear in lists given the user's settings (G35 is opt-in). */
export const visibleGames = (games: readonly GameMeta[], showReligious: boolean) =>
  games.filter((g) => g.gated !== "religious" || showReligious);

export function filterGames(games: readonly GameMeta[], f: GameFilters): GameMeta[] {
  return games.filter((g) => {
    if (f.mood && !g.moods.includes(f.mood)) return false;
    if (f.duration !== null && g.minutes > f.duration) return false;
    if (f.noTools && g.requiresTools) return false;
    if (f.noMovement && g.requiresMovement) return false;
    return true;
  });
}

export function pickRandom<T>(list: readonly T[]): T | undefined {
  if (list.length === 0) return undefined;
  return list[Math.floor(Math.random() * list.length)];
}

/** Arabic count noun agreement: 1, 2, 3–10, 11+. */
export function countNoun(
  n: number,
  forms: { one: string; two: string; few: string; many: string },
): string {
  if (n === 1) return forms.one;
  if (n === 2) return forms.two;
  if (n >= 3 && n <= 10) return forms.few;
  return forms.many;
}

export const MINUTE_FORMS = { one: "دقيقة", two: "دقيقتان", few: "دقائق", many: "دقيقة" };
export const ROUND_FORMS = { one: "جولة", two: "جولتان", few: "جولات", many: "جولة" };

export const DEPTH_LABEL: Record<GameMeta["depth"], string> = {
  light: "خفيف",
  deep: "عميق",
  mixed: "متنوّع",
};
