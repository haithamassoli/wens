"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Num } from "@/components/Num";
import { Handoff } from "@/components/play/Handoff";
import { ResultShell } from "@/components/play/ResultShell";
import { SessionFrame } from "@/components/play/SessionFrame";
import { G07_CARDS } from "@/lib/content";
import {
  G07,
  G07_MAX_CHARS,
  G07_ROUNDS,
  type G07Setup,
  type G07State,
  isValidForm,
  other,
} from "@/lib/engine";
import type { GameMeta } from "@/lib/games";
import { readSeen } from "@/lib/storage";
import { PlayCard } from "./ChoiceRound";
import { Instructions, SetupShell, Stats } from "./Setup";
import { useSession } from "./useSession";

const FIELDS = ["s1", "s2", "s3"] as const;
const INPUT =
  "min-h-11 w-full rounded-xl border border-line bg-card px-4 text-base text-ink placeholder:text-ink-faint";

/** G07 — Two Truths and a Fiction (FR-G07): write 3 statements + secret fiction → handoff → guess → reveal. */
export function G07Play({ game }: { game: GameMeta }) {
  const [session, setSession] = useState<{ setup: G07Setup; seen: string[] } | null>(null);
  if (session) return <Session game={game} {...session} />;
  return (
    <SessionFrame game={game}>
      {/* ponytail: prompts are optional inspiration, so the count gate is the fixed round count. */}
      <SetupShell
        game={game}
        available={G07_ROUNDS}
        requested={G07_ROUNDS}
        onStart={(aliases) => setSession({ setup: { aliases }, seen: readSeen(game.id) })}
      >
        <p className="rounded-card bg-card p-4 text-ink-soft">
          <Num value={G07_ROUNDS} /> جولات ثابتة: يكتب كلٌّ منكما <Num value={G07_ROUNDS / 2} /> مرات
          ويخمّن <Num value={G07_ROUNDS / 2} /> مرات.
        </p>
      </SetupShell>
    </SessionFrame>
  );
}

function ScoreLine({ state }: { state: G07State }) {
  const { points } = G07.deriveResult(state);
  return (
    <p className="text-ink-soft">
      {state.aliases.A} <Num value={points.A} /> – {state.aliases.B} <Num value={points.B} />
    </p>
  );
}

