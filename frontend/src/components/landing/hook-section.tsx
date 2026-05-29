"use client";

import { useCallback, useMemo, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useI18n } from "./language-provider";
import { Section, SectionHeader, sectionContainer } from "./landing-section";
import FadeInOnScroll from "./fade-in-on-scroll";
import { Button } from "@/components/ui/button";
import { useContactModal } from "./contact-modal";
import { cn } from "@/lib/utils";
import {
  HOOK_DIAGNOSTIC_CONFIG,
  HOOK_INPUT_ORDER,
  buildHookTicks,
  snapHookValue,
  type HookInputKey,
} from "@/lib/landing/hook-diagnostic-config";
import {
  computeHookDiagnosticMetrics,
  formatHookMoney,
  type HookHealthZone,
} from "@/lib/landing/hook-diagnostic-metrics";
import { useFastAnimatedNumber } from "@/hooks/use-fast-animated-number";

type HookInputState = Record<HookInputKey, number>;

const DEFAULT_INPUTS: HookInputState = {
  contractsPerMonth: HOOK_DIAGNOSTIC_CONFIG.inputs.contractsPerMonth.default,
  annualRevenueBillionVnd:
    HOOK_DIAGNOSTIC_CONFIG.inputs.annualRevenueBillionVnd.default,
  avgSalaryMillionVndPerMonth:
    HOOK_DIAGNOSTIC_CONFIG.inputs.avgSalaryMillionVndPerMonth.default,
};

const STEP_LABEL_KEYS: Record<HookInputKey, string> = {
  contractsPerMonth: "hook_step1_label",
  annualRevenueBillionVnd: "hook_step2_label",
  avgSalaryMillionVndPerMonth: "hook_step3_label",
};

const STEP_UNIT_KEYS: Record<HookInputKey, string> = {
  contractsPerMonth: "hook_step1_unit",
  annualRevenueBillionVnd: "hook_step2_unit",
  avgSalaryMillionVndPerMonth: "hook_step3_unit",
};

const ZONE_STYLES: Record<
  HookHealthZone,
  { score: string; label: string; needle: string }
> = {
  healthy: {
    score: "text-emerald-800",
    label: "text-emerald-700/90",
    needle: "#2d6a4f",
  },
  warning: {
    score: "text-amber-800",
    label: "text-amber-800/90",
    needle: "#b45309",
  },
  critical: {
    score: "text-red-900",
    label: "text-red-900/90",
    needle: "#991b1b",
  },
};

type DiagnosticStepProps = {
  stepIndex: number;
  inputKey: HookInputKey;
  value: number;
  onChange: (value: number) => void;
  isLast: boolean;
};

