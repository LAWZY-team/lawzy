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

interface ProgressStepsVerticalProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

/**
 * ProgressStepsVertical - Danh sách bước dọc cho form đa bước.
 */
export function ProgressStepsVertical({ steps, currentStep, className }: ProgressStepsVerticalProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex flex-col gap-6">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isUpcoming = stepNumber > currentStep;
          const StepIcon = step.icon;

          return (
            <div key={step.id} className="flex items-start gap-3">
              <div className="flex flex-col items-center shrink-0 -mt-0.5">
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-lg border-2 transition-all duration-300",
                    isCompleted && "bg-orange-600 border-orange-600 text-white",
                    isCurrent && "bg-orange-600 border-orange-600 text-white scale-105",
                    isUpcoming && "bg-background border-gray-200 text-muted-foreground dark:border-gray-700"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : StepIcon ? (
                    <StepIcon className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-semibold">{stepNumber}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "w-0.5 flex-1 min-h-[24px] mt-2 transition-all duration-500",
                      isCompleted ? "bg-orange-600" : "bg-gray-200 dark:bg-gray-700"
                    )}
                  />
                )}
              </div>
              <div className="flex-1 pt-2 min-w-0 pb-2">
                <p
                  className={cn(
                    "text-sm font-medium break-words",
                    isCurrent && "text-foreground",
                    isUpcoming && "text-muted-foreground",
                    isCompleted && "text-foreground"
                  )}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p
                    className={cn(
                      "text-xs leading-relaxed break-words mt-0.5",
                      isCurrent ? "text-muted-foreground" : "text-muted-foreground/70"
                    )}
                  >
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
