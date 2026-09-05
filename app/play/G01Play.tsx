"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { Num } from "@/components/Num";
import { ResultShell } from "@/components/play/ResultShell";
import { SessionFrame } from "@/components/play/SessionFrame";
import { G01_CARDS } from "@/lib/content";
import { G01, type G01Setup, type Pack } from "@/lib/engine";
import type { GameMeta } from "@/lib/games";
import { readSeen } from "@/lib/storage";
import { PlayCard } from "./ChoiceRound";
import { Instructions, RoundsPicker, SetupShell, Stats } from "./Setup";
import { useSession } from "./useSession";

const PACKS: { id: Pack; label: string }[] = [
  { id: "light", label: "خفيف" },
  { id: "memories", label: "ذكريات" },
  { id: "dreams", label: "أحلام" },
];

/** G01 — Conversation Starters (FR-G01): setup → instructions → card … → results. */
export function G01Play({ game }: { game: GameMeta }) {
  const [packs, setPacks] = useState<Pack[]>(["light", "memories", "dreams"]);
  const [rounds, setRounds] = useState<5 | 10>(5);
  const [session, setSession] = useState<{ setup: G01Setup; seen: string[] } | null>(null);

  if (session) return <Session game={game} {...session} />;

  const draft = { packs, rounds };
  const available = G01.availableCount(G01_CARDS, draft);
  const togglePack = (id: Pack) =>
    setPacks((p) => {
      const next = p.includes(id) ? p.filter((x) => x !== id) : [...p, id];
      return next.length ? next : p; // at least one pack
    });

  return (
    <SessionFrame game={game}>
      <SetupShell
        game={game}
        available={available}
        requested={rounds}
        onStart={(aliases) => setSession({ setup: { ...draft, aliases }, seen: readSeen(game.id) })}
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-semibold">الباقات</legend>
          <div className="flex flex-wrap gap-2">
            {PACKS.map((p) => (
              <Chip
                key={p.id}
                pressed={packs.includes(p.id)}
                onToggle={() => togglePack(p.id)}
                hue={game.hue}
              >
                {p.label}
              </Chip>
            ))}
          </div>
        </fieldset>
        <RoundsPicker value={rounds} onChange={setRounds} hue={game.hue} />
      </SetupShell>
    </SessionFrame>
  );
}

function Session({ game, setup, seen }: { game: GameMeta; setup: G01Setup; seen: string[] }) {
  const { state, send, restart } = useSession(G01, G01_CARDS, setup, seen);
  const total = state.deck.length;
  const card = state.deck[state.roundIndex];
  const inRound = state.phase === "card" && card !== undefined;

  return (
    <SessionFrame
      game={game}
      live={state.phase !== "results"}
      onExit={() => send({ type: "END" })}
      progress={inRound ? { current: state.roundIndex + 1, total } : undefined}
    >
      {state.phase === "instructions" ? (
        <Instructions game={game} onStart={() => send({ type: "START" })} />
      ) : null}

      {inRound ? (
        <div className="flex flex-1 flex-col gap-5">
          <PlayCard
            headline={`الدور على ${state.aliases[state.speaker]}`}
            cardId={card.id}
            body={card.body}
          />
          <div className="mt-auto flex flex-col gap-2">
            <Button fullWidth onClick={() => send({ type: "NEXT" })}>
              التالي
            </Button>
            <Button variant="ghost" fullWidth onClick={() => send({ type: "SKIP" })}>
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
  state: ReturnType<typeof G01.initialState>;
  onReplay: () => void;
}) {
  const r = G01.deriveResult(state);
  return (
    <ResultShell
      game={game}
      title="انتهت الجلسة"
      note={r.completed === 0 ? "لم تُكتمل أي جولة بعد." : undefined}
      onReplay={onReplay}
    >
      <Stats
        rows={[
          { label: "بطاقات مكتملة", value: <Num value={r.completed} /> },
          { label: "بطاقات متخطّاة", value: <Num value={r.skipped} /> },
        ]}
      />
    </ResultShell>
  );
}
