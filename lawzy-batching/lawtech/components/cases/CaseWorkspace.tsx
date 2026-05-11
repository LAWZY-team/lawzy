"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileText, RefreshCcw } from "lucide-react";

import { ExportPanel } from "@/components/export/ExportPanel";
import { MasterForm } from "@/components/forms/MasterForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { saveCase } from "@/lib/actions";
import type { GeneralInfo } from "@/lib/schemas";

export interface TemplateSummary {
  id: string;
  code: string;
  name: string;
  isRequired: boolean;
  language: string;
  status: string;
  placeholders: string[];
}

const emptyGeneralInfo = {
  companyNameVi: "",
  companyNameEn: "",
  address: "",
  capitalAmount: 0,
  capitalCurrency: "VND",
  members: [{ name: "", nationality: "", documentNumber: "", sharePercent: 100 }],
  legalRepName: "",
  legalRepNationality: "Việt Nam",
  legalRepDocNumber: "",
  legalRepTitle: "Giám đốc",
  industries: [{ code: "", nameVi: "", isPrimary: true }],
  registrationDate: "",
} as GeneralInfo;

interface Props {
  caseId: string;
  templates: TemplateSummary[];
  initialGeneralInfo?: GeneralInfo;
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("vi-VN").format(amount) + " " + currency;
}

function buildPreview(generalInfo: GeneralInfo, template: TemplateSummary) {
  const primaryIndustry = generalInfo.industries.find((industry) => industry.isPrimary);
  const memberList = generalInfo.members
    .map(
      (member) =>
        `${member.name} (${member.nationality}) - ${member.sharePercent}% - ${member.documentNumber}`
    )
    .join("\n");

  return [
    `${template.code} - ${template.name}`,
    "",
    `Tên doanh nghiệp: ${generalInfo.companyNameVi}`,
    `Tên tiếng Anh: ${generalInfo.companyNameEn}`,
    `Địa chỉ trụ sở: ${generalInfo.address}`,
    `Vốn điều lệ: ${formatMoney(generalInfo.capitalAmount, generalInfo.capitalCurrency)}`,
    `Người đại diện: ${generalInfo.legalRepName} - ${generalInfo.legalRepTitle}`,
    `Ngành chính: ${primaryIndustry?.code ?? "N/A"} - ${primaryIndustry?.nameVi ?? "N/A"}`,
    "",
    "Thành viên/cổ đông:",
    memberList,
  ].join("\n");
}

export function CaseWorkspace({ caseId, templates, initialGeneralInfo }: Props) {
  const router = useRouter();
  const [generalInfo, setGeneralInfo] = useState<GeneralInfo>(
    initialGeneralInfo || emptyGeneralInfo
  );
  const [activeTemplateId, setActiveTemplateId] = useState(templates[0]?.id ?? "");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  const activeTemplate =
    templates.find((template) => template.id === activeTemplateId) ?? templates[0];

  const preview = useMemo(
    () => buildPreview(generalInfo, activeTemplate),
    [activeTemplate, generalInfo]
  );

  function handleSubmit(data: GeneralInfo) {
    setIsSaving(true);
    setGeneralInfo(data);
    
    startTransition(async () => {
      try {
        const result = await saveCase(caseId, data);
        setLastSavedAt(new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }));
        
        if (result?.newCaseId) {
          router.push(`/cases/${result.newCaseId}`);
        }
      } catch (error) {
        console.error("Save error:", error);
        alert("Lưu thất bại!");
      } finally {
        setIsSaving(false);
      }
    });
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Hồ sơ #{caseId}</p>
              <h1 className="mt-1 text-2xl font-semibold">
                Batch fill hồ sơ FDI từ Master Form
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Dữ liệu được lưu tự động xuống Supabase. Hãy điền đầy đủ Master Form 
                để đồng bộ các template target.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Auto-save 30s</Badge>
              <Badge variant="secondary">Tổng vốn = 100%</Badge>
              <Badge variant="secondary">13 template target</Badge>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Master Information Form</CardTitle>
              <CardDescription>
                Nguồn dữ liệu duy nhất cho toàn bộ bộ hồ sơ. Các lỗi required, ngày tháng,
                vốn và tỷ lệ góp vốn được validate trước khi batch.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MasterForm
                defaultValues={generalInfo}
                onSubmit={handleSubmit}
                isSaving={isSaving}
              />
              {lastSavedAt && (
                <p className="mt-3 text-xs text-slate-500">Đã lưu nháp lúc {lastSavedAt}</p>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Template selector</CardTitle>
                <CardDescription>
                  Danh sách template target được fetch trực tiếp từ bảng templates của Supabase.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setActiveTemplateId(template.id)}
                    className={`flex w-full items-start justify-between rounded-lg border p-3 text-left transition ${
                      activeTemplateId === template.id
                        ? "border-slate-900 bg-slate-100"
                        : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    <span>
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <FileText className="size-4" />
                        {template.code} - {template.name}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {template.placeholders.length} placeholders · {template.language}
                      </span>
                    </span>
                    {template.isRequired ? (
                      <Badge>Bắt buộc</Badge>
                    ) : (
                      <Badge variant="secondary">Tùy chọn</Badge>
                    )}
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Preview</CardTitle>
                    <CardDescription>
                      Preview text mô phỏng dữ liệu đã được điền vào template.
                    </CardDescription>
                  </div>
                  <Button type="button" variant="outline" onClick={() => handleSubmit(generalInfo)}>
                    <RefreshCcw className="size-4" />
                    Re-sync
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="min-h-80 whitespace-pre-wrap rounded-lg border bg-slate-950 p-4 text-sm leading-6 text-slate-50">
                  {preview}
                </pre>
                <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  Các field trong preview lấy trực tiếp từ Master Form hiện tại.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Export</CardTitle>
                <CardDescription>
                  Gọi `POST /batch` khi `NEXT_PUBLIC_API_URL` được cấu hình; nếu chưa có
                  backend, frontend trả mock download để demo flow.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ExportPanel
                  caseId={caseId}
                  generalInfo={generalInfo}
                  templates={templates}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
