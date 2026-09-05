"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Tag } from "@/components/Chip";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Num } from "@/components/Num";
import { ResultShell } from "@/components/play/ResultShell";
import { SessionFrame } from "@/components/play/SessionFrame";
import { G18_CARDS } from "@/lib/content";
import { G18, type G18Setup } from "@/lib/engine/g18";
import type { GameMeta } from "@/lib/games";
import { readSeen } from "@/lib/storage";
import { Instructions, RoundsPicker, SetupShell, Stats } from "./Setup";
import { useSession } from "./useSession";

const CATEGORY: Record<string, string> = {
  travel: "سفر",
  food: "طعام",
  home: "بيت",
  celebration: "مناسبات",
  daily: "يوميات",
  sport: "رياضة",
  nature: "طبيعة",
  weather: "طقس",
};

/** G18 — Emoji Guessing (FR-G18). Cooperative: one screen, no handoff, no secrets. */
export function G18Play({ game }: { game: GameMeta }) {
  const [rounds, setRounds] = useState<5 | 10>(10);
  const [session, setSession] = useState<{ setup: G18Setup; seen: string[] } | null>(null);

  if (session) return <Session game={game} {...session} />;

  return (
    <SessionFrame game={game}>
      <SetupShell
        game={game}
        available={G18.availableCount(G18_CARDS, { rounds })}
        requested={rounds}
        onStart={(aliases) => setSession({ setup: { rounds, aliases }, seen: readSeen(game.id) })}
      >
        <RoundsPicker value={rounds} onChange={setRounds} hue={game.hue} />
      </SetupShell>
    </SessionFrame>
  );
}

