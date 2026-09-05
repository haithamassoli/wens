"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { Num } from "@/components/Num";
import { Handoff } from "@/components/play/Handoff";
import { ResultShell } from "@/components/play/ResultShell";
import { SessionFrame } from "@/components/play/SessionFrame";
import { G23_CARDS } from "@/lib/content";
import type { G23Card } from "@/lib/content/types";
import { G23, type G23Setup, type G23State, moveItem, other } from "@/lib/engine";
import { countNoun, ROUND_FORMS } from "@/lib/filters";
import type { GameMeta } from "@/lib/games";
import { readSeen } from "@/lib/storage";
import { PlayCard } from "./ChoiceRound";
import { Instructions, SetupShell, Stats } from "./Setup";
import { useSession } from "./useSession";

/** G23 — Rank It Like Me (FR-G23): ranker orders 4 items → handoff → predictor orders → reveal. */
export function G23Play({ game }: { game: GameMeta }) {
  const [rounds, setRounds] = useState<4 | 6>(6);
  const [session, setSession] = useState<{ setup: G23Setup; seen: string[] } | null>(null);
  if (session) return <Session game={game} {...session} />;
  return (
    <SessionFrame game={game}>
      <SetupShell
        game={game}
        available={G23.availableCount(G23_CARDS, { rounds })}
        requested={rounds}
        onStart={(aliases) => setSession({ setup: { rounds, aliases }, seen: readSeen(game.id) })}
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-semibold">عدد الجولات</legend>
          <div className="flex gap-2">
            {([4, 6] as const).map((n) => (
              <Chip key={n} pressed={rounds === n} onToggle={() => setRounds(n)} hue={game.hue}>
                <Num value={n} /> {countNoun(n, ROUND_FORMS)}
              </Chip>
            ))}
          </div>
        </fieldset>
      </SetupShell>
    </SessionFrame>
  );
}

const labelOf = (card: G23Card, id: string) => card.items.find((o) => o.id === id)?.label ?? "";

