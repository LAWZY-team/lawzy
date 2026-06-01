"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LpmsFadeIn } from "./lpms-fade-in";

type LpmsFeatureShellProps = {
  index: number;
  badge: string;
  title: string;
  children: ReactNode;
  className?: string;
  dark?: boolean;
};

export function LpmsFeatureShell({ index, badge, title, children, className, dark = false }: LpmsFeatureShellProps) {
  return (
    <LpmsFadeIn delay={index * 0.08} className={cn("relative overflow-clip [clip-path:inset(0)]", dark ? "z-20 bg-zinc-950" : "z-0 bg-[#faf9f5]")}>
      <section
        className={cn(
          "relative overflow-clip py-14 sm:py-16 md:py-20",
          dark ? "relative -mt-px text-white" : "border-t border-gray-100/80",
          className
        )}
      >
        <div className="container mx-auto w-full max-w-7xl px-4 sm:px-5 md:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-3 sm:mb-10">
            <span
              className={cn(
                "w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider",
                dark ? "bg-orange-500/15 text-orange-300" : "bg-orange-100 text-orange-700"
              )}
            >
              {badge}
            </span>
            <h2 className={cn("text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl", dark ? "text-white" : "text-foreground")}>
              {title}
            </h2>
          </div>
          {children}
        </div>
      </section>
    </LpmsFadeIn>
  );
}
