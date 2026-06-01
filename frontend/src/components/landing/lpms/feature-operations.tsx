"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useI18n } from "../language-provider";
import { LpmsFeatureShell } from "./lpms-feature-shell";
import { cn } from "@/lib/utils";
import { Clock, FileText, FolderLock, Users } from "lucide-react";

type LpmsTabId = "matter" | "timesheet" | "docs" | "access";

const TABS: { id: LpmsTabId; icon: typeof Users; titleKey: string; descKey: string }[] = [
  { id: "matter", icon: Users, titleKey: "lpms_partner_f2_tab_matter", descKey: "lpms_partner_f2_tab_matter_desc" },
  { id: "timesheet", icon: Clock, titleKey: "lpms_partner_f2_tab_timesheet", descKey: "lpms_partner_f2_tab_timesheet_desc" },
  { id: "docs", icon: FileText, titleKey: "lpms_partner_f2_tab_docs", descKey: "lpms_partner_f2_tab_docs_desc" },
  { id: "access", icon: FolderLock, titleKey: "lpms_partner_f2_tab_access", descKey: "lpms_partner_f2_tab_access_desc" },
];

function TimesheetMockup({ t }: { t: (key: string) => string }) {
  const [seconds, setSeconds] = useState(252);
  const [amount, setAmount] = useState(1250000);
  useEffect(() => {
    const id = setInterval(() => {
      setSeconds((s) => s + 1);
      setAmount((a) => a + 8500);
    }, 1000);
    return () => clearInterval(id);
  }, []);
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return (
    <div className="flex h-full flex-col justify-center gap-6 p-2">
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Time-tracking</p>
        <p className="mt-2 font-mono text-4xl font-bold text-emerald-400">
          {h}:{m}:{s}
        </p>
      </div>
      <div className="rounded-xl border border-zinc-700 bg-zinc-800/80 p-4">
        <p className="text-xs text-zinc-400">{t("lpms_partner_f2_mock_invoice")}</p>
        <motion.p
          key={amount}
          initial={{ opacity: 0.6, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1 text-2xl font-bold text-white"
        >
          {amount.toLocaleString("vi-VN")} ₫
        </motion.p>
      </div>
    </div>
  );
}

function DocsMockup({ t }: { t: (key: string) => string }) {
  return (
    <div className="relative flex h-full flex-col justify-center gap-4 p-2">
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          animate={{ x: [0, 72, 72, 0], y: [0, 0, 36, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="z-10 w-fit rounded-lg border border-orange-400/60 bg-orange-500/20 px-3 py-2 text-xs font-semibold text-orange-700 dark:text-orange-200"
        >
          {t("lpms_partner_f2_mock_drag_source")}
        </motion.div>
        <div className="rounded-lg border border-dashed border-zinc-600 bg-zinc-800/50 px-3 py-6 text-center text-xs text-zinc-400">
          {t("lpms_partner_f2_mock_drag_target")}
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0.3 }}
        animate={{ opacity: [0.3, 1, 1] }}
        transition={{ duration: 4, repeat: Infinity, times: [0, 0.55, 1] }}
        className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-xs leading-relaxed text-zinc-300"
      >
        <span className="text-emerald-400">Công ty TNHH Alpha</span> — Hợp đồng dịch vụ tư vấn pháp lý đã được điền tự động.
      </motion.div>
    </div>
  );
}

function MatterMockup({ t }: { t: (key: string) => string }) {
  return (
    <div className="flex h-full flex-col justify-center gap-4 p-2">
      <div className="rounded-xl border border-zinc-700 bg-zinc-800/60 p-4">
        <p className="text-sm font-semibold text-white">{t("lpms_partner_f2_mock_matter_client")}</p>
        <p className="mt-2 text-xs text-emerald-400">{t("lpms_partner_f2_mock_matter_status")}</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-700">
          <div className="h-full w-2/3 rounded-full bg-orange-500" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-zinc-400">
        {["Hồ sơ", "Biên bản", "Đơn tố tụng"].map((label) => (
          <div key={label} className="rounded-lg border border-zinc-700 py-3">
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function AccessMockup({ t }: { t: (key: string) => string }) {
  const roles = [
    { key: "lpms_partner_f2_mock_role_lawyer", access: "Full" },
    { key: "lpms_partner_f2_mock_role_associate", access: "Matter" },
    { key: "lpms_partner_f2_mock_role_intern", access: "Read" },
  ] as const;
  return (
    <div className="flex h-full flex-col justify-center gap-3 p-2">
      {roles.map((role) => (
        <div key={role.key} className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3">
          <span className="text-sm text-zinc-200">{t(role.key)}</span>
          <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-xs font-medium text-emerald-400">{role.access}</span>
        </div>
      ))}
    </div>
  );
}

export function FeatureOperations() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<LpmsTabId>("matter");

  return (
    <LpmsFeatureShell index={0} badge={t("lpms_partner_f2_badge")} title={t("lpms_partner_f2_title")} dark>
      <p className="mb-4 max-w-4xl text-base leading-relaxed text-zinc-400 sm:text-lg">{t("lpms_partner_f2_intro")}</p>
      <p className="mb-10 inline-flex max-w-4xl rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-200 sm:text-base">
        {t("lpms_partner_f2_local_highlight")}
      </p>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="flex flex-col gap-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onMouseEnter={() => setActiveTab(tab.id)}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "rounded-2xl border px-4 py-4 text-left transition-all sm:px-5",
                  isActive ? "border-orange-500 bg-zinc-900" : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                )}
              >
                <div className="flex items-start gap-3">
                  <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", isActive ? "text-orange-400" : "text-zinc-500")} />
                  <div>
                    <p className={cn("font-semibold", isActive ? "text-white" : "text-zinc-300")}>{t(tab.titleKey)}</p>
                    {isActive ? <p className="mt-1 text-sm leading-relaxed text-zinc-400">{t(tab.descKey)}</p> : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="min-h-[320px] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl shadow-black/40">
          <div className="mb-4 flex items-center gap-2 border-b border-zinc-800 pb-3">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <span className="ml-2 text-xs text-zinc-500">{t("lpms_partner_f2_mock_app_label")}</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="min-h-[240px]"
            >
              {activeTab === "matter" ? <MatterMockup t={t} /> : null}
              {activeTab === "timesheet" ? <TimesheetMockup t={t} /> : null}
              {activeTab === "docs" ? <DocsMockup t={t} /> : null}
              {activeTab === "access" ? <AccessMockup t={t} /> : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </LpmsFeatureShell>
  );
}
