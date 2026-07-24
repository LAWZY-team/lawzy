"use client";

import { useEffect, useMemo, useState } from "react";
import type React from "react";
import Image from "next/image";
import {
  BookOpen,
  CalendarDays,
  FileText,
  Folder,
  LayoutDashboard,
  Library,
  MessageCircle,
  PhoneCall,
  Plus,
  RotateCcw,
  Search,
  Signature,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  demoKnowledgeBase,
  demoParties,
  demoTemplates,
  initialDemoContracts,
} from "./demo-data";
import type { DemoContract, DemoStatus, DemoTemplate } from "./demo-types";
import {
  completionPercent,
  createObligations,
  formatDate,
  getTemplate,
  renderText,
  sortContracts,
  statusLabels,
} from "./demo-utils";

type DemoView =
  | "dashboard"
  | "contracts"
  | "repository"
  | "calendar"
  | "search"
  | "templates"
  | "knowledge"
  | "parties"
  | "advisory"
  | "new"
  | "workspace";

const STORAGE_KEY = "lawzy.contracts.workspace.v2";

const statusOrder: DemoStatus[] = [
  "draft",
  "ready_to_sign",
  "active",
  "expiring_soon",
];

const statusClassName: Record<DemoStatus, string> = {
  draft: "border-zinc-300 bg-white text-zinc-700",
  ready_to_sign: "border-zinc-950 bg-zinc-950 text-white",
  active: "border-zinc-600 bg-zinc-100 text-zinc-950",
  expiring_soon: "border-zinc-950 bg-white text-zinc-950",
};

const navItems: Array<{
  id: DemoView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "dashboard", label: "Bảng điều khiển", icon: LayoutDashboard },
  { id: "contracts", label: "Hợp đồng", icon: Library },
  { id: "repository", label: "Kho lưu trữ", icon: Folder },
  { id: "calendar", label: "Lịch", icon: CalendarDays },
  { id: "search", label: "Tìm kiếm", icon: Search },
  { id: "templates", label: "Mẫu hợp đồng", icon: FileText },
  { id: "knowledge", label: "Kho tri thức", icon: BookOpen },
  { id: "parties", label: "Đối tác", icon: Users },
  { id: "advisory", label: "Tư vấn luật sư", icon: PhoneCall },
];

const retainerPlans = [
  {
    id: "basic",
    name: "Gói Cơ bản",
    priceLabel: "5.000.000đ / tháng",
    hours: 5,
    sla: "Phản hồi trong 24 giờ làm việc",
    description:
      "Phù hợp doanh nghiệp mới bắt đầu chuẩn hóa hợp đồng, ít phát sinh vấn đề phức tạp.",
    features: [
      "5 giờ tư vấn mỗi tháng",
      "Trả lời qua email hoặc tin nhắn",
      "Rà soát hợp đồng theo mẫu có sẵn",
      "Không bao gồm buổi họp định kỳ",
    ],
  },
  {
    id: "standard",
    name: "Gói Tiêu chuẩn",
    priceLabel: "10.000.000đ / tháng",
    hours: 10,
    sla: "Phản hồi trong 8 giờ làm việc",
    recommended: true,
    description:
      "Phù hợp doanh nghiệp chưa có pháp chế nhưng cần luật sư cố định hiểu hồ sơ.",
    features: [
      "10 giờ tư vấn mỗi tháng",
      "Rà soát hợp đồng theo mẫu không giới hạn",
      "1 buổi họp tư vấn định kỳ mỗi tháng",
      "Luật sư phụ trách cố định",
    ],
  },
  {
    id: "premium",
    name: "Gói Mở rộng",
    priceLabel: "18.000.000đ / tháng",
    hours: 20,
    sla: "Phản hồi trong 4 giờ làm việc",
    description:
      "Phù hợp khi số lượng hợp đồng tăng nhanh hoặc có nhiều yêu cầu cần xử lý gấp.",
    features: [
      "20 giờ tư vấn mỗi tháng",
      "Đường dây ưu tiên cho yêu cầu khẩn cấp",
      "2 buổi họp tư vấn định kỳ mỗi tháng",
      "Hỗ trợ hợp đồng phức tạp ngoài mẫu",
    ],
  },
];

const advisoryChips = [
  "Đối tác muốn chấm dứt hợp đồng trước hạn",
  "Cần rà soát điều khoản phạt vi phạm",
  "Nhân sự nghỉ việc trước khi hết hạn hợp đồng",
  "Khách hàng yêu cầu điều khoản độc quyền",
];

const lawyer = {
  initials: "BT",
  name: "LS. Nguyễn Bảo Trâm",
  title: "Luật sư phụ trách - Đoàn Luật sư TP.HCM",
};

const advisoryRenewDate = new Date(Date.now() + 18 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

const contractTabs = [
  { id: "fill", label: "Điền dữ liệu" },
  { id: "content", label: "Nội dung" },
  { id: "versions", label: "Phiên bản" },
  { id: "comments", label: "Góp ý" },
  { id: "approval", label: "Ký duyệt" },
  { id: "obligations", label: "Nghĩa vụ" },
  { id: "attachments", label: "Tệp" },
  { id: "related", label: "Liên quan" },
  { id: "audit", label: "Nhật ký" },
] as const;

type ContractTab = (typeof contractTabs)[number]["id"];

const emptyValues = (template: DemoTemplate) =>
  Object.fromEntries(template.fields.map((field) => [field.key, ""]));

function createContractFromTemplate(template: DemoTemplate): DemoContract {
  const values = emptyValues(template);
  values.company_name = "Công ty Lawzy";

  return {
    id: `contract-${Date.now()}`,
    templateId: template.id,
    title: `${template.name} mới`,
    counterparty: "",
    owner: "Kinh doanh",
    status: "draft",
    values,
    obligations: createObligations(template),
    versions: [],
    comments: [],
    attachments: [],
    auditLogs: [
      {
        id: `log-${Date.now()}`,
        action: `Tạo hồ sơ từ mẫu ${template.name}`,
        actor: "Kinh doanh",
        createdAt: new Date().toISOString().slice(0, 10),
      },
    ],
    createdAt: new Date().toISOString().slice(0, 10),
  };
}

function normalizeContract(contract: DemoContract): DemoContract {
  return {
    ...contract,
    versions: contract.versions ?? [],
    comments: contract.comments ?? [],
    attachments: contract.attachments ?? [],
    auditLogs: contract.auditLogs ?? [],
  };
}

function loadContracts(): DemoContract[] {
  if (typeof window === "undefined") return initialDemoContracts;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialDemoContracts;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map((contract) => normalizeContract(contract as DemoContract))
      : initialDemoContracts;
  } catch {
    return initialDemoContracts;
  }
}

