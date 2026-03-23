import type { TranslationKey } from "@/lib/i18n";

export interface QuotaLimits {
  dailyAiQuota?: number | 'unlimited';
  storageBytes?: number;
  workspaceMembers?: number | 'unlimited';
  templates?: number | 'unlimited';
  aiAssistant?: boolean;
  /** Per-seat pricing (VND). Used for Team plan. */
  pricePerSeat?: number;
  minSeats?: number;
  maxSeats?: number;
  /** Extra storage per seat (bytes) */
  storagePerSeatBytes?: number;
  /** AI top-up: VND per extra request */
  aiTopUpPricePerRequest?: number;
  aiTopUpMinCredits?: number;
}

/** Compute price for Team plan given seat count */
export function computeTeamPlanPrice(
  plan: Plan,
  seatCount: number
): number {
  const q = plan.quotaLimits as QuotaLimits | null;
  if (!q?.pricePerSeat || !q?.minSeats) return plan.price;
  const seats = Math.max(seatCount, q.minSeats);
  const maxSeats = q.maxSeats ?? 1000;
  const capped = Math.min(seats, maxSeats);
  return capped * q.pricePerSeat;
}

export interface Plan {
  id: string;
  slug: string;
  name: string;
  nameEn?: string | null;
  description?: string | null;
  descriptionEn?: string | null;
  price: number;
  billingCycle: string;
  sortOrder: number;
  isActive: boolean;
  isHighlighted: boolean;
  contactSales: boolean;
  quotaLimits?: QuotaLimits | null;
  createdAt: string;
  updatedAt: string;
}

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

/** Format quota value for display. Use with t() for i18n. */
export function formatQuotaDisplay(
  value: number | 'unlimited' | undefined,
  t: TranslateFn
): string {
  if (value === undefined) return t('plan_na');
  if (value === 'unlimited') return t('plan_unlimited');
  return String(value);
}

/** Format storage bytes for display. Use with t() for i18n. */
export function formatStorageDisplay(
  bytes: number | undefined,
  t: TranslateFn
): string {
  if (bytes == null || bytes < 0) return t('plan_na');
  const n = Math.round(bytes);
  if (bytes >= 1024 ** 4) return t('plan_size_tb', { n: (bytes / 1024 ** 4).toFixed(0) });
  if (bytes >= 1024 ** 3) return t('plan_size_gb', { n: (bytes / 1024 ** 3).toFixed(0) });
  if (bytes >= 1024 ** 2) return t('plan_size_mb', { n: (bytes / 1024 ** 2).toFixed(0) });
  if (bytes >= 1024) return t('plan_size_kb', { n: (bytes / 1024).toFixed(0) });
  return t('plan_size_bytes', { n });
}
