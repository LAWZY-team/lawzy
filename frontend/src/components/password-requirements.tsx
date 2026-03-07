"use client";

import { useMemo } from "react";
import { Check, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface PasswordRequirementsProps {
  password: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function PasswordRequirements({
  password,
  open,
  onOpenChange,
  children,
}: PasswordRequirementsProps) {
  const requirements = useMemo(() => {
    return [
      {
        label: "Tối thiểu 8 ký tự",
        met: password.length >= 8,
      },
      {
        label: "Ít nhất 1 chữ in hoa",
        met: /[A-Z]/.test(password),
      },
      {
        label: "Ít nhất 1 số",
        met: /[0-9]/.test(password),
      },
      {
        label: "Ít nhất 1 ký tự đặc biệt",
        met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      },
    ];
  }, [password]);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>{children}</PopoverAnchor>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={8}
        className="w-64 p-3"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Yêu cầu mật khẩu:</p>
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
      </PopoverContent>
    </Popover>
  );
}
