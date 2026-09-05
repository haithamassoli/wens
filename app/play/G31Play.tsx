"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Num } from "@/components/Num";
import { ResultShell } from "@/components/play/ResultShell";
import { SessionFrame } from "@/components/play/SessionFrame";
import { G31_CARDS } from "@/lib/content";
import { G31, G31_ROUNDS, type G31Setup } from "@/lib/engine/g31";
import type { GameMeta } from "@/lib/games";
import { readSeen } from "@/lib/storage";
import { PlayCard } from "./ChoiceRound";
import { Instructions, SetupShell, Stats } from "./Setup";
import { useSession } from "./useSession";

/**
 * G31 — A Gratitude Card (FR-G31): one starter per person, then «بطاقة أخرى» or «إنهاء».
 * Nothing is typed and nothing is stored: the summary shows a count, never a single word of
 * what was said, and the game never schedules a reminder.
 */
export function G31Play({ game }: { game: GameMeta }) {
  const [session, setSession] = useState<{ setup: G31Setup; seen: string[] } | null>(null);
  if (session) return <Session game={game} {...session} />;

  return (
    <SessionFrame game={game}>
      <SetupShell
        game={game}
        available={G31.availableCount(G31_CARDS, {})}
        requested={G31_ROUNDS}
        onStart={(aliases) => setSession({ setup: { aliases }, seen: readSeen(game.id) })}
      >
        <p className="text-ink-soft">
          بطاقة لكلٍّ منكما تُقال بصوت عالٍ. لا كتابة ولا حفظ، وما يُقال يبقى بينكما.
        </p>
      </SetupShell>
    </SessionFrame>
  );
}

function Session({ game, setup, seen }: { game: GameMeta; setup: G31Setup; seen: string[] }) {
  const { state, send, restart } = useSession(G31, G31_CARDS, setup, seen);
  const card = state.deck[state.roundIndex];
  const inRound = state.phase === "card" && card !== undefined;
  // After both partners have read one card the session may end at any moment.
  const canFinish = state.completedRounds.length + state.skippedRounds.length >= G31_ROUNDS;

  return (
    <SessionFrame game={game} live={state.phase !== "results"} onExit={() => send({ type: "END" })}>
      {state.phase === "instructions" ? (
        <Instructions game={game} onStart={() => send({ type: "START" })} />
      ) : null}

      {inRound ? (
        <div className="flex flex-1 flex-col gap-5">
          <PlayCard
            headline={`الدور على ${state.aliases[state.reader]}`}
            cardId={card.id}
            body={card.body}
          />
          <p className="text-ink-faint text-sm">أكمل البطاقة بشيء محدّد حدث فعلاً، ولو كان صغيراً.</p>

          <div className="mt-auto flex flex-col gap-2">
            <Button fullWidth onClick={() => send({ type: "NEXT" })}>
              {canFinish ? "بطاقة أخرى" : "التالي"}
            </Button>
            {canFinish ? (
              <Button variant="secondary" fullWidth onClick={() => send({ type: "END" })}>
                إنهاء
              </Button>
            ) : null}
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
  state: ReturnType<typeof G31.initialState>;
  onReplay: () => void;
}) {
  const { read } = G31.deriveResult(state);
  return (
    <ResultShell
      game={game}
      title={read > 0 ? "ختمتما بكلام طيّب" : "انتهت الجلسة"}
      note={read === 0 ? "لم تُقرأ أي بطاقة بعد." : "ما قيل يبقى بينكما؛ لم نحفظ منه شيئاً."}
      onReplay={onReplay}
    >
      {/* FR-G31: the count only — never the gratitude itself. */}
      <Stats rows={[{ label: "بطاقات قرأتماها", value: <Num value={read} /> }]} />
    </ResultShell>
  );
}
