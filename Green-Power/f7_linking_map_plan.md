# Đặc Tả Kiến Trúc & Kế Hoạch Triển Khai Chi Tiết: F7 - Linking Map (Project Legal State Engine)

Tài liệu này đóng vai trò là bản kế hoạch chi tiết dành cho tính năng **F7 - Linking Map (Hồ sơ gắn theo dự án & Quản lý phiên bản)**. Từ một công cụ quản lý file phẳng, F7 biến đổi Lawzy thành một **"Project Legal State Engine"** (Động cơ quản lý trạng thái pháp lý dự án), phục vụ các dự án hạ tầng, xây dựng và năng lượng phức tạp (như doanh nghiệp **Green Power**).

---

## 1. Bối Cảnh & Pain Points (Nỗi đau của Doanh nghiệp)

Trong các dự án năng lượng tái tạo, xây dựng hoặc hạ tầng, một dự án (Project Container) có thể bao gồm hàng trăm hồ sơ pháp lý, hành chính, hợp đồng và tài liệu kỹ thuật khác nhau (Quyết định chủ trương đầu tư, Báo cáo đánh giá tác động môi trường - ĐTM, Hợp đồng EPC, Hợp đồng PPA, Giấy phép xây dựng, Biên bản nghiệm thu). 

### Các Pain Points cốt lõi:
1.  **Dữ liệu tĩnh và phân tán**: Mỗi văn bản là một file độc lập. Khi một thông số nguồn thay đổi (ví dụ: công suất dự án giảm từ 50MWp xuống 45MWp, hoặc thay đổi tên pháp nhân), không có cách nào để biết những hồ sơ downstream nào bị ảnh hưởng. Nhân viên phải tự rà soát thủ công, dẫn đến quên cập nhật hoặc sai lệch dữ liệu giữa các văn bản.
2.  **Mâu thuẫn hiệu lực ngược (Parent-Child Conflict)**: 
    *   *Chiều xuôi*: Hợp đồng gốc (Parent) thay đổi làm các phụ lục (Child) hoặc biên bản nghiệm thu bị lệch mốc thời gian/đơn giá.
    *   *Chiều ngược*: Phụ lục hợp đồng mới (Child) sửa đổi một điều khoản của Hợp đồng chính (Parent), làm điều khoản gốc của hợp đồng chính hết hiệu lực, nhưng khi đọc hợp đồng chính, người xem vẫn đọc nội dung cũ nếu không đối chiếu chéo thủ công.
3.  **Rủi ro không tuân thủ (Compliance Risks)**: Thiếu các điều kiện tiên quyết (Pre-requisites) trước khi nộp hồ sơ (ví dụ: Biên bản nghiệm thu nghiệm thu tĩnh khi chưa có Báo cáo kiểm định kỹ thuật hợp lệ).

---

## 2. Phân Tích Vai Trò Của AI Trong Hệ Thống Linking Map

Để biến hệ thống thành một mạng lưới pháp lý động (Legal Graph), **AI (Gemini)** được tích hợp sâu vào từng bước của quy trình:

