"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { Num } from "@/components/Num";
import { AliasFields } from "@/components/play/AliasFields";
import { ResultShell } from "@/components/play/ResultShell";
import { SessionFrame, usePageHidden } from "@/components/play/SessionFrame";
import { Toggle } from "@/components/Toggle";
import { G20_CARDS } from "@/lib/content";
import type { G20Card } from "@/lib/content/types";
import {
  G20,
  G20_LEVELS,
  G20_OPTIONS,
  G20_ROUNDS,
  G20_VIEW_MS,
  type G20Level,
  type G20Setup,
  type G20State,
  playerOfRound,
  viewRemainingMs,
} from "@/lib/engine/g20";
import type { Event } from "@/lib/engine/types";
import type { GameMeta } from "@/lib/games";
import { markSeen, readSeen } from "@/lib/storage";

const GRID_COLS: Record<G20Level, string> = {
  4: "grid-cols-2",
  6: "grid-cols-3",
  9: "grid-cols-3",
};

/** One object, drawn either as its symbol (with the word as its label) or as the word itself. */
function ObjectFace({ card, wordsOnly }: { card: G20Card; wordsOnly: boolean }) {
  if (wordsOnly) return <span className="font-semibold text-lg">{card.body}</span>;
  return (
    <span className="flex flex-col items-center gap-1">
      <span role="img" aria-label={card.body} className="text-4xl leading-none">
        {card.emoji}
      </span>
      <span className="text-ink-soft text-xs">{card.body}</span>
    </span>
  );
}

