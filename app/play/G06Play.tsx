"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { Num } from "@/components/Num";
import { ResultShell } from "@/components/play/ResultShell";
import { SessionFrame } from "@/components/play/SessionFrame";
import { G06_CARDS } from "@/lib/content";
import { G06, G06_PACKS, G06_ROUNDS, type G06Pack, type G06Setup } from "@/lib/engine/g06";
import type { GameMeta } from "@/lib/games";
import { readSeen, useGameData } from "@/lib/storage";
import { PlayCard } from "./ChoiceRound";
import { Instructions, SetupShell, Stats } from "./Setup";
import { useSession } from "./useSession";

const PACK_LABEL: Record<G06Pack, string> = {
  beginnings: "بدايات",
  travel: "سفر",
  home: "بيت",
  funny: "طرائف",
};

const TITLE_MAX = 40;

/** One saved memory title. Only what the players typed and explicitly saved (DATA-02). */
export interface SavedTitle {
  title: string;
  cardId: string;
  at: number;
}

// ponytail: titles live in localStorage only (R1). Ceiling: one device, no sharing —
// the R3 upgrade path is the cloud album (e.g. a Convex `memories` table keyed by couple).
const useTitles = () => useGameData("G06", [] as SavedTitle[]);

const formatDate = (at: number) =>
  new Date(at).toLocaleDateString("ar", { year: "numeric", month: "long", day: "numeric" });

/** G06 — Memory Lane (FR-G06): setup (+ saved titles) → instructions → 5 cards → results. */
export function G06Play({ game }: { game: GameMeta }) {
  const [packs, setPacks] = useState<G06Pack[]>([...G06_PACKS]);
  const [session, setSession] = useState<{ setup: G06Setup; seen: string[] } | null>(null);

  if (session) return <Session game={game} {...session} />;

  const draft: G06Setup = { packs };
  const available = G06.availableCount(G06_CARDS, draft);
  const togglePack = (id: G06Pack) =>
    setPacks((p) => {
      const next = p.includes(id) ? p.filter((x) => x !== id) : [...p, id];
      return next.length ? next : p; // at least one pack
    });

  return (
    <SessionFrame game={game}>
      <SetupShell
        game={game}
        available={available}
        requested={G06_ROUNDS}
        onStart={(aliases) => setSession({ setup: { ...draft, aliases }, seen: readSeen(game.id) })}
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-semibold">الباقات</legend>
          <div className="flex flex-wrap gap-2">
            {G06_PACKS.map((p) => (
              <Chip
                key={p}
                pressed={packs.includes(p)}
                onToggle={() => togglePack(p)}
                hue={game.hue}
              >
                {PACK_LABEL[p]}
              </Chip>
            ))}
          </div>
        </fieldset>
        <SavedTitles hue={game.hue} />
      </SetupShell>
    </SessionFrame>
  );
}

