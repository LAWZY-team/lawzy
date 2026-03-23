# API Specification

**Dự án:** LAWZY MVP  
**Phiên bản:** 1.2  
**Ngày:** 2026-03-23  
**Kiến trúc:** Frontend Next.js proxy `/api/proxy/*` → Backend NestJS (port 5000)

---

## 1. Tổng quan

- **Next.js routes**: /api/ai/*, /api/export/docx, /api/extract-text, /api/payment/*, /api/auth/*
- **Backend (qua proxy)**: workspaces, users, documents, templates, plans, payments, files, dashboard, help-center, public-shares
- **Base URL**: Development `http://localhost:3000`; API prefix `/api/...` hoặc `/api/proxy/...` cho backend

---

## 2. AI APIs (Next.js)

- POST /api/ai/generate — Tạo/cập nhật hợp đồng; body: metadata, prompt, workspaceId, existingContent, mergeFieldValues, attachedSources
- POST /api/ai/review — Phân tích rủi ro
- POST /api/ai/cite-law — Trích dẫn luật

---

## 3. Export & Extract

- POST /api/export/docx — TipTap JSON → .docx
- POST /api/extract-text — multipart PDF/DOC/DOCX → text (max 10MB)

---

## 4. Payment APIs

- POST /api/payment/create — userId, plan, amount
- GET /api/payment/status/[orderId]
- POST /api/payment/webhook — PayOS callback

Backend: POST /payments, GET /payments, GET /payments/by-order/:orderCode; POST /payments/webhook.

---

## 5. Backend API (qua /api/proxy)

| Module | Endpoints |
|--------|-----------|
| Plans | GET /plans, GET /plans/by-slug/:slug; admin: CRUD /admin/plans |
| Payments | POST /payments, GET /payments, GET /payments/by-order/:orderCode |
| Workspaces | GET/POST /workspaces, GET /workspaces/:id, POST /workspaces/:id/members; admin: /admin/workspaces |
| Users | GET /users/me; admin: GET /admin/users |
| Documents | GET/POST /documents, GET /documents/recent, GET /documents/stats/overview |
| Templates | GET/POST /templates, GET /templates/:id |
| Files | GET /files, POST /files/upload, GET /files/:id/download, GET /files/storage/:workspaceId |
| Dashboard | GET /dashboard/overview, /chart, /recent, /workspace-breakdown |
| AI | POST /ai/deduct-credit |
| Help Center | POST /help-center/contact, /submit; GET /help-center/inbox |
| Public Shares | POST /public-shares, GET /public-shares/:token |

---

## 6. Admin & CMS (cms-admin-plan)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | /articles | List (public: published; admin: all) |
| GET | /articles/by-slug/:slug | Chi tiết public |
| POST/PATCH/DELETE | /articles | Admin CRUD |
| GET | /admin/users | Danh sách user (admin) |

---

## 7. Sources (FEATURE-SPEC)

POST /workspaces/:id/sources/upload; GET/PATCH/DELETE /workspaces/:id/sources/:sourceId; POST .../reprocess.

---

## 8. Chat (đề xuất mở rộng)

GET/POST/PATCH/DELETE /documents/:id/conversations; chat-messages hỗ trợ ?conversationId=.
