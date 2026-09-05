import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-chip px-5 py-2 font-semibold text-base leading-tight transition-[color,background-color,border-color,box-shadow,transform] duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary:
    "bg-marigold text-ink shadow-[0_6px_16px_-8px_var(--color-marigold-deep)] hover:brightness-95 hover:shadow-lift active:brightness-90",
  secondary: "border border-line bg-card text-ink hover:border-ink-faint hover:bg-white",
  ghost: "bg-transparent text-ink hover:bg-ground-deep",
  danger: "bg-danger text-white hover:brightness-95",
};

interface CommonProps {
  variant?: Variant;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
}

type ButtonAsButton = CommonProps &
  Omit<ComponentProps<"button">, "className" | "children"> & { href?: undefined };
type ButtonAsLink = CommonProps &
  Omit<ComponentProps<typeof Link>, "className" | "children"> & { href: string };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button(props: ButtonProps) {
  const { variant = "primary", fullWidth = false, className = "", ...rest } = props;
  const cls = `${base} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`.trim();

  if (rest.href !== undefined) {
    const { href, ...linkProps } = rest as ButtonAsLink;
    return (
      <Link href={href} className={cls} {...linkProps}>
        {props.children}
      </Link>
    );
  }
  const { type = "button", ...buttonProps } = rest as ButtonAsButton;
  return (
    <button type={type} className={cls} {...buttonProps}>
      {props.children}
    </button>
  );
}
