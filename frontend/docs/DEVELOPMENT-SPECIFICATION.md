# Development Specification

**Dự án:** LAWZY MVP  
**Phiên bản:** 1.2  
**Ngày:** 2026-03-23

---

## 1. Kiến trúc

- **Frontend**: Next.js (App Router), React, TypeScript, Tailwind, shadcn/ui, Zustand, TanStack Query
- **Backend**: NestJS, Prisma, MySQL
- **API**: Frontend /api/proxy/* → Backend (BACKEND_URL, port 5000)
- **AI**: Gemini qua Next.js routes (/api/ai/*)

---

## 2. Cấu trúc thư mục

```
lawzy/
├── frontend/src/     # App Router, components, stores, lib
├── backend/src/      # NestJS modules (workspaces, users, documents, plans, payments, files, dashboard, ...)
└── docs/             # (lawzy/docs đã gộp vào frontend/docs)
```

---

## 2.1 Docker (docker/)

Tất cả compose trong `docker/`. Chạy từ root:

- `docker compose up -d` hoặc `yarn docker:dev` → MySQL dev (port 3307)
- `docker compose -f docker/compose.uat.yml up -d` → UAT full
- Coolify: `docker/compose.uat-backend.yml`, `docker/compose.prod-backend.yml`, …

Chi tiết: `docker/README.md`.

---

## 3. Local Setup (DEV_SETUP)

### Thứ tự khởi động

1. **MySQL**: `MYSQL_ROOT_PASSWORD=lawzy-dev-2025 yarn docker:dev`
2. **Backend**: `cd backend && yarn install && npx prisma generate && npx prisma migrate dev && yarn start:dev` → http://localhost:5000
3. **Frontend**: `yarn dev` → http://localhost:3000

### Biến môi trường

- **frontend/.env.local**: `BACKEND_URL=http://127.0.0.1:5000` (tránh lỗi proxy 502 trên Windows khi `localhost` ưu tiên IPv6; có thể bỏ nếu dùng helper `getBackendBaseUrl()` đã rewrite `localhost`)
- **backend/.env**: `DATABASE_URL="mysql://root:lawzy-dev-2025@localhost:3307/lawzy"`, `PORT=5000`

### Khắc phục lỗi

- 404 proxy → backend chưa chạy
- EADDRINUSE 5000 → tắt process port 5000
- "no space left on device" (Coolify): `docker builder prune -af`, `docker image prune -af`; bật Docker Cleanup trong Coolify

---

## 4. Branch Strategy (BRANCH_STRATEGY_COMMITS)

| Branch | Phạm vi |
|--------|---------|
| feat/membership-payment | Plans, Payment, pricing |
| feat/admin-cms | Admin users, workspaces, articles, inbox |
| update/auth-landing-i18n | Auth, landing, i18n, settings |

Merge: update/auth → feat/admin-cms → feat/membership-payment → main → production.

Kiểm tra: `yarn lint`, `npx tsc --noEmit`, `yarn build` (frontend & backend); sau merge: `prisma migrate deploy`, `prisma seed`.

---

## 5. Admin & CMS (cms-admin-plan)

- **Sidebar**: Nhóm "Quản lý" khi `user?.roles?.includes('admin')`: Tin tức & Bài viết → /admin/articles; Người dùng → /admin/users
- **Backend**: ArticlesModule, AdminUsersController; RolesGuard @Roles('admin')
- **Routes**: /dashboard/admin/articles, /dashboard/admin/users; public /news, /news/[slug], /policy/[slug]

---

## 6. Coding Standards

- TypeScript strict; path alias @/*; kebab-case file; PascalCase component; use- prefix hooks
- Zustand cho auth, editor, quota, workspace; persist sessionStorage cho guest-flow
- State-Management: authResolved, guest-from-landing; AuthBootstrap, guest-flow-store

---

## 7. Tài liệu tham chiếu

- SRS, API-Specification, BRD, ROADMAP — frontend/docs
- FEATURE-SPEC-USER-UPLOAD-SOURCES, State-Management — frontend/docs
