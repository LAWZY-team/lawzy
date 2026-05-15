# Docker Compose – Lawzy

Tất cả file compose nằm trong `docker/`. **Chạy từ thư mục gốc lawzy.**

## Local Development

### Chỉ DB trên máy (tùy chọn)

Nếu **không** dùng MySQL local, bỏ qua bước này — chỉ cần `DATABASE_URL` production trong `backend/.env`.

```bash
# MySQL dev cục bộ (port 3307) — chỉ khi bạn muốn DB trên máy
docker compose -f docker/compose.dev.yml up -d
```

### Backend API trong Docker + DB production (khuyến nghị: không tạo DB local)

1. Trong `backend/.env` đặt **`DATABASE_URL` trỏ thẳng tới MySQL production** (copy từ Coolify / biến môi trường server). Host trong URL là hostname/IP công khai của MySQL — backend trong container kết nối giống máy bạn, **không** cần `host.docker.internal` trừ khi MySQL chạy trên chính máy host.
2. Đảm bảo firewall / allowlist MySQL cloud cho phép IP máy bạn (hoặc VPN tới mạng nội bộ nếu DB private).
3. Các biến khác (`JWT_SECRET`, `JWT_REFRESH_SECRET`, R2, PayOS, …) giữ khớp nhu cầu local; compose chỉ override `FRONTEND_URL` và `PORT` nếu có.
4. **Không** bắt buộc `backend/.env.docker`. File đó chỉ hữu ích khi MySQL nằm trên **máy host** và bạn cần host `host.docker.internal` thay cho `localhost` (xem `backend/.env.docker.example`).
5. Chạy backend:

```bash
docker compose -f docker/compose.local-backend.yml up
# hoặc từ root:
docker compose -f docker-compose.local-backend.yml up
```

Compose **không** chạy `prisma migrate deploy` hay seed — tránh ghi đè dữ liệu production. Schema phải đã khớp với DB (đã migrate trên server).

5. Frontend (terminal trên máy):

```bash
cd frontend && yarn dev
```

Trong `frontend/.env.local`:

```env
BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_APP_URL=http://localhost:3000
# Không set NEXT_PUBLIC_ALLOW_ROBOT_INDEXING → local không bị Google index
```

Trình duyệt mở `http://localhost:3000/login` — cookie auth qua proxy same-origin tới backend `:5000`.

### SEO / robots (build-time `NEXT_PUBLIC_*`)

| Môi trường | `NEXT_PUBLIC_APP_URL` | `NEXT_PUBLIC_SITE_ENV` | `NEXT_PUBLIC_ALLOW_ROBOT_INDEXING` |
|------------|------------------------|-------------------------|-------------------------------------|
| Production | `https://lawzy.vn` | `production` | `true` |
| UAT | `https://uat.lawzy.vn` | `uat` | `false` |

Đã gắn trong `docker/compose.prod*.yml`, `docker/compose.uat*.yml` và `frontend/Dockerfile` build args. Rebuild frontend image sau khi đổi các biến này.

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
├── compose.dev.yml           # MySQL dev local
├── compose.local-backend.yml # Backend API (Docker) + .env (DB có thể production)
├── compose.uat.yml    # UAT full
├── compose.prod.yml   # Production full
├── compose.uat-backend.yml
├── compose.uat-frontend.yml
├── compose.prod-backend.yml
├── compose.prod-frontend.yml
└── README.md
```
