import type { DemoContract, DemoStatus, DemoTemplate } from "./demo-types";

export const statusLabels: Record<DemoStatus, string> = {
  draft: "Bản thảo",
  ready_to_sign: "Sẵn sàng ký",
  active: "Đang hiệu lực",
  expiring_soon: "Sắp hết hạn",
};

export function getTemplate(templates: DemoTemplate[], templateId: string) {
  return templates.find((template) => template.id === templateId) ?? templates[0];
}

export function formatDate(date: string): string {
  if (!date) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function formatMoney(value: string): string {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return value || "Chưa có";
  return new Intl.NumberFormat("vi-VN").format(number);
}

export function renderText(text: string, values: Record<string, string>) {
  return text.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key: string) => {
    const value = values[key];
    return value?.trim() ? value : `[${key}]`;
  });
}

export function completionPercent(contract: DemoContract, template: DemoTemplate): number {
  const required = template.fields.filter((field) => field.required);
  if (!required.length) return 100;
  const filled = required.filter((field) => contract.values[field.key]?.trim()).length;
  return Math.round((filled / required.length) * 100);
}

export function createObligations(template: DemoTemplate) {
  const now = new Date();
  return template.defaultObligations.map((item, index) => {
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + item.dueInDays);
    return {
      ...item,
      id: `obl-${Date.now()}-${index}`,
      dueDate: dueDate.toISOString().slice(0, 10),
      done: false,
    };
  });
}

export function sortContracts(contracts: DemoContract[]) {
  return [...contracts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