export function DemoShell() {
  const [contracts, setContracts] = useState<DemoContract[]>(initialDemoContracts);
  const [selectedId, setSelectedId] = useState(initialDemoContracts[0]?.id ?? "");
  const [view, setView] = useState<DemoView>("dashboard");
  const [query, setQuery] = useState("");
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const loaded = loadContracts();
      setContracts(loaded);
      setSelectedId(loaded[0]?.id ?? "");
      setStorageReady(true);
    }, 0);
    return () => window.clearTimeout(handle);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts));
  }, [contracts, storageReady]);

  const selectedContract = useMemo(
    () => contracts.find((contract) => contract.id === selectedId) ?? contracts[0],
    [contracts, selectedId],
  );

  const updateContract = (id: string, patch: Partial<DemoContract>) => {
    setContracts((current) =>
      current.map((contract) =>
        contract.id === id
          ? {
              ...contract,
              ...patch,
              auditLogs:
                patch.status && patch.status !== contract.status
                  ? [
                      {
                        id: `log-${Date.now()}`,
                        action: `Đổi trạng thái sang ${statusLabels[patch.status]}`,
                        actor: contract.owner,
                        createdAt: new Date().toISOString().slice(0, 10),
                      },
                      ...contract.auditLogs,
                    ]
                  : contract.auditLogs,
            }
          : contract,
      ),
    );
  };

  const updateValue = (id: string, key: string, value: string) => {
    setContracts((current) =>
      current.map((contract) =>
        contract.id === id
          ? { ...contract, values: { ...contract.values, [key]: value } }
          : contract,
      ),
    );
  };

  const mutateContract = (id: string, updater: (contract: DemoContract) => DemoContract) => {
    setContracts((current) =>
      current.map((contract) => (contract.id === id ? updater(contract) : contract)),
    );
  };

  const createContract = (template: DemoTemplate) => {
    const contract = createContractFromTemplate(template);
    setContracts((current) => [contract, ...current]);
    setSelectedId(contract.id);
    setView("workspace");
  };

  const resetData = () => {
    setContracts(initialDemoContracts);
    setSelectedId(initialDemoContracts[0]?.id ?? "");
    setView("dashboard");
  };

  const removeContract = (id: string) => {
    setContracts((current) => {
      const next = current.filter((contract) => contract.id !== id);
      if (selectedId === id) setSelectedId(next[0]?.id ?? "");
      return next;
    });
  };

  const openContract = (id: string) => {
    setSelectedId(id);
    setView("workspace");
  };

  return (
    <main className="min-h-[100dvh] bg-white text-zinc-950">
      <div className="grid min-h-[100dvh] grid-cols-1 lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="border-b border-zinc-200 bg-white lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col">
            <div className="flex h-24 items-center border-b border-zinc-200 px-8">
              <Image
                src="/logo/lawzy-logo-black.png"
                alt="Lawzy"
                width={188}
                height={56}
                className="h-14 w-auto object-contain"
                priority
              />
            </div>

            <nav className="space-y-1 px-3 py-4">
              {navItems.map((item) => (
                <NavButton
                  key={item.id}
                  active={view === item.id}
                  icon={item.icon}
                  label={item.label}
                  onClick={() => setView(item.id)}
                />
              ))}
            </nav>

            <div className="mt-auto border-t border-zinc-200 p-3">
              <Button
                type="button"
                variant="outline"
                className="w-full border-zinc-300 bg-white text-zinc-950 hover:bg-zinc-50"
                onClick={resetData}
              >
                <RotateCcw className="size-4" />
                Khôi phục dữ liệu mẫu
              </Button>
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          {view === "dashboard" && (
            <Dashboard contracts={contracts} onCreate={() => setView("new")} onOpen={openContract} />
          )}
          {view === "contracts" && (
            <ContractsView contracts={contracts} onCreate={() => setView("new")} onOpen={openContract} />
          )}
          {view === "repository" && (
            <RepositoryView contracts={contracts} onOpen={openContract} />
          )}
          {view === "calendar" && (
            <CalendarView contracts={contracts} onOpen={openContract} />
          )}
          {view === "search" && (
            <SearchView
              query={query}
              setQuery={setQuery}
              contracts={contracts}
              onOpen={openContract}
            />
          )}
          {(view === "templates" || view === "new") && (
            <TemplatePicker onCreate={createContract} />
          )}
          {view === "knowledge" && <KnowledgeBaseView />}
          {view === "parties" && <PartiesView contracts={contracts} onOpen={openContract} />}
          {view === "advisory" && <AdvisoryView />}
          {view === "workspace" && selectedContract && (
            <ContractWorkspace
              contract={selectedContract}
              template={getTemplate(demoTemplates, selectedContract.templateId)}
              onUpdate={updateContract}
              onUpdateValue={updateValue}
              onMutate={mutateContract}
              onDelete={removeContract}
            />
          )}
        </section>
      </div>
    </main>
  );
}

function NavButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-9 w-full items-center gap-3 rounded-md px-3 text-[15px] font-medium transition",
        active
          ? "bg-zinc-100 text-zinc-950"
          : "text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950",
      )}
    >
      <Icon className="size-4 text-current" />
      <span>{label}</span>
    </button>
  );
}

function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-sm font-medium text-zinc-500">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-zinc-950">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
          {description}
        </p>
      </div>
      {action}
    </header>
  );
}

function Dashboard({
  contracts,
  onCreate,
  onOpen,
}: {
  contracts: DemoContract[];
  onCreate: () => void;
  onOpen: (id: string) => void;
}) {
  const activeCount = contracts.filter((contract) => contract.status === "active").length;
  const draftCount = contracts.filter((contract) => contract.status === "draft").length;
  const dueCount = contracts
    .flatMap((contract) => contract.obligations)
    .filter((item) => !item.done).length;
  const recent = sortContracts(contracts).slice(0, 5);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-6 lg:px-8">
      <PageHeader
        eyebrow="LAWZY"
        title="Quản lý hợp đồng đơn giản cho đội vận hành"
        description="Tạo bản thảo từ mẫu, điền thông tin cần thiết, xem bản hợp đồng và theo dõi việc cần làm sau khi ký."
        action={
          <Button
            type="button"
            onClick={onCreate}
            className="bg-zinc-950 text-white hover:bg-zinc-800"
          >
            <Plus className="size-4" />
            Tạo hợp đồng
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Đang hiệu lực" value={activeCount} />
        <Metric label="Bản thảo" value={draftCount} />
        <Metric label="Việc đang mở" value={dueCount} />
      </div>

      <section className="rounded-md border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-semibold">Luồng hợp đồng</h2>
          <span className="text-xs text-zinc-500">{contracts.length} hồ sơ</span>
        </div>
        <div className="grid gap-0 divide-y divide-zinc-200 md:grid-cols-4 md:divide-x md:divide-y-0">
          {statusOrder.map((status) => (
            <PipelineColumn
              key={status}
              status={status}
              contracts={contracts.filter((contract) => contract.status === status)}
              onOpen={onOpen}
            />
          ))}
        </div>
      </section>

      <RecentContracts contracts={recent} onOpen={onOpen} />
    </div>
  );
}

