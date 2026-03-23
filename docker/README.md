# Docker Compose – Lawzy

Tất cả file compose nằm trong `docker/`. **Chạy từ thư mục gốc lawzy.**

## Local Development

```bash
# Chỉ MySQL (port 3307)
docker compose -f docker/compose.dev.yml up -d
```

## Full Stack (UAT / Production)

```bash
# UAT
docker compose -f docker/compose.uat.yml up -d

# Production
docker compose -f docker/compose.prod.yml up -d
```

## Coolify (Deploy riêng Backend/Frontend)

| File | Môi trường | Mô tả |
|------|------------|-------|
| `compose.uat-backend.yml` | UAT | MySQL + Backend + NocoDB |
| `compose.uat-frontend.yml` | UAT | Chỉ Frontend |
| `compose.prod-backend.yml` | Production | MySQL + Backend |
| `compose.prod-frontend.yml` | Production | Chỉ Frontend |

Coolify: **base_directory**: `/` (repo root), **compose**: `docker/compose.uat-backend.yml` (ví dụ).

## Cấu trúc

```
docker/
├── mysql/
│   └── init.sql       # Init DB (lawzy, lawzy_uat, nocodb)
├── compose.dev.yml    # MySQL dev local
├── compose.uat.yml    # UAT full
├── compose.prod.yml   # Production full
├── compose.uat-backend.yml
├── compose.uat-frontend.yml
├── compose.prod-backend.yml
├── compose.prod-frontend.yml
└── README.md
```