/** Titles saved on this device, with a two-step delete (no accidental loss). */
function SavedTitles({ hue }: { hue: string }) {
  const [titles, setTitles, hydrated] = useTitles();
  const [confirming, setConfirming] = useState<number | null>(null);

  if (!hydrated || titles.length === 0) return null;
  const ordered = [...titles].sort((a, b) => b.at - a.at);

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-semibold">
        عناوين محفوظة (<Num value={titles.length} />)
      </h2>
      <ul className="flex flex-col gap-2">
        {ordered.map((t) => (
          <li
            key={`${t.cardId}-${t.at}`}
            className="flex items-center justify-between gap-3 rounded-card border border-line bg-card p-3"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{t.title}</p>
              <p className="text-ink-faint text-sm">{formatDate(t.at)}</p>
            </div>
            {confirming === t.at ? (
              <span className="flex shrink-0 gap-1">
                <Button
                  variant="danger"
                  className="!min-h-11 !px-3"
                  onClick={() => {
                    setTitles(titles.filter((x) => x.at !== t.at));
                    setConfirming(null);
                  }}
                >
                  تأكيد الحذف
                </Button>
                <Button
                  variant="ghost"
                  className="!min-h-11 !px-3"
                  onClick={() => setConfirming(null)}
                >
                  تراجع
                </Button>
              </span>
            ) : (
              <Button
                variant="ghost"
                className="!min-h-11 !px-3 shrink-0"
                style={{ color: hue }}
                aria-label={`احذف «${t.title}»`}
                onClick={() => setConfirming(t.at)}
              >
                حذف
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Session({ game, setup, seen }: { game: GameMeta; setup: G06Setup; seen: string[] }) {
  const { state, send, restart } = useSession(G06, G06_CARDS, setup, seen);
  const [, setTitles] = useTitles();
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  const card = state.deck[state.roundIndex];
  const inRound = state.phase === "card" && card !== undefined;

  // Leaving a card always clears the draft: cancelling saves nothing (FR-G06 acceptance).
  const leave = (type: "NEXT" | "SKIP") => () => {
    setDraft("");
    setSaved(null);
    send({ type });
  };

  const save = () => {
    const title = draft.trim().slice(0, TITLE_MAX);
    if (!title || !card) return;
    setTitles((prev) => [...prev, { title, cardId: card.id, at: Date.now() }]);
    setDraft("");
    setSaved(title);
  };

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
          <PlayCard headline="استرجعا هذه الذكرى معاً" cardId={card.id} body={card.body} />
          <p className="text-ink-faint text-sm">لا يهمّ إن اختلفت روايتاكما؛ لكلٍّ منكما ذاكرته.</p>

          <div className="flex flex-col gap-2">
            <label htmlFor="memory-title" className="font-semibold text-sm">
              عنوان للذكرى (اختياري)
            </label>
            <input
              id="memory-title"
              type="text"
              maxLength={TITLE_MAX}
              autoComplete="off"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="مثلاً: أول فطور في البيت"
              className="min-h-11 rounded-xl border border-line bg-card px-4 text-base text-ink placeholder:text-ink-faint"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-ink-faint text-sm">
                <Num value={`${draft.length}/${TITLE_MAX}`} />
              </span>
              {/* Nothing is stored until this button is pressed. */}
              <Button variant="secondary" disabled={draft.trim().length === 0} onClick={save}>
                احفظ العنوان
              </Button>
            </div>
            <p role="status" aria-live="polite" className="min-h-5 text-ink-soft text-sm">
              {saved ? `حُفظ «${saved}» على هذا الجهاز.` : ""}
            </p>
          </div>

          <div className="mt-auto flex flex-col gap-2">
            <Button fullWidth onClick={leave("NEXT")}>
              التالي
            </Button>
            <Button variant="ghost" fullWidth onClick={leave("SKIP")}>
              تخطّي
            </Button>
            <p className="text-center text-ink-faint text-sm">لا بأس بالتخطّي.</p>
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
  state: ReturnType<typeof G06.initialState>;
  onReplay: () => void;
}) {
  const r = G06.deriveResult(state);
  const [titles, , hydrated] = useTitles();
  return (
    <ResultShell
      game={game}
      title="انتهت الجولة في درب الذكريات"
      note={
        r.completed === 0
          ? "لم تُكتمل أي بطاقة بعد."
          : state.endedEarly
            ? "انتهت الجلسة مبكراً؛ هذه خلاصة ما استرجعتماه."
            : undefined
      }
      onReplay={onReplay}
    >
      {/* No accuracy score (FR-G06 Result). */}
      <Stats
        rows={[
          { label: "ذكريات استرجعتماها", value: <Num value={r.completed} /> },
          { label: "بطاقات متخطّاة", value: <Num value={r.skipped} /> },
          ...(hydrated ? [{ label: "عناوين محفوظة", value: <Num value={titles.length} /> }] : []),
        ]}
      />
    </ResultShell>
  );
}