| Bước Vận Hành | Vai trò của AI (Gemini Engine) | Lý do cần AI (Không thể dùng Code cứng) |
| :--- | :--- | :--- |
| **Bước 1: Trích xuất Metadata (Input)** | Khi tải lên tài liệu, AI quét Preamble và nội dung để trích xuất các biến cấu trúc: Công suất (MWp), Tên chủ đầu tư, Mã dự án, Tên nhà thầu, Ngày ký, Số hiệu quyết định. | Ngôn từ văn bản pháp lý đa dạng, không có cấu trúc cố định. AI cần hiểu ngữ cảnh để trích xuất đúng thực thể (Named Entity Recognition). |
| **Bước 2: Đề xuất Liên kết (Linking)** | AI phân tích mối quan hệ phụ thuộc. Ví dụ: Phát hiện câu chữ *"Căn cứ theo Hợp đồng số 15/2026/HĐ-GP..."* để đề xuất liên kết Child (Phụ lục) - Parent (Hợp đồng gốc). | Số hiệu hợp đồng hoặc tên dự án có thể bị viết tắt hoặc sai lệch nhỏ (ví dụ: "HĐ-15" vs "15/2026/HĐ"). AI thực hiện khớp mờ (Fuzzy Matching) và hiểu ngữ nghĩa. |
| **Bước 3: Lan truyền thay đổi (Propagation)** | Khi một thông số nguồn (ví dụ: Công suất dự án) thay đổi ở văn bản gốc, AI quét các tài liệu downstream kế thừa thông số này và xác định chính xác những điều khoản nào bị ảnh hưởng. | Code cứng chỉ tìm được từ khóa. AI cần đánh giá xem sự thay đổi thông số đó có làm thay đổi nghĩa vụ hoặc tính hợp pháp của điều khoản downstream hay không. |
| **Bước 4: Kiểm tra Nhất quán (Consistency)** | AI đối chiếu chéo các thông số giữa các tài liệu trong dự án (ví dụ: so khớp tên Công ty EPC trong Hợp đồng EPC với Biên bản nghiệm thu). | Phát hiện mâu thuẫn logic và ngữ nghĩa giữa hai văn bản khác nhau mà không cần cấu trúc trường dữ liệu giống hệt nhau. |
| **Bước 5: Tự động tạo Phụ lục (Mitigation)** | AI tự động soạn thảo bản thảo Phụ lục điều chỉnh (Amendment Draft) để sửa đổi các điều khoản bị xung đột ở tài liệu downstream. | Soạn thảo văn bản pháp lý cá nhân hóa theo mẫu của doanh nghiệp và ngữ cảnh xung đột thực tế. |

---

## 3. Thiết Kế Cơ Sở Dữ Liệu (Database Schema)

