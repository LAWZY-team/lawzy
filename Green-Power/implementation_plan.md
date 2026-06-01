# Kế Hoạch Triển Khai Chi Tiết: F7 - Linking Map & Project Legal State Engine

Tài liệu này đặc tả chi tiết kế hoạch thực hiện từng bước (Step-by-step) cho 6 ticket thuộc tính năng **F7 - Linking Map (Project Legal State Engine)**.
Theo yêu cầu, chúng tôi sẽ thực hiện tuần tự: **Hoàn thành từng task $\rightarrow$ Viết kiểm thử/xác minh đầu ra $\rightarrow$ Báo cáo và dừng lại đợi ý kiến trước khi làm task tiếp theo**.

---

## Danh Sách Các Ticket & Lộ Trình Triển Khai (Roadmap)

### 🎫 LAW-F7-01: [Backend] Triển Khai Projects API & Document Hierarchy Links
*   **Mô tả**: Thiết lập NestJS Module `projects` để xử lý CRUD Dự án. Xây dựng các API liên kết tài liệu (`parentId`, `projectId`) và tạo/xóa các liên kết đồ thị trong bảng `DocumentLink`.
*   **Đầu ra (Output)**:
    *   Thư mục mới: `backend/src/modules/projects/` gồm: `projects.module.ts`, `projects.controller.ts`, `projects.service.ts` và các file DTO.
    *   Các endpoints mới:
      *   `POST /projects`: Tạo dự án mới (kiểm tra unique trùng code theo workspace).
      *   `GET /projects`: Danh sách dự án trong workspace.
      *   `GET /projects/:id`: Lấy chi tiết dự án.
      *   `PATCH /projects/:id`: Cập nhật tên/mô tả dự án.
      *   `DELETE /projects/:id`: Xóa dự án (set `projectId` trên các document liên kết thành null).
      *   `POST /documents/links`: Thiết lập liên kết đồ thị (gợi ý tự động hoặc thủ công).
      *   `GET /documents/:id/links`: Lấy danh sách liên kết đồ thị của tài liệu.
      *   `DELETE /documents/links/:id`: Gỡ liên kết đồ thị.
*   **Tiêu chí nghiệm thu (Acceptance Criteria - AC)**:
    *   `[AC-1]` Biên dịch thành công backend và frontend.
    *   `[AC-2]` Tạo dự án trùng mã code trên 2 Workspace khác nhau $\rightarrow$ Thành công. Tạo trùng trên cùng Workspace $\rightarrow$ Trả về `400 Bad Request`.
    *   `[AC-3]` API `POST /documents/links` kiểm tra và ngăn chặn vòng lặp phụ thuộc (ví dụ: A là con B, B là con C, C không được là con A) và trả về lỗi `409 Conflict`.
    *   `[AC-4]` Khi tài liệu cha bị xóa tạm thời (soft-deleted bằng `deletedAt`), liên kết `DocumentLink` tương ứng chuyển trạng thái thành `broken`.

---

