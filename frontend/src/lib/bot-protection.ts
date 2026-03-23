export const isBotProtectionEnabled =
  process.env.NODE_ENV === "production" &&
  !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export const shouldVerifyBotProtection =
  process.env.NODE_ENV === "production" &&
  !!process.env.TURNSTILE_SECRET_KEY;
