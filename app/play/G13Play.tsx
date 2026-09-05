"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Tag } from "@/components/Chip";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Num } from "@/components/Num";
import { ResultShell } from "@/components/play/ResultShell";
import { SessionFrame } from "@/components/play/SessionFrame";
import { G13_CARDS } from "@/lib/content";
import {
  type AdSlot,
  drawn,
  G13,
  G13_ROUNDS,
  G13_SECONDS,
  G13_SLOTS,
  type G13Setup,
  type G13State,
} from "@/lib/engine/g13";
import { remainingMs } from "@/lib/engine/perform";
import type { Event } from "@/lib/engine/types";
import { countNoun } from "@/lib/filters";
import type { GameMeta } from "@/lib/games";
import { markSeen, readSeen } from "@/lib/storage";
import { Instructions, SetupShell, Stats } from "./Setup";
import { Countdown, useTimerLoop } from "./shared/timer";

/** Arabic count-noun forms for the results title (1 and 2 never take the numeral). */
const SPOT_FORMS = { one: "فقرة واحدة", two: "فقرتين", few: "فقرات", many: "فقرة" };

const SLOT_LABEL: Record<AdSlot, string> = {
  product: "المنتج",
  style: "الأسلوب",
  audience: "الجمهور",
};

/** G13 — The Unusual Announcer (FR-G13). Four 30-second spots; the announcer alternates. */
export function G13Play({ game }: { game: GameMeta }) {
  const [session, setSession] = useState<{ setup: G13Setup; seen: string[] } | null>(null);

  if (session) return <Session game={game} {...session} />;

  return (
    <SessionFrame game={game}>
      <SetupShell
        game={game}
        available={G13.availableCount(G13_CARDS, {})}
        requested={G13_ROUNDS}
        onStart={(aliases) => setSession({ setup: { aliases }, seen: readSeen(game.id) })}
      >
        <p className="rounded-card bg-card p-4 text-ink-soft">
          <Num value={G13_ROUNDS} /> فقرات، لكلٍّ منكما اثنتان. في كل فقرة منتج وأسلوب وجمهور، ولكما
          استبدال عنصر واحد فقط قبل أن يبدأ المؤقّت.
        </p>
      </SetupShell>
    </SessionFrame>
  );
}

function Session({ game, setup, seen }: { game: GameMeta; setup: G13Setup; seen: string[] }) {
  const deal = useCallback(
    (history: string[]) => G13.initialState(G13.buildDeck(G13_CARDS, setup, history), setup),
    [setup],
  );
  const [state, setState] = useState<G13State>(() => deal(seen));
  const send = useCallback((e: Event) => setState((s) => G13.reduce(s, e)), []);
  const restart = () => setState(deal(readSeen("G13")));

  // Seen history (FR-CORE-07): every element actually dealt into a consumed round.
  useEffect(() => {
    if (!state.ended) return;
    const used = state.deck.slice(0, state.completedRounds.length + state.skippedRounds.length);
    markSeen(
      "G13",
      used.flatMap((d) => [d.product.id, d.style.id, d.audience.id]),
    );
  }, [state]);

  const { aliases, phase, announcer } = state;
  const elements = drawn(state);
  const now = useTimerLoop(phase, send);
  const inRound = elements !== null && phase !== "instructions" && phase !== "results";
  const inTimer = phase.startsWith("timer_");

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

      {inRound && elements ? (
        <div className="flex flex-1 flex-col gap-5">
          <p className="font-semibold text-ink-soft" aria-live="polite">
            {phase === "review"
              ? "أيّ جملة كانت الأفضل؟ اختاراها بينكما"
              : `دور ${aliases[announcer]} في الإعلان`}
          </p>

          <dl className="flex flex-col gap-3">
            {G13_SLOTS.map((slot) => (
              <div
                key={slot}
                className="flex items-center justify-between gap-3 rounded-card bg-card p-4 shadow-[var(--shadow-deck)]"
              >
                <div className="min-w-0">
                  <dt className="text-ink-soft text-sm">{SLOT_LABEL[slot]}</dt>
                  <dd className="font-display font-semibold text-xl leading-snug">
                    {elements[slot].body}
                  </dd>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {state.replaced === slot ? <Tag hue={game.hue}>مستبدَل</Tag> : null}
                  <FavoriteButton kind="card" id={elements[slot].id} />
                </div>
              </div>
            ))}
          </dl>

          {phase === "card" ? (
            <>
              {state.replaced === null ? (
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-1 text-ink-soft text-sm">
                    تستطيعان استبدال عنصر واحد فقط
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {G13_SLOTS.map((slot) => (
                      <Button
                        key={slot}
                        variant="secondary"
                        onClick={() => send({ type: "REPLACE", slot })}
                      >
                        استبدل {SLOT_LABEL[slot]}
                      </Button>
                    ))}
                  </div>
                </fieldset>
              ) : (
                <p role="status" className="text-ink-soft text-sm">
                  استُبدل {SLOT_LABEL[state.replaced]}. العناصر الثلاثة ثابتة الآن.
                </p>
              )}
              <div className="mt-auto flex flex-col gap-2">
                <Button fullWidth onClick={() => send({ type: "READY", now: Date.now() })}>
                  ابدأ الإعلان (<Num value={G13_SECONDS} /> ثانية)
                </Button>
                <Button variant="ghost" fullWidth onClick={() => send({ type: "SKIP" })}>
                  تخطّي
                </Button>
              </div>
            </>
          ) : null}

          {inTimer ? (
            <>
              <Countdown ms={remainingMs(state, now)} phase={phase} />
              <div className="mt-auto flex flex-col gap-2">
                <Button fullWidth onClick={() => send({ type: "DONE" })}>
                  انتهى الإعلان
                </Button>
                {phase === "timer_running" ? (
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => send({ type: "PAUSE", now: Date.now() })}
                  >
                    إيقاف مؤقّت
                  </Button>
                ) : null}
                {phase === "timer_paused" ? (
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => send({ type: "RESUME", now: Date.now() })}
                  >
                    متابعة
                  </Button>
                ) : null}
                <Button variant="ghost" fullWidth onClick={() => send({ type: "SKIP" })}>
                  تخطّي
                </Button>
              </div>
            </>
          ) : null}

          {phase === "review" ? (
            <>
              <p className="rounded-card bg-mint-soft p-4">
                قولا الجملة الأفضل بصوت عالٍ واضحكا عليها. لا شيء يُكتب ولا يُحفظ.
              </p>
              <div className="mt-auto flex flex-col gap-2">
                <Button fullWidth onClick={() => send({ type: "NEXT" })}>
                  تمّ
                </Button>
              </div>
            </>
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
  state: G13State;
  onReplay: () => void;
}) {
  const r = G13.deriveResult(state);
  const { aliases } = state;
  return (
    <ResultShell
      game={game}
      title={r.completed === 0 ? "انتهت الجلسة" : `قدّمتما ${countNoun(r.completed, SPOT_FORMS)}`}
      note={
        r.completed === 0 ? "لم تُكتمل أي فقرة بعد." : "لا ترتيب ولا فائز؛ العبرة في الضحك وحده."
      }
      onReplay={onReplay}
    >
      <Stats
        rows={[
          { label: `فقرات ${aliases.A}`, value: <Num value={r.performances.A} /> },
          { label: `فقرات ${aliases.B}`, value: <Num value={r.performances.B} /> },
          { label: "فقرات متخطّاة", value: <Num value={r.skipped} /> },
        ]}
      />
    </ResultShell>
  );
}
