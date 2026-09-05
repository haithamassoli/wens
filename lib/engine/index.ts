import type { AnyCard, GameId } from "../content/types";
import { G01 } from "./g01.ts";
import { G02 } from "./g02.ts";
import { G03 } from "./g03.ts";
import { G04 } from "./g04.ts";
import { G09 } from "./g09.ts";
import { G25 } from "./g25.ts";
import type { GameDefinition } from "./types.ts";

export * from "./choice.ts";
export * from "./g01.ts";
export * from "./g02.ts";
export * from "./g03.ts";
export * from "./g04.ts";
export * from "./g09.ts";
export * from "./g25.ts";
export * from "./types.ts";
export * from "./util.ts";

export type AnyGameDefinition = GameDefinition<AnyCard, unknown, unknown, unknown>;

export const DEFINITIONS = { G01, G02, G03, G04, G09, G25 } satisfies Record<
  GameId,
  AnyGameDefinition
>;
