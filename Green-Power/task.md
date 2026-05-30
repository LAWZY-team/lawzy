# Danh sách công việc (F7 Gap Fixes & Feature Implementation)

- [x] **🎫 LAW-F7-01 (Backend): Projects API & Document Hierarchy Links**
  - [x] Cập nhật Prisma Schema (`Project`, `DocumentLink`, `ClauseMapping`, `MismatchAlert`, soft delete).
  - [x] Chạy `npx prisma db push` để tạo bảng và đồng bộ database.
  - [x] Triển khai `ProjectsService` và `ProjectsController` xử lý CRUD Dự án.
  - [x] Thiết lập ràng buộc unique `@@unique([workspaceId, code])` trên dự án.
  - [x] Triển khai API liên kết tài liệu `/documents/links` trong `DocumentsService`.
  - [x] Xây dựng thuật toán kiểm tra vòng lặp phụ thuộc (Circular Dependency) bằng đệ quy BFS/DFS.
  - [x] Viết kịch bản kiểm thử tích hợp tự động [f7-01-smoke-test.ts](file:///Users/lyanhquan/code/lawzy/backend/scripts/f7-01-smoke-test.ts) và chạy PASS thành công.
- [x] **🎫 LAW-F7-02 (AI/Backend): AI Metadata & Entity Extractor Service**
  - [x] Xây dựng prompt và service gọi Gemini trích xuất dữ liệu khi upload.
- [x] **🎫 LAW-F7-03 (Backend/AI): Engine Đề Xuất Liên Kết Parent-Child Tự Động**
  - [x] Thiết lập logic gợi ý liên kết và lưu trạng thái từ chối `ai_rejected`.
- [x] **🎫 LAW-F7-04 (Backend/AI): Clause-level Mapping & Versioning Engine**
  - [x] Xây dựng logic đè phiên bản điều khoản và ánh xạ giữa các UUID Clause.
- [x] **🎫 LAW-F7-05 (Backend/AI): Change Propagation & Consistency Validator**
  - [x] Triển khai kiểm tra mismatch thông số chéo và cơ chế lọc RBAC.
- [x] **🎫 LAW-F7-06 (Frontend): UI Cây Tài Liệu & Lớp Phủ Hiệu Lực Trực Quan**
  - [x] Xây dựng giao diện Tree view dự án và Side Sheet so sánh trong editor.
