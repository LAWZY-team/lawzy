"use client";

import { useRef, type MouseEvent } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useI18n } from "../language-provider";
import { LpmsFeatureShell } from "./lpms-feature-shell";
import { Award, Building2 } from "lucide-react";

export function FeatureJointMedia() {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-80, 80], [10, -10]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-80, 80], [-10, 10]), { stiffness: 300, damping: 30 });

  const handleMove = (event: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    x.set(event.clientX - rect.left - rect.width / 2);
    y.set(event.clientY - rect.top - rect.height / 2);
  };

  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <LpmsFeatureShell index={3} badge={t("lpms_partner_f4_badge")} title={t("lpms_partner_f4_title")} dark>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
        <div className="space-y-5 text-base leading-relaxed text-zinc-400 sm:text-lg">
          <p>{t("lpms_partner_f4_mechanism")}</p>
          <p className="text-zinc-300">{t("lpms_partner_f4_benefit")}</p>
        </div>
        <div className="flex justify-center [perspective:1000px]">
          <motion.div
            ref={ref}
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            className="lpms-shimmer-card w-full max-w-md rounded-3xl border border-zinc-700 bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950 p-8 shadow-2xl shadow-black/50 transition-transform duration-300 hover:scale-[1.02]"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-700/80 text-white">
                <Building2 className="h-8 w-8" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">{t("lpms_partner_f4_partner_name")}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-orange-300">
                  <Award className="h-4 w-4" />
                  {t("lpms_partner_f4_partner_badge")}
                </p>
              </div>
            </div>
            <div className="mt-8 rounded-xl border border-zinc-700/80 bg-zinc-900/60 p-4">
              <p className="text-xs uppercase tracking-widest text-zinc-500">Featured on lawzy.vn</p>
              <p className="mt-2 text-sm text-zinc-300">Strategic Legal Partner spotlight</p>
            </div>
          </motion.div>
        </div>
      </div>
    </LpmsFeatureShell>
  );
}
