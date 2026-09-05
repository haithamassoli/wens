import Link from "next/link";
import { countNoun, MINUTE_FORMS } from "@/lib/filters";
import { type GameMeta, MOOD_LABEL } from "@/lib/games";
import { Tag } from "./Chip";
import { Num } from "./Num";

/** A small stack of two tilted cards, tinted with the game hue. */
export function DeckGlyph({ hue, size = 56 }: { hue: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      <circle cx="28" cy="28" r="28" fill={`color-mix(in srgb, ${hue} 16%, white)`} />
      <g transform="rotate(-10 28 30)">
        <rect x="18" y="14" width="20" height="28" rx="5" fill={hue} opacity="0.35" />
      </g>
      <g transform="rotate(6 28 30)">
        <rect x="18" y="13" width="20" height="28" rx="5" fill={hue} />
      </g>
    </svg>
  );
}

export function GameCard({ game }: { game: GameMeta }) {
  return (
    <Link
      href={`/games/${game.slug}`}
      className="group flex gap-4 rounded-card border border-line bg-card p-4 pe-5 transition-[transform,box-shadow] hover:shadow-lift focus-visible:shadow-lift md:p-5"
      style={{ borderInlineStartWidth: 6, borderInlineStartColor: game.hue }}
      aria-label={`${game.name}: ${game.tagline}`}
    >
      <DeckGlyph hue={game.hue} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div>
          <h3 className="font-bold font-display text-ink text-xl leading-tight">{game.name}</h3>
          <p className="text-ink-soft leading-snug">{game.tagline}</p>
        </div>
        <ul className="flex flex-wrap gap-1.5" aria-label="تفاصيل">
          <li>
            <Tag>
              <Num value={game.minutes} />
              &nbsp;{countNoun(game.minutes, MINUTE_FORMS)}
            </Tag>
          </li>
          <li>
            <Tag>هاتف واحد</Tag>
          </li>
          {game.moods.map((m) => (
            <li key={m}>
              <Tag hue={game.hue}>{MOOD_LABEL[m]}</Tag>
            </li>
          ))}
        </ul>
      </div>
    </Link>
  );
}
