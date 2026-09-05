"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Tag } from "@/components/Chip";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Num } from "@/components/Num";
import { AliasFields } from "@/components/play/AliasFields";
import { Handoff } from "@/components/play/Handoff";
import { ResultShell } from "@/components/play/ResultShell";
import { SessionFrame } from "@/components/play/SessionFrame";
import { G15_CARDS } from "@/lib/content";
import {
  CODE_MAX,
  CODE_MIN,
  emptyStations,
  G15,
  type G15State,
  HINT_MAX,
  type Path,
  pathValid,
  playerView,
  STATIONS,
  type Station,
  stationErrors,
} from "@/lib/engine/g15";
import type { Aliases, Event } from "@/lib/engine/types";
import type { GameMeta } from "@/lib/games";
import { useGameData } from "@/lib/storage";
import { Instructions, Stats } from "./Setup";

const INPUT =
  "min-h-11 w-full rounded-xl border border-line bg-card px-4 py-2 text-base text-ink placeholder:text-ink-faint";
/** Fixed positional slots: stations have no identity of their own, so the slot is the key. */
const SLOTS = Array.from({ length: STATIONS }, (_, i) => `station-${i + 1}`);

/**
 * G15 — Home Treasure Hunt (FR-G15). Creator writes 5 stations (hint + code), previews what the
 * player will see, locks the path and hands the phone over. The locked path is stored locally
 * so the page survives a reload; codes are never rendered in the player UI.
 * ponytail: single-phone only; sharing a path between two phones is the Convex-sync upgrade.
 */
export function G15Play({ game }: { game: GameMeta }) {
  const [path, setPath, hydrated] = useGameData<Path | null>("G15", null);
  const [aliases, setAliases] = useState<Aliases>({ A: "", B: "" });
  const [draft, setDraft] = useState<Station[]>(emptyStations);
  const [state, setState] = useState<G15State | null>(null);
  const send = useCallback((e: Event) => setState((s) => (s ? G15.reduce(s, e) : s)), []);

  const begin = useCallback(
    (stations: Station[]) => {
      const setup = { aliases, stations };
      setState(G15.initialState(G15.buildDeck(G15_CARDS, setup, []), setup));
    },
    [aliases],
  );

  // After a reload mid-hunt the locked path is still there: rebuild the session from it.
  useEffect(() => {
    if (hydrated && path?.started && !state) begin(path.stations);
  }, [hydrated, path, state, begin]);

  const reset = () => {
    setPath(null);
    setState(null);
    setDraft(emptyStations());
  };

  if (!hydrated) return <SessionFrame game={game}>{null}</SessionFrame>;

  if (!path) {
    return (
      <SessionFrame game={game}>
        <Creator
          game={game}
          aliases={aliases}
          onAliases={setAliases}
          draft={draft}
          onDraft={setDraft}
          onLock={(stations) => setPath({ stations, lockedAt: Date.now(), started: false })}
        />
      </SessionFrame>
    );
  }

  if (!path.started) {
    const seeker = aliases.B.trim() || "اللاعب الثاني";
    return (
      <SessionFrame game={game}>
        <div className="flex flex-1 flex-col gap-4">
          <Handoff
            toName={seeker}
            onReady={() => {
              setPath({ ...path, started: true });
              begin(path.stations);
            }}
          />
          <Button
            variant="ghost"
            fullWidth
            onClick={() => {
              setDraft(path.stations);
              setPath(null);
            }}
          >
            العودة إلى التعديل
          </Button>
          <p className="text-center text-ink-faint text-sm">
            بعد أن يضغط شريكك «أنا مستعدّ» لا يمكن تعديل المسار، فقط بدء مسار جديد.
          </p>
        </div>
      </SessionFrame>
    );
  }

  if (!state) return <SessionFrame game={game}>{null}</SessionFrame>; // rebuilding after a reload

  const st = state.stations[state.station];
  const view = playerView(state.stations)[state.station];
  const inRound = state.phase === "input" && view !== undefined && st !== undefined;

  return (
    <SessionFrame
      game={game}
      live={state.phase !== "results"}
      onExit={() => send({ type: "END" })}
      progress={inRound ? { current: state.station + 1, total: STATIONS } : undefined}
    >
      {state.phase === "instructions" ? (
        <Instructions game={game} onStart={() => send({ type: "START" })} />
      ) : null}

      {inRound ? (
        <StationPlay
          key={state.station}
          index={state.station}
          hint={view.hint}
          extraHint={state.extraShown ? view.extraHint : null}
          hasExtra={view.extraHint.length > 0}
          attempt={state.attempt}
          wrong={state.wrong}
          onAttempt={(value) => send({ type: "INPUT", field: "code", value })}
          onCheck={() => send({ type: "DONE" })}
          onHint={() => send({ type: "HINT" })}
          onSkip={() => send({ type: "SKIP" })}
        />
      ) : null}

      {state.phase === "results" ? (
        <Results game={game} state={state} onReplay={() => begin(state.stations)} onReset={reset} />
      ) : null}
    </SessionFrame>
  );
}

