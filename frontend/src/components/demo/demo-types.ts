export type DemoStatus =
  | "draft"
  | "ready_to_sign"
  | "active"
  | "expiring_soon";

export type DemoFieldType = "text" | "date" | "number" | "money" | "select";

export type DemoField = {
  key: string;
  label: string;
  type: DemoFieldType;
  required?: boolean;
  options?: string[];
};

export type DemoTemplate = {
  id: string;
  name: string;
  category: string;
  description: string;
  fields: DemoField[];
  sections: string[];
  defaultObligations: DemoObligationSeed[];
};

export type DemoObligationSeed = {
  title: string;
  dueInDays: number;
  owner: string;
};

export type DemoObligation = DemoObligationSeed & {
  id: string;
  dueDate: string;
  done: boolean;
};

export type DemoVersion = {
  id: string;
  label: string;
  createdAt: string;
  summary: string;
  values: Record<string, string>;
};

export type DemoComment = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  status: "open" | "resolved";
};

export type DemoAttachment = {
  id: string;
  name: string;
  kind: string;
  addedAt: string;
};

export type DemoAuditLog = {
  id: string;
  action: string;
  actor: string;
  createdAt: string;
};

export type DemoContract = {
  id: string;
  templateId: string;
  title: string;
  counterparty: string;
  owner: string;
  status: DemoStatus;
  values: Record<string, string>;
  obligations: DemoObligation[];
  versions: DemoVersion[];
  comments: DemoComment[];
  attachments: DemoAttachment[];
  auditLogs: DemoAuditLog[];
  createdAt: string;
};
