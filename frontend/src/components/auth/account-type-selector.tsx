"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/components/i18n-provider";

export type AccountType = "personal" | "business";

interface AccountTypeSelectorProps {
  value: AccountType;
  onChange: (value: AccountType) => void;
}

export function AccountTypeSelector({ value, onChange }: AccountTypeSelectorProps) {
  const { t } = useT();
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{t("auth_account_type")}</Label>
      <Select value={value} onValueChange={(v) => onChange(v as AccountType)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="personal">{t("auth_account_personal")}</SelectItem>
          <SelectItem value="business">{t("auth_account_business")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