### 🎫 LAW-F7-02: [AI/Backend] Service Trích Xuất Metadata Dự Án (Gemini AI Engine)
*   **Mô tả**: Xây dựng service nền kết nối với Gemini qua [ai-provider.service.ts](file:///Users/lyanhquan/code/lawzy/backend/src/modules/ai/ai-provider.service.ts) để tự động trích xuất các biến cấu trúc pháp lý (Chủ đầu tư, Nhà thầu, Công suất, Địa điểm, Căn cứ pháp lý) từ 3 trang đầu của tài liệu khi tải lên.
*   **Đầu ra (Output)**:
    *   Service: `ProjectMetadataExtractorService` trong module `source-processing` hoặc `projects`.
    *   Hệ thống prompt đặc tả cấu trúc JSON trả về từ Gemini.
*   **Tiêu chí nghiệm thu (Acceptance Criteria - AC)**:
    *   `[AC-1]` AI trích xuất thành công JSON chứa ít nhất: `projectName`, `developerName`, `contractorName`, `capacity`, `location`, `legalBases`.
    *   `[AC-2]` Khi tài liệu lỗi hoặc scan mờ không OCR được, hệ thống tự động ghi nhận lỗi vào `metadata.error` thay vì crash tiến trình tải lên.
    *   `[AC-3]` Tích hợp thành công vào luồng upload tệp trong `documents.service.ts`.

---

### 🎫 LAW-F7-03: [Backend/AI] Engine Đề Xuất Liên Kết Parent-Child Tự Động
*   **Mô tả**: Sử dụng AI quét Preamble của phụ lục để tìm kiếm số hiệu hợp đồng gốc. Thực hiện fuzzy matching trong DB để sinh đề xuất liên kết parent-child dưới trạng thái `'ai_suggested'`.
*   **Đầu ra (Output)**:
    *   Service: `ProjectLinkerSuggestionService`.
    *   Endpoint: `GET /documents/:id/linking-suggestions` trả về các liên kết đề xuất từ AI.
    *   Endpoint: `POST /documents/:id/accept-link` và `POST /documents/:id/reject-link`.
*   **Tiêu chí nghiệm thu (Acceptance Criteria - AC)**:
    *   `[AC-1]` AI phát hiện số hiệu hợp đồng gốc (ví dụ: *HĐ số 15/2026/GP*) trong phụ lục và tìm đúng tài liệu gốc có trường `metadata.contractNumber` tương ứng.
    *   `[AC-2]` Khi người dùng từ chối đề xuất, trạng thái lưu thành `'ai_rejected'` để AI không bao giờ gợi ý lại liên kết này.

---

### 🎫 LAW-F7-04: [Backend/AI] Clause-level Mapping & Versioning Engine
*   **Mô tả**: Khi phụ lục được liên kết thành công, AI phân tích các thay đổi trên từng điều khoản (ví dụ: *"Sửa đổi Điều 5..."*). Lưu bản ghi đè hiệu lực trong `ClauseMapping` giữa các ID Clause tĩnh (sử dụng cấu trúc định danh của `ClauseExtension` TipTap).
*   **Đầu ra (Output)**:
    *   Service: `ClauseVersioningService`.
    *   Endpoint: `GET /documents/:id/clause-mappings` lấy bản đồ hiệu lực điều khoản của tệp.
*   **Tiêu chí nghiệm thu (Acceptance Criteria - AC)**:
    *   `[AC-1]` AI ánh xạ chính xác điều khoản bị đè (Điều 5 gốc) và điều khoản thay thế (Mục 2 phụ lục).
    *   `[AC-2]` Cập nhật thuộc tính của Node Clause bị đè trong hợp đồng gốc thành `status: 'superseded'` và lưu liên kết trỏ tới tài liệu phụ lục.

---

### 🎫 LAW-F7-05: [Backend/AI] Change Propagation & Consistency Validator
*   **Mô tả**: Bộ máy chạy background kiểm tra tính nhất quán thông số chéo giữa các tài liệu trong dự án (ví dụ: phát hiện công suất dự án bị lệch giữa Hợp đồng EPC và Biên bản nghiệm thu).
*   **Đầu ra (Output)**:
    *   Service: `ConsistencyValidatorService`.
    *   Endpoint: `POST /projects/:id/validate-consistency` kích hoạt quét thủ công.
    *   Endpoint: `GET /projects/:id/mismatch-alerts` trả về danh sách cảnh báo sai lệch trong dự án.
*   **Tiêu chí nghiệm thu (Acceptance Criteria - AC)**:
    *   `[AC-1]` Phát hiện chính xác các sai lệch giá trị giữa các tệp kế thừa thông số trong cùng dự án và lưu vào bảng `MismatchAlert`.
    *   `[AC-2]` Khi người dùng chỉnh sửa thông số đồng nhất, chạy lại kiểm tra sẽ tự động chuyển trạng thái alert thành `resolved`.
    *   `[AC-3]` Lọc các cảnh báo theo phân quyền xem tài liệu (RBAC) của người dùng hiện tại để bảo mật thông tin nhạy cảm.

---

### 🎫 LAW-F7-06: [Frontend] UI Cây Tài Liệu & Lớp Phủ Hiệu Lực Trực Quan
*   **Mô tả**: Triển khai giao diện Document Tree View tại màn hình dự án và lớp phủ (badge/sheet) cảnh báo điều khoản hết hiệu lực trên Editor.
*   **Đầu ra (Output)**:
    *   Màn hình giao diện: `/app/(dashboard)/projects/[id]/page.tsx` hiển thị sơ đồ cây dự án.
    *   Sidebar so sánh Side-by-side tại Editor chi tiết.
*   **Tiêu chí nghiệm thu (Acceptance Criteria - AC)**:
    *   `[AC-1]` Sơ đồ cây hiển thị phân cấp thụt lề chính xác theo trường `parentId`.
    *   `[AC-2]` Trong editor, các điều khoản bị sửa đổi có badge màu cam nhấp nháy. Click vào sẽ mở Side Sheet hiển thị so sánh nội dung cũ (gạch ngang) và nội dung mới ở Phụ lục tương ứng.

---

## 4. Quy Trình Phê Duyệt & Thực Thi
1. Người dùng phê duyệt kế hoạch tổng thể này.
2. Chúng tôi tạo bảng công việc trong `task.md` để theo dõi.
3. Bắt tay thực hiện ticket **LAW-F7-01**. Sau khi hoàn thành và vượt qua kiểm thử build, chúng tôi sẽ **dừng lại** báo cáo cụ thể mã nguồn thay đổi và đợi người dùng ra lệnh tiếp theo.
