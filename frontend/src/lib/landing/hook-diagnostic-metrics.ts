import {
  HOOK_DIAGNOSTIC_CONFIG,
  type HookCurrencyCode,
} from "./hook-diagnostic-config";

export type HookHealthZone = "healthy" | "warning" | "critical";

export type HookDiagnosticInputs = {
  contractsPerMonth: number;
  annualRevenueBillionVnd: number;
  avgSalaryMillionVndPerMonth: number;
};

export type HookDiagnosticMetrics = {
  score: number;
  zone: HookHealthZone;
  operationalWasteVnd: number;
  revenueLeakageVnd: number;
  lawzySavingsVnd: number;
};

const { formulas, gauge } = HOOK_DIAGNOSTIC_CONFIG;

/**
 * Computes health score and monetary estimates (VND) from slider inputs.
 */
export const computeHookDiagnosticMetrics = (
  inputs: HookDiagnosticInputs,
  locale: string
): HookDiagnosticMetrics => {
  const { contractsPerMonth, annualRevenueBillionVnd, avgSalaryMillionVndPerMonth } = inputs;
  
  let salaryVndPerMonth = 0;
  let revenueVnd = 0;

  if (locale === "en") {
    // annualRevenueBillionVnd is actually Million USD
    revenueVnd = annualRevenueBillionVnd * 1_000_000 * HOOK_DIAGNOSTIC_CONFIG.vndPerUsd;
    // avgSalaryMillionVndPerMonth is actually USD/month
    salaryVndPerMonth = avgSalaryMillionVndPerMonth * HOOK_DIAGNOSTIC_CONFIG.vndPerUsd;
  } else {
    // annualRevenueBillionVnd is Billion VND
    revenueVnd = annualRevenueBillionVnd * 1_000_000_000;
    // avgSalaryMillionVndPerMonth is Million VND
    salaryVndPerMonth = avgSalaryMillionVndPerMonth * 1_000_000;
  }

  const operationalWasteVnd =
    contractsPerMonth *
    formulas.monthsPerYear *
    formulas.hoursPerContract *
    salaryVndPerMonth *
    formulas.manualWorkRatio;

  const revenueLeakageVnd =
    revenueVnd *
    formulas.revenueLeakageRatePerBillion *
    (contractsPerMonth / formulas.contractsNormalization);

  const lawzySavingsVnd =
    (operationalWasteVnd + revenueLeakageVnd) * formulas.lawzyRetentionRatio;

  // Scale back to original VND units for internal score formula consistency
  const revenueScale = revenueVnd / 1_000_000_000;
  const salaryScale = salaryVndPerMonth / 1_000_000;

  const rawScore =
    formulas.score.base -
    contractsPerMonth * formulas.score.contractWeight -
    revenueScale * formulas.score.revenueWeight -
    salaryScale * formulas.score.salaryWeight;

  const score = Math.max(0, Math.min(100, Math.round(rawScore)));
  const zone: HookHealthZone =
    score >= gauge.healthyMinScore
      ? "healthy"
      : score >= gauge.warningMinScore
        ? "warning"
        : "critical";

  return {
    score,
    zone,
    operationalWasteVnd,
    revenueLeakageVnd,
    lawzySavingsVnd,
  };
};

export const convertVndToDisplayAmount = ({
  amountVnd,
  currency,
}: {
  amountVnd: number;
  currency: HookCurrencyCode;
}): number => {
  if (currency === "VND") {
    return amountVnd;
  }
  return amountVnd / HOOK_DIAGNOSTIC_CONFIG.vndPerUsd;
};

export const formatHookMoney = ({
  amountVnd,
  currency,
  locale,
}: {
  amountVnd: number;
  currency: HookCurrencyCode;
  locale: string;
}): string => {
  if (currency === "USD") {
    const usd = convertVndToDisplayAmount({ amountVnd, currency: "USD" });
    return new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(usd);
  }
  if (amountVnd >= 1_000_000_000_000) {
    return `${(amountVnd / 1_000_000_000_000).toFixed(1)} ${locale === "vi" ? "nghìn tỷ" : "T"}`;
  }
  if (amountVnd >= 1_000_000_000) {
    return `${(amountVnd / 1_000_000_000).toFixed(1)} ${locale === "vi" ? "tỷ" : "B"}`;
  }
  if (amountVnd >= 1_000_000) {
    return `${Math.round(amountVnd / 1_000_000)} ${locale === "vi" ? "triệu" : "M"}`;
  }
  return `${Math.round(amountVnd).toLocaleString(locale === "vi" ? "vi-VN" : "en-US")}`;
};
