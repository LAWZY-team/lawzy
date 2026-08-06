"use client";

import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n-provider";

interface PasswordRequirementsProps {
  password: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function PasswordRequirements({
  password,
  open,
  children,
}: PasswordRequirementsProps) {
  const { t } = useT();

  const requirements = useMemo(() => {
    return [
      {
        label: t("auth_password_req_length"),
        met: password.length >= 8,
      },
      {
        label: t("auth_password_req_uppercase"),
        met: /[A-Z]/.test(password),
      },
      {
        label: t("auth_password_req_number"),
        met: /[0-9]/.test(password),
      },
      {
        label: t("auth_password_req_special"),
        met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      },
    ];
  }, [password, t]);

  return (
    <div className="relative">
      {children}
      <div
        className={cn(
          "absolute left-0 top-full z-20 mt-2 w-64 rounded-md border bg-popover p-3 text-popover-foreground shadow-md transition-all duration-150",
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0",
        )}
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">{t("auth_password_requirements_title")}</p>
          <ul className="space-y-1.5">
            {requirements.map((req, index) => (
              <li
                key={index}
                className={cn(
                  "flex items-center gap-2 text-xs transition-colors",
                  req.met
                    ? "text-green-600 dark:text-green-400"
                    : "text-muted-foreground",
                )}
              >
                {req.met ? (
                  <Check className="h-3.5 w-3.5 flex-shrink-0" />
                ) : (
                  <X className="h-3.5 w-3.5 flex-shrink-0" />
                )}
                <span>{req.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
