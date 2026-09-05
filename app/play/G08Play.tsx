"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Tag } from "@/components/Chip";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Num } from "@/components/Num";
import { ResultShell } from "@/components/play/ResultShell";
import { SessionFrame } from "@/components/play/SessionFrame";
import { G08_CARDS } from "@/lib/content";
import { G08, G08_FOLLOW_UPS, G08_ROUNDS, type G08Setup } from "@/lib/engine/g08";
import type { GameMeta } from "@/lib/games";
import { readSeen } from "@/lib/storage";
import { Instructions, SetupShell, Stats } from "./Setup";
import { useSession } from "./useSession";

const CATEGORY: Record<string, string> = {
  work: "مشروع",
  home: "بيت",
  travel: "سفر",
  fantasy: "خيال",
};

/** G08 — Our World If… (FR-G08): setup → instructions → 3 scenarios × 3 follow-ups → results. */
export function G08Play({ game }: { game: GameMeta }) {
  const [session, setSession] = useState<{ setup: G08Setup; seen: string[] } | null>(null);
  if (session) return <Session game={game} {...session} />;

  return (
    <SessionFrame game={game}>
      <SetupShell
        game={game}
        available={G08.availableCount(G08_CARDS, {})}
        requested={G08_ROUNDS}
        onStart={(aliases) => setSession({ setup: { aliases }, seen: readSeen(game.id) })}
      >
        <p className="text-ink-soft">
          ثلاث فرضيات، ولكل فرضية ثلاثة أسئلة تبنيان جوابها معاً. لا توجد إجابة صحيحة.
        </p>
      </SetupShell>
    </SessionFrame>
  );
}

function Session({ game, setup, seen }: { game: GameMeta; setup: G08Setup; seen: string[] }) {
  const { state, send, restart } = useSession(G08, G08_CARDS, setup, seen);
  const card = state.deck[state.roundIndex];
  const inRound = state.phase === "card" && card !== undefined;
  const last = state.stepIndex === G08_FOLLOW_UPS - 1;

  return (
    <SessionFrame
      game={game}
      live={state.phase !== "results"}
      onExit={() => send({ type: "END" })}
      progress={inRound ? { current: state.roundIndex + 1, total: state.deck.length } : undefined}
    >
      {state.phase === "instructions" ? (
        <Instructions game={game} onStart={() => send({ type: "START" })} />
      ) : null}

      {inRound ? (
        <div className="flex flex-1 flex-col gap-5">
          {/* The premise stays fixed while its follow-ups are answered (FR-G08 acceptance). */}
          <article
            key={card.id}
            className="rounded-card border-t-8 bg-card p-6 shadow-[var(--shadow-deck)]"
            style={{ borderColor: game.hue }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                <Tag hue={game.hue}>الفرضية</Tag>
                {CATEGORY[card.category] ? <Tag>{CATEGORY[card.category]}</Tag> : null}
              </div>
              <FavoriteButton kind="card" id={card.id} />
            </div>
            <p className="mt-4 font-bold font-display text-2xl leading-snug">{card.body}</p>
          </article>

          <div className="flex flex-col gap-2">
            <p className="font-semibold text-ink-soft">
              السؤال <Num value={state.stepIndex + 1} /> من <Num value={G08_FOLLOW_UPS} />
            </p>
            <p
              key={`${card.id}-${state.stepIndex}`}
              role="status"
              aria-live="polite"
              className="rounded-card bg-mint-soft p-5 font-display font-semibold text-ink text-xl leading-snug"
            >
              {card.followUps[state.stepIndex]}
            </p>
            <p className="text-ink-faint text-sm">
              ليقترح كلٌّ منكما فكرة، ثم اتفقا على واحدة تُدخلانها في عالمكما.
            </p>
          </div>

          <div className="mt-auto flex flex-col gap-2">
            <Button fullWidth onClick={() => send({ type: "NEXT" })}>
              {last ? "اتفقنا — الفرضية التالية" : "اتفقنا"}
            </Button>
            {/* Redrawing replaces the whole scenario and counts as a skip. */}
            <Button variant="ghost" fullWidth onClick={() => send({ type: "SKIP" })}>
              بطاقة أخرى
            </Button>
            <p className="text-center text-ink-faint text-sm">
              «بطاقة أخرى» تستبدل الفرضية بأسئلتها الثلاثة.
            </p>
          </div>
        </div>
      ) : null}

      {state.phase === "results" ? <Results game={game} state={state} onReplay={restart} /> : null}
    </SessionFrame>
  );
}

function Results({
  game,
  state,
  onReplay,
}: {
  game: GameMeta;
  state: ReturnType<typeof G08.initialState>;
  onReplay: () => void;
}) {
  const r = G08.deriveResult(state);
  return (
    <ResultShell
      game={game}
      title={r.completed > 0 ? "بنيتما عالمكما" : "انتهت الجلسة"}
      note={
        r.completed === 0
          ? "لم تكتمل أي فرضية بعد."
          : state.endedEarly
            ? "انتهت الجلسة مبكراً؛ هذه خلاصة ما بنيتماه."
            : "لا إجابة صحيحة هنا — أنجزتماها معاً."
      }
      onReplay={onReplay}
    >
      <Stats
        rows={[
          { label: "فرضيات مكتملة", value: <Num value={r.completed} /> },
          { label: "فرضيات استبدلتماها", value: <Num value={r.skipped} /> },
        ]}
      />
    </ResultShell>
  );
}
