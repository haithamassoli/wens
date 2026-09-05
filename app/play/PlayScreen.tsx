"use client";

import type { GameMeta } from "@/lib/games";
import { G01Play } from "./G01Play";
import { G02Play } from "./G02Play";
import { G03Play } from "./G03Play";
import { G04Play } from "./G04Play";
import { G05Play } from "./G05Play";
import { G06Play } from "./G06Play";
import { G07Play } from "./G07Play";
import { G08Play } from "./G08Play";
import { G09Play } from "./G09Play";
import { G10Play } from "./G10Play";
import { G11Play } from "./G11Play";
import { G12Play } from "./G12Play";
import { G13Play } from "./G13Play";
import { G14Play } from "./G14Play";
import { G15Play } from "./G15Play";
import { G16Play } from "./G16Play";
import { G17Play } from "./G17Play";
import { G18Play } from "./G18Play";
import { G19Play } from "./G19Play";
import { G20Play } from "./G20Play";
import { G21Play } from "./G21Play";
import { G22Play } from "./G22Play";
import { G23Play } from "./G23Play";
import { G24Play } from "./G24Play";
import { G25Play } from "./G25Play";
import { G26Play } from "./G26Play";
import { G27Play } from "./G27Play";
import { G28Play } from "./G28Play";
import { G29Play } from "./G29Play";
import { G30Play } from "./G30Play";
import { G31Play } from "./G31Play";
import { G32Play } from "./G32Play";
import { G33Play } from "./G33Play";
import { G34Play } from "./G34Play";
import { G35Play } from "./G35Play";
import { G36Play } from "./G36Play";

// ponytail: static switch; move to next/dynamic per game if the initial bundle grows past budget.
export function PlayScreen({ game }: { game: GameMeta }) {
  switch (game.id) {
    case "G01":
      return <G01Play game={game} />;
    case "G02":
      return <G02Play game={game} />;
    case "G03":
      return <G03Play game={game} />;
    case "G04":
      return <G04Play game={game} />;
    case "G09":
      return <G09Play game={game} />;
    case "G25":
      return <G25Play game={game} />;
    case "G05":
      return <G05Play game={game} />;
    case "G06":
      return <G06Play game={game} />;
    case "G07":
      return <G07Play game={game} />;
    case "G08":
      return <G08Play game={game} />;
    case "G10":
      return <G10Play game={game} />;
    case "G11":
      return <G11Play game={game} />;
    case "G12":
      return <G12Play game={game} />;
    case "G13":
      return <G13Play game={game} />;
    case "G14":
      return <G14Play game={game} />;
    case "G15":
      return <G15Play game={game} />;
    case "G16":
      return <G16Play game={game} />;
    case "G17":
      return <G17Play game={game} />;
    case "G18":
      return <G18Play game={game} />;
    case "G19":
      return <G19Play game={game} />;
    case "G20":
      return <G20Play game={game} />;
    case "G21":
      return <G21Play game={game} />;
    case "G22":
      return <G22Play game={game} />;
    case "G23":
      return <G23Play game={game} />;
    case "G24":
      return <G24Play game={game} />;
    case "G26":
      return <G26Play game={game} />;
    case "G27":
      return <G27Play game={game} />;
    case "G28":
      return <G28Play game={game} />;
    case "G29":
      return <G29Play game={game} />;
    case "G30":
      return <G30Play game={game} />;
    case "G31":
      return <G31Play game={game} />;
    case "G32":
      return <G32Play game={game} />;
    case "G33":
      return <G33Play game={game} />;
    case "G34":
      return <G34Play game={game} />;
    case "G35":
      return <G35Play game={game} />;
    case "G36":
      return <G36Play game={game} />;
  }
}
