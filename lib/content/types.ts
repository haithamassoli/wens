// Shared content schema (PRD §7). Content lives in /content/*.json, one array per game.
export type GameId = "G01" | "G02" | "G03" | "G04" | "G09" | "G25";
export type CardStatus = "draft" | "review" | "published" | "archived";

export interface BaseCard {
  id: string; // e.g. "G02-001", unique across all files
  gameId: GameId;
  locale: "ar";
  version: number;
  status: CardStatus;
  category: string; // editorial category, per-game values below
  depth: "light" | "deep";
  body: string; // user-facing Arabic text
  tags: string[];
  requiresMovement: boolean;
  requiresTools: boolean;
  estimatedMinutes: number;
  reviewedAt: string; // ISO date
}

export interface Option {
  id: string; // stable, e.g. "sea"
  label: string;
}

/** G01 — category: "light" | "memories" | "dreams" | "deeper". Spoken answers, no options. */
export type ConversationCard = BaseCard;

/** G02 — exactly 2 options. category: "outings" | "food" | "home" | "travel" | "habits" | "fun" ... free-form. */
export interface ChoiceCard extends BaseCard {
  options: [Option, Option];
}

/** G03 — options are implicit: PLAYER_A | PLAYER_B | BOTH. body is a statement like "من منا ينسى المفاتيح أكثر؟" */
export type WhichOfUsCard = BaseCard;

/** G04 — exactly 4 distinct options; the answering player supplies the reference answer. */
export interface PredictionCard extends BaseCard {
  options: [Option, Option, Option, Option];
}

/** G09 — category: "verbal" | "acting" | "movement". */
export interface TimerCard extends BaseCard {
  durationSeconds: 30 | 60;
  steps: string[]; // 1–3 short instructions
  alternative: string; // easier/no-tools variant, may be ""
}

/** G25 — category: "home" | "outing" | "creative" | "food" | "active" ... free-form. */
export interface WheelCard extends BaseCard {
  location: "indoor" | "outdoor" | "any";
  costTier: "free" | "low" | "flexible";
  minMinutes: number;
  maxMinutes: number;
  materials: string[];
}

export type AnyCard =
  | ConversationCard
  | ChoiceCard
  | WhichOfUsCard
  | PredictionCard
  | TimerCard
  | WheelCard;
