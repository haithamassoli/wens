import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { Button } from "@/components/Button";
import { Tag } from "@/components/Chip";
import { FavoriteButton } from "@/components/FavoriteButton";
import { DeckGlyph } from "@/components/GameCard";
import { Num } from "@/components/Num";
import { PageHeader } from "@/components/PageHeader";
import { countNoun, DEPTH_LABEL, MINUTE_FORMS, ROUND_FORMS } from "@/lib/filters";
import { GAMES, type GameMeta, gameBySlug, MOOD_LABEL } from "@/lib/games";

export function generateStaticParams() {
  return GAMES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps<"/games/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const game = gameBySlug(slug);
  if (!game) return {};
  return {
    title: game.name,
    description: game.tagline,
    alternates: { canonical: `/games/${game.slug}` },
    openGraph: { title: game.name, description: game.tagline, url: `/games/${game.slug}` },
  };
}

function RoundsLabel({ game }: { game: GameMeta }) {
  if (game.fixedRounds !== undefined) {
    if (game.fixedRounds === 1) return <>نشاط واحد في كل مرة</>;
    return (
      <>
        <Num value={game.fixedRounds} /> {countNoun(game.fixedRounds, ROUND_FORMS)}
      </>
    );
  }
  if (game.rounds.length === 0) return <>حسب رغبتكما</>;
  const last = game.rounds[game.rounds.length - 1];
  return (
    <>
      {game.rounds.map((r, i) => (
        <Fragment key={r}>
          {i > 0 ? " أو " : null}
          <Num value={r} />
        </Fragment>
      ))}{" "}
      {countNoun(last, ROUND_FORMS)}
    </>
  );
}

export default async function GameDetailsPage({ params }: PageProps<"/games/[slug]">) {
  const { slug } = await params;
  const game = gameBySlug(slug);
  if (!game) notFound();

  const facts: { label: string; value: React.ReactNode }[] = [
    {
      label: "المدّة",
      value: (
        <>
          نحو <Num value={game.minutes} /> {countNoun(game.minutes, MINUTE_FORMS)}
        </>
      ),
    },
    { label: "الجولات", value: <RoundsLabel game={game} /> },
    { label: "العمق", value: DEPTH_LABEL[game.depth] },
    {
      label: "الأدوات",
      value: game.requiresTools ? "بعض البطاقات تحتاج أدوات بسيطة" : "لا تحتاج أدوات",
    },
    {
      label: "الحركة",
      value: game.requiresMovement ? "بعض البطاقات تتضمّن حركة" : "تُلعب جالسَين",
    },
  ];

  return (
    <article className="flex flex-col gap-8">
      <div className="flex items-start gap-4">
        <DeckGlyph hue={game.hue} size={72} />
        <div className="flex-1">
          <PageHeader title={game.name} lede={game.tagline}>
            <Tag>هاتف واحد</Tag>
            {game.moods.map((m) => (
              <Tag key={m} hue={game.hue}>
                {MOOD_LABEL[m]}
              </Tag>
            ))}
          </PageHeader>
        </div>
      </div>

      <section
        aria-labelledby="why-title"
        className="rounded-card border border-line bg-card p-5"
        style={{ borderInlineStartWidth: 6, borderInlineStartColor: game.hue }}
      >
        <h2 id="why-title" className="mb-1 font-display font-semibold text-ink text-lg">
          لماذا تلعبانها؟
        </h2>
        <p className="text-ink leading-relaxed">{game.why}</p>
      </section>

      <section aria-labelledby="steps-title" className="flex flex-col gap-3">
        <h2 id="steps-title" className="font-display font-semibold text-ink text-lg">
          كيف تُلعب؟
        </h2>
        <ol className="flex flex-col gap-2">
          {game.steps.map((step, i) => (
            <li
              key={step}
              className="flex items-start gap-3 rounded-card border border-line bg-card px-4 py-3"
            >
              <span
                aria-hidden="true"
                className="ltr mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full font-bold font-display text-ink text-sm"
                style={{ backgroundColor: `color-mix(in srgb, ${game.hue} 22%, white)` }}
              >
                {i + 1}
              </span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="facts-title">
        <h2 id="facts-title" className="mb-2 font-display font-semibold text-ink text-lg">
          قبل أن تبدآ
        </h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 rounded-card border border-line bg-card p-5 sm:grid-cols-2">
          {facts.map((f) => (
            <div key={f.label} className="flex flex-col">
              <dt className="text-ink-soft text-sm">{f.label}</dt>
              <dd className="font-medium text-ink">{f.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        {/* /play/[gameId] is built separately; this page only links to it. */}
        <Button href={`/play/${game.id}`} fullWidth className="text-lg sm:flex-1">
          ابدأ
        </Button>
        <FavoriteButton kind="game" id={game.id} withLabel />
      </div>
    </article>
  );
}
