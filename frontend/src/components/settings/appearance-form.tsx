"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";
import { useT } from "@/components/i18n-provider";

export function AppearanceForm() {
  const { t } = useT();
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h4 className="text-sm font-medium">{t("settings_appearance")}</h4>
        <p className="text-sm text-muted-foreground">
          {t("settings_appearance_fixed")}
        </p>
      </div>
      <Card className="mt-4 border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-900">
              {t("settings_appearance_light_only")}
            </p>
          </div>
        </CardContent>
      </Card>
      <div className="mt-6">
        <div className="items-center rounded-md border-2 border-primary p-1 max-w-md">
          {/* skeleton */}
        </div>
        <span className="block w-full p-2 text-center font-normal text-primary">
          {t("settings_appearance_current")}
        </span>
      </div>
    </div>
  );
}
