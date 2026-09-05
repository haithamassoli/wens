"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Tag } from "@/components/Chip";
import { Num } from "@/components/Num";
import { Handoff } from "@/components/play/Handoff";
import { ResultShell } from "@/components/play/ResultShell";
import { SessionFrame } from "@/components/play/SessionFrame";
import { G14_CARDS } from "@/lib/content";
import type { G14Card } from "@/lib/content/types";
import { bidder, G14, G14_ROUNDS, G14_STARS, type G14State } from "@/lib/engine/g14";
import type { Player } from "@/lib/engine/types";
import type { GameMeta } from "@/lib/games";
import { readSeen } from "@/lib/storage";
import { PlayCard } from "./ChoiceRound";
import { Instructions, SetupShell, Stats } from "./Setup";
import { useSession } from "./useSession";

const CATEGORY: Record<G14Card["category"], string> = {
  home: "في البيت",
  outing: "خرجة",
  choice: "حقّ الاختيار",
  fun: "مرح",
};

/** G14 — The Preference Auction: 100 stars each, 5 secret bids, highest wins and pays. */
export function G14Play({ game }: { game: GameMeta }) {
  const [session, setSession] = useState<{
    aliases: { A: string; B: string };
    seen: string[];
  } | null>(null);

  if (session) return <Session game={game} {...session} />;

  return (
    <SessionFrame game={game}>
      <SetupShell
        game={game}
        available={G14.availableCount(G14_CARDS, {})}
        requested={G14_ROUNDS}
        onStart={(aliases) => setSession({ aliases, seen: readSeen(game.id) })}
      >
        <p className="rounded-card bg-card p-4 text-ink-soft">
          لكلٍّ منكما <Num value={G14_STARS} /> نجمة لا قيمة مالية لها، و
          <Num value={G14_ROUNDS} /> امتيازات على المزاد. ما لا تنفقانه يبقى معكما.
        </p>
      </SetupShell>
    </SessionFrame>
  );
}

function Balances({ state }: { state: G14State }) {
  return (
    <p className="text-ink-soft text-sm" aria-live="polite">
      نجوم {state.aliases.A}: <Num value={state.balances.A} /> · نجوم {state.aliases.B}:{" "}
      <Num value={state.balances.B} />
    </p>
  );
}

function Session({
  game,
  aliases: names,
  seen,
}: {
  game: GameMeta;
  aliases: { A: string; B: string };
  seen: string[];
}) {
  const setup = { aliases: names };
  const { state, send, restart } = useSession(G14, G14_CARDS, setup, seen);
  const { aliases, phase } = state;
  const card = state.deck[state.roundIndex];
  const active = bidder(phase);
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
        <BidInput
          key={`${state.roundIndex}-${active}`}
          card={card}
          player={active}
          state={state}
          onLock={(bid) => {
            send({ type: "SET", key: "bid", value: bid });
            send({ type: "LOCK", player: active });
          }}
          onSkip={() => send({ type: "SKIP" })}
        />
      ) : null}

      {phase === "handoff" ? (
        <Handoff toName={aliases.B} onReady={() => send({ type: "READY" })} />
      ) : null}

      {phase === "reveal" && card && last ? (
        <div className="flex flex-1 flex-col gap-5">
          <PlayCard headline="النتيجة" cardId={card.id} body={card.body}>
            <Tag hue={game.hue}>{CATEGORY[card.category]}</Tag>
          </PlayCard>
          <div className="flex flex-col gap-3 rounded-card bg-card p-5">
            <p
              role="status"
              aria-live="polite"
              className={`self-start rounded-chip border px-4 py-1.5 font-bold ${
                last.winner === "shared" ? "border-mint bg-mint-soft" : "border-line bg-ground"
              }`}
            >
              {last.winner === "shared" ? (
                "تعادل: امتياز مشترك بلا خصم"
              ) : (
                <>
                  فاز {aliases[last.winner]} ودفع <Num value={last.price} /> نجمة
                </>
              )}
            </p>
            <dl className="flex flex-col gap-2">
              {(["A", "B"] as const).map((p) => (
                <div key={p} className="flex items-baseline justify-between gap-4">
                  <dt className="text-ink-soft">مزايدة {aliases[p]}</dt>
                  <dd className="font-semibold">
                    <Num value={state.bids[p] ?? 0} /> نجمة
                  </dd>
                </div>
              ))}
            </dl>
            <div className="border-line border-t pt-3">
              <Balances state={state} />
            </div>
          </div>
          <Button fullWidth className="mt-auto" onClick={() => send({ type: "NEXT" })}>
            التالي
          </Button>
        </div>
      ) : null}

      {phase === "results" ? <Results game={game} state={state} onReplay={restart} /> : null}
    </SessionFrame>
  );
}

