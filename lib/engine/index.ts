import type { AnyCard, GameId } from "../content/types";
import { G01 } from "./g01.ts";
import { G02 } from "./g02.ts";
import { G03 } from "./g03.ts";
import { G04 } from "./g04.ts";
import { G05 } from "./g05.ts";
import { G06 } from "./g06.ts";
import { G07 } from "./g07.ts";
import { G08 } from "./g08.ts";
import { G09 } from "./g09.ts";
import { G10 } from "./g10.ts";
import { G11 } from "./g11.ts";
import { G12 } from "./g12.ts";
import { G13 } from "./g13.ts";
import { G14 } from "./g14.ts";
import { G15 } from "./g15.ts";
import { G16 } from "./g16.ts";
import { G17 } from "./g17.ts";
import { G18 } from "./g18.ts";
import { G19 } from "./g19.ts";
import { G20 } from "./g20.ts";
import { G21 } from "./g21.ts";
import { G22 } from "./g22.ts";
import { G23 } from "./g23.ts";
import { G24 } from "./g24.ts";
import { G25 } from "./g25.ts";
import { G26 } from "./g26.ts";
import { G27 } from "./g27.ts";
import { G28 } from "./g28.ts";
import { G29 } from "./g29.ts";
import { G30 } from "./g30.ts";
import { G31 } from "./g31.ts";
import { G32 } from "./g32.ts";
import { G33 } from "./g33.ts";
import { G34 } from "./g34.ts";
import { G35 } from "./g35.ts";
import { G36 } from "./g36.ts";
import type { GameDefinition } from "./types.ts";

export * from "./choice.ts";
export * from "./g01.ts";
export * from "./g02.ts";
export * from "./g03.ts";
export * from "./g04.ts";
export * from "./g05.ts";
export * from "./g06.ts";
export * from "./g07.ts";
export * from "./g08.ts";
export * from "./g09.ts";
export * from "./g10.ts";
export * from "./g11.ts";
export * from "./g12.ts";
export * from "./g13.ts";
export * from "./g14.ts";
export * from "./g15.ts";
export * from "./g16.ts";
export * from "./g17.ts";
export * from "./g18.ts";
export * from "./g19.ts";
export * from "./g20.ts";
export * from "./g21.ts";
export * from "./g22.ts";
export * from "./g23.ts";
export * from "./g24.ts";
export * from "./g25.ts";
export * from "./g26.ts";
export * from "./g27.ts";
export * from "./g28.ts";
export * from "./g29.ts";
export * from "./g30.ts";
export * from "./g31.ts";
export * from "./g32.ts";
export * from "./g33.ts";
export * from "./g34.ts";
export * from "./g35.ts";
export * from "./g36.ts";
export * from "./types.ts";
export * from "./util.ts";

export type AnyGameDefinition = GameDefinition<AnyCard, unknown, unknown, unknown>;

export const DEFINITIONS = {
  G01,
  G02,
  G03,
  G04,
  G05,
  G06,
  G07,
  G08,
  G09,
  G10,
  G11,
  G12,
  G13,
  G14,
  G15,
  G16,
  G17,
  G18,
  G19,
  G20,
  G21,
  G22,
  G23,
  G24,
  G25,
  G26,
  G27,
  G28,
  G29,
  G30,
  G31,
  G32,
  G33,
  G34,
  G35,
  G36,
} satisfies Record<GameId, AnyGameDefinition>;
