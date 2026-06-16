/**
 * Hook section — diagnostic inputs, display currency, and formula coefficients.
 * Formulas are placeholders until validated; adjust values here only.
 */
export type HookCurrencyCode = "USD" | "VND";

export const HOOK_DIAGNOSTIC_CONFIG = {
  /** Default currency for monetary results on the right panel */
  displayCurrency: "USD" as HookCurrencyCode,
  /** FX Rate: 1 USD = 26000 VND */
  vndPerUsd: 26_000,
  inputs: {
    contractsPerMonth: {
      min: 5,
      max: 500,
      default: 50,
      snapStep: 10,
    },
    annualRevenueBillionVnd: {
      min: 1,
      max: 500,
      default: 50,
      snapStep: 10,
    },
    avgSalaryMillionVndPerMonth: {
      min: 8,
      max: 50,
      default: 15,
      snapStep: 1,
    },
  },
  gauge: {
    healthyMinScore: 70,
    warningMinScore: 40,
  },
  /**
   * Placeholder formulas — all coefficients are tunable without touching UI code.
   * Amounts are computed in VND internally; converted for USD display.
   */
  formulas: {
    hoursPerContract: 4,
    monthsPerYear: 12,
    manualWorkRatio: 0.35,
    revenueLeakageRatePerBillion: 0.002,
    contractsNormalization: 100,
    lawzyRetentionRatio: 0.65,
    score: {
      base: 100,
      contractWeight: 0.08,
      revenueWeight: 0.04,
      salaryWeight: 0.5,
    },
  },
  /** Count-up duration when slider values change (ms) */
  animatedNumberDurationMs: 100,
} as const;

export type HookInputKey = keyof typeof HOOK_DIAGNOSTIC_CONFIG.inputs;

export const HOOK_INPUT_ORDER: HookInputKey[] = [
  "contractsPerMonth",
  "annualRevenueBillionVnd",
  "avgSalaryMillionVndPerMonth",
];

export const snapHookValue = ({
  value,
  min,
  max,
  snapStep,
}: {
  value: number;
  min: number;
  max: number;
  snapStep: number;
}): number => {
  const snapped = Math.round(value / snapStep) * snapStep;
  return Math.min(max, Math.max(min, snapped));
};

export const buildHookTicks = ({
  min,
  max,
  snapStep,
}: {
  min: number;
  max: number;
  snapStep: number;
}): number[] => {
  const ticks: number[] = [];
  for (let v = min; v <= max; v += snapStep) {
    ticks.push(v);
  }
  if (ticks[ticks.length - 1] !== max) {
    ticks.push(max);
  }
  return ticks;
};