function BidInput({
  card,
  player,
  state,
  onLock,
  onSkip,
}: {
  card: G14Card;
  player: Player;
  state: G14State;
  onLock: (bid: number) => void;
  onSkip: () => void;
}) {
  const [raw, setRaw] = useState("");
  const balance = state.balances[player];
  const bid = raw.trim() === "" ? null : Number(raw);
  const tooHigh = bid !== null && bid > balance;
  const valid = bid !== null && Number.isInteger(bid) && bid >= 0 && bid <= balance;
  const name = state.aliases[player];

  return (
    <form
      className="flex flex-1 flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid && bid !== null) onLock(bid);
      }}
    >
      <PlayCard headline={`${name}: زايد سرّاً`} cardId={card.id} body={card.body}>
        <Tag>{CATEGORY[card.category]}</Tag>
      </PlayCard>
      <label className="flex flex-col gap-2">
        <span className="font-semibold">
          كم نجمة تدفع؟ <span className="text-ink-soft">(لديك</span> <Num value={balance} />{" "}
          <span className="text-ink-soft">نجمة)</span>
        </span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={balance}
          step={1}
          value={raw}
          autoComplete="off"
          onChange={(e) => setRaw(e.target.value)}
          aria-invalid={raw !== "" && !valid}
          className="ltr min-h-11 rounded-xl border border-line bg-card px-4 text-base text-ink"
        />
        <span
          role="status"
          className={`min-h-5 text-sm ${tooHigh ? "text-danger" : "text-ink-faint"}`}
        >
          {tooHigh
            ? "لا يمكن المزايدة بأكثر من نجومك المتبقية."
            : raw !== "" && !valid
              ? "أدخل عدداً صحيحاً من الصفر فما فوق."
              : "الصفر مسموح: أحياناً لا يستحقّ الامتياز نجمة واحدة."}
        </span>
      </label>
      <div className="mt-auto flex flex-col gap-2">
        <Button type="submit" fullWidth disabled={!valid}>
          تثبيت المزايدة
        </Button>
        <Button variant="ghost" fullWidth onClick={onSkip}>
          تخطّي
        </Button>
        <p className="text-center text-ink-faint text-sm">لا بأس بالتخطّي.</p>
      </div>
    </form>
  );
}

function Results({
  game,
  state,
  onReplay,
}: {
  game: GameMeta;
  state: G14State;
  onReplay: () => void;
}) {
  const r = G14.deriveResult(state);
  const { aliases } = state;
  const title = (id: string) => state.deck.find((c) => c.id === id)?.body ?? "";
  return (
    <ResultShell
      game={game}
      title={state.endedEarly ? "جلسة غير مكتملة" : "انتهى المزاد"}
      note={r.completed === 0 ? "لم يُكتمل أي مزاد بعد." : undefined}
      onReplay={onReplay}
    >
      <Stats
        rows={[
          { label: `امتيازات ${aliases.A}`, value: <Num value={r.won.A.length} /> },
          { label: `امتيازات ${aliases.B}`, value: <Num value={r.won.B.length} /> },
          { label: "امتيازات مشتركة", value: <Num value={r.shared.length} /> },
          { label: `نجوم ${aliases.A} المتبقية`, value: <Num value={r.stars.A} /> },
          { label: `نجوم ${aliases.B} المتبقية`, value: <Num value={r.stars.B} /> },
          { label: "جولات متخطّاة", value: <Num value={r.skipped} /> },
        ]}
      />
      {r.completed > 0 ? (
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          {(["A", "B"] as const).flatMap((p) =>
            r.won[p].map((id) => (
              <li key={id} className="rounded-xl bg-ground p-3">
                <span className="font-semibold">{aliases[p]}: </span>
                {title(id)}
              </li>
            )),
          )}
          {r.shared.map((id) => (
            <li key={id} className="rounded-xl bg-mint-soft p-3">
              <span className="font-semibold">معاً: </span>
              {title(id)}
            </li>
          ))}
        </ul>
      ) : null}
    </ResultShell>
  );
}
