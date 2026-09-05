"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Num } from "@/components/Num";
import { ResultShell } from "@/components/play/ResultShell";
import { SessionFrame } from "@/components/play/SessionFrame";
import { G12_CARDS } from "@/lib/content";
import {
  G12,
  G12_MAX_CHARS,
  G12_MAX_TURNS,
  type G12Setup,
  type G12State,
  storyText,
} from "@/lib/engine";
import type { GameMeta } from "@/lib/games";
import { readSeen } from "@/lib/storage";
import { Instructions, SetupShell, Stats } from "./Setup";
import { useSession } from "./useSession";

/** G12 — A Story, One Word at a Time (FR-G12): alternating editor, undo latest, explicit copy. */
export function G12Play({ game }: { game: GameMeta }) {
  const [session, setSession] = useState<{ setup: G12Setup; seen: string[] } | null>(null);
  if (session) return <Session game={game} {...session} />;
  return (
    <SessionFrame game={game}>
      <SetupShell
        game={game}
        available={G12.availableCount(G12_CARDS, {})}
        requested={1}
        onStart={(aliases) => setSession({ setup: { aliases }, seen: readSeen(game.id) })}
      >
        <p className="rounded-card bg-card p-4 text-ink-soft">
          حتى <Num value={G12_MAX_TURNS} /> دوراً، و<Num value={G12_MAX_CHARS} /> حرفاً في كل دور.
          القصة تُمسح عند الخروج ما لم تنسخاها.
        </p>
      </SetupShell>
    </SessionFrame>
  );
}

function Story({ state }: { state: G12State }) {
  const opening = state.deck[state.roundIndex];
  return (
    <div className="card-in rounded-card bg-card p-5 shadow-[var(--shadow-deck)]">
      <div className="flex items-start justify-between gap-3">
        <p className="font-display font-semibold text-xl leading-relaxed">
          <span className="font-bold">{opening?.body}</span>
          {state.segments.map((seg, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: segments are append-only
              key={i}
              title={state.aliases[seg.player]}
              className={seg.player === "A" ? "text-ink" : "text-ink-soft"}
            >
              {" "}
              {seg.text}
            </span>
          ))}
        </p>
        {opening ? <FavoriteButton kind="card" id={opening.id} /> : null}
      </div>
    </div>
  );
}

function Session({ game, setup, seen }: { game: GameMeta; setup: G12Setup; seen: string[] }) {
  const { state, send, restart } = useSession(G12, G12_CARDS, setup, seen);
  const { aliases, phase } = state;
  const full = state.segments.length >= G12_MAX_TURNS;
  const canAdd = state.draft.trim().length > 0 && !full;

  return (
    <SessionFrame game={game} live={phase !== "results"} onExit={() => send({ type: "END" })}>
      {phase === "instructions" ? (
        <Instructions game={game} onStart={() => send({ type: "START" })} />
      ) : null}

      {phase === "input" ? (
        <form
          className="flex flex-1 flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (canAdd) send({ type: "NEXT" });
          }}
        >
          <p className="font-semibold text-ink-soft" aria-live="polite">
            {full ? "اكتملت الأدوار العشرون" : `الدور على ${aliases[state.turn]}`} · الدور{" "}
            <Num value={Math.min(state.segments.length + 1, G12_MAX_TURNS)} /> من{" "}
            <Num value={G12_MAX_TURNS} />
          </p>
          <Story state={state} />
          <label className="flex flex-col gap-1 text-ink-soft text-sm">
            <span className="flex justify-between">
              <span>{aliases[state.turn]}، أضف كلمة أو جملة قصيرة</span>
              <span>
                <Num value={state.draft.length} />/<Num value={G12_MAX_CHARS} />
              </span>
            </span>
            <input
              type="text"
              maxLength={G12_MAX_CHARS}
              autoComplete="off"
              disabled={full}
              value={state.draft}
              onChange={(e) => send({ type: "INPUT", field: "text", value: e.target.value })}
              className="min-h-11 rounded-xl border border-line bg-card px-4 text-base text-ink placeholder:text-ink-faint"
            />
          </label>
          <div className="mt-auto flex flex-col gap-2">
            <Button type="submit" fullWidth disabled={!canAdd}>
              أضف ومرّر الهاتف
            </Button>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                fullWidth
                disabled={state.segments.length === 0}
                onClick={() => send({ type: "UNDO" })}
              >
                تراجع عن آخر دور
              </Button>
              <Button
                variant="secondary"
                fullWidth
                disabled={state.segments.length === 0}
                onClick={() => send({ type: "DONE" })}
              >
                عرض القصة
              </Button>
            </div>
            {state.segments.length === 0 ? (
              <Button variant="ghost" fullWidth onClick={() => send({ type: "SKIP" })}>
                بداية أخرى
              </Button>
            ) : null}
          </div>
        </form>
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
  state: G12State;
  onReplay: () => void;
}) {
  const r = G12.deriveResult(state);
  const [copied, setCopied] = useState<"ok" | "fail" | null>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(storyText(state));
      setCopied("ok");
    } catch {
      setCopied("fail");
    }
  };
  return (
    <ResultShell
      game={game}
      title={r.finished ? "اكتملت القصة" : "جلسة غير مكتملة"}
      note={r.finished ? undefined : "لم تُحفظ القصة؛ تُمسح عند الخروج."}
      onReplay={onReplay}
    >
      {r.finished ? (
        <>
          <p className="font-display text-lg leading-relaxed">{r.story}</p>
          <div className="mt-4 flex flex-col gap-2">
            <Button variant="secondary" fullWidth onClick={copy}>
              نسخ القصة
            </Button>
            <p
              role="status"
              aria-live="polite"
              className="min-h-5 text-center text-ink-soft text-sm"
            >
              {copied === "ok"
                ? "نُسخت القصة."
                : copied === "fail"
                  ? "تعذّر النسخ؛ حدّدا النصّ وانسخاه يدوياً."
                  : ""}
            </p>
          </div>
        </>
      ) : null}
      <div className="mt-4">
        <Stats rows={[{ label: "عدد الأدوار", value: <Num value={r.turns} /> }]} />
      </div>
    </ResultShell>
  );
}