const DiagnosticStep = ({
  stepIndex,
  inputKey,
  value,
  onChange,
  isLast,
}: DiagnosticStepProps) => {
  const { t } = useI18n();
  const config = HOOK_DIAGNOSTIC_CONFIG.inputs[inputKey];
  const ticks = useMemo(
    () =>
      buildHookTicks({
        min: config.min,
        max: config.max,
        snapStep: config.snapStep,
      }),
    [config.min, config.max, config.snapStep],
  );
  const atMax = value >= config.max;
  const handleChange = useCallback(
    (next: number) => {
      onChange(Math.min(config.max, Math.max(config.min, next)));
    },
    [config.max, config.min, onChange],
  );
  const handlePointerUp = useCallback(() => {
    onChange(
      snapHookValue({
        value,
        min: config.min,
        max: config.max,
        snapStep: config.snapStep,
      }),
    );
  }, [config.max, config.min, config.snapStep, onChange, value]);
  const percent = ((value - config.min) / (config.max - config.min)) * 100;
  return (
    <div className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-300/90 bg-white text-sm font-semibold text-stone-800 shadow-sm">
          {stepIndex}
        </span>
        {!isLast ? (
          <span
            className="mt-2 w-px flex-1 min-h-[2.5rem] bg-gradient-to-b from-stone-300/80 to-stone-200/40"
            aria-hidden
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1 pb-8">
        <p className="text-sm font-medium leading-snug text-foreground">
          {t(STEP_LABEL_KEYS[inputKey])}
        </p>
        <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-[1.65rem]">
          {value}
          {atMax ? "+" : ""}{" "}
          <span className="text-base font-medium text-muted-foreground">
            {t(STEP_UNIT_KEYS[inputKey])}
          </span>
        </p>
        <div className="relative mt-4">
          <div
            className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between px-0.5"
            aria-hidden
          >
            {ticks.map((tick) => {
              const tickPercent =
                ((tick - config.min) / (config.max - config.min)) * 100;
              return (
                <span
                  key={tick}
                  className="h-1.5 w-px bg-stone-300/90"
                  style={{
                    position: "absolute",
                    left: `${tickPercent}%`,
                    transform: "translateX(-50%)",
                  }}
                />
              );
            })}
          </div>
          <input
            type="range"
            min={config.min}
            max={config.max}
            step={1}
            value={value}
            onChange={(e) => handleChange(Number(e.target.value))}
            onPointerUp={handlePointerUp}
            onBlur={handlePointerUp}
            className="hook-range-input relative z-10 w-full"
            aria-valuemin={config.min}
            aria-valuemax={config.max}
            aria-valuenow={value}
            style={
              {
                "--range-percent": `${percent}%`,
              } as CSSProperties
            }
          />
          <div className="mt-2 flex justify-between text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
            <span>{config.min}</span>
            <span>{config.max}+</span>
          </div>
        </div>
      </div>
    </div>
  );
};

type HealthGaugeProps = {
  score: number;
  zone: HookHealthZone;
  zoneLabel: string;
  zoneAxisLabels: { critical: string; warning: string; healthy: string };
};

const HealthGauge = ({
  score,
  zone,
  zoneLabel,
  zoneAxisLabels,
}: HealthGaugeProps) => {
  const rotation = -90 + (score / 100) * 180;
  const styles = ZONE_STYLES[zone];
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-40 w-full max-w-sm">
        <svg viewBox="0 0 200 112" className="h-full w-full" aria-hidden>
          <path
            d="M 24 100 A 76 76 0 0 1 68 44"
            fill="none"
            stroke="#dc2626"
            strokeWidth="10"
            strokeLinecap="round"
            opacity={0.35}
          />
          <path
            d="M 68 44 A 76 76 0 0 1 132 44"
            fill="none"
            stroke="#d97706"
            strokeWidth="10"
            strokeLinecap="round"
            opacity={0.4}
          />
          <path
            d="M 132 44 A 76 76 0 0 1 176 100"
            fill="none"
            stroke="#059669"
            strokeWidth="10"
            strokeLinecap="round"
            opacity={0.45}
          />
          <g transform={`rotate(${rotation} 100 100)`}>
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="38"
              stroke={styles.needle}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="100" cy="100" r="5" fill={styles.needle} />
          </g>
        </svg>
      </div>
      <p
        className={cn(
          "mt-1 text-4xl font-bold tabular-nums tracking-tight",
          styles.score,
        )}
      >
        {score}/100
      </p>
      <p className={cn("mt-1 text-sm font-semibold", styles.label)}>
        {zoneLabel}
      </p>
    </div>
  );
};

type AnimatedMoneyProps = {
  amountVnd: number;
  className?: string;
};

const AnimatedMoney = ({ amountVnd, className }: AnimatedMoneyProps) => {
  const { locale } = useI18n();
  const animated = useFastAnimatedNumber(
    amountVnd,
    HOOK_DIAGNOSTIC_CONFIG.animatedNumberDurationMs,
  );
  const formatted = formatHookMoney({
    amountVnd: animated,
    currency: HOOK_DIAGNOSTIC_CONFIG.displayCurrency,
    locale,
  });
  return (
    <p
      className={cn(
        "text-xl font-bold tabular-nums tracking-tight sm:text-2xl",
        className,
      )}
    >
      {formatted}
    </p>
  );
};

type ResultCardProps = {
  title: string;
  description: string;
  amountVnd: number;
  barClass: string;
  valueClass: string;
  featured?: boolean;
};

const ResultCard = ({
  title,
  description,
  amountVnd,
  barClass,
  valueClass,
  featured = false,
}: ResultCardProps) => (
  <div
    className={cn(
      "rounded-xl border bg-white p-5 shadow-sm transition-shadow",
      featured
        ? "border-emerald-200/90 shadow-md shadow-emerald-900/[0.06] ring-1 ring-emerald-100/80"
        : "border-stone-200/90 shadow-stone-900/[0.04]",
    )}
  >
    <div className={cn("mb-3 h-0.5 w-12 rounded-full", barClass)} />
    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-600">
      {title}
    </p>
    <AnimatedMoney amountVnd={amountVnd} className={valueClass} />
    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
      {description}
    </p>
  </div>
);

export default function HookSection() {
  const { t } = useI18n();
  const { open } = useContactModal();
  const [inputs, setInputs] = useState<HookInputState>(DEFAULT_INPUTS);
  const setInput = useCallback((key: HookInputKey, value: number) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }, []);
  const metrics = useMemo(() => computeHookDiagnosticMetrics(inputs), [inputs]);
  const zoneLabel =
    metrics.zone === "healthy"
      ? t("hook_gauge_healthy")
      : metrics.zone === "warning"
        ? t("hook_gauge_warning")
        : t("hook_gauge_critical");
  return (
    <Section
      id="hook"
      spacing="compact"
      className="border-t border-stone-200/60 bg-[#faf9f5]"
    >
      <div className={sectionContainer}>
        <FadeInOnScroll>
          <SectionHeader
            title={t("hook_title")}
            subtitle={t("hook_subtitle")}
            margin="tight"
          />
        </FadeInOnScroll>
        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-10">
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-stone-200/80 bg-white/90 p-6 shadow-sm shadow-stone-900/[0.04] sm:p-7">
              <div className="mb-6 flex items-center justify-between gap-3 border-b border-stone-100 pb-4">
                <h3 className="text-base font-semibold text-foreground sm:text-lg">
                  {t("hook_diagnostics_title")}
                </h3>
                <span className="shrink-0 rounded-full bg-stone-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                  {t("hook_diagnostics_badge")}
                </span>
              </div>
              {HOOK_INPUT_ORDER.map((key, index) => (
                <DiagnosticStep
                  key={key}
                  stepIndex={index + 1}
                  inputKey={key}
                  value={inputs[key]}
                  onChange={(v) => setInput(key, v)}
                  isLast={index === HOOK_INPUT_ORDER.length - 1}
                />
              ))}
              <p className="border-t border-stone-100 pt-4 text-xs leading-relaxed text-muted-foreground">
                {t("hook_privacy_note")}
              </p>
            </div>
          </div>
          <div className="space-y-6 lg:col-span-3">
            <div className="rounded-2xl border border-stone-200/80 bg-white/95 p-6 shadow-sm shadow-stone-900/[0.04] sm:p-8">
              <h3 className="text-center text-base font-semibold text-foreground sm:text-lg">
                {t("hook_treatment_title")}
              </h3>
              <div className="mt-6">
                <HealthGauge
                  score={metrics.score}
                  zone={metrics.zone}
                  zoneLabel={zoneLabel}
                  zoneAxisLabels={{
                    critical: t("hook_gauge_zone_critical"),
                    warning: t("hook_gauge_zone_warning"),
                    healthy: t("hook_gauge_zone_healthy"),
                  }}
                />
              </div>
              <AnimatePresence mode="wait">
                {metrics.zone === "critical" ? (
                  <motion.p
                    key="critical-alert"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="mt-4 rounded-lg border border-red-900/15 bg-red-950/[0.04] px-4 py-3 text-sm font-medium leading-snug text-red-950"
                  >
                    {t("hook_gauge_warning_text")}
                  </motion.p>
                ) : null}
              </AnimatePresence>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <ResultCard
                  title={t("hook_result1_title")}
                  description={t("hook_result1_desc")}
                  amountVnd={metrics.operationalWasteVnd}
                  barClass="bg-amber-800/75"
                  valueClass="text-amber-950"
                />
                <ResultCard
                  title={t("hook_result2_title")}
                  description={t("hook_result2_desc")}
                  amountVnd={metrics.revenueLeakageVnd}
                  barClass="bg-red-950/65"
                  valueClass="text-red-950"
                />
                <ResultCard
                  title={t("hook_result3_title")}
                  description={t("hook_result3_desc")}
                  amountVnd={metrics.lawzySavingsVnd}
                  barClass="bg-emerald-700"
                  valueClass="text-emerald-900"
                  featured
                />
              </div>
              <p className="mt-6 text-center text-[11px] text-muted-foreground">
                {t("hook_disclaimer")}
              </p>
            </div>
            <Button
              size="lg"
              className="h-auto min-h-12 w-full whitespace-normal px-6 py-3 text-center text-sm font-semibold leading-snug shadow-md shadow-orange-900/10 sm:text-base"
              onClick={open}
            >
              {t("hook_cta")}
            </Button>
          </div>
        </div>
      </div>
    </Section>
  );
}
