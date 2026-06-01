# LAWZY x GREEN POWER - KẾ HOẠCH TRIỂN KHAI & DANH SÁCH LARK TICKET (F7 & F6)

Tài liệu này được biên soạn dựa trên phân tích chi tiết mã nguồn đã code trong commit `dc5090051f0617e010ae3dace301f7313084c94b` và kế hoạch tổng thể từ file `Lawzy x Green - Development plan - HMQ-check.csv`.

---

## I. ĐÁNH GIÁ TRẠNG THÁI CODE HIỆN TẠI (GIT COMMIT `dc509005`)

### 1. Phân hệ F7 (Hồ Sơ Dự Án & Quản Lý Phiên Bản)
*   **Trạng thái:** **Hoàn thành 100% phần Code** (bao gồm cả Backend Services, REST APIs, AI prompts, kịch bản Smoke Tests và giao diện Frontend).
*   **Các cấu phần đã viết:**
    *   **Database Schema:** Bổ sung các bảng `Project`, `DocumentLink`, `ClauseMapping`, `MismatchAlert` và thêm các trường `projectId`, `parentId` tự tham chiếu phân cấp vào bảng `Document` trong [schema.prisma](file:///d:/Workspace/lawzy/backend/prisma/schema.prisma).
    *   **Backend Services:**
        *   `ProjectsService`: CRUD Dự án theo từng Workspace.
        *   `ProjectMetadataExtractorService`: AI quét thông số dự án (`projectName`, `developerName`, `contractorName`, `capacity`, `location`, `legalBases`, `contractNumber`) từ tệp đính kèm vật lý (PDF/Word) hoặc fallback sang TipTap JSON.
        *   `ProjectLinkerSuggestionService`: AI quét preamble văn bản để tự động nhận dạng số hiệu hợp đồng gốc, đề xuất liên kết parent-child dưới dạng `ai_suggested`.
        *   `ClauseVersioningService`: AI quét cấu trúc câu chữ trong TipTap JSON để tự động ánh xạ phiên bản điều khoản bị thay thế/sửa đổi/bổ sung, cập nhật trực tiếp `status: 'superseded'` vào block văn bản của hợp đồng gốc.
        *   `ConsistencyValidatorService`: AI đối chiếu chéo metadata giữa các tài liệu cùng dự án để phát hiện mâu thuẫn (lệch công suất, lệch tên chủ đầu tư/nhà thầu...) và tạo `MismatchAlert` phân quyền theo RBAC.
    *   **Frontend UI:**
        *   Màn hình chi tiết dự án tại [projects/[id]/page.tsx](file:///d:/Workspace/lawzy/frontend/src/app/(dashboard)/projects/[id]/page.tsx) hiển thị sơ đồ cây tài liệu thụt đầu dòng đệ quy và danh sách `MismatchAlert` lệch thông số chéo.
        *   Màn hình Editor tại [editor/[id]/page.tsx](file:///d:/Workspace/lawzy/frontend/src/app/(dashboard)/editor/[id]/page.tsx) tích hợp với [clause.tsx](file:///d:/Workspace/lawzy/frontend/src/lib/tiptap/extensions/clause.tsx) lắng nghe sự kiện click badge "Đã bị thay thế", hiển thị Side Sheet so sánh văn bản cũ - mới song song cực kỳ trực quan.

### 2. Phân hệ F6 (Quản Lý Nghĩa Vụ)
*   **Trạng thái:** **Chưa được triển khai (0%)**.
*   **Thiếu sót:**
    *   Bảng `Obligation` chưa có trong [schema.prisma](file:///d:/Workspace/lawzy/backend/prisma/schema.prisma).
    *   Thư mục backend `backend/src/modules/obligations` chưa được khởi tạo.
    *   Chưa có màn hình gợi ý nghĩa vụ AI và Kanban Board theo dõi nghĩa vụ trên Frontend.

---

## II. LƯU Ý QUAN TRỌNG & ĐIỂM CHƯA HỢP LÝ CẦN KHẮC PHỤC

> [!IMPORTANT]
> **1. Lỗi DB Drift khi Pull Code mới:**
> Việc pull code mới có thay đổi cấu trúc Prisma nhưng DB local `lawzy-mysql-dev` (port 3307) đã chứa dữ liệu cũ. Khi chạy `npm run db:setup` sẽ bị lỗi **Error: P3005 (The database schema is not empty)** do Prisma phát hiện lệch lịch sử migration. 
> *   *Giải pháp:* Cần tiến hành reset DB bằng cách drop schema hiện tại hoặc chạy `npx prisma migrate dev --name init_projects` (chấp nhận reset/mất dữ liệu cũ) để đồng bộ cấu trúc mới.
>
> **2. Thiếu Schema Model Obligation cho F6:**
> File kế hoạch yêu cầu bảng Obligation phân tách rõ Financial & Non-Financial nhưng hiện trạng DB hoàn toàn chưa thiết kế bảng này. Cần bổ sung ngay cấu trúc model này vào `schema.prisma`.
>
> **3. Cơ chế kích hoạt trích xuất nghĩa vụ AI (F6-02):**
> Việc AI trích xuất nghĩa vụ nên chạy dưới dạng **Background Job/Asynchronous Event** (ví dụ NestJS `EventEmitter` hoặc `Queue`) khi document chuyển sang trạng thái "Đã ký duyệt" (`signed`), tránh chặn luồng HTTP request chính của người dùng khiến giao diện bị đơ/chậm.

---

## III. DANH SÁCH LARK TICKET (EPIC, PARENT, CHILD TASK)

Dưới đây là danh sách Lark Ticket được cấu trúc rõ ràng theo cấu trúc phân cấp Parent-Child (Cha-Con) để bạn dễ dàng copy và tạo ticket trên Lark.

### 1. PHÂN HỆ F7: HỒ SƠ DỰ ÁN & QUẢN LÝ PHIÊN BẢN

#### [EPIC][BE/FE] – Project Management – F7 – Hồ Sơ Dự Án & Quản Lý Phiên Bản
*   **Mô tả:** Gom nhóm tài liệu pháp lý theo từng hồ sơ dự án của khách hàng, tự động phát hiện liên kết phụ lục/nghiệm thu và kiểm tra tính nhất quán thông số chéo bằng AI.

---

##### [TASK][BE] – Project Management – F7-01 – US-F7-01 – TC-F7-001 – Cấu trúc DB Project & Quan hệ phân cấp tự tham chiếu
*   **Loại:** Backend (Đã code - Chờ chạy Migration)
*   **Mô tả chi tiết & Tiêu chí nghiệm thu (AC):**
    *   Tạo bảng `Project` (id, workspaceId, name, code, description) liên kết với `Workspace`.
    *   Bổ sung trường `projectId`, `parentId` tự tham chiếu (Self-referencing relation) trên bảng `Document` để xây dựng cấu trúc cây.
    *   Bổ sung các bảng hỗ trợ: `DocumentLink`, `ClauseMapping`, `MismatchAlert`.
    *   Cập nhật API CRUD tài liệu để tự động lọc theo dự án.
*   **Tái sử dụng & Tối ưu:** Kế thừa cơ chế tự tham chiếu phân cấp sẵn có tại model `SourceChunk`.

##### [TASK][BE] – Project Management – F7-02 – US-F7-02 – TC-F7-002 – AI Metadata Extractor - Trích xuất thông số dự án
*   **Loại:** AI / Backend (Đã code)
*   **Mô tả chi tiết & Tiêu chí nghiệm thu (AC):**
    *   Xây dựng `ProjectMetadataExtractorService` đọc file vật lý (PDF/Word) trên R2, nếu lỗi fallback sang đọc TipTap `contentJSON`.
    *   Gửi 8000 ký tự đầu tiên sang Gemini AI để trích xuất JSON định dạng: `projectName`, `developerName`, `contractorName`, `capacity`, `location`, `legalBases`, `contractNumber`.
    *   Tự động lưu kết quả vào trường `metadata` của tài liệu trong DB khi tài liệu chuyển sang trạng thái `completed`/`signed`.
*   **Tái sử dụng & Tối ưu:** Kế thừa pipeline trích xuất văn bản (OCR/Parsing) từ module `source-processing`.

##### [TASK][BE] – Project Management – F7-03 – US-F7-03 – TC-F7-003 – AI Link Suggestions - Quét Preamble gợi ý liên kết
*   **Loại:** AI / Backend (Đã code)
*   **Mô tả chi tiết & Tiêu chí nghiệm thu (AC):**
    *   Xây dựng `ProjectLinkerSuggestionService` quét 3000 ký tự đầu (Preamble) gửi Gemini nhận dạng số hiệu hợp đồng gốc.
    *   Thực hiện so khớp mờ (Fuzzy matching) loại bỏ ký tự đặc biệt để tìm hợp đồng gốc trong cùng Workspace.
    *   Tạo liên kết đề xuất `DocumentLink` với trạng thái `ai_suggested`.
    *   Viết APIs `accept-link` (chuyển trạng thái sang `active`, gán `parentId`), `reject-link` (chuyển trạng thái sang `ai_rejected` để chặn gợi ý lại).
*   **Tái sử dụng & Tối ưu:** Tận dụng DB Transaction để đảm bảo tính nhất quán khi cập nhật cây quan hệ tài liệu.

##### [TASK][BE] – Project Management – F7-04 – US-F7-04 – TC-F7-004 – Clause-Level Versioning - Ánh xạ biến động điều khoản
*   **Loại:** AI / Backend (Đã code)
*   **Mô tả chi tiết & Tiêu chí nghiệm thu (AC):**
    *   Xây dựng `ClauseVersioningService` quét đệ quy các block `type: 'clause'` từ JSON TipTap của cả Hợp đồng chính và Phụ lục.
    *   Dùng AI đối chiếu văn nghĩa để xác định quan hệ đè hiệu lực (`supersedes`, `modifies`, `extends`).
    *   Cập nhật trực tiếp trạng thái `status: 'superseded'`, `supersededByDocumentId`, `supersededByClauseId` vào JSON gốc của hợp đồng chính.
    *   Lưu lịch sử chi tiết vào bảng `clause_mappings`.
*   **Tái sử dụng & Tối ưu:** Sử dụng cấu trúc lưu trữ Metadata của block văn bản sẵn có trong schema.

##### [TASK][BE] – Project Management – F7-05 – US-F7-05 – TC-F7-005 – Consistency Validator - Đối chiếu thông số chéo & RBAC
*   **Loại:** AI / Backend (Đã code)
*   **Mô tả chi tiết & Tiêu chí nghiệm thu (AC):**
    *   Xây dựng `ConsistencyValidatorService` gom tất cả tài liệu trong cùng dự án, dùng AI so khớp chéo các biến kỹ thuật/pháp lý (`capacity`, `location`, `developerName`...).
    *   Tạo cảnh báo `MismatchAlert` (`unresolved`) nếu phát hiện sai lệch thông số.
    *   Tự động giải phóng cảnh báo (`resolved`) khi thông số được cập nhật đồng nhất.
    *   Lọc phân quyền hiển thị cảnh báo (RBAC): Ẩn cảnh báo liên quan đến tài liệu mật (`visibility: 'private'`) của user khác.
*   **Tái sử dụng & Tối ưu:** Tái sử dụng module bảo mật phân quyền Workspace membership.

##### [TASK][FE] – Project Management – F7-06 – US-F7-06 – TC-F7-006 – Component Sơ đồ Cây tài liệu trực quan (Tree View)
*   **Loại:** Frontend (Đã code)
*   **Mô tả chi tiết & Tiêu chí nghiệm thu (AC):**
    *   Xây dựng trang chi tiết dự án `/projects/[id]`.
    *   Thiết kế component hiển thị cấu trúc sơ đồ cây phân cấp của dự án bằng thuật toán đệ quy co giãn thụt đầu dòng (indentation) tự động dựa trên `parentId`.
    *   Hiển thị danh sách cảnh báo sai lệch thông số (Mismatch Alerts) phân loại theo mức độ nghiêm trọng (Cao / Trung bình).
    *   Tích hợp nút kích hoạt quét nhất quán thông số chéo thủ công kèm hiệu ứng loading xoay tròn.
*   **Tái sử dụng & Tối ưu:** Tái sử dụng cấu trúc tương tác UI (hover/click/active) từ sidebar và primitives của `ui/card`, `ui/badge`.

##### [TASK][FE] – Project Management – F7-07 – US-F7-07 – TC-F7-007 – Overlay Cảnh báo bản đồ hiệu lực & Side Sheet so sánh song song trong Editor
*   **Loại:** Frontend (Đã code)
*   **Mô tả chi tiết & Tiêu chí nghiệm thu (AC):**
    *   Tích hợp bộ quét vào tiến trình render nội dung TipTap của hợp đồng chính.
    *   Nếu phát hiện block văn bản mang trạng thái `status === 'superseded'`, tự động chèn một Alert Badge màu cam nổi bật: *"Đã được sửa đổi bởi Phụ lục số X - Xem chi tiết"*.
    *   Khi người dùng click vào badge, mở một Side Sheet hiển thị giao diện so sánh song song (side-by-side) giữa điều khoản cũ (gạch ngang màu đỏ) và điều khoản mới nhất ở phụ lục con (nền cam nhạt).
*   **Tái sử dụng & Tối ưu:** Tái sử dụng Side Sheet từ `ui/sheet` và kế thừa panel hiển thị trích dẫn nguồn `citation-panel.tsx`.

---
---

### 2. PHÂN HỆ F6: QUẢN LÝ NGHĨA VỤ

#### [EPIC][BE/FE] – Obligation – F6 – Quản Lý Nghĩa Vụ Hợp Đồng
*   **Mô tả:** Tự động nhận diện, trích xuất nghĩa vụ tài chính và phi tài chính từ hợp đồng đã ký bằng AI, đồng bộ lịch làm việc và tự động leo thang cảnh báo khi quá hạn.

---

##### [TASK][BE] – Obligation – F6-01 – US-F6-01 – TC-F6-001 – Cấu trúc DB Obligation & REST API CRUD
*   **Loại:** Backend (Chưa thực hiện - Cần code mới)
*   **Mô tả chi tiết & Tiêu chí nghiệm thu (AC):**
    *   Thêm bảng `Obligation` vào `schema.prisma` gồm các trường:
        *   *Chung:* `id`, `documentId`, `workspaceId`, `picId` (PIC xử lý), `title`, `status` (`pending`, `in_progress`, `completed`, `overdue`, `escalated`), `dueDate`, `createdAt`, `updatedAt`.
        *   *Financial (Tài chính):* `amount` (Decimal), `percentage` (Float), `triggerCondition` (Text).
        *   *Non-Financial (Phi tài chính):* `obligationType` (`warranty`, `inspection`, `delivery`...), `effectivePeriod` (Text), `responsibleVendor` (String).
    *   Viết bộ REST APIs CRUD:
        *   `GET /documents/:id/obligations`: Lấy danh sách nghĩa vụ của tài liệu.
        *   `POST /documents/:id/obligations`: Tạo thủ công nghĩa vụ.
        *   `PATCH /obligations/:id`: Cập nhật trạng thái, gia hạn hoặc đổi PIC.
        *   `DELETE /obligations/:id`: Xóa nghĩa vụ.
*   **Tái sử dụng & Tối ưu:** Chuẩn hóa cấu trúc trả về dữ liệu giống module `documents` và kiểm tra quyền truy cập thông qua `WorkspaceAccessService`.

##### [TASK][BE] – Obligation – F6-02 – US-F6-02 – TC-F6-002 – AI Job Obligation Service - Tự động trích xuất nghĩa vụ bằng Gemini
*   **Loại:** AI / Backend (Chưa thực hiện - Cần code mới)
*   **Mô tả chi tiết & Tiêu chí nghiệm thu (AC):**
    *   Xây dựng service `AIJobObligationService` tự động kích hoạt khi tài liệu chuyển sang trạng thái "Đã ký duyệt" (`signed`).
    *   Thiết kế System Prompt chuyên sâu gửi `contentJSON` của TipTap sang Gemini để bóc tách các cam kết tĩnh thành data có cấu trúc khớp Schema:
        *   Nhận diện các điều khoản bảo hành dài hạn (ví dụ: Tấm pin mặt trời bảo hành 20 năm, Inverter bảo hành 5 năm).
        *   Nhận diện tiến độ thanh toán (ví dụ: Thanh toán 10% khi giao hàng).
        *   Tự động tính toán ngày đáo hạn tương đối từ ngày ký hợp đồng.
    *   Lưu các nghĩa vụ đề xuất này dưới trạng thái nháp (`status: 'pending'`).
*   **Tái sử dụng & Tối ưu:** Sử dụng `ai-provider.service.ts` tích hợp sẵn hàm `generateContentWithRetry` xử lý cơ chế Exponential Backoff để chống lỗi mạng.

##### [TASK][BE] – Obligation – F6-03 – US-F6-03 – TC-F6-003 – ICS Calendar Feed & NestJS Cron Job leo thang cảnh báo
*   **Loại:** Backend (Chưa thực hiện - Cần code mới)
*   **Mô tả chi tiết & Tiêu chí nghiệm thu (AC):**
    *   Xây dựng API `/api/obligations/calendar-feed/:token` kết xuất dữ liệu cấu trúc iCalendar (.ics) giúp người dùng đồng bộ lịch nghĩa vụ lên Google Calendar, Outlook hoặc Lark.
    *   Viết NestJS Cron Job chạy định kỳ mỗi sáng:
        *   Gửi mail thông báo nhắc nhở trước hạn 30, 15, 7 ngày cho PIC.
        *   **Cấp độ 1 (High Alert):** Chuyển trạng thái sang `overdue` (đỏ) vào đúng Due Date, gửi thông báo cảnh báo.
        *   **Cấp độ 2 (Leo thang SLA):** Nếu trễ hạn quá 3 ngày, tự động chuyển trạng thái sang `escalated` và bắn mail báo cáo trực tiếp tới Trưởng phòng/CEO.
*   **Tái sử dụng & Tối ưu:** Tái sử dụng module email tại `src/modules/email` và kho template email có sẵn trong hệ thống.

##### [TASK][FE] – Obligation – F6-04 – US-F6-04 – TC-F6-004 – Giao diện màn hình duyệt gợi ý nghĩa vụ AI
*   **Loại:** Frontend (Chưa thực hiện - Cần code mới)
*   **Mô tả chi tiết & Tiêu chí nghiệm thu (AC):**
    *   Xây dựng màn hình kiểm duyệt trung gian hiển thị danh sách checklist nghĩa vụ do AI tự động đề xuất.
    *   Cho phép Project Manager rà soát, chỉnh sửa trực tiếp nội dung nghĩa vụ, thời hạn, chỉ định PIC (Người chịu trách nhiệm) trước khi bấm "Xác nhận" để chính thức lưu vào DB.
*   **Tái sử dụng & Tối ưu:** Tái sử dụng cấu trúc bảng dữ liệu từ `ui/table.tsx` và component `Badge` hiển thị mức độ ưu tiên.

##### [TASK][FE] – Obligation – F6-05 – US-F6-05 – TC-F6-005 – Giao diện Kanban Board theo dõi nghĩa vụ kéo thả
*   **Loại:** Frontend (Chưa thực hiện - Cần code mới)
*   **Mô tả chi tiết & Tiêu chí nghiệm thu (AC):**
    *   Xây dựng màn hình Kanban Board tại đường dẫn `/documents/obligations` hiển thị danh sách nghĩa vụ chia làm 5 cột tương ứng với trạng thái công việc.
    *   Hỗ trợ kéo thả mượt mà để thay đổi trạng thái nghĩa vụ bằng cách ứng dụng thư viện `@dnd-kit/core` và `@dnd-kit/sortable`.
    *   Thêm bộ lọc nhanh nghĩa vụ theo loại (Tài chính / Phi tài chính), theo PIC, và highlight màu đỏ nổi bật cho các thẻ nghĩa vụ quá hạn.
*   **Tái sử dụng & Tối ưu:** Kế thừa phong cách phối màu HSL dark-theme sẵn có của hệ thống.

---

## IV. BƯỚC TRIỂN KHAI THỰC TẾ NGAY HÔM NAY (IMPLEMENTATION STEPS)

Dưới đây là các bước kỹ thuật chi tiết giúp bạn triển khai đồng bộ thành công cả F7 (đang lỗi migration) và F6 (chưa có code).

### Bước 1: Khắc phục lỗi DB Drift & Apply cấu trúc F7
Do database của bạn có lịch sử drift không đồng bộ, hãy chạy chuỗi lệnh sau tại thư mục `backend/` để làm sạch DB và đồng bộ cấu trúc F7 mới nhất:

```powershell
# Di chuyển vào thư mục backend
cd backend

# Thực hiện reset database bắt buộc (lệnh này sẽ xóa sạch các bảng cũ bị drift và apply lại toàn bộ 18 migrations)
npx prisma migrate reset --force

# Chạy seed dữ liệu hệ thống (tài khoản test, template email...)
npm run db:setup
```

### Bước 2: Chạy thử kịch bản Smoke Tests kiểm chứng F7
Để đảm bảo tất cả logic AI, fuzzy match và đè điều khoản hoạt động chính xác trước khi đưa lên sản phẩm, bạn hãy chạy lần lượt các kịch bản smoke-test tự động sẵn có:

```powershell
# Chạy smoke-test kiểm tra quan hệ phân cấp, chặn vòng lặp
npx ts-node -r tsconfig-paths/register scripts/f7-02-smoke-test.ts

# Chạy smoke-test kiểm tra trích xuất Metadata AI
npx ts-node -r tsconfig-paths/register scripts/f7-03-smoke-test.ts

# Chạy smoke-test kiểm tra gợi ý liên kết phụ lục AI
npx ts-node -r tsconfig-paths/register scripts/f7-04-smoke-test.ts

# Chạy smoke-test kiểm tra đối chiếu nhất quán chéo AI
npx ts-node -r tsconfig-paths/register scripts/f7-05-smoke-test.ts
```

### Bước 3: Định nghĩa bảng Obligation trong `schema.prisma` (F6 Backend)
Mở file `backend/prisma/schema.prisma` và thêm model `Obligation` vào cuối file:

```prisma
model Obligation {
  id                String    @id @default(uuid())
  documentId        String    @map("document_id")
  workspaceId       String    @map("workspace_id")
  picId             String?   @map("pic_id")
  title             String    @db.VarChar(255)
  description       String?   @db.Text
  status            String    @default("pending") // 'pending' | 'in_progress' | 'completed' | 'overdue' | 'escalated'
  dueDate           DateTime  @map("due_date")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  // Nhóm thuộc tính tài chính
  amount            Decimal?  @db.Decimal(15, 2)
  percentage        Float?
  triggerCondition  String?   @db.Text @map("trigger_condition")

  // Nhóm thuộc tính phi tài chính
  obligationType    String?   @map("obligation_type") // 'warranty' | 'inspection' | 'delivery' | 'other'
  effectivePeriod   String?   @db.VarChar(255) @map("effective_period")
  responsibleVendor String?   @db.VarChar(255) @map("responsible_vendor")

  // Quan hệ liên kết
  document          Document  @relation(fields: [documentId], references: [id], onDelete: Cascade)
  workspace         Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([documentId])
  @@index([workspaceId])
  @@index([status])
  @@map("obligations")
}
```

Đồng thời, cập nhật quan hệ trong `model Document` và `model Workspace` để liên kết với `Obligation[]`. Sau đó, chạy lệnh tạo migration mới:
```powershell
npx prisma migrate dev --name add_obligation_model
```

### Bước 4: Triển khai Module Backend `obligations`
1. Khởi tạo thư mục: `backend/src/modules/obligations/`.
2. Tạo các cấu phần:
    *   `obligations.module.ts`: Đăng ký Controller, Service và nạp `PrismaModule`.
    *   `obligations.controller.ts`: Định nghĩa các route REST APIs CRUD (GET, POST, PATCH, DELETE).
    *   `obligations.service.ts`: Xử lý logic truy vấn, cập nhật trạng thái nghĩa vụ và kiểm tra quyền thông qua `WorkspaceAccessService`.

### Bước 5: Phát triển AI Job & Cron Job leo thang cảnh báo
1. **AI Job:** Tạo file `backend/src/modules/ai/services/ai-job-obligation.service.ts`. Định nghĩa System Prompt yêu cầu Gemini phân tích `contentJSON` của hợp đồng để bóc tách nghĩa vụ tài chính/phi tài chính thành định dạng JSON tương thích với Schema của bảng `Obligation`.
2. **Cron Job:** Tạo file `backend/src/modules/obligations/services/escalation-cron.service.ts`. Sử dụng thư viện `@nestjs/schedule` thiết lập task chạy định kỳ mỗi 8:00 sáng để quét do-date, gửi mail nhắc nhở PIC và cập nhật trạng thái `overdue`/`escalated`.

### Bước 6: Phát triển UI Kanban & Duyệt gợi ý AI trên Frontend
1. Tạo thư mục: `frontend/src/app/(dashboard)/documents/obligations/`.
2. Viết file `page.tsx` chứa:
    *   Component Kanban Board chia cột theo trạng thái, tích hợp `@dnd-kit/core` để bắt sự kiện kéo thả và gọi API `PATCH /obligations/:id` cập nhật trạng thái xuống DB.
    *   Một tab/modal phụ làm màn hình **Checklist duyệt nghĩa vụ gợi ý từ AI** trước khi bấm lưu.