/** Ordered list with move-up/move-down buttons (keyboard and touch share the same path). */
// ponytail: no drag-and-drop; buttons cover touch + keyboard identically. Add DnD later if asked.
function OrderList({
  card,
  order,
  onChange,
}: {
  card: G23Card;
  order: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <ol className="flex flex-col gap-2">
      {order.map((id, i) => {
        const label = labelOf(card, id);
        return (
          <li key={id} className="flex items-center gap-3 rounded-card bg-card p-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ground font-bold">
              <Num value={i + 1} />
            </span>
            <span className="flex-1 font-medium text-lg">{label}</span>
            <span className="flex gap-1">
              <Button
                variant="secondary"
                aria-label={`تحريك ${label} لأعلى`}
                disabled={i === 0}
                onClick={() => onChange(moveItem(order, i, -1))}
                className="!min-w-11 !px-3"
              >
                ↑
              </Button>
              <Button
                variant="secondary"
                aria-label={`تحريك ${label} لأسفل`}
                disabled={i === order.length - 1}
                onClick={() => onChange(moveItem(order, i, 1))}
                className="!min-w-11 !px-3"
              >
                ↓
              </Button>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ScoreLine({ state }: { state: G23State }) {
  const { points } = G23.deriveResult(state);
  return (
    <p className="text-ink-soft">
      {state.aliases.A} <Num value={points.A} /> – {state.aliases.B} <Num value={points.B} />
    </p>
  );
}

function Session({ game, setup, seen }: { game: GameMeta; setup: G23Setup; seen: string[] }) {
  const { state, send, restart } = useSession(G23, G23_CARDS, setup, seen);
  const { aliases, phase, ranker } = state;
  const predictor = other(ranker);
  const card = state.deck[state.roundIndex];
  const active =
    phase === `player_${ranker}_input`
      ? ranker
      : phase === `player_${predictor}_input`
        ? predictor
        : null;
  const last = state.completedRounds[state.completedRounds.length - 1];
  const inRound = card !== undefined && phase !== "instructions" && phase !== "results";

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

      {active && card ? (
        <div className="flex flex-1 flex-col gap-5">
          <PlayCard
            headline={
              active === ranker
                ? `${aliases[ranker]}: رتّب حسب تفضيلك، الأحبّ أوّلاً`
                : `${aliases[predictor]}: كيف رتّبها ${aliases[ranker]}؟`
            }
            cardId={card.id}
            body={card.body}
          />
          <OrderList
            card={card}
            order={state.orders[active]}
            onChange={(value) => send({ type: "SET", key: "order", value })}
          />
          <div className="mt-auto flex flex-col gap-2">
            <Button fullWidth onClick={() => send({ type: "LOCK", player: active })}>
              تثبيت الترتيب
            </Button>
            <Button variant="ghost" fullWidth onClick={() => send({ type: "SKIP" })}>
              تخطّي
            </Button>
            <p className="text-center text-ink-faint text-sm">لا بأس بالتخطّي.</p>
          </div>
        </div>
      ) : null}

      {phase === "handoff" ? (
        <Handoff toName={aliases[predictor]} onReady={() => send({ type: "READY" })} />
      ) : null}

      {phase === "reveal" && card && last ? (
        <div className="flex flex-1 flex-col gap-5">
          <PlayCard headline="النتيجة" cardId={card.id} body={card.body} />
          <p
            role="status"
            aria-live="polite"
            className={`self-start rounded-chip border px-4 py-1.5 font-bold ${
              last.points === 4 ? "border-mint bg-mint-soft" : "border-line bg-ground"
            }`}
          >
            <Num value={last.points} /> من <Num value={4} /> في مكانها الصحيح
          </p>
          <ol className="flex flex-col gap-2">
            {last.order.map((id, i) => {
              const hit = last.prediction[i] === id;
              return (
                <li key={id} className="flex items-center gap-3 rounded-card bg-card p-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ground font-bold">
                    <Num value={i + 1} />
                  </span>
                  <span className="flex flex-1 flex-col">
                    <span className="font-medium">{labelOf(card, id)}</span>
                    {!hit ? (
                      <span className="text-ink-soft text-sm">
                        توقّع {aliases[predictor]}: {labelOf(card, last.prediction[i])}
                      </span>
                    ) : null}
                  </span>
                  <span className={`shrink-0 text-sm ${hit ? "font-bold" : "text-ink-soft"}`}>
                    {hit ? "صحيح" : "مختلف"}
                  </span>
                </li>
              );
            })}
          </ol>
          <ScoreLine state={state} />
          <Button fullWidth className="mt-auto" onClick={() => send({ type: "NEXT" })}>
            التالي
          </Button>
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
  state: G23State;
  onReplay: () => void;
}) {
  const r = G23.deriveResult(state);
  const { aliases } = state;
  const verdict =
    r.winner === null ? null : r.winner === "tie" ? "تعادل" : `الأكثر توقّعاً: ${aliases[r.winner]}`;
  return (
    <ResultShell
      game={game}
      title={state.endedEarly ? "جلسة غير مكتملة" : "انتهت الجلسة"}
      note={r.completed === 0 ? "لم تُكتمل أي جولة بعد." : undefined}
      onReplay={onReplay}
    >
      <Stats
        rows={[
          {
            label: `نقاط ${aliases.A}`,
            value: (
              <>
                <Num value={r.points.A} /> من <Num value={r.possible.A} />
              </>
            ),
          },
          {
            label: `نقاط ${aliases.B}`,
            value: (
              <>
                <Num value={r.points.B} /> من <Num value={r.possible.B} />
              </>
            ),
          },
          { label: "جولات مكتملة", value: <Num value={r.completed} /> },
          { label: "جولات متخطّاة", value: <Num value={r.skipped} /> },
        ]}
      />
      {verdict ? (
        <p role="status" className="mt-4 font-bold font-display text-2xl">
          {verdict}
        </p>
      ) : null}
    </ResultShell>
  );
}
