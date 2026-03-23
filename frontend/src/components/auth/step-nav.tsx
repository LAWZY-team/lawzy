"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n-provider";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface StepNavProps {
  currentStep: number;
  totalSteps: number;
  onPrevious?: () => void;
  previousHref?: string;
  onNext?: () => void;
  nextLabel?: string;
  nextLoading?: boolean;
  nextDisabled?: boolean;
}

export function StepNav({
  currentStep,
  totalSteps,
  onPrevious,
  previousHref,
  onNext,
  nextLabel = "Tiếp theo",
  nextLoading = false,
  nextDisabled = false,
}: StepNavProps) {
  const { t } = useT()
  return (
    <div className="flex items-center justify-between gap-4 pt-4">
      <div>
        {currentStep > 1 ? (
          previousHref ? (
            <Button type="button" variant="ghost" size="sm" asChild>
              <Link href={previousHref}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                {t("auth_register_back")}
              </Link>
            </Button>
          ) : (
            <Button type="button" variant="ghost" size="sm" onClick={onPrevious}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              {t("auth_register_back")}
            </Button>
          )
        ) : previousHref ? (
          <Button type="button" variant="ghost" size="sm" asChild>
            <Link href={previousHref}>{t("auth_register_has_account")} {t("auth_login")}</Link>
          </Button>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {currentStep} / {totalSteps}
        </span>
        {onNext && (
          <Button type="button" onClick={onNext} disabled={nextLoading || nextDisabled}>
            {nextLoading ? (
              <>
                <span className="animate-pulse">{t("auth_register_processing")}</span>
              </>
            ) : (
              <>
                {nextLabel}
                <ChevronRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