Để hỗ trợ Graph pháp lý này, cơ sở dữ liệu sẽ được mở rộng trong [schema.prisma](file:///Users/lyanhquan/code/lawzy/backend/prisma/schema.prisma):

```prisma
// Cập nhật Model Document hiện tại
model Document {
  // ... các trường hiện có
  deletedAt        DateTime?        @map("deleted_at")
  projectId        String?          @map("project_id")
  parentId         String?          @map("parent_id")
  
  project          Project?         @relation(fields: [projectId], references: [id], onDelete: SetNull)
  parent           Document?        @relation("DocumentHierarchy", fields: [parentId], references: [id], onDelete: SetNull)
  children         Document[]       @relation("DocumentHierarchy")
  
  incomingLinks    DocumentLink[]   @relation("TargetDocument")
  outgoingLinks    DocumentLink[]   @relation("SourceDocument")
  clauseMappings   ClauseMapping[]  @relation("SourceClauseDoc")
  targetMappings   ClauseMapping[]  @relation("TargetClauseDoc")
  mismatchAlerts   MismatchAlert[]
}

// Model Project Container mới
model Project {
  id           String      @id @default(uuid())
  workspaceId  String      @map("workspace_id")
  name         String
  code         String      @map("code")
  description  String?     @db.Text
  createdAt    DateTime    @default(now()) @map("created_at")
  updatedAt    DateTime    @updatedAt @map("updated_at")

  workspace    Workspace   @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  documents    Document[]

  @@unique([workspaceId, code])
}

// Model quản lý liên kết động giữa các văn bản (Dependency & Inherit)
model DocumentLink {
  id               String   @id @default(uuid())
  sourceDocumentId String   @map("source_document_id")
  targetDocumentId String   @map("target_document_id")
  linkType         String   // 'dependency' | 'data_inheritance' | 'reference'
  description      String?  @db.Text
  status           String   @default("active") // 'active' | 'broken' | 'out_of_sync'
  createdAt        DateTime @default(now()) @map("created_at")

  sourceDocument   Document @relation("SourceDocument", fields: [sourceDocumentId], references: [id], onDelete: Cascade)
  targetDocument   Document @relation("TargetDocument", fields: [targetDocumentId], references: [id], onDelete: Cascade)

  @@unique([sourceDocumentId, targetDocumentId, linkType])
}

// Model quản lý phiên bản điều khoản chi tiết (Clause Versioning Map)
model ClauseMapping {
  id              String    @id @default(uuid())
  sourceDocId     String    @map("source_doc_id")
  targetDocId     String    @map("target_doc_id")
  sourceClauseId  String    @map("source_clause_id")
  targetClauseId  String    @map("target_clause_id")
  sourceClauseKey String    @map("source_clause_key") // Ví dụ: "Điều 5. Đơn giá" trong HĐ gốc
  targetClauseKey String    @map("target_clause_key") // Ví dụ: "Mục 2" trong Phụ lục
  mappingType     String    // 'supersedes' (ghi đè) | 'modifies' (sửa đổi) | 'extends' (bổ sung)
  status          String    @default("active")
  effectiveDate   DateTime? @map("effective_date")
  createdAt       DateTime  @default(now()) @map("created_at")

  sourceDoc       Document  @relation("SourceClauseDoc", fields: [sourceDocId], references: [id], onDelete: Cascade)
  targetDoc       Document  @relation("TargetClauseDoc", fields: [targetDocId], references: [id], onDelete: Cascade)

  @@index([sourceDocId])
  @@index([targetDocId])
}

// Model lưu trữ cảnh báo mâu thuẫn dữ liệu chéo
model MismatchAlert {
  id            String   @id @default(uuid())
  documentId    String   @map("document_id")
  fieldKey      String   @map("field_key") // Trường bị lệch, ví dụ: "capacity" hoặc "entity_name"
  sourceValue   String   @db.Text @map("source_value")
  mismatchValue String   @db.Text @map("mismatch_value")
  severity      String   @default("medium") // 'high' | 'medium' | 'low'
  description   String   @db.Text
  status        String   @default("unresolved") // 'unresolved' | 'resolved' | 'bypassed'
  createdAt     DateTime @default(now()) @map("created_at")

  document      Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@index([documentId])
}
```

---

## 4. Kế Hoạch Chi Tiết Các Vé Phát Triển (Jira-style Tickets)

Dưới đây là 6 ticket chi tiết được thiết kế theo đúng định dạng nghiệp vụ chuẩn để đội ngũ phát triển thực thi ngay:

### 🎫 LAW-F7-01: [Backend] DB Schema Migration & Graph Relationship Implementation
*   **Description**: Cập nhật cơ sở dữ liệu để hỗ trợ cấu trúc dự án hình cây và liên kết đồ thị pháp lý. Triển khai các API CRUD cơ bản cho thực thể `Project` và quản lý liên kết `DocumentLink` thủ công giữa các tài liệu.
*   **Actor**: User (Project Administrator)
*   **Trigger**: Quản trị viên truy cập màn hình Cài đặt dự án và tạo mới một dự án hoặc liên kết 2 tài liệu với nhau.
*   **Pre-Condition**:
    *   Người dùng đã đăng nhập và thuộc Workspace hiện tại.
    *   Có quyền `manage_workspace`.
*   **Post condition & AC**:
    *   **Post condition**:
        *   Bảng `Project`, `DocumentLink`, `ClauseMapping`, và `MismatchAlert` được khởi tạo thành công trong DB MySQL.
        *   Tài liệu (Document) có thể liên kết trực tiếp với một `projectId` và `parentId`.
    *   **AC**:
        *   [AC-1] Migration Prisma chạy thành công mà không gây mất mát dữ liệu hiện có của bảng `documents`.
        *   [AC-2] API `POST /projects` tạo thành công Project với mã `code` duy nhất trong Workspace.
        *   [AC-3] API `POST /documents/links` cho phép tạo liên kết giữa tài liệu A và B với `linkType` hợp lệ.
*   **System/user steps**:
    1.  User thực hiện migration DB bằng lệnh: `npx prisma migrate dev --name init_linking_map`.
    2.  User gửi request `POST /api/proxy/projects` kèm theo body `{ name: "Điện mặt trời Gia Lai", code: "GP-GIALAI-2026" }`.
    3.  Hệ thống kiểm tra tính duy nhất của `code`, tạo bản ghi và trả về đối tượng Project mới tạo.
    4.  User gọi API liên kết `POST /api/proxy/documents/links` với body `{ sourceDocumentId: "id-hd-goc", targetDocumentId: "id-phu-luc", linkType: "parent_child" }`.
*   **Exceptional case & message**:
    *   *Trùng mã dự án*: Hệ thống trả về mã lỗi `400 Bad Request` kèm thông điệp: `"Mã dự án này đã tồn tại trong hệ thống. Vui lòng chọn mã khác."`
    *   *Liên kết vòng lặp (Circular Dependency)*: Nếu liên kết tài liệu tạo thành vòng khép kín (A là con B, B là con A), API trả về lỗi `409 Conflict` kèm thông điệp: `"Không thể tạo liên kết. Phát hiện vòng lặp phụ thuộc giữa các tài liệu."`
*   **UI & behavior description**:
    *   Màn hình Cấu hình dự án hiển thị form tạo đơn giản: Nhập Tên dự án, Mã dự án (viết liền không dấu, tự động uppercase).
    *   Nút "Tạo dự án" hiển thị trạng thái loading khi đang gửi request.

---

### 🎫 LAW-F7-02: [AI/Backend] AI Metadata & Entity Extractor Service
*   **Description**: Xây dựng tiến trình nền tự động chạy khi tài liệu được chuyển trạng thái sang `completed` hoặc được tải lên trực tiếp vào thư mục dự án. Sử dụng Gemini để trích xuất các biến cấu trúc cốt lõi từ văn bản và lưu vào `document.metadata`.
*   **Actor**: System / User (nhân viên tải file lên)
*   **Trigger**: User bấm nút "Tải lên" tài liệu vào Thư mục dự án hoặc chuyển trạng thái tài liệu sang "Đã ký".
*   **Pre-Condition**:
    *   File tải lên thuộc định dạng PDF, DOCX hoặc TXT.
    *   Hệ thống OCR hoạt động bình thường đối với file scan.
*   **Post condition & AC**:
    *   **Post condition**:
        *   Bản ghi `Document` được cập nhật trường `metadata` chứa các biến pháp lý đã được chuẩn hóa.
    *   **AC**:
        *   [AC-1] AI trích xuất thành công ít nhất các trường: Tên dự án (`projectName`), Tên chủ đầu tư (`developerName`), Nhà thầu (`contractorName`), Công suất (`capacity`), Địa điểm (`location`), và Căn cứ pháp lý áp dụng (`legalBases`).
        *   [AC-2] Định dạng dữ liệu trả về từ AI là JSON hợp lệ theo đúng cấu trúc Schema quy định.
*   **System/user steps**:
    1.  User tải lên file hợp đồng EPC.
    2.  Backend tiếp nhận file, lưu vào S3/R2 và gọi service `source-processing` để lấy toàn bộ text.
    3.  Dịch vụ gọi Gemini qua [ai-provider.service.ts](file:///Users/lyanhquan/code/lawzy/backend/src/modules/ai/ai-provider.service.ts) với Prompt đặc tả trích xuất thực thể pháp lý.
    4.  Hệ thống parse kết quả JSON của Gemini và lưu vào trường `metadata` của `Document`.
*   **Exceptional case & message**:
    *   *AI không thể phân tích văn bản (file hỏng hoặc quá mờ)*: Lưu trạng thái xử lý lỗi vào `Document.metadata.error` và ghi log. Hiển thị cảnh báo trên UI: `"AI không thể tự động trích xuất thông tin. Bạn có thể tự điền thủ công."`
*   **UI & behavior description**:
    *   Khi đang xử lý, hàng tài liệu hiển thị một spinner nhỏ kèm text *"AI đang trích xuất thông tin..."*. Khi hoàn tất, các nhãn tag metadata (như công suất, chủ đầu tư) tự động xuất hiện trên dòng tài liệu.

---

### 🎫 LAW-F7-03: [Backend/AI] AI Suggestion Engine for Parent-Child Relationships
*   **Description**: Triển khai thuật toán AI quét phần mở đầu (Preamble) của tài liệu mới để tự động tìm kiếm thông số tham chiếu đến Hợp đồng gốc và gợi ý liên kết `parentId` trong cùng một dự án.
*   **Actor**: User (Project Manager)
*   **Trigger**: Tài liệu mới hoàn tất trích xuất metadata và hệ thống phát hiện có từ khóa chỉ định mối quan hệ phụ lục.
*   **Pre-Condition**:
    *   Tài liệu đã được gán mã dự án `projectId`.
    *   Có ít nhất một tài liệu khác trong cùng dự án đóng vai trò Hợp đồng chính (Master Document).
*   **Post condition & AC**:
    *   **Post condition**:
        *   Hệ thống tạo một đề xuất liên kết tạm thời. Nếu người dùng bấm chấp nhận, DB cập nhật `parentId`.
    *   **AC**:
        *   [AC-1] AI nhận diện được số hiệu hợp đồng gốc từ câu chữ phụ lục với độ chính xác > 90%.
        *   [AC-2] Giao diện hiển thị Alert Box hỏi ý kiến người dùng rõ ràng kèm theo nút [Xác nhận liên kết] và [Từ chối].
*   **System/user steps**:
    1.  AI quét thấy đoạn: *"Phụ lục số 02 này được lập căn cứ theo Hợp đồng số 15/2026/HĐ-GP..."*.
    2.  Hệ thống tìm trong DB các tài liệu cùng `projectId` có `metadata.contractNumber` khớp với `"15/2026/HĐ-GP"`.
    3.  Nếu tìm thấy, hệ thống tạo bản ghi liên kết đề xuất và gửi Event xuống Client qua API `GET /documents/:id/linking-suggestions`.
    4.  User bấm [Xác nhận liên kết] trên giao diện.
    5.  Hệ thống cập nhật `parentId` của phụ lục trỏ về hợp đồng gốc.
*   **Exceptional case & message**:
    *   *Không tìm thấy hợp đồng gốc khớp số hiệu*: Hệ thống không tạo đề xuất liên kết tự động và hiển thị thông báo phụ: `"Không tìm thấy tài liệu gốc phù hợp. Bạn có muốn tự chọn liên kết thủ công?"`
*   **UI & behavior description**:
    *   Hộp cảnh báo màu cam nổi bật hiển thị ở đầu trang chi tiết tài liệu: *"Hệ thống phát hiện tài liệu này là Phụ lục của hợp đồng chính 'HĐ mua bán điện số 15'. Bạn có muốn liên kết không?"* kèm 2 nút bấm thao tác nhanh.

---

### 🎫 LAW-F7-04: [Backend/AI] Clause-level Mapping & Versioning Engine
*   **Description**: Triển khai engine phân tích điều khoản. Khi Phụ lục (Child) được liên kết vào Hợp đồng chính (Parent), AI phân tích các thay đổi cụ thể trên từng điều khoản (ví dụ: *"Sửa đổi Điều 5..."*) để tạo cây lịch sử hiệu lực điều khoản (Clause Versioning Tree).
*   **Actor**: System
*   **Trigger**: User phê duyệt liên kết quan hệ Parent-Child giữa Hợp đồng chính và Phụ lục.
*   **Pre-Condition**:
    *   Cả hai tài liệu đều có cấu trúc nội dung hợp lệ (`contentJSON` của TipTap không trống).
*   **Post condition & AC**:
    *   **Post condition**:
        *   Các bản ghi `ClauseMapping` được tạo trong DB để ghi nhận trạng thái: Điều 5 gốc bị `superseded` bởi Điều 5 mới trong Phụ lục.
    *   **AC**:
        *   [AC-1] AI trích xuất chính xác điều khoản bị thay thế và điều khoản thay thế.
        *   [AC-2] Hệ thống đánh dấu trạng thái của điều khoản gốc thành hết hiệu lực pháp lý (inactive/superseded) kể từ ngày phụ lục có hiệu lực.
*   **System/user steps**:
    1.  Hệ thống kích hoạt background worker khi nhận được event `document.linked`.
    2.  Worker gọi Gemini gửi text của phụ lục và mục lục điều khoản hợp đồng gốc.
    3.  Gemini trả về danh sách ánh xạ điều khoản: `[{ sourceClauseKey: "Điều 5", targetClauseKey: "Mục 2", mappingType: "supersedes" }]`.
    4.  Hệ thống ghi đè metadata của block "Điều 5" trong `contentJSON` của hợp đồng gốc: `{ active: false, supersededBy: "id-phu-luc-2" }`.
*   **Exceptional case & message**:
    *   *AI không xác định được điều khoản bị sửa đổi do câu từ quá mơ hồ*: Hệ thống ghi nhận trạng thái cảnh báo trên tài liệu gốc: `"Phát hiện phụ lục có sửa đổi điều khoản nhưng AI không thể tự động ánh xạ. Vui lòng kiểm tra thủ công."`
*   **UI & behavior description**:
    *   Tiến trình chạy ngầm hoàn toàn không gây chặn UI của người dùng. Trạng thái bản đồ hiệu lực được cập nhật ngay khi người dùng tải lại trang hợp đồng.

---

### 🎫 LAW-F7-05: [Backend/AI] Change Propagation & Consistency Validator
*   **Description**: Xây dựng bộ máy kiểm tra tính nhất quán (Consistency Checking) chéo giữa các tài liệu trong dự án. Tự động phát hiện xung đột dữ liệu (ví dụ: công suất dự án bị lệch giữa Hợp đồng EPC và Giấy phép sở) và lan truyền trạng thái "Out of Sync" tới các tài liệu downstream.
*   **Actor**: System
*   **Trigger**: Một tài liệu nguồn trong dự án (ví dụ: Giấy phép đầu tư) được cập nhật hoặc chỉnh sửa thông số.
*   **Pre-Condition**:
    *   Tài liệu thuộc dự án đã được thiết lập các liên kết `DocumentLink` kiểu `data_inheritance` hoặc `dependency`.
*   **Post condition & AC**:
    *   **Post condition**:
        *   Tự động tạo các bản ghi `MismatchAlert` trong DB cho các tài liệu downstream có dữ liệu bị lệch.
        *   Trạng thái liên kết `DocumentLink.status` chuyển thành `out_of_sync`.
    *   **AC**:
        *   [AC-1] Phát hiện tất cả các lỗi lệch tên pháp nhân, lệch công suất dự án, lệch tiến độ giữa các văn bản trong cùng một dự án.
        *   [AC-2] Tự động giải phóng cảnh báo khi người dùng cập nhật thông số đồng nhất.
*   **System/user steps**:
    1.  User sửa công suất dự án từ 50MWp thành 45MWp trên Hợp đồng chính và bấm Lưu.
    2.  Hệ thống kích hoạt `ConsistencyValidatorService`.
    3.  Service quét tất cả các tài liệu con/phụ thuộc trong dự án đang kế thừa trường `capacity`.
    4.  Phát hiện Biên bản nghiệm thu kỹ thuật và Báo cáo ĐTM vẫn lưu trữ thông số cũ `50MWp`.
    5.  Hệ thống tạo bản ghi `MismatchAlert` lưu trữ thông tin lệch giá trị và đánh dấu cảnh báo lên các tài liệu downstream.
*   **Exceptional case & message**:
    *   Không có trường hợp ngoại lệ kỹ thuật. Nếu so khớp thất bại do dữ liệu trống, hệ thống sẽ bỏ qua và không tạo cảnh báo giả.
*   **UI & behavior description**:
    *   Gửi thông báo đẩy (Notification) đến Trưởng bộ phận Pháp lý: *"Phát hiện xung đột thông số công suất (50MWp vs 45MWp) tại Dự án Gia Lai. Vui lòng rà soát."*

---

### 🎫 LAW-F7-06: [Frontend] Document Tree View & Clause Validity Map UI
*   **Description**: Triển khai giao diện hiển thị cấu trúc cây tài liệu của dự án tại màn hình dashboard dự án và lớp phủ Bản đồ hiệu lực điều khoản (Clause Validity Map Overlay) trong trình soạn thảo hợp đồng.
*   **Actor**: User
*   **Trigger**: User truy cập màn hình chi tiết dự án hoặc mở xem một hợp đồng có phụ lục đính kèm.
*   **Pre-Condition**:
    *   Trình duyệt hỗ trợ render CSS phân cấp tốt (đã cài đặt TailwindCSS).
*   **Post condition & AC**:
    *   **Post condition**:
        *   Giao diện hiển thị cây phân cấp chuẩn xác.
        *   Các điều khoản bị sửa đổi được hiển thị kèm alert badge màu cam nhấp nháy nhẹ. Click vào sẽ mở Side Sheet hiển thị nội dung so sánh chéo.
    *   **AC**:
        *   [AC-1] Cây tài liệu hiển thị thụt lề chuẩn xác dựa trên quan hệ `parentId`.
        *   [AC-2] Client Side Sheet hiển thị so sánh Side-by-side văn bản cũ và mới mà không bị lỗi layout trên màn hình desktop và tablet.
        *   [AC-3] Cung cấp nút tạo nhanh Phụ lục điều chỉnh trực tiếp từ cảnh báo xung đột (tích hợp F8).
*   **System/user steps**:
    1.  User mở màn hình tài liệu dự án Gia Lai. Giao diện hiển thị cấu trúc cây: Hợp đồng chính -> Phụ lục 01 -> Phụ lục 02.
    2.  User click mở Hợp đồng chính. Trình soạn thảo render nội dung.
    3.  Tại Điều 5, hệ thống hiển thị badge: *"Đã được sửa đổi bởi Phụ lục 02 (Mục 2) - Click để xem"*.
    4.  User click vào badge. Side Sheet trượt ra từ bên phải hiển thị: Bên trái là Điều 5 cũ (bị gạch ngang), bên hợp đồng gốc.
    5.  Nếu có cảnh báo thay đổi luật (F8), Side Sheet hiển thị nút **[Khởi tạo Phụ lục điều chỉnh]**. User bấm nút, hệ thống tự động khởi tạo draft Phụ lục từ Template Marketplace và chuyển hướng user vào Editor mới.
*   **Exceptional case & message**:
    *   *Tài liệu con bị xóa*: Cây thư mục tự động cập nhật ẩn tài liệu con đó và đưa quan hệ của tài liệu cháu lên cấp cha mà không gây crash giao diện.
*   **UI & behavior description**:
    *   Sử dụng hiệu ứng trượt mượt mà (slide-in) của Framer Motion cho Side Sheet.
    *   Sử dụng màu cam nhẹ (`bg-orange-50 text-orange-600 border-orange-300`) cho các badge cảnh báo sửa đổi để thu hút sự chú ý nhưng không gây cảm giác quá nguy hiểm như màu đỏ của lỗi hệ thống.
