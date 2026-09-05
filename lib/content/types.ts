// Shared content schema (PRD §7). Content lives in /content/*.json, one array per game.
export type GameId =
  | "G01"
  | "G02"
  | "G03"
  | "G04"
  | "G05"
  | "G06"
  | "G07"
  | "G08"
  | "G09"
  | "G10"
  | "G11"
  | "G12"
  | "G13"
  | "G14"
  | "G15"
  | "G16"
  | "G17"
  | "G18"
  | "G19"
  | "G20"
  | "G21"
  | "G22"
  | "G23"
  | "G24"
  | "G25"
  | "G26"
  | "G27"
  | "G28"
  | "G29"
  | "G30"
  | "G31"
  | "G32"
  | "G33"
  | "G34"
  | "G35"
  | "G36";
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

// ---- R1+ card types: each game owns its own line below (edit only yours). ----
/** G05 — category: "daily" | "feelings" | "us" | "future". body = an unfinished sentence ending in "…". */
export type G05Card = BaseCard;
/** G06 — category: "beginnings" | "travel" | "home" | "funny". body = a shared-memory question. */
export type G06Card = BaseCard;
/** G07 — category: "prompt". Optional inspiration prompts only; the game runs without cards. */
export type G07Card = BaseCard;
/** G08 — category: "work" | "home" | "travel" | "fantasy". body = the premise; the trio is answered in order. */
export interface G08Card extends BaseCard {
  followUps: [string, string, string]; // exactly 3 follow-up questions about the same premise
}
/** G10 — category is the difficulty: "easy" | "medium" | "hard". body = the word or scene to act out. */
export type G10Card = BaseCard;
/** G11 — category: "food" | "home" | "nature" | "animals" | "travel" | "daily". body = the target word. */
export interface G11Card extends BaseCard {
  forbidden: [string, string, string]; // the three words the explainer may not say
}
/** G12 — category: "opening". body = a five-word opening line of the story. */
export type G12Card = BaseCard;
/** G13 — category: "product" | "style" | "audience"; one round draws one card of each. body = the element. */
export type G13Card = BaseCard;
/** G14 — an imaginary privilege to bid on. category: "home" | "outing" | "choice" | "fun". */
export interface G14Card extends BaseCard {
  category: "home" | "outing" | "choice" | "fun";
}
/** G15 — clue-writing examples for the creator. category: "example". body = the sample clue. */
export interface G15Card extends BaseCard {
  tip: string; // why this clue works / how to write one like it
}
/**
 * G16 — a tested simple recipe. category: "sandwich" | "eggs" | "salad" | "warm" | "sweet" | "drink".
 * `ingredients` are canonical names from `G16_INGREDIENTS` (lib/engine/g16.ts); matching is strict.
 */
export interface G16Card extends BaseCard {
  ingredients: string[];
  tools: string[];
  minutes: number;
  steps: string[]; // 3–6 short instructions
  tasks: [string, string]; // a split of the work for two people
}
/** G17 — a drawable word. category: "objects" | "animals" | "places" | "actions"; depth = difficulty. */
export interface G17Card extends BaseCard {
  category: "objects" | "animals" | "places" | "actions";
  synonyms: string[]; // accepted alternatives, shown at the reveal (may be empty)
}
/** G18 — category: "travel" | "food" | "home" | "celebration" | "daily" | "sport" | "nature" | "weather". */
export interface G18Card extends BaseCard {
  /** `body` is the emoji string (3 symbols); `alt` describes them for screen readers. */
  alt: string;
  options: [Option, Option, Option, Option];
  answer: string; // id of the single approved option
  hint: string; // short optional nudge, may be ""
}
/** G19 — one card per story. category: "family" | "travel" | "mystery". body = intro. */
export interface EscapeLock {
  title: string;
  clueA: string; // read privately by player A
  clueB: string; // read privately by player B
  question: string;
  answers: string[]; // ≥1, compared after normalizeAnswer()
  hint: string;
  solution: string;
  explanation: string;
}
export interface G19Card extends BaseCard {
  title: string;
  locks: [EscapeLock, EscapeLock, EscapeLock, EscapeLock];
  ending: string;
}
/** G20 — category: "object". `body` is the Arabic word, `emoji` the single symbol shown in the grid. */
export interface G20Card extends BaseCard {
  emoji: string;
}
/** G21 — category: "home" | "kitchen" | "outdoors" | "food" | "animals" | "things". body = the secret word. */
export type G21Card = BaseCard;
/** G22 — category: "letter" (body = one curated Arabic letter) | "category" (body = the category label). */
export type G22Card = BaseCard;
/** G23 — category: "leisure" | "food" | "home" | "travel" | "moments" ... free-form. body = the ranking question. */
export interface G23Card extends BaseCard {
  items: [Option, Option, Option, Option]; // exactly 4 distinct items to rank
}
/** G24 — category: "logic" | "numbers" | "words" | "riddle". One puzzle per local day. */
export interface G24Card extends BaseCard {
  options: [Option, Option, Option, Option];
  answer: string; // id of the correct option
  explanation: string; // shown with the answer
}
/** G26 — plan part. category: "opener" | "closer"; tags carry the mood ("calm" | "fun" | "deep"). */
export interface G26Card extends BaseCard {
  category: "opener" | "closer";
  minutes: number; // 5–15
}
/** G27 — inspiration only; the couple's real wishes live in local storage. category: "example". */
export interface G27Card extends BaseCard {
  cost: "free" | "low" | "medium";
}
/** G28 — category: "example". body = an example memory to inspire the first entry (no deck). */
export type G28Card = BaseCard;
/** G29 — category: "starter". body = an opening line offered as a chip while composing. */
export type G29Card = BaseCard;
/** G30 — category: "home" | "outside" | "food" | "creative". A safe new experience to try. */
export interface G30Card extends BaseCard {
  minutes: number; // same value as estimatedMinutes, kept explicit for the filter
  costTier: "free" | "low";
}
/** G31 — category: "daily" | "support" | "growth". body = a gratitude starter completed aloud. */
export type G31Card = BaseCard;
/** G32 — a suggested weekly mission. category: "home" | "food" | "space" | "admin". */
export interface G32Card extends BaseCard {
  steps: [string, string]; // a natural 2-way split of the mission
}
/** G33 — one lesson per card. category: "language" | "art" | "photo" | "wellness" | "craft" | "money" | "food" | "nature" | "memory". body = title. */
export interface G33Card extends BaseCard {
  lesson: string; // ≤600 chars
  exercise: string; // what to do together
  question: {
    body: string;
    options: [Option, Option, Option, Option];
    answer: string; // option id
    explanation: string;
  };
}
/** G34 — a photo theme. category: "home" | "outside" | "colours" | "details". */
export interface G34Card extends BaseCard {
  hint: string;
}
/** G35 — category: "seerah" | "quran" | "ethics". body = question; source is required for published cards. */
export interface G35Card extends BaseCard {
  options: [Option, Option, Option, Option];
  answer: string; // option id
  explanation: string; // 1–2 sentences
  source: string; // precise reference
}
/** G36 — category: "family" | "neighbours" | "community" | "home". Voluntary, never logged as worship. */
export interface G36Card extends BaseCard {
  minutes: number;
  materials: string[];
  costTier: "free" | "low";
}
