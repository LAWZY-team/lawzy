"use client";

import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Step {
  id: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
}

interface ProgressStepsProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

/**
 * ProgressSteps - Danh sách bước ngang (cho mobile).
 */
export function ProgressSteps({ steps, currentStep, className }: ProgressStepsProps) {
  return (
    <div className={cn("w-full overflow-x-auto no-scrollbar scroll-smooth", className)}>
      <div className="flex items-start justify-start sm:justify-center min-w-max sm:min-w-0 gap-2 sm:gap-3">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isUpcoming = stepNumber > currentStep;

          return (
            <div key={step.id} className="flex items-center shrink-0">
              <div className="flex flex-col items-center min-w-[56px] sm:min-w-[64px]">
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 transition-all duration-300",
                    isCompleted && "bg-orange-600 border-orange-600 text-white",
                    isCurrent && "bg-orange-600 border-orange-600 text-white scale-110",
                    isUpcoming && "bg-background border-gray-200 text-muted-foreground dark:border-gray-700"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-semibold">{stepNumber}</span>
                  )}
                </div>
                <p
                  className={cn(
                    "mt-1.5 text-[10px] sm:text-xs font-medium text-center break-words leading-tight line-clamp-2 px-0.5",
                    isCurrent && "text-orange-600",
                    isUpcoming && "text-muted-foreground",
                    isCompleted && "text-foreground"
                  )}
                >
                  {step.label}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "w-4 sm:w-6 h-0.5 shrink-0 transition-all duration-500",
                    isCompleted ? "bg-orange-600" : "bg-gray-200 dark:bg-gray-700"
                  )}
                  style={{ marginTop: "14px" }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
