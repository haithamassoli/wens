/**
 * The ونس mark: two tilted cards with a marigold heart — same artwork as the app icon
 * (assets/icon.svg), minus the dark tile so it sits on any background.
 * The wordmark is HTML text, not SVG, so it uses the loaded display font.
 */
export function Logo({
  size = 40,
  withWordmark = false,
  animate = false,
  className = "",
}: {
  size?: number;
  withWordmark?: boolean;
  animate?: boolean;
  className?: string;
}) {
  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${animate ? "logo-deal" : ""}`}
    >
      <g className="logo-back" transform="rotate(-18 24 24)">
        <rect x="10" y="6" width="28" height="36" rx="8" fill="#8f7aa3" />
      </g>
      <g className="logo-front" transform="rotate(7 24 24)">
        <rect
          x="10"
          y="6"
          width="28"
          height="36"
          rx="8"
          fill="#faf7fc"
          stroke="var(--color-ink)"
          strokeWidth="1.5"
        />
        <g className="logo-heart">
          <path
            transform="translate(24 24) scale(0.82) translate(-12 -12)"
            fill="var(--color-marigold)"
            d="M12 21.35 10.55 20.03C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35Z"
          />
        </g>
      </g>
    </svg>
  );

  if (!withWordmark) return <span className={className}>{mark}</span>;

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {mark}
      <span className="font-display font-extrabold text-2xl text-ink leading-none">ونس</span>
    </span>
  );
}
