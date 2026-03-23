# Software Requirements Specification (SRS)

**Dự án:** LAWZY MVP  
**Phiên bản:** 1.2  
**Ngày:** 2026-03-23  
**Tham chiếu:** BRD-Business-Requirements-Document.md, ROADMAP.md

---

## 1. Giới thiệu

Tài liệu SRS mô tả chi tiết yêu cầu chức năng và phi chức năng của hệ thống LAWZY. Phạm vi: Dashboard, Editor, Templates, Sources, Payment, Workspace, Settings. Trạng thái: Frontend + Backend NestJS; API proxy; auth thật; RAG chưa có.

---

## 2. Yêu cầu chức năng (tóm tắt)

- **Dashboard**: UC-DASH-01–04 (tổng quan, quota, storage, quick actions)
- **Editor**: UC-ED-01–07 (mới/template, TipTap, AI generate, metadata, export Word, version)
- **Templates**: UC-TPL-01–02 (list, filter, chi tiết, mở editor)
- **Sources**: UC-SRC-01–03 (list, upload, chi tiết) — chi tiết pipeline xem FEATURE-SPEC-USER-UPLOAD-SOURCES
- **Payment**: UC-PAY-01–02 (gói, nâng cấp, status) — chi tiết xem PLAN_MEMBERSHIP_PLANS_PAYMENT
- **Workspace & Permissions**: UC-WS-01–02
- **Files**: UC-FIL-01
- **Settings**: UC-SET-01–02
- **Guest & Auth**: State-Management; Auth upgrade (auth-pages-upgrade-plan)

---

## 3. Admin & CMS (cms-admin-plan)

| Tính năng | Mô tả |
|-----------|-------|
| CMS Tin tức & Bài viết | CRUD bài viết (type: news, policy, document); Admin only |
| Quản lý người dùng | Danh sách user, search, xem chi tiết; PATCH role (phase 2) |
| Sidebar Admin | Nhóm "Quản lý": Tin tức & Bài viết, Người dùng — chỉ khi `user.roles` có `admin` |

Routes: `/dashboard/admin/articles`, `/dashboard/admin/users`; public: `/news`, `/news/[slug]`, `/policy/[slug]`. Backend: `GET /admin/users`, Articles CRUD; RolesGuard @Roles('admin').

---

## 4. Chat AI & Conversation (Analysis Noralib/Lawzy)

**Hiện tại:** ChatMessage gắn Document; metadata.thinking cho ChatThinkingBlock; version restore qua chatCursorAt.

**Đề xuất mở rộng:**
- **ChatConversation**: Nhiều luồng chat/document; schema ChatConversation, ChatMessage.conversationId
- **Sidebar trong ChatColumn**: "Cuộc trò chuyện mới", danh sách conversations (rename, delete)
- **AgentThinkingSteps**: Render toolCalls từ metadata (extract_merge_fields, generate_contract, analyze_clause)

API: GET/POST/PATCH/DELETE `/documents/:id/conversations`; chat-messages hỗ trợ conversationId.

---

## 5. Membership & Payment (PLAN_MEMBERSHIP_PLANS_PAYMENT)

- MembershipPlan, Payment (Prisma); GET /plans, CRUD admin plans; POST /payments, webhook
- Frontend: usePlans, PricingCard, UpgradeModal, /payment, /pricing, /admin/plans
- Phụ lục: Gói theo seat (Team 99k/seat), AI Top-up, Admin activate workspace

---

## 6. Auth nâng cấp (auth-pages-upgrade-plan)

- AuthLayout: grid, ProgressStepsVertical, AccountTypeSelector (cá nhân/doanh nghiệp)
- Register 4 bước; BenefitsPanel khi login 1 step

---

## 7. Yêu cầu phi chức năng

NFR-P1–P3 (hiệu năng), NFR-S1–S3 (bảo mật), NFR-U1–U3 (usability), NFR-M1–M3 (maintainability), NFR-C1–C2 (tương thích).