function Session({ game, setup, seen }: { game: GameMeta; setup: G18Setup; seen: string[] }) {
  const { state, send, restart } = useSession(G18, G18_CARDS, setup, seen);
  const { phase } = state;
  const card = state.deck[state.roundIndex];
  const inRound = card !== undefined && phase !== "instructions" && phase !== "results";
  const last = state.completedRounds[state.completedRounds.length - 1];
  const labelOf = (id: string | null) => card?.options.find((o) => o.id === id)?.label ?? "";

  return (
    <SessionFrame
      game={game}
      live={phase !== "results"}
      onExit={() => send({ type: "END" })}
      progress={inRound ? { current: state.roundIndex + 1, total: state.deck.length } : undefined}
    >
      {phase === "instructions" ? (
        <Instructions game={game} onStart={() => send({ type: "START" })} />
      ) : null}

      {inRound && card ? (
        <div className="flex flex-1 flex-col gap-5">
          <article
            className="card-in rounded-card border-t-8 bg-card p-6 shadow-[var(--shadow-deck)]"
            style={{ borderColor: game.hue }}
          >
            <div className="flex items-start justify-between gap-3">
              {CATEGORY[card.category] ? <Tag hue={game.hue}>{CATEGORY[card.category]}</Tag> : null}
              <FavoriteButton kind="card" id={card.id} />
            </div>
            <p
              role="img"
              aria-label={card.alt}
              className="mt-4 text-center text-6xl leading-normal tracking-[0.15em]"
            >
              {card.body}
            </p>
            <p className="mt-2 text-center text-ink-faint text-sm">{card.alt}</p>
            {state.hinted && card.hint ? (
              <p role="status" className="mt-4 rounded-xl bg-mint-soft p-3 text-center">
                <span className="font-semibold">تلميح: </span>
                {card.hint}
              </p>
            ) : null}
          </article>

          {phase === "card" ? (
            <>
              <fieldset className="flex flex-col gap-2">
                <legend className="sr-only">الحلول المحتملة</legend>
                {card.options.map((o) => {
                  const on = o.id === state.chosen;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => send({ type: "SUBMIT", player: "A", optionId: o.id })}
                      style={
                        on
                          ? {
                              borderColor: game.hue,
                              backgroundColor: `color-mix(in srgb, ${game.hue} 18%, white)`,
                            }
                          : undefined
                      }
                      className={`flex min-h-14 items-center justify-between gap-3 rounded-2xl border-2 px-5 py-3 text-start font-medium text-lg transition-colors ${
                        on ? "text-ink" : "border-line bg-card text-ink hover:border-ink-faint"
                      }`}
                    >
                      <span>{o.label}</span>
                      <span aria-hidden="true" className={on ? "font-bold" : "invisible"}>
                        ✓
                      </span>
                    </button>
                  );
                })}
              </fieldset>
              <div className="mt-auto flex flex-col gap-2">
                <Button
                  fullWidth
                  disabled={state.chosen === null}
                  onClick={() => send({ type: "DONE" })}
                >
                  تثبيت الإجابة
                </Button>
                {card.hint && !state.hinted ? (
                  <Button variant="secondary" fullWidth onClick={() => send({ type: "HINT" })}>
                    تلميح (بلا خصم)
                  </Button>
                ) : null}
                <Button variant="secondary" fullWidth onClick={() => send({ type: "REVEAL" })}>
                  اعرض الحل
                </Button>
                <Button variant="ghost" fullWidth onClick={() => send({ type: "SKIP" })}>
                  تخطّي
                </Button>
                <p className="text-center text-ink-faint text-sm">لا بأس بالتخطّي.</p>
              </div>
            </>
          ) : null}

          {phase === "reveal" && last ? (
            <div className="flex flex-1 flex-col gap-4">
              <p
                role="status"
                aria-live="polite"
                className={`self-start rounded-chip border px-4 py-1.5 font-bold ${
                  last.revealed
                    ? "border-line bg-ground text-ink"
                    : last.correct
                      ? "border-mint bg-mint-soft text-ink"
                      : "border-line bg-ground text-ink"
                }`}
              >
                {last.revealed ? "عُرض الحل" : last.correct ? "إجابة صحيحة!" : "ليست الإجابة"}
              </p>
              <dl className="flex flex-col gap-2 rounded-card bg-card p-5">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-ink-soft">الحلّ</dt>
                  <dd className="text-end font-semibold">{labelOf(card.answer)}</dd>
                </div>
                {last.chosen && last.chosen !== card.answer ? (
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-ink-soft">اخترتما</dt>
                    <dd className="text-end">{labelOf(last.chosen)}</dd>
                  </div>
                ) : null}
                {last.hinted && card.hint ? (
                  <div className="border-line border-t pt-2 text-ink-soft text-sm">
                    التلميح كان: {card.hint}
                  </div>
                ) : null}
              </dl>
              <Button fullWidth className="mt-auto" onClick={() => send({ type: "NEXT" })}>
                التالي
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {phase === "results" ? <Results game={game} state={state} onReplay={restart} /> : null}
    </SessionFrame>
  );
}

function Results({
  game,
  state,
  onReplay,
}: {
  game: GameMeta;
  state: Parameters<typeof G18.deriveResult>[0];
  onReplay: () => void;
}) {
  const r = G18.deriveResult(state);
  return (
    <ResultShell
      game={game}
      title={
        r.solved + r.missed + r.revealed === 0 ? "لم تُكتمل أي بطاقة بعد." : `حللتما ${r.solved}`
      }
      note={state.endedEarly ? "انتهت الجلسة مبكراً؛ هذه خلاصة ما لعبتماه." : undefined}
      onReplay={onReplay}
    >
      <Stats
        rows={[
          { label: "نقاط (حلّ قبل الكشف)", value: <Num value={r.solved} /> },
          { label: "إجابات لم تُصب", value: <Num value={r.missed} /> },
          { label: "عُرض حلّها", value: <Num value={r.revealed} /> },
          { label: "بطاقات متخطّاة", value: <Num value={r.skipped} /> },
          { label: "تلميحات استُخدمت", value: <Num value={r.hints} /> },
        ]}
      />
      <p className="mt-4 text-ink-soft text-sm">التلميح لا يُنقص النقاط، وعرض الحلّ لا يُحتسب.</p>
    </ResultShell>
  );
}
