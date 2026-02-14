# 1. SETUP
- Đã có setup file .env

- R2_ENDPOINT_URL=https://79711f09e0c4d445d918d23d7d712c93.r2.cloudflarestorage.com
- R2_ACCESS_KEY=
- R2_SECRET_KEY=
- R2_BUCKET=lawzy-contract-templates
- R2_REGION=auto

# Thư viện mẫu hợp đồng
- Thư viện mẫu hợp đồng sẽ có 2 tab nhỏ bên trong "Hệ thống" và "Cộng đồng". Ở mục cộng đồng sẽ cho người dùng tự do đăng tải hợp đồng và xóa, các mẫu hợp đồng được lưu trong R2 nên phải thiết lập ở bên backend/ hợp lý. Chia cấu trúc file dễ theo dõi và bảo trì
## Hệ thống
Chứa các mẫu hợp đồng do hệ thống cung cấp.

Các mẫu này được quản lý ở phía backend và lưu trữ ở R2 Cloudfare
## Cộng đồng
- Cho phép người dùng tự do: đăng tải hợp đồng cho người khác sử dụng, xóa hợp đồng của chính mình. Hiện tại chưa authentication nên mặc định ai cũng thao tác được.

# 2. Yêu cầu kỹ thuật
- Sử dụng 
- Việc upload file lên R2 phải được xử lý ở backend.
- Không expose R2 credentials ra frontend.
- Cấu trúc thư mục cần được chia rõ ràng: dễ theo dõi, dễ bảo trì. mở rộng

# 3. Quy ước lưu trữ (R2 keys)
- Prefix:
  - Hệ thống: `templates/system/`
  - Cộng đồng: `templates/community/`
- Format file: `templates/{scope}/{uuid}{ext}` (ví dụ: `templates/community/<uuid>.pdf`)

# 4. Backend API (NestJS)
- GET `/contract-templates?scope=system|community`
  - List các file theo scope (files-only: key, fileName, size, lastModified)
- POST `/contract-templates/community` (multipart/form-data, field `file`)
  - Upload file lên `templates/community/`
  - Giới hạn: 10MB; allow: pdf/doc/docx
- GET `/contract-templates/:scope/:id/download`
  - Download file (stream, attachment)
- DELETE `/contract-templates/community/:id`
  - Xóa file community theo `id` (tương ứng tên file trong prefix)
