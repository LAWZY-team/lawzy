"use client";

import {
  Briefcase,
  FileText,
  Shield,
  Package,
  Building2,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CONTRACT_TYPES,
  type ContractTypeId,
} from "@/lib/editor/contract-questionnaires";

const ICON_MAP = {
  Briefcase,
  FileText,
  Shield,
  Package,
  Building2,
} as const;

const ICON_COLOR_MAP: Record<string, string> = {
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  green: "bg-emerald-500",
  orange: "bg-orange-500",
  violet: "bg-violet-500",
};

interface ContractTypeCardsProps {
  onSelect: (contractTypeId: ContractTypeId) => void;
}

export function ContractTypeCards({ onSelect }: ContractTypeCardsProps) {
  return (
    <div className="w-full space-y-5">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Tạo hợp đồng thông minh
        </h2>
        <p className="text-sm text-muted-foreground max-w-lg sm:max-w-xl md:max-w-2xl mx-auto leading-relaxed">
          Chọn loại hợp đồng bạn muốn tạo. Chúng tôi sẽ hướng dẫn bạn từng bước
          để đảm bảo hợp đồng đầy đủ và chính xác.
        </p>
      </div>

      <div className="grid w-full gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))]">
        {CONTRACT_TYPES.map((ct) => {
          const IconComponent = ICON_MAP[ct.icon as keyof typeof ICON_MAP];
          const iconBg = ICON_COLOR_MAP[ct.color] ?? "bg-slate-500";
          return (
            <button
              key={ct.id}
              type="button"
              onClick={() => onSelect(ct.id)}
              className={cn(
                "group flex flex-col gap-4 p-5 rounded-2xl border border-border bg-card text-left",
                "transition-all duration-200 ease-out",
                "hover:border-foreground/15 hover:shadow-[0_6px_24px_-6px_rgba(0,0,0,0.12)] hover:-translate-y-[2px]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              <div
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shadow-sm shrink-0",
                  iconBg,
                )}
              >
                {IconComponent && (
                  <IconComponent className="w-5 h-5 text-white" />
                )}
              </div>

              <div className="space-y-1.5 flex-1">
                <h3 className="text-sm font-semibold text-foreground leading-snug">
                  {ct.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {ct.description}
                </p>
              </div>

              {/* <div className="rounded-lg bg-muted/70 px-3 py-2.5 text-xs text-muted-foreground leading-relaxed"> */}
              {/* {ct.examples} */}
              {/* </div> */}

              <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors duration-150">
                <span>Chọn loại này</span>
                <ChevronRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
