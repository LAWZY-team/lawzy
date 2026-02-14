# Development Specification

**Dự án:** LAWZY MVP  
**Phiên bản:** 1.1  
**Ngày:** 2026-02-10  
**Đối tượng:** Dev team, architect, maintainer  
**Tham chiếu:** [ROADMAP.md](ROADMAP.md) — Tầm nhìn và roadmap theo giai đoạn (Backend, RAG, Payment, Quality)

---

## 1. Kiến trúc tổng quan

### 1.1 Trạng thái hiện tại (MVP)

Hiện tại LAWZY là **single codebase** (Next.js + frontend); **chưa có backend service riêng**, **chưa có database**, **chưa có RAG**. Dữ liệu từ mock JSON; chỉ một số luồng gọi API (editor → AI, export, extract-text; payment → create/webhook). Phần dưới mô tả kiến trúc **đang có**; Mục **1.3** và **Mục 9** mô tả hướng kiến trúc tương lai theo roadmap.

### 1.2 Mô tả kiến trúc (hiện tại)

LAWZY là ứng dụng web **single codebase** chạy trên **Next.js 16** (App Router), kết hợp:

- **Frontend:** React 19, TypeScript, Tailwind CSS 4, shadcn/ui (Radix), Zustand, TanStack Query (sẵn sàng dùng).
- **Backend logic (trong cùng repo):** Next.js Route Handlers dưới `/api/*` (AI, export, extract-text, payment).
- **AI:** Google Gemini (Gemini 2.5 Flash) qua `@google/generative-ai`; system prompt chuyên luật Việt Nam.
- **Editor:** TipTap (ProseMirror) với extension merge field tùy chỉnh.
- **Dữ liệu MVP:** Mock JSON trong `src/mock/`; persistence qua Zustand persist (auth, quota, workspace).

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                           │
│  React + Zustand (auth, editor, quota, workspace)                │
│  TipTap Editor · shadcn/ui · TanStack Query                       │
└───────────────────────────┬─────────────────────────────────────┘
                             │ HTTP (fetch)
