"use client";

import { useState } from "react";
import { ChevronDown, Cpu, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLawfirmAiUsage } from "@/hooks/lawfirm/use-lawfirm-workspace";
import type { Locale } from "./lawfirm-demo-types";

const number = new Intl.NumberFormat("vi-VN");
const token = (value: number) => number.format(value);

export function LawfirmAiUsageFooter({ locale }: { locale: Locale }) {
  const [expanded, setExpanded] = useState(false);
  const usage = useLawfirmAiUsage();
  const report = usage.data;
  const vi = locale === "vi";

  return (
    <footer className="mx-4 mb-5 mt-8 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left hover:bg-zinc-100"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <Cpu className="size-4 text-zinc-500" />
          <div>
            <p className="text-xs font-semibold text-zinc-900">
              {vi
                ? "Báo cáo token Gemini · 30 ngày"
                : "Gemini token report · 30 days"}
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              {report
                ? `${token(report.totals.total_tokens)} token · ${report.totals.calls} ${vi ? "lần gọi" : "calls"}`
                : vi
                  ? "Chưa có dữ liệu sử dụng"
                  : "No usage data yet"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-zinc-600">
          {report && (
            <>
              <span>Input {token(report.totals.prompt_tokens)}</span>
              <span>Output {token(report.totals.output_tokens)}</span>
              <span>Cache {token(report.totals.cached_tokens)}</span>
            </>
          )}
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              expanded && "rotate-180",
            )}
          />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-zinc-200 bg-white px-4 py-4">
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {[
              [
                vi ? "Tổng token" : "Total tokens",
                report?.totals.total_tokens ?? 0,
              ],
              ["Input", report?.totals.prompt_tokens ?? 0],
              ["Output", report?.totals.output_tokens ?? 0],
              [
                vi ? "Suy luận" : "Thinking",
                report?.totals.thinking_tokens ?? 0,
              ],
              [vi ? "Đã cache" : "Cached", report?.totals.cached_tokens ?? 0],
              [
                vi ? "Hiệu chỉnh AI" : "AI corrections",
                report?.totals.correction_count ?? 0,
              ],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-md border border-zinc-200 p-2.5"
              >
                <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                  {label}
                </p>
                <p className="mt-1 text-sm font-semibold text-zinc-900">
                  {token(Number(value))}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-900">
              {vi ? "Chi tiết từng việc" : "Usage by task"}
            </p>
            <button
              type="button"
              onClick={() => void usage.refetch()}
              className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-900"
            >
              <RefreshCw
                className={cn("size-3", usage.isFetching && "animate-spin")}
              />
              {vi ? "Làm mới" : "Refresh"}
            </button>
          </div>

          <div className="mt-2 overflow-x-auto rounded-md border border-zinc-200">
            <table className="w-full min-w-[760px] text-left text-[11px]">
              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">
                    {vi ? "Công việc" : "Task"}
                  </th>
                  <th className="px-3 py-2 font-medium">Model</th>
                  <th className="px-3 py-2 font-medium">Input</th>
                  <th className="px-3 py-2 font-medium">Output</th>
                  <th className="px-3 py-2 font-medium">Thinking</th>
                  <th className="px-3 py-2 font-medium">Cache</th>
                  <th className="px-3 py-2 font-medium">Total</th>
                  <th className="px-3 py-2 font-medium">
                    {vi ? "Thời gian" : "Time"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {(report?.recent ?? []).map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-zinc-800">
                        {item.task_label}
                      </p>
                      <p className="mt-0.5 text-[10px] text-zinc-400">
                        {item.template_set?.name ?? item.task_type} ·{" "}
                        {item.status}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-zinc-500">
                      {item.model_name}
                    </td>
                    <td className="px-3 py-2.5">{token(item.prompt_tokens)}</td>
                    <td className="px-3 py-2.5">{token(item.output_tokens)}</td>
                    <td className="px-3 py-2.5">
                      {token(item.thinking_tokens)}
                    </td>
                    <td className="px-3 py-2.5">{token(item.cached_tokens)}</td>
                    <td className="px-3 py-2.5 font-semibold text-zinc-900">
                      {token(item.total_tokens)}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-500">
                      {(item.latency_ms / 1000).toFixed(1)}s
                    </td>
                  </tr>
                ))}
                {!report?.recent.length && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-6 text-center text-zinc-400"
                    >
                      {vi
                        ? "Chưa có Gemini call nào được ghi nhận."
                        : "No Gemini calls recorded."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[10px] text-zinc-400">
            {vi
              ? "Số liệu lấy trực tiếp từ usageMetadata của Gemini; thao tác deterministic/OCR local dùng 0 token."
              : "Counts come from Gemini usageMetadata; deterministic/local OCR operations use 0 tokens."}
          </p>
        </div>
      )}
    </footer>
  );
}