function ContractsView({
  contracts,
  onCreate,
  onOpen,
}: {
  contracts: DemoContract[];
  onCreate: () => void;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-6 lg:px-8">
      <PageHeader
        eyebrow="Hợp đồng"
        title="Tất cả hồ sơ đang xử lý"
        description="Theo dõi nhanh trạng thái trước khi hợp đồng được ký và chuyển sang kho lưu trữ."
        action={
          <Button
            type="button"
            onClick={onCreate}
            className="bg-zinc-950 text-white hover:bg-zinc-800"
          >
            <Plus className="size-4" />
            Tạo hợp đồng
          </Button>
        }
      />
      <section className="rounded-md border border-zinc-200 bg-white">
        <ContractRows contracts={contracts} onOpen={onOpen} />
      </section>
    </div>
  );
}

function RepositoryView({
  contracts,
  onOpen,
}: {
  contracts: DemoContract[];
  onOpen: (id: string) => void;
}) {
  const [status, setStatus] = useState<"all" | "active" | "expiring_soon">("all");
  const [party, setParty] = useState("all");
  const repositoryContracts = contracts
    .filter((contract) => ["active", "expiring_soon"].includes(contract.status))
    .filter((contract) => status === "all" || contract.status === status)
    .filter((contract) => party === "all" || contract.counterparty === party);
  const parties = Array.from(
    new Set(
      contracts
        .map((contract) => contract.counterparty)
        .filter((item): item is string => Boolean(item)),
    ),
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-6 lg:px-8">
      <PageHeader
        eyebrow="Kho lưu trữ"
        title="Hợp đồng đã ký hoặc cần theo dõi"
        description="Nơi lưu các hợp đồng đang hiệu lực, sắp hết hạn và các việc cần nhớ sau khi ký."
      />
      <div className="grid gap-3 rounded-md border border-zinc-200 bg-white p-3 md:grid-cols-3">
        <FilterSelect label="Trạng thái" value={status} onChange={(value) => setStatus(value as "all" | "active" | "expiring_soon")}>
          <option value="all">Đang hiệu lực và sắp hết hạn</option>
          <option value="active">Đang hiệu lực</option>
          <option value="expiring_soon">Sắp hết hạn</option>
        </FilterSelect>
        <FilterSelect label="Đối tác" value={party} onChange={setParty}>
          <option value="all">Tất cả đối tác</option>
          {parties.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </FilterSelect>
        <div className="rounded-md border border-zinc-200 px-3 py-2">
          <p className="text-xs font-medium text-zinc-500">Việc chưa xong</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {repositoryContracts.flatMap((contract) => contract.obligations).filter((item) => !item.done).length}
          </p>
        </div>
      </div>
      <section className="rounded-md border border-zinc-200 bg-white">
        <RepositoryRows contracts={repositoryContracts} onOpen={onOpen} />
      </section>
    </div>
  );
}

function RepositoryRows({
  contracts,
  onOpen,
}: {
  contracts: DemoContract[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="divide-y divide-zinc-200">
      <div className="grid grid-cols-[minmax(0,1fr)_150px_150px_180px] gap-3 px-4 py-3 text-xs font-medium uppercase text-zinc-500">
        <span>Hợp đồng</span>
        <span>Đối tác</span>
        <span>Trạng thái</span>
        <span>Việc tiếp theo</span>
      </div>
      {contracts.map((contract) => {
        const next = contract.obligations
          .filter((item) => !item.done)
          .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
        return (
          <button
            key={contract.id}
            type="button"
            onClick={() => onOpen(contract.id)}
            className="grid w-full grid-cols-[minmax(0,1fr)_150px_150px_180px] items-center gap-3 px-4 py-3 text-left transition hover:bg-zinc-50"
          >
            <span className="truncate text-sm font-medium">{contract.title}</span>
            <span className="truncate text-sm text-zinc-600">{contract.counterparty}</span>
            <Badge className={cn("rounded-md", statusClassName[contract.status])}>
              {statusLabels[contract.status]}
            </Badge>
            <span className="text-sm text-zinc-600">
              {next ? `${next.title} · ${formatDate(next.dueDate)}` : "Không có việc mở"}
            </span>
          </button>
        );
      })}
      {contracts.length === 0 && (
        <div className="px-4 py-10 text-center text-sm text-zinc-500">
          Chưa có hợp đồng nào trong kho lưu trữ.
        </div>
      )}
    </div>
  );
}

function CalendarView({
  contracts,
  onOpen,
}: {
  contracts: DemoContract[];
  onOpen: (id: string) => void;
}) {
  const obligations = contracts
    .flatMap((contract) =>
      contract.obligations.map((obligation) => ({
        ...obligation,
        contractId: contract.id,
        contractTitle: contract.title,
      })),
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-6 lg:px-8">
      <PageHeader
        eyebrow="Lịch"
        title="Mốc việc cần theo dõi"
        description="Lịch rút gọn, tập trung vào hạn nghiệm thu, thanh toán và gia hạn."
      />
      <section className="rounded-md border border-zinc-200 bg-white">
        <ObligationRows items={obligations} onOpen={onOpen} />
      </section>
    </div>
  );
}

function SearchView({
  query,
  setQuery,
  contracts,
  onOpen,
}: {
  query: string;
  setQuery: (query: string) => void;
  contracts: DemoContract[];
  onOpen: (id: string) => void;
}) {
  const [status, setStatus] = useState<"all" | DemoStatus>("all");
  const [category, setCategory] = useState("all");
  const [scope, setScope] = useState<"all" | "metadata" | "content">("all");

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return sortContracts(contracts).filter((contract) => {
      const template = getTemplate(demoTemplates, contract.templateId);
      if (status !== "all" && contract.status !== status) return false;
      if (category !== "all" && template.category !== category) return false;
      if (!normalized) return true;

      const metadataText = [
        contract.title,
        contract.counterparty,
        contract.owner,
        statusLabels[contract.status],
        template.name,
        template.category,
      ]
        .join(" ")
        .toLowerCase();
      const contentText = template.sections
        .map((section) => renderText(section, contract.values))
        .join(" ")
        .toLowerCase();

      if (scope === "metadata") return metadataText.includes(normalized);
      if (scope === "content") return contentText.includes(normalized);
      return metadataText.includes(normalized) || contentText.includes(normalized);
    });
  }, [category, contracts, query, scope, status]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-6 lg:px-8">
      <PageHeader
        eyebrow="Tìm kiếm"
        title="Tìm kiếm nâng cao"
        description="Tìm theo tên hồ sơ, đối tác, trạng thái hoặc toàn bộ nội dung hợp đồng đã điền."
      />
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nhập từ khóa tìm kiếm"
          className="h-11 w-full rounded-md border border-zinc-300 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-zinc-950"
        />
      </label>
      <div className="grid gap-3 rounded-md border border-zinc-200 bg-white p-3 md:grid-cols-3">
        <FilterSelect label="Trạng thái" value={status} onChange={(value) => setStatus(value as "all" | DemoStatus)}>
          <option value="all">Tất cả trạng thái</option>
          {statusOrder.map((item) => (
            <option key={item} value={item}>
              {statusLabels[item]}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="Loại mẫu" value={category} onChange={setCategory}>
          <option value="all">Tất cả loại mẫu</option>
          {demoTemplates.map((template) => (
            <option key={template.id} value={template.category}>
              {template.category}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="Phạm vi tìm" value={scope} onChange={(value) => setScope(value as "all" | "metadata" | "content")}>
          <option value="all">Tất cả</option>
          <option value="metadata">Thông tin hồ sơ</option>
          <option value="content">Nội dung hợp đồng</option>
        </FilterSelect>
      </div>
      <section className="rounded-md border border-zinc-200 bg-white">
        <SearchResults contracts={results} query={query} onOpen={onOpen} />
      </section>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-950"
      >
        {children}
      </select>
    </label>
  );
}

function SearchResults({
  contracts,
  query,
  onOpen,
}: {
  contracts: DemoContract[];
  query: string;
  onOpen: (id: string) => void;
}) {
  const normalized = query.trim().toLowerCase();
  return (
    <div className="divide-y divide-zinc-200">
      {contracts.map((contract) => {
        const template = getTemplate(demoTemplates, contract.templateId);
        const rendered = template.sections
          .map((section) => renderText(section, contract.values))
          .join(" ");
        const index = normalized ? rendered.toLowerCase().indexOf(normalized) : -1;
        const snippet =
          index >= 0
            ? rendered.slice(Math.max(0, index - 72), Math.min(rendered.length, index + 160))
            : rendered.slice(0, 220);
        return (
          <button
            key={contract.id}
            type="button"
            onClick={() => onOpen(contract.id)}
            className="block w-full px-4 py-4 text-left transition hover:bg-zinc-50"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold">{contract.title}</h2>
              <Badge className={cn("rounded-md", statusClassName[contract.status])}>
                {statusLabels[contract.status]}
              </Badge>
              <span className="text-xs text-zinc-500">{template.category}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{snippet}</p>
          </button>
        );
      })}
      {contracts.length === 0 && (
        <div className="px-4 py-10 text-center text-sm text-zinc-500">
          Không tìm thấy kết quả phù hợp.
        </div>
      )}
    </div>
  );
}

function TemplatePicker({ onCreate }: { onCreate: (template: DemoTemplate) => void }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-6 lg:px-8">
      <PageHeader
        eyebrow="Mẫu hợp đồng"
        title="Chọn mẫu để tạo bản thảo"
        description="Các mẫu giữ lại những việc đội kinh doanh, vận hành và nhân sự hay dùng nhất."
      />

      <div className="grid gap-3 md:grid-cols-3">
        {demoTemplates.map((template) => (
          <article key={template.id} className="rounded-md border border-zinc-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase text-zinc-500">
                  {template.category}
                </p>
                <h2 className="mt-2 text-base font-semibold">{template.name}</h2>
              </div>
              <FileText className="size-5 text-zinc-500" />
            </div>
            <p className="mt-3 min-h-20 text-sm leading-6 text-zinc-600">
              {template.description}
            </p>
            <div className="mt-4 flex items-center justify-between border-t border-zinc-200 pt-4">
              <span className="text-xs text-zinc-500">
                {template.fields.length} trường cần điền
              </span>
              <Button
                type="button"
                onClick={() => onCreate(template)}
                className="bg-zinc-950 text-white hover:bg-zinc-800"
              >
                <Plus className="size-4" />
                Dùng mẫu
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function KnowledgeBaseView() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-6 lg:px-8">
      <PageHeader
        eyebrow="Kho tri thức"
        title="Ghi chú hướng dẫn nội bộ"
        description="Các ghi chú ngắn giúp đội không có pháp chế biết khi nào có thể tự xử lý và khi nào nên hỏi chuyên gia."
      />
      <section className="rounded-md border border-zinc-200 bg-white">
        <div className="divide-y divide-zinc-200">
          {demoKnowledgeBase.map((item) => (
            <article key={item.id} className="px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-md border-zinc-300">
                  {item.category}
                </Badge>
                <h2 className="text-sm font-semibold">{item.title}</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{item.summary}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function PartiesView({
  contracts,
  onOpen,
}: {
  contracts: DemoContract[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-6 lg:px-8">
      <PageHeader
        eyebrow="Đối tác"
        title="Danh bạ thường dùng"
        description="Danh sách đối tác, nhà cung cấp và nhân sự mẫu được dùng trong các hồ sơ hiện có."
      />
      <div className="grid gap-3 md:grid-cols-3">
        {demoParties.map((party) => {
          const related = contracts.filter((contract) => contract.counterparty === party.name);
          return (
            <article key={party.id} className="rounded-md border border-zinc-200 bg-white p-4">
              <p className="text-xs font-medium uppercase text-zinc-500">{party.type}</p>
              <h2 className="mt-2 text-base font-semibold">{party.name}</h2>
              <p className="mt-1 text-sm text-zinc-600">{party.contact}</p>
              <p className="mt-3 min-h-12 text-sm leading-6 text-zinc-600">{party.note}</p>
              <div className="mt-4 border-t border-zinc-200 pt-3">
                <p className="text-xs text-zinc-500">{related.length} hợp đồng liên quan</p>
                {related[0] && (
                  <button
                    type="button"
                    onClick={() => onOpen(related[0].id)}
                    className="mt-2 text-sm font-medium text-zinc-950 underline underline-offset-4"
                  >
                    Mở hồ sơ gần nhất
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

type AdvisoryRequest = {
  id: string;
  text: string;
  urgency: "normal" | "urgent";
  hours: number;
  status: "processing" | "answered";
  date: string;
  reply?: string;
};

const initialAdvisoryRequests: AdvisoryRequest[] = [
  {
    id: "adv-1",
    text: "Đối tác muốn đơn phương chấm dứt hợp đồng trước hạn, cần kiểm tra điều khoản phạt.",
    urgency: "urgent",
    hours: 1.5,
    status: "answered",
    date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    reply:
      "Nên bổ sung thời hạn báo trước tối thiểu 30 ngày và cách tính khoản phạt để tránh tranh chấp.",
  },
  {
    id: "adv-2",
    text: "Nhân sự xin nghỉ trước khi hết hạn hợp đồng lao động, cần hướng dẫn quy trình.",
    urgency: "normal",
    hours: 1,
    status: "answered",
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    reply:
      "Có thể xử lý theo quy trình thông báo nghỉ việc, bàn giao tài sản và chốt các khoản thanh toán còn lại.",
  },
  {
    id: "adv-3",
    text: "Khách hàng yêu cầu thêm điều khoản độc quyền thương hiệu trong hợp đồng dịch vụ.",
    urgency: "normal",
    hours: 1,
    status: "processing",
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  },
];

function AdvisoryView() {
  const [planId, setPlanId] = useState("standard");
  const [hoursUsed, setHoursUsed] = useState(4.5);
  const [urgency, setUrgency] = useState<"normal" | "urgent">("normal");
  const [text, setText] = useState("");
  const [requests, setRequests] = useState<AdvisoryRequest[]>(initialAdvisoryRequests);
  const plan = retainerPlans.find((item) => item.id === planId) ?? retainerPlans[1];
  const estimatedHours = urgency === "urgent" ? 1.5 : 1;
  const remainingHours = Math.max(0, plan.hours - hoursUsed);
  const usagePercent = Math.min(100, Math.round((hoursUsed / plan.hours) * 100));

  const submitRequest = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const next: AdvisoryRequest = {
      id: `adv-${Date.now()}`,
      text: trimmed,
      urgency,
      hours: estimatedHours,
      status: "processing",
      date: new Date().toISOString().slice(0, 10),
    };
    setRequests((current) => [next, ...current]);
    setHoursUsed((current) => Number((current + estimatedHours).toFixed(1)));
    setText("");
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-6 lg:px-8">
      <PageHeader
        eyebrow="Tư vấn luật sư"
        title="Kết nối luật sư theo gói retainer"
        description="Doanh nghiệp không có pháp chế có thể gửi câu hỏi, theo dõi giờ tư vấn đã dùng và biết luật sư nào đang phụ trách."
      />

      <section className="rounded-md border border-zinc-200 bg-white">
        <div className="grid gap-0 divide-y divide-zinc-200 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:divide-x lg:divide-y-0">
          <div className="p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-medium uppercase text-zinc-500">
                  Gói retainer hiện tại
                </p>
                <h2 className="mt-2 text-2xl font-semibold">{plan.name}</h2>
                <p className="mt-2 text-sm text-zinc-600">{plan.priceLabel}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="border-zinc-300 bg-white text-zinc-950 hover:bg-zinc-50"
                onClick={() => {
                  const field = document.getElementById("advisory-request");
                  field?.focus();
                }}
              >
                <MessageCircle className="size-4" />
                Gửi yêu cầu mới
              </Button>
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-zinc-600">Giờ tư vấn đã dùng tháng này</span>
                <span className="font-medium tabular-nums">
                  {hoursUsed}/{plan.hours} giờ
                </span>
              </div>
              <div className="h-2 rounded-full bg-zinc-100">
                <div
                  className="h-2 rounded-full bg-zinc-950"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <RetainerMeta label="Cam kết phản hồi" value={plan.sla} />
              <RetainerMeta label="Chu kỳ mới bắt đầu" value={formatDate(advisoryRenewDate)} />
              <RetainerMeta label="Yêu cầu kỳ này" value={`${requests.length} yêu cầu`} />
            </div>
          </div>

          <div className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-full border border-zinc-300 bg-zinc-50 text-sm font-semibold">
                {lawyer.initials}
              </div>
              <div>
                <p className="text-sm font-semibold">{lawyer.name}</p>
                <p className="mt-1 text-xs text-zinc-500">{lawyer.title}</p>
              </div>
            </div>
            <div className="mt-5 rounded-md border border-zinc-200 p-3 text-sm leading-6 text-zinc-600">
              Luật sư phụ trách sẽ xem lịch sử hợp đồng, câu hỏi và mức độ khẩn cấp để phản hồi theo SLA của gói.
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-md border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-4 py-3">
            <h2 className="text-sm font-semibold">Gửi yêu cầu tư vấn</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Mỗi yêu cầu sẽ trừ giờ tư vấn dự kiến trong gói hiện tại.
            </p>
          </div>
          <div className="p-4">
            <textarea
              id="advisory-request"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Ví dụ: Đối tác muốn thêm điều khoản độc quyền, rủi ro là gì?"
              className="min-h-32 w-full rounded-md border border-zinc-300 bg-white p-3 text-sm outline-none focus:border-zinc-950"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {advisoryChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setText(chip)}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
                >
                  {chip}
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setUrgency("normal")}
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm font-medium",
                    urgency === "normal"
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : "border-zinc-300 bg-white text-zinc-700",
                  )}
                >
                  Thường
                </button>
                <button
                  type="button"
                  onClick={() => setUrgency("urgent")}
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm font-medium",
                    urgency === "urgent"
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : "border-zinc-300 bg-white text-zinc-700",
                  )}
                >
                  Khẩn cấp
                </button>
              </div>
              <p className="text-sm text-zinc-600">
                Ước tính {estimatedHours} giờ. Còn {remainingHours.toFixed(1)} giờ trong gói.
              </p>
            </div>
            <Button
              type="button"
              onClick={submitRequest}
              className="mt-4 bg-zinc-950 text-white hover:bg-zinc-800"
            >
              Gửi luật sư
            </Button>
          </div>
        </div>

        <div className="rounded-md border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-4 py-3">
            <h2 className="text-sm font-semibold">Lịch sử tư vấn</h2>
          </div>
          <div className="divide-y divide-zinc-200">
            {requests.map((request) => (
              <article key={request.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="outline" className="rounded-md border-zinc-300">
                    {request.status === "answered" ? "Đã phản hồi" : "Đang xử lý"}
                  </Badge>
                  <span className="text-xs text-zinc-500">{formatDate(request.date)}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-700">{request.text}</p>
                <p className="mt-2 text-xs text-zinc-500">
                  {request.urgency === "urgent" ? "Khẩn cấp" : "Thường"} - {request.hours} giờ
                </p>
                {request.reply && (
                  <p className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm leading-6 text-zinc-600">
                    <span className="font-medium text-zinc-950">{lawyer.name}: </span>
                    {request.reply}
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-md border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-semibold">So sánh gói retainer</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Phần này đặt cuối trang để người dùng xem sau khi đã hiểu trạng thái gói hiện tại.
          </p>
        </div>
        <div className="grid gap-0 divide-y divide-zinc-200 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {retainerPlans.map((item) => (
            <article key={item.id} className="flex flex-col p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold">{item.name}</h3>
                  <p className="mt-1 text-sm text-zinc-600">{item.priceLabel}</p>
                </div>
                {item.recommended && (
                  <Badge className="rounded-md border-zinc-950 bg-zinc-950 text-white">
                    Phù hợp
                  </Badge>
                )}
              </div>
              <p className="mt-3 min-h-16 text-sm leading-6 text-zinc-600">
                {item.description}
              </p>
              <ul className="mt-4 flex flex-1 flex-col gap-2 text-sm text-zinc-700">
                {item.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="mt-1 size-1.5 rounded-full bg-zinc-950" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                variant={planId === item.id ? "outline" : "default"}
                className={cn(
                  "mt-5",
                  planId === item.id
                    ? "border-zinc-300 bg-white text-zinc-950"
                    : "bg-zinc-950 text-white hover:bg-zinc-800",
                )}
                onClick={() => setPlanId(item.id)}
                disabled={planId === item.id}
              >
                {planId === item.id ? "Đang dùng" : "Chọn gói này"}
              </Button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function RetainerMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-200 px-3 py-2">
      <p className="text-xs font-medium uppercase text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-zinc-950">{value}</p>
    </div>
  );
}

function ContractWorkspace({
  contract,
  template,
  onUpdate,
  onUpdateValue,
  onMutate,
  onDelete,
}: {
  contract: DemoContract;
  template: DemoTemplate;
  onUpdate: (id: string, patch: Partial<DemoContract>) => void;
  onUpdateValue: (id: string, key: string, value: string) => void;
  onMutate: (id: string, updater: (contract: DemoContract) => DemoContract) => void;
  onDelete: (id: string) => void;
}) {
  const completion = completionPercent(contract, template);
  const [tab, setTab] = useState<ContractTab>("fill");

  return (
    <div className="grid min-h-[100dvh] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 px-5 py-6 lg:px-8">
        <header className="mb-5 flex flex-col gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge className={cn("rounded-md", statusClassName[contract.status])}>
                {statusLabels[contract.status]}
              </Badge>
              <span className="text-xs text-zinc-500">{template.name}</span>
            </div>
            <input
              value={contract.title}
              onChange={(event) => onUpdate(contract.id, { title: event.target.value })}
              className="w-full border-none bg-transparent p-0 text-2xl font-semibold outline-none"
            />
            <p className="mt-2 text-sm text-zinc-500">
              Tạo ngày {formatDate(contract.createdAt)} bởi {contract.owner}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-zinc-300 bg-white text-zinc-950 hover:bg-zinc-50"
              onClick={() => onDelete(contract.id)}
            >
              <Trash2 className="size-4" />
              Xóa
            </Button>
            <Button
              type="button"
              className="bg-zinc-950 text-white hover:bg-zinc-800"
              onClick={() => onUpdate(contract.id, { status: "ready_to_sign" })}
            >
              <Signature className="size-4" />
              Sẵn sàng ký
            </Button>
          </div>
        </header>

        <div className="mb-5 overflow-x-auto border-b border-zinc-200">
          <div className="flex min-w-max gap-1">
            {contractTabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition",
                  tab === item.id
                    ? "border-zinc-950 text-zinc-950"
                    : "border-transparent text-zinc-500 hover:text-zinc-950",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <ContractTabPanel
          tab={tab}
          contract={contract}
          template={template}
          completion={completion}
          onMutate={onMutate}
        />
      </div>

      <aside className="border-t border-zinc-200 bg-white lg:border-l lg:border-t-0">
        <div className="sticky top-0 flex max-h-[100dvh] flex-col">
          <div className="border-b border-zinc-200 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Điền thông tin</h2>
              <span className="text-sm tabular-nums text-zinc-500">{completion}%</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-zinc-100">
              <div
                className="h-2 rounded-full bg-zinc-950 transition-all"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              <FieldInput
                label="Đối tác"
                value={contract.counterparty}
                onChange={(value) => onUpdate(contract.id, { counterparty: value })}
              />
              <FieldInput
                label="Người phụ trách"
                value={contract.owner}
                onChange={(value) => onUpdate(contract.id, { owner: value })}
              />

              <div className="border-t border-zinc-200 pt-4">
                <p className="mb-3 text-xs font-medium uppercase text-zinc-500">
                  Trường trong mẫu
                </p>
                <div className="space-y-3">
                  {template.fields.map((field) => (
                    <FieldInput
                      key={field.key}
                      label={field.label}
                      value={contract.values[field.key] ?? ""}
                      type={field.type}
                      options={field.options}
                      required={field.required}
                      onChange={(value) => onUpdateValue(contract.id, field.key, value)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-200 p-4">
            <div className="mb-3 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-zinc-300 bg-white text-zinc-950 hover:bg-zinc-50"
                onClick={() => window.print()}
              >
                In / PDF
              </Button>
              <Button
                type="button"
                className="bg-zinc-950 text-white hover:bg-zinc-800"
                onClick={() =>
                  onUpdate(contract.id, {
                    status: contract.status === "active" ? "expiring_soon" : "active",
                  })
                }
              >
                {contract.status === "active" ? "Sắp hết hạn" : "Đã ký"}
              </Button>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-500">
                Trạng thái
              </span>
              <select
                value={contract.status}
                onChange={(event) =>
                  onUpdate(contract.id, { status: event.target.value as DemoStatus })
                }
                className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-950"
              >
                {statusOrder.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </aside>
    </div>
  );
}

function ContractTabPanel({
  tab,
  contract,
  template,
  completion,
  onMutate,
}: {
  tab: ContractTab;
  contract: DemoContract;
  template: DemoTemplate;
  completion: number;
  onMutate: (id: string, updater: (contract: DemoContract) => DemoContract) => void;
}) {
  if (tab === "fill" || tab === "content") {
    return <DocumentPreview contract={contract} template={template} editable={tab === "content"} />;
  }

  if (tab === "versions") {
    return (
      <VersionsPanel contract={contract} template={template} onMutate={onMutate} />
    );
  }

  if (tab === "comments") {
    return <CommentsPanel contract={contract} onMutate={onMutate} />;
  }

  if (tab === "approval") {
    return (
      <InfoPanel
        title="Ký duyệt nội bộ"
        description="Thay cho workflow phức tạp, người dùng chỉ cần tự kiểm tra đủ thông tin rồi chuyển sang trạng thái sẵn sàng ký."
        rows={[
          ["Thông tin bắt buộc", `${completion}% hoàn tất`, completion === 100 ? "Đạt" : "Cần bổ sung"],
          ["Đối tác", contract.counterparty || "Chưa có", contract.counterparty ? "Đạt" : "Cần bổ sung"],
          ["Trạng thái", statusLabels[contract.status], "Có thể cập nhật ở panel bên phải"],
        ]}
      />
    );
  }

  if (tab === "obligations") {
    return <ContractObligationsPanel contract={contract} onMutate={onMutate} />;
  }

  if (tab === "attachments") {
    return <AttachmentsPanel contract={contract} onMutate={onMutate} />;
  }

  if (tab === "related") {
    return (
      <InfoPanel
        title="Hồ sơ liên quan"
        rows={[
          ["Mẫu nguồn", template.name, template.category],
          ["Đối tác", contract.counterparty || "Chưa có", "Danh bạ đối tác"],
          ["Việc liên quan", `${contract.obligations.length} mục`, "Theo dõi sau ký"],
        ]}
      />
    );
  }

  return (
    <InfoPanel
      title="Nhật ký hoạt động"
      rows={(contract.auditLogs.length
        ? contract.auditLogs
        : [
            {
              id: "fallback-log",
              action: "Tạo hồ sơ",
              actor: contract.owner,
              createdAt: contract.createdAt,
            },
          ]
      ).map((log) => [log.action, log.actor, formatDate(log.createdAt)])}
    />
  );
}

function VersionsPanel({
  contract,
  template,
  onMutate,
}: {
  contract: DemoContract;
  template: DemoTemplate;
  onMutate: (id: string, updater: (contract: DemoContract) => DemoContract) => void;
}) {
  const saveVersion = () => {
    onMutate(contract.id, (current) => ({
      ...current,
      versions: [
        {
          id: `ver-${Date.now()}`,
          label: `Bản ${current.versions.length + 1}`,
          createdAt: new Date().toISOString().slice(0, 10),
          summary: `Lưu snapshot từ ${template.name}`,
          values: current.values,
        },
        ...current.versions,
      ],
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          action: "Lưu phiên bản hợp đồng",
          actor: current.owner,
          createdAt: new Date().toISOString().slice(0, 10),
        },
        ...current.auditLogs,
      ],
    }));
  };

  return (
    <section className="rounded-md border border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Phiên bản</h2>
          <p className="mt-1 text-sm text-zinc-600">Lưu lại mốc nội dung quan trọng trước khi gửi hoặc ký.</p>
        </div>
        <Button type="button" onClick={saveVersion} className="bg-zinc-950 text-white hover:bg-zinc-800">
          Lưu phiên bản
        </Button>
      </div>
      <div className="divide-y divide-zinc-200">
        {contract.versions.map((version) => (
          <div key={version.id} className="grid grid-cols-[120px_minmax(0,1fr)_140px] gap-3 px-4 py-3 text-sm">
            <span className="font-medium">{version.label}</span>
            <span className="text-zinc-600">{version.summary}</span>
            <span className="text-zinc-500">{formatDate(version.createdAt)}</span>
          </div>
        ))}
        {contract.versions.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-zinc-500">Chưa có phiên bản đã lưu.</div>
        )}
      </div>
    </section>
  );
}

function CommentsPanel({
  contract,
  onMutate,
}: {
  contract: DemoContract;
  onMutate: (id: string, updater: (contract: DemoContract) => DemoContract) => void;
}) {
  const [body, setBody] = useState("");
  const addComment = () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    onMutate(contract.id, (current) => ({
      ...current,
      comments: [
        {
          id: `cmt-${Date.now()}`,
          author: current.owner,
          body: trimmed,
          createdAt: new Date().toISOString().slice(0, 10),
          status: "open",
        },
        ...current.comments,
      ],
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          action: "Thêm góp ý vào hợp đồng",
          actor: current.owner,
          createdAt: new Date().toISOString().slice(0, 10),
        },
        ...current.auditLogs,
      ],
    }));
    setBody("");
  };

  return (
    <section className="rounded-md border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold">Góp ý và đề xuất chỉnh sửa</h2>
        <p className="mt-1 text-sm text-zinc-600">Ghi chú nội bộ đơn giản trước khi gửi ký.</p>
      </div>
      <div className="border-b border-zinc-200 p-4">
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Nhập góp ý hoặc việc cần kiểm tra"
          className="min-h-24 w-full rounded-md border border-zinc-300 bg-white p-3 text-sm outline-none focus:border-zinc-950"
        />
        <Button type="button" onClick={addComment} className="mt-3 bg-zinc-950 text-white hover:bg-zinc-800">
          Thêm góp ý
        </Button>
      </div>
      <div className="divide-y divide-zinc-200">
        {contract.comments.map((comment) => (
          <article key={comment.id} className="px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">{comment.author}</p>
              <Badge variant="outline" className="rounded-md border-zinc-300">
                {comment.status === "open" ? "Đang mở" : "Đã xử lý"}
              </Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{comment.body}</p>
            <p className="mt-2 text-xs text-zinc-500">{formatDate(comment.createdAt)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ContractObligationsPanel({
  contract,
  onMutate,
}: {
  contract: DemoContract;
  onMutate: (id: string, updater: (contract: DemoContract) => DemoContract) => void;
}) {
  const toggle = (id: string) => {
    onMutate(contract.id, (current) => ({
      ...current,
      obligations: current.obligations.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item,
      ),
    }));
  };

  return (
    <section className="rounded-md border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold">Nghĩa vụ và mốc theo dõi</h2>
      </div>
      <div className="divide-y divide-zinc-200">
        {contract.obligations.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <button type="button" onClick={() => toggle(item.id)} className="flex min-w-0 items-center gap-3 text-left">
              <span className={cn("flex size-5 items-center justify-center rounded border", item.done ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-300 text-transparent")}>✓</span>
              <span className="min-w-0">
                <span className={cn("block truncate text-sm font-medium", item.done && "line-through text-zinc-400")}>{item.title}</span>
                <span className="mt-1 block text-xs text-zinc-500">Hạn {formatDate(item.dueDate)}</span>
              </span>
            </button>
            <span className="text-sm text-zinc-600">{item.owner}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function AttachmentsPanel({
  contract,
  onMutate,
}: {
  contract: DemoContract;
  onMutate: (id: string, updater: (contract: DemoContract) => DemoContract) => void;
}) {
  const [name, setName] = useState("");
  const addAttachment = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onMutate(contract.id, (current) => ({
      ...current,
      attachments: [
        {
          id: `att-${Date.now()}`,
          name: trimmed,
          kind: trimmed.toLowerCase().includes("ký") ? "Bản đã ký" : "Tài liệu",
          addedAt: new Date().toISOString().slice(0, 10),
        },
        ...current.attachments,
      ],
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          action: `Thêm tệp ${trimmed}`,
          actor: current.owner,
          createdAt: new Date().toISOString().slice(0, 10),
        },
        ...current.auditLogs,
      ],
    }));
    setName("");
  };

  return (
    <section className="rounded-md border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold">Tệp đính kèm</h2>
        <p className="mt-1 text-sm text-zinc-600">Nhập tên tệp để mô phỏng báo giá, bản scan đã ký hoặc biên bản nghiệm thu.</p>
      </div>
      <div className="flex gap-2 border-b border-zinc-200 p-4">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ví dụ: Hợp đồng đã ký.pdf"
          className="h-9 min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-950"
        />
        <Button type="button" onClick={addAttachment} className="bg-zinc-950 text-white hover:bg-zinc-800">
          Thêm tệp
        </Button>
      </div>
      <div className="divide-y divide-zinc-200">
        {contract.attachments.map((file) => (
          <div key={file.id} className="grid grid-cols-[minmax(0,1fr)_140px_120px] gap-3 px-4 py-3 text-sm">
            <span className="truncate font-medium">{file.name}</span>
            <span className="text-zinc-600">{file.kind}</span>
            <span className="text-zinc-500">{formatDate(file.addedAt)}</span>
          </div>
        ))}
        {contract.attachments.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-zinc-500">Chưa có tệp đính kèm.</div>
        )}
      </div>
    </section>
  );
}

function DocumentPreview({
  contract,
  template,
  editable,
}: {
  contract: DemoContract;
  template: DemoTemplate;
  editable: boolean;
}) {
  return (
    <section className="mx-auto max-w-3xl rounded-md border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-8 py-6">
        <p className="text-center text-xs uppercase text-zinc-500">
          Cộng hòa Xã hội Chủ nghĩa Việt Nam
        </p>
        <h2 className="mt-6 text-center text-xl font-semibold uppercase tracking-normal">
          {template.name}
        </h2>
      </div>
      <div className="space-y-5 px-8 py-7 text-[15px] leading-7 text-zinc-800">
        {template.sections.map((section, index) => (
          <div key={`${template.id}-${index}`} className={editable ? "rounded-md border border-zinc-200 p-3" : ""}>
            <p>
              <span className="font-semibold">Điều {index + 1}. </span>
              {renderText(section, contract.values)}
            </p>
            {editable && (
              <p className="mt-2 text-xs text-zinc-500">
                Nội dung mẫu được hiển thị để người dùng kiểm tra. Bản này chưa mở trình soạn thảo điều khoản nâng cao.
              </p>
            )}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 border-t border-zinc-200 px-8 py-8 text-center text-sm">
        <div>
          <p className="font-semibold">Đại diện Bên A</p>
          <div className="mx-auto mt-16 h-px w-32 bg-zinc-300" />
        </div>
        <div>
          <p className="font-semibold">Đại diện Bên B</p>
          <div className="mx-auto mt-16 h-px w-32 bg-zinc-300" />
        </div>
      </div>
    </section>
  );
}

function InfoPanel({
  title,
  description,
  rows,
}: {
  title: string;
  description?: string;
  rows: string[][];
}) {
  return (
    <section className="rounded-md border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-zinc-600">{description}</p>}
      </div>
      <div className="divide-y divide-zinc-200">
        {rows.map((row) => (
          <div
            key={row.join("-")}
            className="grid grid-cols-[160px_minmax(0,1fr)_160px] gap-3 px-4 py-3 text-sm"
          >
            <span className="font-medium text-zinc-950">{row[0]}</span>
            <span className="text-zinc-600">{row[1]}</span>
            <span className="text-zinc-500">{row[2]}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  type = "text",
  options,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date" | "number" | "money" | "select";
  options?: string[];
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 text-xs font-medium text-zinc-600">
        {label}
        {required && <span className="text-zinc-950">*</span>}
      </span>
      {type === "select" ? (
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-zinc-950"
        >
          <option value="">Chọn</option>
          {(options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          value={value}
          type={type === "date" ? "date" : type === "number" || type === "money" ? "number" : "text"}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-zinc-950"
        />
      )}
    </label>
  );
}

function PipelineColumn({
  status,
  contracts,
  onOpen,
}: {
  status: DemoStatus;
  contracts: DemoContract[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="min-h-64 p-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium uppercase text-zinc-500">
          {statusLabels[status]}
        </p>
        <span className="text-xs tabular-nums text-zinc-500">{contracts.length}</span>
      </div>
      <div className="space-y-2">
        {contracts.map((contract) => (
          <button
            key={contract.id}
            type="button"
            onClick={() => onOpen(contract.id)}
            className="w-full rounded-md border border-zinc-200 bg-white p-3 text-left transition hover:border-zinc-950"
          >
            <p className="line-clamp-2 text-sm font-medium">{contract.title}</p>
            <p className="mt-1 truncate text-xs text-zinc-500">
              {contract.counterparty || "Chưa có đối tác"}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function ContractRows({
  contracts,
  onOpen,
}: {
  contracts: DemoContract[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="divide-y divide-zinc-200">
      <div className="grid grid-cols-[minmax(0,1fr)_160px_150px_120px] gap-3 px-4 py-3 text-xs font-medium uppercase text-zinc-500">
        <span>Tên hồ sơ</span>
        <span>Đối tác</span>
        <span>Trạng thái</span>
        <span>Ngày tạo</span>
      </div>
      {contracts.map((contract) => (
        <button
          key={contract.id}
          type="button"
          onClick={() => onOpen(contract.id)}
          className="grid w-full grid-cols-[minmax(0,1fr)_160px_150px_120px] items-center gap-3 px-4 py-3 text-left transition hover:bg-zinc-50"
        >
          <span className="truncate text-sm font-medium">{contract.title}</span>
          <span className="truncate text-sm text-zinc-600">
            {contract.counterparty || "Chưa có"}
          </span>
          <Badge className={cn("rounded-md", statusClassName[contract.status])}>
            {statusLabels[contract.status]}
          </Badge>
          <span className="text-sm text-zinc-600">{formatDate(contract.createdAt)}</span>
        </button>
      ))}
      {contracts.length === 0 && (
        <div className="px-4 py-10 text-center text-sm text-zinc-500">
          Chưa có hồ sơ phù hợp.
        </div>
      )}
    </div>
  );
}

function ObligationRows({
  items,
  onOpen,
}: {
  items: Array<{
    id: string;
    title: string;
    owner: string;
    dueDate: string;
    done: boolean;
    contractId: string;
    contractTitle: string;
  }>;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="divide-y divide-zinc-200">
      <div className="grid grid-cols-[minmax(0,1fr)_150px_130px] gap-3 px-4 py-3 text-xs font-medium uppercase text-zinc-500">
        <span>Công việc</span>
        <span>Hạn</span>
        <span>Phụ trách</span>
      </div>
      {items.map((item) => (
        <button
          key={`${item.contractId}-${item.id}`}
          type="button"
          onClick={() => onOpen(item.contractId)}
          className="grid w-full grid-cols-[minmax(0,1fr)_150px_130px] items-center gap-3 px-4 py-3 text-left transition hover:bg-zinc-50"
        >
          <span className={cn("min-w-0", item.done && "text-zinc-400")}>
            <span className="block truncate text-sm font-medium">{item.title}</span>
            <span className="mt-1 block truncate text-xs text-zinc-500">
              {item.contractTitle}
            </span>
          </span>
          <span className="text-sm text-zinc-600">{formatDate(item.dueDate)}</span>
          <span className="text-sm text-zinc-600">{item.owner}</span>
        </button>
      ))}
    </div>
  );
}

function RecentContracts({
  contracts,
  onOpen,
}: {
  contracts: DemoContract[];
  onOpen: (id: string) => void;
}) {
  return (
    <section className="rounded-md border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold">Mở gần đây</h2>
      </div>
      <div className="divide-y divide-zinc-200">
        {contracts.map((contract) => (
          <button
            key={contract.id}
            type="button"
            onClick={() => onOpen(contract.id)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-zinc-50"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{contract.title}</p>
              <p className="mt-1 text-xs text-zinc-500">{formatDate(contract.createdAt)}</p>
            </div>
            <Badge className={cn("rounded-md", statusClassName[contract.status])}>
              {statusLabels[contract.status]}
            </Badge>
          </button>
        ))}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4">
      <p className="text-xs font-medium uppercase text-zinc-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