function Session({ game, setup, seen }: { game: GameMeta; setup: G07Setup; seen: string[] }) {
  const { state, send, restart } = useSession(G07, G07_CARDS, setup, seen);
  const { aliases, phase, writer } = state;
  const guesser = other(writer);
  const prompt = state.deck[state.roundIndex];
  const writing = phase === `player_${writer}_input`;
  const guessing = phase === `player_${guesser}_input`;
  const last = state.completedRounds[state.completedRounds.length - 1];
  const inRound = phase !== "instructions" && phase !== "results";
  const valid = isValidForm(state.statements, state.fiction);

  return (
    <SessionFrame
      game={game}
      live={phase !== "results"}
      onExit={() => send({ type: "END" })}
      progress={inRound ? { current: state.roundIndex + 1, total: G07_ROUNDS } : undefined}
    >
      {phase === "instructions" ? (
        <Instructions game={game} onStart={() => send({ type: "START" })} />
      ) : null}

      {writing ? (
        <form
          className="flex flex-1 flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) send({ type: "LOCK", player: writer });
          }}
        >
          <p className="font-semibold text-ink-soft" aria-live="polite">
            {aliases[writer]}: اكتب حقيقتين وجملة مختلقة
          </p>
          {prompt ? (
            <PlayCard headline="فكرة للبدء (اختياري)" cardId={prompt.id} body={prompt.body} />
          ) : null}
          <fieldset className="flex flex-col gap-3">
            <legend className="sr-only">الجمل الثلاث</legend>
            {FIELDS.map((f, i) => {
              const isFiction = state.fiction === i;
              return (
                <div key={f} className="flex flex-col gap-1.5 rounded-card bg-card p-3">
                  <label className="flex flex-col gap-1 text-ink-soft text-sm">
                    الجملة <Num value={i + 1} />
                    <input
                      type="text"
                      maxLength={G07_MAX_CHARS}
                      autoComplete="off"
                      value={state.statements[i]}
                      onChange={(e) => send({ type: "INPUT", field: f, value: e.target.value })}
                      className={INPUT}
                    />
                  </label>
                  <button
                    type="button"
                    aria-pressed={isFiction}
                    onClick={() => send({ type: "SET", key: "fiction", value: i })}
                    className={`inline-flex min-h-11 items-center gap-2 self-start rounded-chip border px-4 font-medium text-sm transition-colors ${
                      isFiction ? "border-ink bg-ink text-ground" : "border-line bg-card text-ink"
                    }`}
                  >
                    {isFiction ? "✓ هذه هي المختلقة" : "هذه هي المختلقة"}
                  </button>
                </div>
              );
            })}
          </fieldset>
          <div className="mt-auto flex flex-col gap-2">
            {!valid ? (
              <p role="status" className="text-center text-ink-soft text-sm">
                ثلاث جمل مختلفة غير فارغة، وحدّد واحدة مختلقة.
              </p>
            ) : null}
            <Button type="submit" fullWidth disabled={!valid}>
              تثبيت ومرّر الهاتف
            </Button>
            <Button variant="ghost" fullWidth onClick={() => send({ type: "SKIP" })}>
              تخطّي
            </Button>
            <p className="text-center text-ink-faint text-sm">لا بأس بالتخطّي.</p>
          </div>
        </form>
      ) : null}

      {phase === "handoff" ? (
        <Handoff toName={aliases[guesser]} onReady={() => send({ type: "READY" })} />
      ) : null}

      {/* Guessing: the fiction index stays in state and is never rendered here. */}
      {guessing ? (
        <div className="flex flex-1 flex-col gap-5">
          <p className="font-semibold text-ink-soft" aria-live="polite">
            {aliases[guesser]}: أيّ جملة اختلقها {aliases[writer]}؟
          </p>
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">الجمل</legend>
            {state.statements.map((text, i) => {
              const on = state.guess === i;
              return (
                <button
                  key={FIELDS[i]}
                  type="button"
                  aria-pressed={on}
                  onClick={() => send({ type: "SUBMIT", player: guesser, optionId: String(i) })}
                  style={
                    on
                      ? {
                          borderColor: game.hue,
                          backgroundColor: `color-mix(in srgb, ${game.hue} 18%, white)`,
                        }
                      : undefined
                  }
                  className={`flex min-h-14 items-center justify-between gap-3 rounded-2xl border-2 px-5 py-3 text-start font-medium text-lg ${
                    on ? "text-ink" : "border-line bg-card text-ink"
                  }`}
                >
                  <span>{text}</span>
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
              disabled={state.guess === null}
              onClick={() => send({ type: "LOCK", player: guesser })}
            >
              تثبيت التخمين
            </Button>
            <Button variant="ghost" fullWidth onClick={() => send({ type: "SKIP" })}>
              تخطّي
            </Button>
          </div>
        </div>
      ) : null}

      {phase === "reveal" && last ? (
        <div className="flex flex-1 flex-col gap-5">
          <p className="font-semibold text-ink-soft">النتيجة</p>
          <p
            role="status"
            aria-live="polite"
            className={`self-start rounded-chip border px-4 py-1.5 font-bold ${
              last.correct ? "border-mint bg-mint-soft" : "border-line bg-ground"
            }`}
          >
            {last.correct ? `تخمين صحيح، نقطة لـ${aliases[other(last.writer)]}` : "تخمين مختلف"}
          </p>
          <ol className="flex flex-col gap-2">
            {last.statements.map((text, i) => (
              <li
                key={FIELDS[i]}
                className="flex items-center justify-between gap-3 rounded-card bg-card p-4"
              >
                <span>{text}</span>
                <span className="flex shrink-0 flex-col items-end gap-1 text-sm">
                  {i === last.fiction ? <span className="font-bold">المختلقة</span> : null}
                  {i === last.guess ? (
                    <span className="text-ink-soft">تخمين {aliases[other(last.writer)]}</span>
                  ) : null}
                </span>
              </li>
            ))}
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
  state: G07State;
  onReplay: () => void;
}) {
  const r = G07.deriveResult(state);
  const { aliases } = state;
  const verdict =
    r.winner === null ? null : r.winner === "tie" ? "تعادل" : `الأكثر تخميناً: ${aliases[r.winner]}`;
  return (
    <ResultShell
      game={game}
      title={state.endedEarly ? "جلسة غير مكتملة" : "انتهت الجلسة"}
      note={r.completed === 0 ? "لم تُكتمل أي جولة بعد." : undefined}
      onReplay={onReplay}
    >
      <Stats
        rows={[
          { label: `نقاط ${aliases.A}`, value: <Num value={r.points.A} /> },
          { label: `نقاط ${aliases.B}`, value: <Num value={r.points.B} /> },
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
