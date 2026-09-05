/** Western digits kept LTR inside RTL text (NFR-UX-01). */
export function Num({ value }: { value: number | string }) {
  return <span className="ltr tabular-nums">{value}</span>;
}
