"use client";

import type { GameMeta } from "@/lib/games";
import { G01Play } from "./G01Play";
import { G02Play } from "./G02Play";
import { G03Play } from "./G03Play";
import { G04Play } from "./G04Play";
import { G09Play } from "./G09Play";
import { G25Play } from "./G25Play";

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
  }
}
