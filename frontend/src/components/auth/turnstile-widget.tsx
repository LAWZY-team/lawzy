"use client";

import { forwardRef } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { isBotProtectionEnabled } from "@/lib/bot-protection";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

interface TurnstileWidgetProps {
  onSuccess: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  className?: string;
}

export const TurnstileWidget = forwardRef<TurnstileInstance | undefined, TurnstileWidgetProps>(
  function TurnstileWidget({ onSuccess, onError, onExpire, className }, ref) {
    if (!isBotProtectionEnabled || !TURNSTILE_SITE_KEY) {
      return null;
    }

    return (
      <div className={className}>
        <Turnstile
          ref={ref}
          siteKey={TURNSTILE_SITE_KEY}
          options={{ size: "compact", theme: "light" }}
          onSuccess={onSuccess}
          onError={onError}
          onExpire={onExpire}
        />
      </div>
    );
  }
);
