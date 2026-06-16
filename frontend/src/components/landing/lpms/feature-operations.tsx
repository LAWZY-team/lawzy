"use client";

import { useI18n } from "../language-provider";
import { LpmsFeatureShell } from "./lpms-feature-shell";
import { Clock, FileText, FolderLock, Users } from "lucide-react";

export function FeatureOperations() {
  const { t } = useI18n();

  const features = [
    {
      icon: Users,
      title: t("lpms_partner_f2_tab_matter"),
      desc: t("lpms_partner_f2_tab_matter_desc"),
    },
    {
      icon: Clock,
      title: t("lpms_partner_f2_tab_timesheet"),
      desc: t("lpms_partner_f2_tab_timesheet_desc"),
    },
    {
      icon: FileText,
      title: t("lpms_partner_f2_tab_docs"),
      desc: t("lpms_partner_f2_tab_docs_desc"),
    },
    {
      icon: FolderLock,
      title: t("lpms_partner_f2_tab_access"),
      desc: t("lpms_partner_f2_tab_access_desc"),
    },
  ];

  return (
    <LpmsFeatureShell index={0} title={t("lpms_partner_f2_title")}>
      <div className="flex flex-col gap-6 lg:gap-8">
        {/* Intro text */}
        <div className="max-w-4xl space-y-4">
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("lpms_partner_f2_intro")}
          </p>
          <div className="inline-flex items-center gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-2.5 text-sm font-semibold text-emerald-800">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            {t("lpms_partner_f2_local_highlight")}
          </div>
        </div>

        {/* 2x2 Feature Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8 mt-2">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={i}
                className="group relative overflow-hidden rounded-3xl border border-gray-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-md hover:shadow-orange-500/5"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 transition-colors group-hover:bg-orange-100/80">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-semibold text-foreground text-lg group-hover:text-orange-700 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {feature.desc}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </LpmsFeatureShell>
  );
}
