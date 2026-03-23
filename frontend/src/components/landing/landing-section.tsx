import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export const sectionContainer =
  "container mx-auto w-full max-w-7xl px-4 sm:px-5 md:px-6 lg:px-8";

const spacingMap = {
  relaxed: "py-16 sm:py-20 md:py-24 lg:py-28",
  compact: "py-12 sm:py-16 md:py-20",
  none: "",
} as const;

const marginMap = {
  default: "mb-10 sm:mb-12 md:mb-16",
  tight: "mb-8 sm:mb-10",
  loose: "mb-12 sm:mb-16 md:mb-20",
} as const;

type SectionProps = {
  id?: string;
  children: ReactNode;
  className?: string;
  spacing?: keyof typeof spacingMap;
  "aria-labelledby"?: string;
};

export function Section({ id, children, className, spacing = "relaxed", "aria-labelledby": labelledBy }: SectionProps) {
  return (
    <section id={id} className={cn(spacingMap[spacing], className)} aria-labelledby={labelledBy}>
      {children}
    </section>
  );
}

type SectionHeaderProps = {
  title?: string;
  subtitle?: string;
  align?: "center" | "left";
  margin?: keyof typeof marginMap;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  as?: "h1" | "h2" | "h3";
  accent?: boolean;
  /** Word or phrase to highlight in orange (must exist in title) */
  highlightWord?: string;
};

function renderTitleWithHighlight(title: string, highlightWord?: string, Tag: "h1" | "h2" | "h3" = "h2", titleClassName?: string) {
  const baseCls = "text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground";
  if (!highlightWord || !title.includes(highlightWord)) {
    return <Tag className={cn(baseCls, titleClassName)}>{title}</Tag>;
  }
  const parts = title.split(highlightWord);
  return (
    <Tag className={cn(baseCls, titleClassName)}>
      {parts[0]}
      <span className="text-orange-600">{highlightWord}</span>
      {parts[1]}
    </Tag>
  );
}

export function SectionHeader({
  title,
  subtitle,
  align = "center",
  margin = "default",
  className,
  titleClassName,
  subtitleClassName,
  as: Tag = "h2",
  accent = false,
  highlightWord,
}: SectionHeaderProps) {
  const alignCls = align === "center" ? "text-center mx-auto" : "text-left mr-auto";

  return (
    <header className={cn("max-w-3xl space-y-3 sm:space-y-4", marginMap[margin], alignCls, className)}>
      {title ? (
        accent ? (
          <Tag className={cn("text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-orange-600", titleClassName)}>
            {title}
          </Tag>
        ) : (
          renderTitleWithHighlight(title, highlightWord, Tag, titleClassName)
        )
      ) : null}
      {subtitle ? (
        <p
          className={cn(
            "text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed",
            align === "center" && "max-w-3xl mx-auto",
            subtitleClassName
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}

type SectionEyebrowProps = {
  title: string;
  className?: string;
};

export function SectionEyebrow({ title, className }: SectionEyebrowProps) {
  return (
    <h3
      className={cn(
        "text-center text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground sm:text-base md:text-lg md:tracking-[0.25em]",
        className
      )}
    >
      {title}
    </h3>
  );
}
