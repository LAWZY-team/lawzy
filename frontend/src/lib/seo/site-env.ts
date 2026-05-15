export const PRODUCTION_SITE_URL = "https://lawzy.vn" as const;

export type SiteEnv = "production" | "uat" | "development";

const SITE_ENV_VALUES: readonly SiteEnv[] = ["production", "uat", "development"];

const parseSiteEnv = (value: string | undefined): SiteEnv | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return SITE_ENV_VALUES.includes(normalized as SiteEnv) ? (normalized as SiteEnv) : null;
};

export const getSiteEnv = (): SiteEnv => {
  const explicit = parseSiteEnv(process.env.NEXT_PUBLIC_SITE_ENV);
  if (explicit) return explicit;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").toLowerCase();
  if (appUrl.includes("uat.")) return "uat";
  if (appUrl.includes("lawzy.vn")) return "production";
  return "development";
};

export const isRobotIndexingAllowed = (): boolean => {
  const allowFlag = process.env.NEXT_PUBLIC_ALLOW_ROBOT_INDEXING?.trim().toLowerCase();
  if (allowFlag === "false" || allowFlag === "0") return false;
  if (allowFlag === "true" || allowFlag === "1") return true;
  return getSiteEnv() === "production";
};

export const getAppUrl = (): string =>
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";

export const getProductionSiteUrl = (): string => PRODUCTION_SITE_URL;

export const getSchemaBaseUrl = (): string =>
  isRobotIndexingAllowed() ? getAppUrl() : PRODUCTION_SITE_URL;
