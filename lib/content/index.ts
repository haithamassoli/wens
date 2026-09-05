import g01 from "@/content/g01.json";
import g02 from "@/content/g02.json";
import g03 from "@/content/g03.json";
import g04 from "@/content/g04.json";
import g05 from "@/content/g05.json";
import g06 from "@/content/g06.json";
import g07 from "@/content/g07.json";
import g08 from "@/content/g08.json";
import g09 from "@/content/g09.json";
import g10 from "@/content/g10.json";
import g11 from "@/content/g11.json";
import g12 from "@/content/g12.json";
import g13 from "@/content/g13.json";
import g14 from "@/content/g14.json";
import g15 from "@/content/g15.json";
import g16 from "@/content/g16.json";
import g17 from "@/content/g17.json";
import g18 from "@/content/g18.json";
import g19 from "@/content/g19.json";
import g20 from "@/content/g20.json";
import g21 from "@/content/g21.json";
import g22 from "@/content/g22.json";
import g23 from "@/content/g23.json";
import g24 from "@/content/g24.json";
import g25 from "@/content/g25.json";
import g26 from "@/content/g26.json";
import g27 from "@/content/g27.json";
import g28 from "@/content/g28.json";
import g29 from "@/content/g29.json";
import g30 from "@/content/g30.json";
import g31 from "@/content/g31.json";
import g32 from "@/content/g32.json";
import g33 from "@/content/g33.json";
import g34 from "@/content/g34.json";
import g35 from "@/content/g35.json";
import g36 from "@/content/g36.json";
import type {
  AnyCard,
  ChoiceCard,
  ConversationCard,
  G05Card,
  G06Card,
  G07Card,
  G08Card,
  G10Card,
  G11Card,
  G12Card,
  G13Card,
  G14Card,
  G15Card,
  G16Card,
  G17Card,
  G18Card,
  G19Card,
  G20Card,
  G21Card,
  G22Card,
  G23Card,
  G24Card,
  G26Card,
  G27Card,
  G28Card,
  G29Card,
  G30Card,
  G31Card,
  G32Card,
  G33Card,
  G34Card,
  G35Card,
  G36Card,
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
export const G05_CARDS = g05 as unknown as G05Card[];
export const G06_CARDS = g06 as unknown as G06Card[];
export const G07_CARDS = g07 as unknown as G07Card[];
export const G08_CARDS = g08 as unknown as G08Card[];
export const G10_CARDS = g10 as unknown as G10Card[];
export const G11_CARDS = g11 as unknown as G11Card[];
export const G12_CARDS = g12 as unknown as G12Card[];
export const G13_CARDS = g13 as unknown as G13Card[];
export const G14_CARDS = g14 as unknown as G14Card[];
export const G15_CARDS = g15 as unknown as G15Card[];
export const G16_CARDS = g16 as unknown as G16Card[];
export const G17_CARDS = g17 as unknown as G17Card[];
export const G18_CARDS = g18 as unknown as G18Card[];
export const G19_CARDS = g19 as unknown as G19Card[];
export const G20_CARDS = g20 as unknown as G20Card[];
export const G21_CARDS = g21 as unknown as G21Card[];
export const G22_CARDS = g22 as unknown as G22Card[];
export const G23_CARDS = g23 as unknown as G23Card[];
export const G24_CARDS = g24 as unknown as G24Card[];
export const G26_CARDS = g26 as unknown as G26Card[];
export const G27_CARDS = g27 as unknown as G27Card[];
export const G28_CARDS = g28 as unknown as G28Card[];
export const G29_CARDS = g29 as unknown as G29Card[];
export const G30_CARDS = g30 as unknown as G30Card[];
export const G31_CARDS = g31 as unknown as G31Card[];
export const G32_CARDS = g32 as unknown as G32Card[];
export const G33_CARDS = g33 as unknown as G33Card[];
export const G34_CARDS = g34 as unknown as G34Card[];
export const G35_CARDS = g35 as unknown as G35Card[];
export const G36_CARDS = g36 as unknown as G36Card[];

const CARDS_BY_GAME: Record<GameId, AnyCard[]> = {
  G01: G01_CARDS,
  G02: G02_CARDS,
  G03: G03_CARDS,
  G04: G04_CARDS,
  G09: G09_CARDS,
  G25: G25_CARDS,
  G05: G05_CARDS,
  G06: G06_CARDS,
  G07: G07_CARDS,
  G08: G08_CARDS,
  G10: G10_CARDS,
  G11: G11_CARDS,
  G12: G12_CARDS,
  G13: G13_CARDS,
  G14: G14_CARDS,
  G15: G15_CARDS,
  G16: G16_CARDS,
  G17: G17_CARDS,
  G18: G18_CARDS,
  G19: G19_CARDS,
  G20: G20_CARDS,
  G21: G21_CARDS,
  G22: G22_CARDS,
  G23: G23_CARDS,
  G24: G24_CARDS,
  G26: G26_CARDS,
  G27: G27_CARDS,
  G28: G28_CARDS,
  G29: G29_CARDS,
  G30: G30_CARDS,
  G31: G31_CARDS,
  G32: G32_CARDS,
  G33: G33_CARDS,
  G34: G34_CARDS,
  G35: G35_CARDS,
  G36: G36_CARDS,
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
