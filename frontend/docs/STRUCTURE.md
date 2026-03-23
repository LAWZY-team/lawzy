# Cấu trúc dự án Lawzy

## Tổng quan

```
lawzy/
├── backend/          # NestJS API
├── frontend/         # Next.js App
├── docker/           # Docker Compose (compose.*.yml, mysql/)
├── deploy/           # (trống – dự phòng)
├── scripts/          # Script tiện ích
├── .github/workflows/# CI/CD
├── docker-compose.yml # Default: MySQL dev (alias docker/compose.dev.yml)
└── package.json      # Root scripts (dev, build, docker:dev)
```

## Backend

```
backend/
├── src/
│   ├── config/
│   ├── integrations/
│   ├── modules/      # workspaces, users, documents, plans, payments, files, dashboard, ai, ...
│   └── utils/
├── prisma/
├── test/
├── plans/            # R2storage.md – nên chuyển vào backend/docs hoặc frontend/docs
├── Dockerfile
└── package.json
```

**Lưu ý:** `backend/plans/R2storage.md` là tài liệu đặc tả R2 – nên chuyển sang `frontend/docs/` hoặc tạo `backend/docs/`.

## Frontend

```
frontend/
├── src/
│   ├── app/          # App Router (dashboard, auth, api)
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── stores/
│   └── types/
├── public/
├── docs/             # SRS, API, BRD, ROADMAP, FEATURE-SPEC, State-Management
├── Dockerfile
└── package.json
```

## Root `src/` (legacy?)

Thư mục `src/` tại root có `app/(auth)`, `app/gemini`, `components/` – có vẻ trùng lặp với `frontend/src/`. Kiểm tra xem còn được dùng không; nếu không thì có thể xóa.

## Docker

Xem `docker/README.md`.
