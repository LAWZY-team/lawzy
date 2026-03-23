# UAT Environment Variables (Coolify)

## Backend (Lawzy UAT Backend)

| Variable | Mô tả | Ví dụ |
|----------|-------|-------|
| MYSQL_ROOT_PASSWORD | MySQL root password | (strong password) |
| JWT_SECRET | JWT signing secret | (random 32+ chars) |
| JWT_REFRESH_SECRET | Refresh token secret | (random 32+ chars) |
| R2_ENDPOINT_URL | S3-compatible storage endpoint | https://s3-hcm-r2.s3cloud.vn |
| R2_ACCESS_KEY | S3 access key | |
| R2_SECRET_KEY | S3 secret key | |
| R2_BUCKET | Bucket name | lawzy |
| R2_REGION | Region | hcm |
| SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS | Email config | |
| MAIL_FROM | From email | noreply@lawzy.vn |
| FRONTEND_URL | UAT frontend URL | https://uat.lawzy.vn |

## Frontend (Lawzy UAT Frontend)

| Variable | Mô tả | Ví dụ |
|----------|-------|-------|
| GEMINI_API_KEY | AI generation | (Google AI key) |
| BACKEND_URL | Server-side proxy to backend | http://host.docker.internal:5001 |
| NEXT_PUBLIC_APP_URL | (build arg) Public app URL | https://uat.lawzy.vn |
| NEXT_PUBLIC_BACKEND_URL | (build arg) Public API base | https://uat.lawzy.vn/api |

**Lưu ý:** `BACKEND_URL` dùng cho server-side fetch (proxy, auth). UAT frontend và backend chạy cùng host (Coolify), dùng `host.docker.internal:5001` để frontend gọi backend.
