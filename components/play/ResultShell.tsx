"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/Button";
import type { GameMeta } from "@/lib/games";

/** Results screen skeleton (S06): title, game-specific summary, Replay + Home. */
export function ResultShell({
  game,
  title,
  note,
  onReplay,
  children,
}: {
  game: GameMeta;
  title: string;
  note?: string;
  onReplay: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="card-in rounded-card bg-card p-6 shadow-[var(--shadow-deck)]">
        <h2 className="font-bold font-display text-3xl">{title}</h2>
        {note ? <p className="mt-1 text-ink-soft">{note}</p> : null}
        <div className="mt-5">{children}</div>
      </div>
      <div className="mt-auto flex flex-col gap-2">
        <Button fullWidth onClick={onReplay}>
          نلعب مرة أخرى
        </Button>
        <Button variant="secondary" fullWidth href={`/games/${game.slug}`}>
          العودة إلى اللعبة
        </Button>
        <Button variant="ghost" fullWidth href="/">
          الرئيسية
        </Button>
      </div>
    </div>
  );
}
