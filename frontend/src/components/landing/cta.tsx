"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const base =
  "inline-flex items-center justify-center gap-2.5 rounded-full font-semibold transition-[transform,box-shadow,background-color,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#faf9f5] active:scale-[0.98]";

const variants = {
  primary:
    "min-h-12 w-full sm:min-w-[12rem] sm:w-auto px-6 py-3 text-base bg-orange-600 text-white shadow-[0_8px_30px_-8px_rgba(234,88,12,0.4)] hover:bg-orange-700 hover:shadow-[0_12px_40px_-10px_rgba(234,88,12,0.45)]",
  secondary:
    "min-h-12 w-full sm:min-w-[12rem] sm:w-auto px-6 py-3 text-base border-2 border-zinc-300 bg-transparent text-foreground hover:border-zinc-400 hover:bg-zinc-50",
} as const;

type CtaProps = {
  href?: string;
  label: string;
  variant?: keyof typeof variants;
  icon?: LucideIcon;
  className?: string;
  onClick?: () => void;
};

export function Cta({ href, label, variant = "primary", icon: Icon, className, onClick }: CtaProps) {
  const classes = cn(base, variants[variant], className);

  if (onClick && !href) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {Icon ? <Icon className="size-5 shrink-0 opacity-90" aria-hidden /> : null}
        <span>{label}</span>
      </button>
    );
  }

  return (
    <Link href={href ?? "#"} className={classes} onClick={onClick}>
      {Icon ? <Icon className="size-5 shrink-0 opacity-90" aria-hidden /> : null}
      <span>{label}</span>
    </Link>
  );
}