function Creator({
  game,
  aliases,
  onAliases,
  draft,
  onDraft,
  onLock,
}: {
  game: GameMeta;
  aliases: Aliases;
  onAliases: (a: Aliases) => void;
  draft: Station[];
  onDraft: (s: Station[]) => void;
  onLock: (stations: Station[]) => void;
}) {
  const [preview, setPreview] = useState(false);
  const valid = pathValid(draft);
  const update = (i: number, patch: Partial<Station>) =>
    onDraft(draft.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  const examples = G15_CARDS.filter((c) => c.status === "published");

  return (
    <form
      className="flex flex-1 flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid)
          onLock(
            draft.map((s) => ({
              hint: s.hint.trim(),
              code: s.code.trim(),
              extraHint: s.extraHint.trim(),
            })),
          );
      }}
    >
      <p className="text-ink-soft">{game.tagline}</p>
      <AliasFields value={aliases} onChange={onAliases} />
      <p className="rounded-card bg-card p-4 text-ink-soft text-sm">
        اللاعب الأول يكتب المسار، والثاني يبحث عن الكنز. اختر أماكن آمنة في البيت، واترك في كل مكان
        ورقة عليها رمز قصير. لا تستخدم رموزاً حسّاسة (كلمات سرّ أو أرقام بطاقات).
      </p>

      <details className="rounded-card border border-line bg-card p-4">
        <summary className="cursor-pointer font-semibold">أمثلة على كتابة الأدلة</summary>
        <ul className="mt-3 flex flex-col gap-3">
          {examples.map((c) => (
            <li
              key={c.id}
              className="flex items-start justify-between gap-3 border-line border-t pt-3"
            >
              <div>
                <p className="font-medium">{c.body}</p>
                <p className="text-ink-soft text-sm">{c.tip}</p>
              </div>
              <FavoriteButton kind="card" id={c.id} />
            </li>
          ))}
        </ul>
      </details>

      {SLOTS.map((slot, i) => {
        const s = draft[i];
        const touched = s.hint || s.code || s.extraHint;
        const errs = touched ? stationErrors(s) : [];
        return (
          <fieldset key={slot} className="flex flex-col gap-3 rounded-card bg-card p-4">
            <legend className="float-start mb-2 w-full font-semibold">
              المحطة <Num value={i + 1} />
            </legend>
            <label className="flex flex-col gap-1 text-ink-soft text-sm">
              <span className="flex justify-between">
                <span>الدليل</span>
                <span>
                  <Num value={s.hint.length} />/<Num value={HINT_MAX} />
                </span>
              </span>
              <textarea
                rows={2}
                maxLength={HINT_MAX}
                value={s.hint}
                onChange={(e) => update(i, { hint: e.target.value })}
                placeholder="مثلاً: ابدأ من حيث نضع أحذيتنا"
                className={INPUT}
              />
            </label>
            <label className="flex flex-col gap-1 text-ink-soft text-sm">
              الرمز الموجود في هذا المكان (<Num value={CODE_MIN} />–<Num value={CODE_MAX} /> أحرف أو
              أرقام)
              <input
                type="text"
                maxLength={CODE_MAX}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                value={s.code}
                onChange={(e) => update(i, { code: e.target.value })}
                placeholder="مثلاً: نجم7"
                className={INPUT}
              />
            </label>
            <label className="flex flex-col gap-1 text-ink-soft text-sm">
              تلميح إضافي (اختياري)
              <input
                type="text"
                maxLength={HINT_MAX}
                autoComplete="off"
                value={s.extraHint}
                onChange={(e) => update(i, { extraHint: e.target.value })}
                placeholder="يظهر فقط إذا طلبه شريكك"
                className={INPUT}
              />
            </label>
            {errs.length ? (
              <ul role="status" className="text-danger text-sm">
                {errs.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            ) : null}
          </fieldset>
        );
      })}

      <Button
        type="button"
        variant="secondary"
        fullWidth
        aria-pressed={preview}
        onClick={() => setPreview((v) => !v)}
      >
        {preview ? "إخفاء المعاينة" : "معاينة"}
      </Button>
      {preview ? (
        <section aria-label="معاينة ما سيراه اللاعب" className="rounded-card bg-mint-soft p-4">
          <p className="mb-2 font-semibold">هكذا يرى شريكك المسار (الرموز لا تظهر له):</p>
          <ol className="flex list-inside list-decimal flex-col gap-2">
            {playerView(draft).map((v, i) => (
              <li key={SLOTS[i]}>
                {v.hint || <span className="text-ink-faint">(دليل فارغ)</span>}
                {v.extraHint ? (
                  <span className="block text-ink-soft text-sm">تلميح إضافي: {v.extraHint}</span>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <div className="mt-auto flex flex-col gap-2">
        {valid ? null : (
          <p className="text-center text-ink-soft text-sm">
            أكمل المحطات الخمس (دليل ورمز لكل محطة) قبل قفل المسار.
          </p>
        )}
        <Button type="submit" fullWidth disabled={!valid}>
          اقفل المسار وسلّم الهاتف
        </Button>
      </div>
    </form>
  );
}

function StationPlay({
  index,
  hint,
  extraHint,
  hasExtra,
  attempt,
  wrong,
  onAttempt,
  onCheck,
  onHint,
  onSkip,
}: {
  index: number;
  hint: string;
  extraHint: string | null;
  hasExtra: boolean;
  attempt: string;
  wrong: boolean;
  onAttempt: (v: string) => void;
  onCheck: () => void;
  onHint: () => void;
  onSkip: () => void;
}) {
  return (
    <form
      className="flex flex-1 flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        onCheck();
      }}
    >
      <p className="font-semibold text-ink-soft" aria-live="polite">
        المحطة <Num value={index + 1} /> من <Num value={STATIONS} />
      </p>
      <div className="flex min-h-44 flex-col gap-4 rounded-card bg-card p-6 shadow-[var(--shadow-deck)]">
        <p className="flex-1 font-display font-semibold text-2xl leading-snug">{hint}</p>
        {extraHint ? (
          <p role="status" className="rounded-xl bg-mint-soft p-3 text-sm">
            <span className="font-semibold">تلميح إضافي: </span>
            {extraHint}
          </p>
        ) : null}
      </div>
      <label className="flex flex-col gap-1 text-ink-soft text-sm">
        الرمز الذي وجدتماه
        <input
          type="text"
          maxLength={CODE_MAX}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          value={attempt}
          onChange={(e) => onAttempt(e.target.value)}
          className={INPUT}
        />
      </label>
      <p role="status" aria-live="polite" className="min-h-5 text-danger text-sm">
        {wrong ? "الرمز غير صحيح، حاولا مرة أخرى." : ""}
      </p>
      <div className="mt-auto flex flex-col gap-2">
        <Button type="submit" fullWidth disabled={attempt.trim() === ""}>
          تحقّق
        </Button>
        {hasExtra && extraHint === null ? (
          <Button type="button" variant="secondary" fullWidth onClick={onHint}>
            تلميح إضافي
          </Button>
        ) : null}
        <Button type="button" variant="ghost" fullWidth onClick={onSkip}>
          تخطّي هذه المحطة
        </Button>
        <p className="text-center text-ink-faint text-sm">التلميح والتخطّي بلا أي خصم.</p>
      </div>
    </form>
  );
}

function Results({
  game,
  state,
  onReplay,
  onReset,
}: {
  game: GameMeta;
  state: G15State;
  onReplay: () => void;
  onReset: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const r = G15.deriveResult(state);
  return (
    <ResultShell
      game={game}
      title={r.completed ? "وجدتما الكنز!" : "انتهى المسار"}
      note={state.endedEarly ? "انتهت الجلسة مبكراً؛ هذه خلاصة ما لعبتماه." : undefined}
      onReplay={onReplay}
    >
      <Stats
        rows={[
          {
            label: "محطات مفتوحة",
            value: (
              <>
                <Num value={r.solved} /> من <Num value={r.total} />
              </>
            ),
          },
          { label: "محطات متخطّاة", value: <Num value={r.skipped} /> },
        ]}
      />
      <div className="mt-4 flex flex-col gap-2">
        {confirming ? (
          <fieldset className="flex flex-col gap-3 rounded-card border border-danger/40 bg-ground p-4">
            <legend className="float-start mb-2 w-full font-semibold">
              حذف هذا المسار وكتابة مسار جديد؟
            </legend>
            <div className="flex gap-2">
              <Button variant="danger" onClick={onReset} className="flex-1">
                نعم، مسار جديد
              </Button>
              <Button variant="secondary" onClick={() => setConfirming(false)} className="flex-1">
                إلغاء
              </Button>
            </div>
          </fieldset>
        ) : (
          <Button variant="secondary" fullWidth onClick={() => setConfirming(true)}>
            مسار جديد
          </Button>
        )}
        <Tag>المسار محفوظ على هذا الهاتف فقط</Tag>
      </div>
    </ResultShell>
  );
}