export function G20Play({ game }: { game: GameMeta }) {
  const [aliases, setAliases] = useState({ A: "", B: "" });
  const [level, setLevel] = useState<G20Level>(4);
  const [wordsOnly, setWordsOnly] = useState(false);
  const setup: G20Setup = { aliases, level, wordsOnly };
  const available = G20.availableCount(G20_CARDS, setup);
  const needed = G20_OPTIONS[level];

  const [state, setState] = useState<G20State | null>(null);
  const send = useCallback((e: Event) => setState((s) => (s ? G20.reduce(s, e) : s)), []);
  const start = () =>
    setState(G20.initialState(G20.buildDeck(G20_CARDS, setup, readSeen("G20")), setup));

  const phase = state?.phase;
  const hidden = usePageHidden();
  const [now, setNow] = useState(() => Date.now());

  // Wall-clock ticks: the engine hides the grid once the window is spent.
  useEffect(() => {
    if (phase !== "timer_running") return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      send({ type: "TICK", now: t });
    }, 200);
    return () => clearInterval(id);
  }, [phase, send]);

  // Hidden tab pauses the memorise window; it never auto-resumes (FR-CORE-05).
  useEffect(() => {
    if (hidden && phase === "timer_running") send({ type: "PAUSE", now: Date.now() });
  }, [hidden, phase, send]);

  // Seen history: only the objects that were actually shown in a completed grid.
  useEffect(() => {
    if (state?.phase !== "results") return;
    markSeen(
      "G20",
      state.completedRounds.flatMap((r) => state.grids[r.roundIndex].targets),
    );
  }, [state]);

  if (!state) {
    return (
      <SessionFrame game={game}>
        <div className="flex flex-1 flex-col gap-6">
          <h2 className="font-bold font-display text-2xl">قبل أن نبدأ</h2>
          <AliasFields value={aliases} onChange={setAliases} />
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-semibold">عدد الأشياء في الشبكة</legend>
            <div className="flex gap-2">
              {G20_LEVELS.map((n) => (
                <Chip key={n} pressed={level === n} onToggle={() => setLevel(n)} hue={game.hue}>
                  <Num value={n} />
                </Chip>
              ))}
            </div>
          </fieldset>
          <Toggle
            label="كلمات بدل الرموز"
            description="اعرضا أسماء الأشياء نصّاً بدل الرموز."
            checked={wordsOnly}
            onChange={setWordsOnly}
          />
          <p role="status" className={available < needed ? "font-semibold" : "text-ink-soft"}>
            {available < needed ? (
              <>
                نحتاج <Num value={needed} /> أشياء على الأقل لهذا المستوى، والمتاح{" "}
                <Num value={available} />.
              </>
            ) : (
              <>
                <Num value={G20_ROUNDS} /> جولات: جولتان لكلٍّ منكما، بشبكة جديدة في كل مرة.
              </>
            )}
          </p>
          <p className="text-ink-soft text-sm">إجابات الجولات مؤقّتة وتُمسح عند الخروج.</p>
          <Button fullWidth className="mt-auto" disabled={available < needed} onClick={start}>
            ابدأ
          </Button>
        </div>
      </SessionFrame>
    );
  }

  if (state.phase === "results") {
    const r = G20.deriveResult(state);
    const names = state.aliases;
    return (
      <SessionFrame game={game}>
        <ResultShell
          game={game}
          title={
            r.rounds === 0
              ? "لم تُكتمل أي جولة بعد."
              : r.A === r.B
                ? "تعادل جميل"
                : `${r.A > r.B ? names.A : names.B} تذكّر أكثر`
          }
          note={state.endedEarly ? "انتهت الجلسة مبكراً؛ هذه خلاصة ما لعبتماه." : undefined}
          onReplay={start}
        >
          <dl className="grid grid-cols-2 gap-3 text-center">
            {(["A", "B"] as const).map((p) => (
              <div key={p} className="rounded-xl bg-ground p-3">
                <dt className="truncate text-ink-soft text-sm">{names[p]}</dt>
                <dd className="font-bold font-display text-3xl">
                  <Num value={r[p]} />
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-ink-soft text-sm">
            جولات مكتملة: <Num value={r.rounds} /> · متخطّاة: <Num value={r.skipped} />. النقطة
            للتذكّر الصحيح، ويُخصم للاختيار الخاطئ، ولا تنزل الجولة عن الصفر.
          </p>
        </ResultShell>
      </SessionFrame>
    );
  }

  if (state.phase === "instructions") {
    return (
      <SessionFrame game={game} live onExit={() => send({ type: "END" })}>
        <div className="flex flex-1 flex-col gap-6">
          <ol className="flex flex-col gap-3">
            {game.steps.map((step, i) => (
              <li key={step} className="flex items-start gap-3 rounded-card bg-card p-4">
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full font-bold text-white"
                  style={{ backgroundColor: game.hue }}
                >
                  <Num value={i + 1} />
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          <h2 className="mt-auto text-center font-bold font-display text-3xl">مستعدّان؟</h2>
          <Button fullWidth onClick={() => send({ type: "START" })}>
            ابدأ
          </Button>
        </div>
      </SessionFrame>
    );
  }

  const grid = state.grids[state.roundIndex];
  const byId = (id: string) => state.deck.find((c) => c.id === id) as G20Card;
  const turn = state.aliases[playerOfRound(state.roundIndex)];
  const seconds = Math.ceil(viewRemainingMs(state, now) / 1000);
  const last = state.completedRounds[state.completedRounds.length - 1];
  const showGrid = state.phase === "timer_running" || state.phase === "timer_paused";

  return (
    <SessionFrame
      game={game}
      live
      progress={{ current: state.roundIndex + 1, total: G20_ROUNDS }}
      onExit={() => send({ type: "END" })}
    >
      <div className="flex flex-1 flex-col gap-5">
        <p className="font-semibold text-ink-soft" aria-live="polite">
          الدور على {turn}
        </p>

        {state.phase === "timer_ready" ? (
          <div className="flex flex-1 flex-col gap-5">
            <div className="rounded-card bg-card p-6 text-center">
              <p className="font-bold font-display text-2xl leading-snug">
                ستظهر <Num value={state.level} /> أشياء لمدة <Num value={G20_VIEW_MS / 1000} />{" "}
                ثوانٍ.
              </p>
              <p className="mt-2 text-ink-soft">احفظاها ثم اختارا ما تتذكّرانه.</p>
            </div>
            <div className="mt-auto flex flex-col gap-2">
              <Button fullWidth onClick={() => send({ type: "READY", now: Date.now() })}>
                اعرض الشبكة
              </Button>
              <Button variant="ghost" fullWidth onClick={() => send({ type: "SKIP" })}>
                تخطّي
              </Button>
            </div>
          </div>
        ) : null}

        {showGrid ? (
          <div className="flex flex-1 flex-col gap-5">
            <div className="flex flex-col items-center gap-1 text-center">
              <div className="font-bold font-display text-5xl tabular-nums leading-none">
                <Num value={seconds} />
              </div>
              <p aria-live="polite" className="min-h-6 text-ink-soft">
                {state.phase === "timer_paused" ? "متوقّف مؤقّتاً" : "احفظا الشبكة"}
              </p>
            </div>
            <ul className={`grid gap-3 ${GRID_COLS[state.level]}`}>
              {grid.targets.map((id) => (
                <li
                  key={id}
                  className="flex min-h-24 items-center justify-center rounded-card bg-card p-3 text-center shadow-[var(--shadow-deck)]"
                >
                  <ObjectFace card={byId(id)} wordsOnly={state.wordsOnly} />
                </li>
              ))}
            </ul>
            <div className="mt-auto flex flex-col gap-2">
              {state.phase === "timer_paused" ? (
                <Button fullWidth onClick={() => send({ type: "RESUME", now: Date.now() })}>
                  متابعة
                </Button>
              ) : null}
              <Button variant="secondary" fullWidth onClick={() => send({ type: "DONE" })}>
                أخفِ الآن
              </Button>
              <Button variant="ghost" fullWidth onClick={() => send({ type: "SKIP" })}>
                تخطّي
              </Button>
            </div>
          </div>
        ) : null}

        {state.phase === "input" ? (
          <div className="flex flex-1 flex-col gap-5">
            <p className="font-semibold text-lg">
              اختر ما تتذكّره — اخترتَ <Num value={state.selected.length} /> من{" "}
              <Num value={state.level} />
            </p>
            <ul className="grid grid-cols-3 gap-2">
              {grid.options.map((id) => {
                const on = state.selected.includes(id);
                return (
                  <li key={id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => send({ type: "SUBMIT", player: "A", optionId: id })}
                      style={
                        on
                          ? {
                              borderColor: game.hue,
                              backgroundColor: `color-mix(in srgb, ${game.hue} 18%, white)`,
                            }
                          : undefined
                      }
                      className={`flex min-h-20 w-full items-center justify-center rounded-2xl border-2 p-2 text-center transition-colors ${
                        on ? "text-ink" : "border-line bg-card text-ink hover:border-ink-faint"
                      }`}
                    >
                      <ObjectFace card={byId(id)} wordsOnly={state.wordsOnly} />
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-auto flex flex-col gap-2">
              <Button fullWidth onClick={() => send({ type: "DONE" })}>
                تثبيت الاختيار
              </Button>
              <Button variant="ghost" fullWidth onClick={() => send({ type: "SKIP" })}>
                تخطّي
              </Button>
              <p className="text-center text-ink-faint text-sm">لا بأس بالتخطّي.</p>
            </div>
          </div>
        ) : null}

        {state.phase === "reveal" && last ? (
          <div className="flex flex-1 flex-col gap-4">
            <p
              role="status"
              aria-live="polite"
              className="self-start rounded-chip border border-line bg-ground px-4 py-1.5 font-bold"
            >
              نقاط هذه الجولة: <Num value={last.score} />
            </p>
            <dl className="flex flex-col gap-2 rounded-card bg-card p-5">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink-soft">تذكّرتَ بشكل صحيح</dt>
                <dd className="font-semibold">
                  <Num value={last.correct} /> من <Num value={state.level} />
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink-soft">اختيارات خاطئة</dt>
                <dd className="font-semibold">
                  <Num value={last.wrong} />
                </dd>
              </div>
            </dl>
            <div>
              <h3 className="mb-2 font-semibold">كانت الشبكة</h3>
              <ul className={`grid gap-2 ${GRID_COLS[state.level]}`}>
                {grid.targets.map((id) => (
                  <li
                    key={id}
                    className={`flex min-h-20 items-center justify-center rounded-2xl border p-2 text-center ${
                      state.selected.includes(id)
                        ? "border-mint bg-mint-soft"
                        : "border-line bg-card"
                    }`}
                  >
                    <span className="flex flex-col items-center gap-1">
                      <ObjectFace card={byId(id)} wordsOnly={state.wordsOnly} />
                      <span className="text-ink-soft text-xs">
                        {state.selected.includes(id) ? "تذكّرتَه" : "فاتك"}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <Button fullWidth className="mt-auto" onClick={() => send({ type: "NEXT" })}>
              {state.roundIndex + 1 >= G20_ROUNDS ? "النتيجة" : "الجولة التالية"}
            </Button>
          </div>
        ) : null}
      </div>
    </SessionFrame>
  );
}
