import g01 from "@/content/g01.json";
import g02 from "@/content/g02.json";
import g03 from "@/content/g03.json";
import g04 from "@/content/g04.json";
import g09 from "@/content/g09.json";
import g25 from "@/content/g25.json";
import type {
  AnyCard,
  ChoiceCard,
  ConversationCard,
  GameId,
  PredictionCard,
  TimerCard,
  WheelCard,
  WhichOfUsCard,
} from "./types";

export const G01_CARDS = g01 as unknown as ConversationCard[];
export const G02_CARDS = g02 as unknown as ChoiceCard[];
export const G03_CARDS = g03 as unknown as WhichOfUsCard[];
export const G04_CARDS = g04 as unknown as PredictionCard[];
export const G09_CARDS = g09 as unknown as TimerCard[];
export const G25_CARDS = g25 as unknown as WheelCard[];

const CARDS_BY_GAME: Record<GameId, AnyCard[]> = {
  G01: G01_CARDS,
  G02: G02_CARDS,
  G03: G03_CARDS,
  G04: G04_CARDS,
  G09: G09_CARDS,
  G25: G25_CARDS,
};

const CARDS_BY_ID = new Map<string, AnyCard>(
  Object.values(CARDS_BY_GAME)
    .flat()
    .map((card) => [card.id, card]),
);

export function cardsByGame(gameId: GameId): AnyCard[] {
  return CARDS_BY_GAME[gameId];
}

export function findCard(id: string): AnyCard | undefined {
  return CARDS_BY_ID.get(id);
}
