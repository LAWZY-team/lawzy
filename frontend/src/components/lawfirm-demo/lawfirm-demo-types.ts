export type Locale = "vi" | "en";
export type InvestorType = "individual" | "organization";
export type FieldGroup = "individual" | "organization" | "representative" | "other";
export type TemplateStatus = "draft" | "ready";
export type DocumentStatus = "draft" | "done";
export type DocumentKind = "docx" | "pdf";

export type ProfileField = {
  id: string;
  group: FieldGroup;
  label: string;
  value: string;
  aliases: string;
};

export type ClientProfile = {
  id: string;
  name: string;
  investorType: InvestorType;
  fields: ProfileField[];
};

export type TemplateField = {
  id: string;
  label: string;
  placeholder: string;
  mappedKey: string;
  source: "auto" | "highlight" | "manual" | "ai";
  count: number;
};

export type TemplateDocument = {
  id: string;
  fileName: string;
  fileType: DocumentKind;
  status: DocumentStatus;
  fields: TemplateField[];
  previewMode: "highlight" | "edit";
  previewHtml?: string;
  previewImage?: string;
  plainText: string;
  storageKey?: string;
  fileId?: string;
};

export type TemplateSet = {
  id: string;
  name: string;
  status: TemplateStatus;
  documents: TemplateDocument[];
};

export type FillSourceFile = {
  id: string;
  name: string;
  file: File;
};

export type FillResult = {
  id: string;
  name: string;
  blob?: Blob;
  bytes?: ArrayBuffer;
  count: number;
  state: "success" | "no_match" | "unsupported" | "error";
  error?: string;
};

export type PersistedWorkspace = {
  profiles: ClientProfile[];
  templates: TemplateSet[];
  activeProfileId: string;
  activeTemplateId: string;
  locale: Locale;
};