┌───────────────────────────▼─────────────────────────────────────┐
│                    Next.js App (Node.js)                          │
│  App Router: (dashboard)/*, payment/status/*                     │
│  API Routes: /api/ai/*, /api/export/*, /api/extract-text,         │
│              /api/payment/*                                       │
└───────────────────────────┬─────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ Gemini API    │   │ Mock JSON     │   │ File I/O      │
│ (generate,    │   │ (users,       │   │ (docx export, │
│  review,      │   │  templates,   │   │  pdf-parse,   │
│  cite-law)    │   │  sources…)    │   │  mammoth)     │
└───────────────┘   └───────────────┘   └───────────────┘
```

### 1.3 Luồng dữ liệu chính

- **Dashboard:** Page load → useEffect set user/workspace từ mock → render StatsCards, QuotaCard, RecentDocs, OverviewChart (dữ liệu từ mock/contracts).
- **Editor:** URL /editor/[id] hoặc /editor/new?template= → load contract hoặc template từ mock → TipTap content + editor store (content, mergeFieldValues, metadata) → AI generate → contractResultToTipTapContent → set content + merge fields.
- **Payment:** Page /payment → POST /api/payment/create → redirect /payment/status/[orderId] → (mock) simulate webhook → updateQuota store → redirect /.

### 1.4 Hướng kiến trúc theo Roadmap (tóm tắt)

- **Giai đoạn 1 (Backend & API thật):** Thêm backend service (hoặc mở rộng Next.js API với DB); database (PostgreSQL khuyến nghị) cho User, Workspace, Contract, Template, UploadSource, Subscription/Order. Frontend thay mock bằng client gọi API (fetch hoặc TanStack Query). Auth (session/JWT) và middleware bảo vệ route. Chi tiết xem [ROADMAP.md — Giai đoạn 1](ROADMAP.md#giai-đoạn-1--backend-cơ-sở--api-thật-foundation).
- **Giai đoạn 2 (RAG):** Pipeline xử lý nguồn (extract → chunk → embed → lưu vector store); khi generate hợp đồng, retrieval top-k chunk theo prompt/workspace, build context có trích dẫn; LLM (Gemini hoặc backend) nhận context RAG. Citation trong output (sourceId, page, excerpt) đã có format trong frontend. Chi tiết xem [ROADMAP.md — Giai đoạn 2](ROADMAP.md#giai-đoạn-2--rag-cho-nguồn-pháp-lý-ai--sources).
- **Giai đoạn 3 (Payment thật):** Tích hợp PayOS; webhook verify signature; cập nhật Order và Subscription trong DB; quota/subscription API. Chi tiết xem [ROADMAP.md — Giai đoạn 3](ROADMAP.md#giai-đoạn-3--thanh-toán-thật--quota-monetization).
- **Giai đoạn 4 (Quality & Scale):** Test (unit, integration, E2E), CI/CD, monitoring, performance; tính năng mở rộng (real-time, PDF export, v.v.). Chi tiết xem [ROADMAP.md — Giai đoạn 4](ROADMAP.md#giai-đoạn-4--chất-lượng-scale--mở-rộng-quality--scale).

---

## 2. Cấu trúc thư mục và module

### 2.1 Cây thư mục (chỉ phần quan trọng)

```
lawzy/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (dashboard)/              # Layout có sidebar, bảo vệ (logic) bởi layout
│   │   │   ├── layout.tsx            # SidebarProvider + AppSidebar + SidebarInset
│   │   │   ├── page.tsx              # Dashboard chính (tabs: Tài liệu, Dung lượng, Quota)
│   │   │   ├── editor/[id]/page.tsx  # Editor (id = new hoặc contractId)
│   │   │   ├── templates/page.tsx
│   │   │   ├── sources/page.tsx
│   │   │   ├── files/page.tsx
│   │   │   ├── documents/
│   │   │   ├── payment/page.tsx      # Chọn gói, nâng cấp
│   │   │   ├── workspace/page.tsx
│   │   │   └── settings/            # account, profile, appearance, display, notifications
│   │   ├── payment/status/[orderId]/ # Trang trạng thái thanh toán (ngoài dashboard layout)
│   │   ├── api/                      # Route Handlers
│   │   │   ├── ai/generate/route.ts
│   │   │   ├── ai/review/route.ts
│   │   │   ├── ai/cite-law/route.ts
│   │   │   ├── export/docx/route.ts
│   │   │   ├── extract-text/route.ts
│   │   │   └── payment/create|status/[orderId]|webhook/route.ts
│   │   ├── layout.tsx                # Root: ThemeProvider, Toaster, fonts
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                       # shadcn/ui (button, card, modal, table, sidebar…)
│   │   ├── layout/                   # AppSidebar, Header, UserNav, WorkspaceNav
│   │   ├── dashboard/                # QuotaCard, ReferralCard, QuickActions, RecentDocs, StatsCards, OverviewChart, StatsByWorkspace
│   │   ├── editor/                   # CanvasEditor, ChatColumn, RightPanel, TiptapEditor, VersionHistory, ExportModal, InitialChatInterface
│   │   ├── templates/                # TemplateGrid, TemplateFilters, TemplateDetailSplit
│   │   ├── sources/                  # AddSourceModal, SourceDetailSplit
│   │   ├── settings/                 # AppearanceForm
│   │   ├── theme-provider.tsx
│   │   ├── error-boundary.tsx
│   │   └── date-picker.tsx
│   ├── lib/                          # Utilities & domain logic
│   │   ├── utils.ts                  # cn(), helpers
│   │   ├── ai/                       # gemini-client.ts, system-prompt.ts
│   │   ├── editor/                   # contract-result.ts, result-to-tiptap-content.ts
│   │   ├── export/                   # docx-converter.ts
│   │   ├── payment/                  # payos-client.ts (mock)
│   │   ├── sources/                  # build-context.ts
│   │   ├── tiptap/extensions/        # merge-field.tsx
│   │   ├── contract-layout.ts
│   │   ├── editor-content-to-text.ts
│   │   └── template-content-to-editor.ts
│   ├── stores/                       # Zustand
│   │   ├── auth-store.ts
│   │   ├── editor-store.ts
│   │   ├── quota-store.ts
│   │   └── workspace-store.ts
│   ├── hooks/                        # use-permissions.ts, use-mobile.ts, use-thinking-progress.ts
│   ├── types/                        # contract.ts, template.ts, workspace.ts, permissions.ts, upload-source.ts
│   └── mock/                         # JSON: users, workspaces, templates, upload-sources, payments, contracts, chat-history, files, merge-fields
├── public/
├── components.json                   # shadcn config
├── next.config.ts
├── tsconfig.json                     # paths: "@/*" -> "./src/*"
├── package.json
└── docs/                             # BRD, SRS, API-Specification, DEVELOPMENT-SPECIFICATION
```

### 2.2 Phân vai trò module

| Thư mục / file | Vai trò |
|----------------|---------|
| **app/** | Định tuyến, layout, page components (có thể "use client" khi cần state/effect). |
| **app/api/** | API handlers: parse body, gọi lib (Gemini, PayOS, docx, extract-text), trả JSON hoặc binary. |
| **components/ui/** | Component UI tái sử dụng (shadcn); không import trực tiếp mock. |
| **components/dashboard**, **editor**, **templates**, **sources** | Feature components; có thể import mock hoặc store. |
| **lib/** | Logic thuần (AI client, export, payment client, build context); không phụ thuộc React. |
| **stores/** | State global (Zustand); persist cho auth, quota, workspace. |
| **hooks/** | Custom hooks (permissions, mobile, thinking progress). |
| **types/** | Định nghĩa TypeScript dùng chung. |
| **mock/** | Dữ liệu JSON thay thế được bằng API sau. |

---

## 3. Path alias và import

- **Alias:** `@/*` → `./src/*` (tsconfig.json `paths`).
- **Quy ước import:** Luôn dùng `@/` cho code trong src (ví dụ `@/components/ui/button`, `@/stores/auth-store`, `@/lib/utils`, `@/types/template`).
- **Mock:** Import trực tiếp JSON, ví dụ `import usersData from '@/mock/users.json'`.
- **shadcn (components.json):** aliases `components` → `@/components`, `utils` → `@/lib/utils`, `ui` → `@/components/ui`, `lib` → `@/lib`, `hooks` → `@/hooks`.

---

## 4. Coding standard và guideline

### 4.1 TypeScript

- **Strict:** Bật `strict: true` trong tsconfig; tránh `any` nếu có thể.
- **Types tập trung:** Dùng types từ `@/types/*`; mở rộng type mới trong thư mục này.
- **API body/response:** Có thể định nghĩa interface trong file route hoặc trong types; đảm bảo request/response khớp API Specification.

### 4.2 React & Next.js

- **Client components:** Thêm `"use client"` khi dùng useState, useEffect, hooks (Zustand, usePermissions), hoặc event handler.
- **Server components:** Mặc định; dùng cho layout và page đơn giản không cần client state.
- **Data fetching:** Trong MVP chủ yếu mock import hoặc fetch trong useEffect (client); khi có API thật có thể chuyển sang server component + fetch hoặc TanStack Query.

### 4.3 Styling

- **Tailwind CSS:** Utility-first; class trong JSX.
- **cn():** Dùng `cn()` từ `@/lib/utils` (clsx + tailwind-merge) để gộp class có điều kiện.
- **Theme:** next-themes; ThemeProvider ở root layout; CSS variables (shadcn) cho màu.

### 4.4 State management

- **Zustand:** Global state (auth, editor, quota, workspace); persist với `persist` middleware (key lawzy-auth, lawzy-quota, lawzy-workspace).
- **Local state:** useState/useReducer trong component hoặc page.
- **Server state (sau này):** TanStack Query đã có trong dependency; có thể dùng cho API thay mock.

### 4.5 Đặt tên

- **File:** kebab-case (vd. `editor-store.ts`, `merge-field.tsx`, `docx-converter.ts`).
- **Component:** PascalCase (vd. `CanvasEditor`, `TemplateDetailSplit`).
- **Hook:** use- prefix (vd. `usePermissions`, `useThinkingProgress`).
- **Store:** use- prefix (vd. `useAuthStore`, `useEditorStore`).
- **Constant:** UPPER_SNAKE hoặc camelCase tùy ngữ cảnh (vd. `LAWZY_SYSTEM_PROMPT`, `DEFAULT_CONTENT`).

### 4.6 Comment và i18n

- Comment quan trọng bằng tiếng Việt hoặc tiếng Anh tùy team (codebase hiện có cả hai).
- Chuỗi hiển thị cho user (label, placeholder, toast) trong MVP đa số tiếng Việt; có thể tách sang file i18n sau.

---

## 5. Dependency management

### 5.1 package.json — nhóm chính

- **Framework:** next 16.x, react 19.x, react-dom 19.x.
- **Language:** typescript.
- **Styling:** tailwindcss, tw-animate-css; postcss.
- **UI:** radix-ui, class-variance-authority, clsx, tailwind-merge, lucide-react, recharts, sonner, framer-motion, cmdk, react-day-picker, date-fns.
- **Editor:** @tiptap/* (react, starter-kit, extension-placeholder, extension-table, extension-text-align, pm).
- **Drag & drop:** @dnd-kit/core, sortable, utilities.
- **State & data:** zustand, @tanstack/react-query, @tanstack/react-query-devtools.
- **Form:** react-hook-form, @hookform/resolvers, zod.
- **AI:** @google/generative-ai.
- **Export & parse:** docx, mammoth, pdf-parse.
- **Layout:** react-resizable-panels.
- **Dev:** eslint, eslint-config-next, @tailwindcss/postcss, shadcn CLI.

### 5.2 Cài đặt và chạy

```bash
npm install
cp .env.local.example .env.local   # Thêm GEMINI_API_KEY, NEXT_PUBLIC_APP_URL
npm run dev
```

### 5.3 Scripts

| Script | Mô tả |
|--------|--------|
| npm run dev | Chạy Next dev server (mặc định localhost:3000). |
| npm run build | Build production. |
| npm run start | Chạy server production sau build. |
| npm run lint | Chạy ESLint. |

### 5.4 Biến môi trường

| Biến | Bắt buộc | Mô tả |
|------|----------|--------|
| GEMINI_API_KEY | Có (cho AI) | API key Google Gemini. |
| NEXT_PUBLIC_APP_URL | Không | Base URL app (vd. http://localhost:3000). |
| GEMINI_MODEL | Không | Override model (mặc định gemini-2.5-flash). |

---

## 6. Mô hình dữ liệu (logic)

- **User:** userId, name, email, avatar, roles[], workspaceId, quota, referral, createdAt (mock users.json).
- **Workspace:** workspaceId, name, logo, plan, settings, subscription, quotaLimits, aiConfig, permissions, members[], workspaceTemplates[], activityLogs[] (types/workspace.ts, mock workspaces.json).
- **Contract:** contractId, title, type, status, contentJSON (TipTap), metadata, mergeFieldValues, versions[], aiSuggestions[], riskAnalysis[], workspaceId, createdBy, createdAt, updatedAt (types/contract.ts).
- **Template:** templateId, slug, version, status, type, title, contentJSON (DocContent với clause/field), mergeFields[], popularity, usageStats, reviewStatus (types/template.ts).
- **UploadSource:** sourceId, workspaceId, fileName, title, status, previewText, pageCount, chunkCount, tags (types/upload-source.ts).
- **Editor store:** currentDocumentId, content (JSONContent), templateMergeFields, mergeFieldValues, metadata (title, type, tags, riskLevel, visibility), isSaving, lastSaved.
- **Quota store:** dailyLimit, dailyRemaining, totalUsed, referralCredits, subscriptionPlan, lastReset (có thể mở rộng storage trong UI từ user.quota).

Quan hệ: User thuộc Workspace; Contract thuộc Workspace; Template dùng chung hoặc gắn workspace; UploadSource thuộc Workspace. Permissions theo Role (admin/editor/viewer) map tới Permission enum.

---

## 7. Build, test và deploy

### 7.1 Build

- `npm run build`: Next.js build (output .next); kiểm tra lỗi TypeScript và build-time errors.
- Đảm bảo không import trực tiếp key nhạy cảm (GEMINI_API_KEY chỉ dùng trong API route trên server).

### 7.2 Test

- Hiện tại chưa có test script trong package.json.
- Khuyến nghị: thêm Jest hoặc Vitest cho unit (lib, utils, hooks); Playwright/Cypress cho E2E (login flow, editor, payment mock). Test API: gọi fetch tới /api/* với payload mẫu và assert response.

### 7.3 Deploy

- Next.js tương thích Vercel, Node server (PM2, Docker), hoặc static export (nếu không dùng API). Lưu ý: API routes cần chạy trên server (Node).
- Env: đặt GEMINI_API_KEY (và biến khác) trên môi trường deploy; không commit .env.local.
- PayOS webhook URL (khi dùng thật): trỏ tới https://<domain>/api/payment/webhook và cấu hình verify signature.

---

## 8. Hướng dẫn mở rộng và bảo trì

### 8.1 Thay mock bằng API thật

1. Tạo client (fetch hoặc TanStack Query) gọi backend; giữ interface (type) giống hiện tại.
2. Trong page/store: thay `import data from '@/mock/...'` bằng `useQuery` hoặc fetch trong useEffect; map response về đúng type (Contract, Template, Workspace, …).
3. API routes có thể giữ cho BFF hoặc chuyển logic sang backend riêng; khi đó Next API chỉ proxy hoặc bỏ.

### 8.2 Thêm API route mới

1. Tạo thư mục dưới `src/app/api/<tên>/route.ts`.
2. Export GET/POST/PUT/DELETE tương ứng; parse body với `await req.json()` (POST/PUT); trả `NextResponse.json(...)` hoặc `new NextResponse(buffer, { headers })`.
3. Cập nhật docs/API-Specification.md.

### 8.3 Thêm trang mới (dashboard)

1. Tạo `src/app/(dashboard)/<tên>/page.tsx` (và layout nếu cần).
2. Thêm link trong AppSidebar (app-sidebar.tsx) tới route tương ứng.
3. Dùng layout (dashboard) sẵn có (sidebar + SidebarInset).

### 8.4 Thêm TipTap extension

1. Tạo file trong `src/lib/tiptap/extensions/<tên>.tsx` (hoặc .ts).
2. Dùng `Node.create()` hoặc `Extension.create()`; đăng ký trong useEditor({ extensions: [ ..., NewExtension ] }).

### 8.5 Permission

- Dùng `usePermissions()` (hasPermission, hasRole, isAdmin, isEditor, isViewer); ẩn/hiện nút hoặc route theo RolePermissions (types/permissions.ts).
- Có thể bọc route bằng HOC hoặc middleware kiểm tra role khi đã có auth thật.

---

## 9. Roadmap & kiến trúc tương lai (chi tiết)

### 9.1 Backend và database (Giai đoạn 1)

- **Vị trí:** Có thể giữ API trong Next.js (Route Handlers + Prisma/Drizzle) hoặc tách backend riêng (Node/Go/Python). Nếu tách: repo hoặc monorepo; Next.js gọi backend qua HTTP.
- **Database:** Schema User, Workspace, WorkspaceMember, Contract, Template, UploadSource (metadata + storagePath), Subscription, Order. Migration, seed; env DATABASE_URL.
- **Auth:** Session cookie hoặc JWT; middleware kiểm tra auth cho route cần bảo vệ; frontend gửi credential (login), lưu token/session.
- **Frontend:** Thay `import mock from '@/mock/...'` bằng `useQuery`/fetch; base URL API từ env; error handling và loading state thống nhất.

### 9.2 RAG pipeline (Giai đoạn 2)

- **Luồng:** Upload file → storage → job extract text → chunking (theo trang hoặc semantic) → embedding (model phù hợp) → lưu vector store (Pgvector/Pinecone/Weaviate) với metadata (sourceId, workspaceId, pageNumber). Generate: query từ prompt + metadata → retrieval top-k → build context (excerpt + sourceId, page) → gửi vào LLM; output giữ format sourceCitations.
- **Vị trí logic:** Có thể nằm trong backend (worker + API) hoặc serverless; Next.js BFF có thể gọi backend “generate-with-rag” thay vì gọi Gemini trực tiếp với context text như hiện tại.

### 9.3 Payment và quota (Giai đoạn 3)

- **PayOS:** Cấu hình webhook URL; create payment trả checkout URL thật; webhook handler verify chữ ký, parse payload, cập nhật Order và Subscription trong DB; logic quota (daily limit, storage) theo plan.
- **Frontend:** Sau thanh toán redirect về status page; polling hoặc API me/workspace để lấy quota/subscription mới.

### 9.4 Chất lượng và mở rộng (Giai đoạn 4)

- **Test:** Unit (lib, utils, hooks), integration (API), E2E (login, tạo HĐ, export, payment). CI chạy test.
- **Monitoring:** Logging, error tracking (Sentry), metric cơ bản.
- **Tính năng mở rộng:** Real-time collaboration, export PDF, ký điện tử, v.v. theo BRD/SRS và roadmap.

---

## 10. Tài liệu tham chiếu

- **BRD:** docs/BRD-Business-Requirements-Document.md — bài toán, user, mục tiêu, phạm vi, trạng thái & tầm nhìn.
- **SRS:** docs/SRS-Software-Requirements-Specification.md — use case, acceptance criteria, NFR, implementation state & roadmap alignment.
- **API:** docs/API-Specification.md — endpoint hiện tại, body, response, bảo mật, hướng phát triển theo giai đoạn.
- **ROADMAP:** docs/ROADMAP.md — tầm nhìn, trạng thái hiện tại, roadmap chi tiết theo giai đoạn.
- **README:** README.md — tổng quan dự án, trạng thái, tech stack, bắt đầu nhanh, liên kết docs.

---

*Tài liệu Development Specification được xây dựng từ cấu trúc mã nguồn và config hiện tại của LAWZY MVP; đã bổ sung trạng thái hiện tại và mục Roadmap & kiến trúc tương lai.*
