# Software Requirements Specification (SRS)

**Dự án:** LAWZY MVP  
**Phiên bản:** 1.1  
**Ngày:** 2026-02-10  
**Tham chiếu:** BRD-Business-Requirements-Document.md, [ROADMAP.md](ROADMAP.md)

---

## 1. Giới thiệu

### 1.1 Mục đích

Tài liệu SRS mô tả chi tiết yêu cầu chức năng và phi chức năng của hệ thống LAWZY, dưới dạng use case, acceptance criteria và đặc tả bổ sung. Tài liệu dùng cho development, QA và review yêu cầu.

### 1.2 Phạm vi

- Ứng dụng web LAWZY: Dashboard, Editor, Templates, Sources, Payment, Workspace, Settings.
- API Next.js (Route Handlers): AI (generate, review, cite-law), export docx, extract-text, payment (create, status, webhook).
- State: Zustand (auth, editor, quota, workspace); dữ liệu hiện tại từ mock JSON.

### 1.3 Trạng thái triển khai hiện tại (Implementation State)

- **Frontend:** Đã triển khai đầy đủ theo use case bên dưới; dữ liệu lấy từ **mock JSON** (import trực tiếp trong page/store). Chỉ **Editor** và **Payment** gọi API thật (Next.js routes): `/api/ai/generate`, `/api/extract-text`, `/api/export/docx`, `/api/payment/create`, `/api/payment/webhook`. Dashboard, Templates, Sources, Files **chưa gọi API** — chỉ đọc mock.
- **Backend:** Chưa có backend service riêng; chưa có database. Chỉ có Next.js API routes (BFF) cho AI, export, extract-text, payment (mock).
- **RAG:** Chưa có. Workspace upload sources được đưa vào prompt dạng text context (buildSourcesContext từ previewText trong mock); chưa embedding, vector store hay retrieval.
- **Authentication:** Chưa có đăng nhập thật; user/workspace set từ mock trong useEffect.
- **Roadmap:** Yêu cầu đáp ứng đầy đủ với backend/DB, API thật và RAG tương ứng với [ROADMAP.md — Giai đoạn 1–2](ROADMAP.md#3-roadmap-theo-giai-đoạn); thanh toán thật tương ứng Giai đoạn 3.

### 1.4 Định nghĩa và từ viết tắt

| Thuật ngữ | Định nghĩa |
|-----------|-------------|
| Merge field | Trường trộn trong văn bản, dạng `{{FIELD_KEY}}`, dùng khi xuất/điền giá trị |
| TipTap | Editor rich text dựa trên ProseMirror |
| Workspace | Không gian làm việc chứa thành viên, templates, sources, quota |
| Upload source | Tài liệu workspace upload (PDF/DOCX/TXT) dùng cho AI tham chiếu |
| Quota | Hạn mức: theo ngày (số lần tạo tài liệu) và dung lượng lưu trữ |

---

## 2. Yêu cầu chức năng

### 2.1 Dashboard

#### UC-DASH-01: Xem tổng quan theo kỳ (Tuần / Tháng / Năm)

| Thuộc tính | Mô tả |
|------------|--------|
| **Mô tả** | Người dùng xem thống kê tài liệu và biểu đồ theo kỳ (week/month/year). |
| **Actor** | User đã đăng nhập (mock). |
| **Precondition** | User và workspace đã được load từ mock (users.json, workspaces.json). |
| **Luồng chính** | 1. Vào Dashboard. 2. Chọn tab "Tài liệu". 3. Chọn kỳ (Tuần này / Tháng nay / Năm nay). 4. Hệ thống hiển thị StatsCards, OverviewChart, QuickActions, StatsByWorkspace, RecentDocs. |
| **Acceptance criteria** | AC1: Có TabsList với TabsTrigger "Tài liệu", "Dung lượng", "Quota". AC2: Select kỳ thay đổi dữ liệu biểu đồ (OverviewChart nhận prop period). AC3: RecentDocs hiển thị danh sách tài liệu gần đây với risk tags. |

#### UC-DASH-02: Xem và quản lý Quota (hạn mức theo ngày / referral)

| Thuộc tính | Mô tả |
|------------|--------|
| **Mô tả** | Người dùng xem quota còn lại trong ngày, referral credits và progress. |
| **Actor** | User đã đăng nhập. |
| **Luồng chính** | 1. Vào Dashboard. 2. Chọn tab "Quota". 3. Xem QuotaCard (daily limit/remaining, referral credits) và ReferralCard (link giới thiệu, thống kê). |
| **Acceptance criteria** | AC1: QuotaCard hiển thị dailyRemaining/dailyLimit và referralCredits. AC2: ReferralCard hiển thị link giới thiệu và số credits đã nhận. AC3: Dữ liệu lấy từ useQuotaStore (persist). |

#### UC-DASH-03: Xem dung lượng lưu trữ

| Thuộc tính | Mô tả |
|------------|--------|
| **Mô tả** | Người dùng xem dung lượng đã dùng / giới hạn (storage). |
| **Actor** | User đã đăng nhập. |
| **Luồng chính** | 1. Vào Dashboard. 2. Chọn tab "Dung lượng". 3. Xem QuotaCard (storage) và StatsByWorkspace. |
| **Acceptance criteria** | AC1: Progress bar và số liệu storage hiển thị đúng. AC2: Dữ liệu có thể từ user.quota (mock) hoặc quota store. |

#### UC-DASH-04: Quick Actions (Tạo hợp đồng, Duyệt template, Mời thành viên)

| Thuộc tính | Mô tả |
|------------|--------|
| **Mô tả** | Người dùng thực hiện hành động nhanh từ Dashboard. |
| **Acceptance criteria** | AC1: Nút/link "Tạo hợp đồng" dẫn đến editor (ví dụ /editor/new). AC2: "Duyệt templates" dẫn đến /templates. AC3: "Mời thành viên" dẫn đến workspace hoặc flow mời (theo thiết kế UI). |

---

### 2.2 Canvas Editor

#### UC-ED-01: Mở editor mới (không template)

| Thuộc tính | Mô tả |
|------------|--------|
| **Mô tả** | Người dùng mở editor với document trống, bắt đầu từ giao diện chat. |
| **Luồng chính** | 1. Vào /editor/new (không query template). 2. Hiển thị ChatColumn full width; chưa mở canvas. 3. Editor có nội dung mặc định (heading "HỢP ĐỒNG MỚI" + paragraph). |
| **Acceptance criteria** | AC1: isCanvasMode = false ban đầu khi id === 'new' và không có template. AC2: ChatColumn nhận messages, onSendMessage, isLoading, thinkingSteps. AC3: Sau khi AI trả về contract_generation, canvas mở (isCanvasMode = true) và nội dung được set vào editor. |

#### UC-ED-02: Mở editor từ template

| Thuộc tính | Mô tả |
|------------|--------|
| **Mô tả** | Người dùng mở editor với nội dung và merge fields từ template. |
| **Luồng chính** | 1. Vào /editor/new?template=tmpl001. 2. Load template từ mock (templates.json); chuyển contentJSON (doc với clause/field) sang TipTap format (templateContentToEditorContent). 3. setTemplateMergeFields và setMergeFieldValues từ template.mergeFields. 4. Canvas mở ngay với nội dung template. |
| **Acceptance criteria** | AC1: Template có contentJSON dạng DocContent (clause, field) được convert đúng sang TipTap. AC2: RightPanel hiển thị merge fields và metadata. AC3: Merge field nodes hiển thị trong editor (MergeFieldExtension). |

#### UC-ED-03: Soạn thảo với TipTap (rich text, merge fields, table)

| Thuộc tính | Mô tả |
|------------|--------|
| **Mô tả** | Người dùng gõ, định dạng, chèn merge field, bảng. |
| **Luồng chính** | 1. Dùng StarterKit (heading, list, bold, italic…), TextAlign, Table, Placeholder. 2. Kéo thả merge field từ panel vào editor (handleDrop application/lawzy-merge-field). 3. Merge field render dạng span có data-field-key, không edit trực tiếp. |
| **Acceptance criteria** | AC1: Merge field insert tại vị trí drop. AC2: Nội dung editor sync vào useEditorStore (setContent, setEditorContent). AC3: Xuất Word thay thế merge field bằng {{FIELD_KEY}} hoặc giá trị (theo docx-converter). |

#### UC-ED-04: Gửi tin nhắn và tạo/sửa hợp đồng bằng AI

| Thuộc tính | Mô tả |
|------------|--------|
| **Mô tả** | Người dùng nhập prompt (và đính kèm file), AI trả về hợp đồng hoặc cập nhật nội dung. |
| **Luồng chính** | 1. Nhập message, tùy chọn đính kèm file (PDF/DOC/DOCX). 2. Nếu có file: POST /api/extract-text, lấy text; gửi kèm attachedSources vào /api/ai/generate. 3. POST /api/ai/generate với metadata, workspaceId, existingContent, mergeFieldValues, attachedSources. 4. Nhận result type contract_generation; contractResultToTipTapContent chuyển sang TipTap; setEditorContent, setTemplateMergeFields, setMergeFieldValues; hiển thị summary (buildContractSummaryMessage) trong chat. |
| **Acceptance criteria** | AC1: Chỉ chấp nhận file .pdf, .doc, .docx. AC2: thinkingSteps hiển thị trong lúc loading (useThinkingProgress). AC3: Nếu API lỗi, hiển thị tin nhắn lỗi trong chat và toast. AC4: Merge keys từ AI được merge vào templateMergeFields và mergeFieldValues. |

#### UC-ED-05: Cập nhật metadata và merge field values

| Thuộc tính | Mô tả |
|------------|--------|
| **Mô tả** | Người dùng sửa title, type, tags, risk level, visibility và giá trị từng merge field trong RightPanel. |
| **Acceptance criteria** | AC1: updateMetadata cập nhật editor store. AC2: updateMergeFieldValue cập nhật từng key. AC3: Xuất Word dùng metadata.title và merge field values (nếu có logic thay thế). |

#### UC-ED-06: Lưu và xuất Word

| Thuộc tính | Mô tả |
|------------|--------|
| **Mô tả** | Người dùng lưu (mock) và xuất file .docx. |
| **Luồng chính** | 1. Lưu: handleSave setSaving, delay 1s, setLastSaved, toast. 2. Xuất: POST /api/export/docx với body { content: JSONContent, metadata: { title } }; nhận blob, tải file. |
| **Acceptance criteria** | AC1: Export request gửi đúng content và metadata. AC2: Response Content-Type và Content-Disposition đúng; file mở được bằng Word. AC3: Merge field trong content xuất ra dạng {{FIELD_KEY}} (docx-converter). |

#### UC-ED-07: Xem lịch sử phiên bản

| Thuộc tính | Mô tả |
|------------|--------|
| **Mô tả** | Người dùng xem danh sách version và khôi phục (nếu có component Version History). |
| **Acceptance criteria** | AC1: Component version-history tồn tại và nhận dữ liệu versions. AC2: Khôi phục cập nhật content trong editor (theo implementation hiện tại). |

---

### 2.3 Template Library

#### UC-TPL-01: Xem danh sách và lọc template

| Thuộc tính | Mô tả |
|------------|--------|
| **Mô tả** | Người dùng xem grid/list template, lọc theo type, sắp xếp (popular/recent/az/za), tìm kiếm. |
| **Luồng chính** | 1. Vào /templates. 2. TemplateFilters: searchQuery, selectedType, selectedSort, viewMode. 3. filteredTemplates = filter + sort từ templates (mock). 4. TemplateGrid hiển thị cards. |
| **Acceptance criteria** | AC1: Tìm kiếm theo title và description. AC2: Lọc type = all hoặc type cụ thể. AC3: Sắp xếp popular (popularity), recent (createdAt), az/za (title). AC4: viewMode card | list thay đổi cách hiển thị. |

#### UC-TPL-02: Xem chi tiết template và mở editor

| Thuộc tính | Mô tả |
|------------|--------|
| **Mô tả** | Người dùng mở modal chi tiết template, xem preview và "Dùng mẫu" để mở editor. |
| **Luồng chính** | 1. Click template → setSelectedTemplate. 2. Modal full size mở; TemplateDetailSplit hiển thị template (preview, merge fields). 3. "Dùng mẫu" (hoặc tương đương) điều hướng /editor/new?template=templateId. |
| **Acceptance criteria** | AC1: Modal đóng khi onClose. AC2: Nội dung template và mergeFields hiển thị đúng. AC3: Điều hướng với query template= đúng templateId. |

---

### 2.4 Upload Sources (Nguồn tham chiếu)

#### UC-SRC-01: Xem danh sách nguồn

| Thuộc tính | Mô tả |
|------------|--------|
| **Mô tả** | Người dùng xem bảng nguồn: tên/tiêu đề, tags, trạng thái, trang/chunk, ngày cập nhật. |
| **Acceptance criteria** | AC1: Cột trạng thái: pending / processing / ready / error với badge tương ứng. AC2: Click row mở modal chi tiết (SourceDetailSplit). |

#### UC-SRC-02: Thêm nguồn (upload file)

| Thuộc tính | Mô tả |
|------------|--------|
| **Mô tả** | Người dùng thêm file (PDF, DOCX, TXT) với title và tags. |
| **Luồng chính** | 1. Click "Thêm nguồn" → AddSourceModal. 2. Chọn file, nhập title, tags; onAdd(items). 3. Tạo bản ghi mới (sourceId, workspaceId, fileName, title, status: processing…); append vào danh sách. |
| **Acceptance criteria** | AC1: Cho phép nhiều file trong một lần thêm. AC2: Sau thêm hiển thị toast và row mới với status processing/ready (mock). AC3: API generate dùng workspace sources (status ready) qua buildSourcesContext. |

#### UC-SRC-03: Xem chi tiết nguồn (preview text)

| Thuộc tính | Mô tả |
|------------|--------|
| **Mô tả** | Người dùng xem preview nội dung (previewText), metadata (pageCount, chunkCount, tags). |
| **Acceptance criteria** | AC1: SourceDetailSplit hiển thị source.previewText (nếu có). AC2: Đóng modal khi onClose. |

---

### 2.5 Payment (Mock)

#### UC-PAY-01: Xem gói và nâng cấp

| Thuộc tính | Mô tả |
|------------|--------|
| **Mô tả** | Người dùng xem các gói (Free, Pro, Enterprise), so sánh tính năng và nâng cấp. |
| **Luồng chính** | 1. Vào /payment. 2. Hiển thị quota (daily, storage) và danh sách plans từ payments.json. 3. Click "Nâng cấp" (trừ Free và Enterprise liên hệ sales): POST /api/payment/create { userId, plan, amount }. 4. Nhận checkoutUrl; redirect đến /payment/status/{orderId}. |
| **Acceptance criteria** | AC1: Gói đang dùng có badge "Đang sử dụng". AC2: Enterprise hiển thị "Liên hệ Sales", toast khi click. AC3: create trả về orderId và checkoutUrl (mock: checkoutUrl = /payment/status/orderId). |

#### UC-PAY-02: Trang trạng thái thanh toán và mô phỏng

| Thuộc tính | Mô tả |
|------------|--------|
| **Mô tả** | Người dùng xem trạng thái đơn; trong demo có nút mô phỏng thành công/thất bại. |
| **Luồng chính** | 1. Vào /payment/status/[orderId]. 2. Trạng thái ban đầu pending. 3. "Mô phỏng thành công": POST /api/payment/webhook { orderId, status: 'success' }; updateQuota (dailyLimit 100, dailyRemaining 100, subscriptionPlan 'pro'); redirect về / sau 5s. 4. "Mô phỏng thất bại": set status failed, hiển thị thông báo. |
| **Acceptance criteria** | AC1: Webhook nhận body và trả success. AC2: useQuotaStore.updateQuota được gọi khi simulate success. AC3: Countdown và redirect về dashboard khi success. |

---

### 2.6 Workspace & Permissions

#### UC-WS-01: Chọn workspace và xem thành viên

| Thuộc tính | Mô tả |
|------------|--------|
| **Mô tả** | Người dùng (có nhiều workspace) chọn workspace hiện tại; xem thành viên và vai trò. |
| **Acceptance criteria** | AC1: useWorkspaceStore.currentWorkspace được set. AC2: Workspace page hoặc sidebar hiển thị members (admin/editor/viewer). AC3: addMember, removeMember, updateMemberRole cập nhật store (persist). |

#### UC-WS-02: Kiểm tra quyền trong UI

| Thuộc tính | Mô tả |
|------------|--------|
| **Mô tả** | Component dùng usePermissions để ẩn/hiện hoặc disable theo role. |
| **Luồng** | hasPermission(Permission), hasRole(Role), isAdmin(), isEditor(), isViewer(); RolePermissions map role → danh sách permission. |
| **Acceptance criteria** | AC1: Admin có đủ quyền (view, edit, delete, create, manage_workspace, manage_members, manage_billing, view_analytics, manage_templates). AC2: Editor: view, edit, create, view_analytics. AC3: Viewer: view_documents. |

---

### 2.7 Files (Quản lý tập tin)

#### UC-FIL-01: Xem danh sách file và dung lượng

| Thuộc tính | Mô tả |
|------------|--------|
| **Mô tả** | Người dùng xem bảng file (tên, kích thước, loại, ngày tải), progress dung lượng. |
| **Acceptance criteria** | AC1: Dữ liệu từ files.json (mock). AC2: Tìm kiếm theo tên. AC3: Xóa file (handleDelete) cập nhật state local và toast. |

---

### 2.8 Settings

| Use case | Mô tả ngắn |
|----------|-------------|
| UC-SET-01 | Trang cài đặt chung (/settings), các sub: account, profile, appearance, display, notifications. |
| UC-SET-02 | Appearance: theme (use ThemeProvider), form cấu hình giao diện (appearance-form). |

---

## 3. Yêu cầu phi chức năng

### 3.1 Hiệu năng

- **NFR-P1:** Trang Dashboard load trong thời gian chấp nhận được với mock data (không block UI).
- **NFR-P2:** Editor (TipTap) phản hồi nhập và thao tác merge field mượt (không lag khi content lớn vừa phải).
- **NFR-P3:** Gọi API AI (generate/review/cite) có timeout và xử lý lỗi; hiển thị loading/thinking steps.

### 3.2 Bảo mật

- **NFR-S1:** GEMINI_API_KEY chỉ dùng ở server (API routes); không expose ra client.
- **NFR-S2:** Payment webhook (khi dùng thật) phải xác minh chữ ký; hiện mock chỉ log và trả success.
- **NFR-S3:** Upload file (extract-text): giới hạn 10MB, chỉ PDF/DOC/DOCX; validate MIME và extension.

### 3.3 Khả dụng (Usability)

- **NFR-U1:** Giao diện hỗ trợ tiếng Việt (nhãn, thông báo, placeholder).
- **NFR-U2:** Toast (sonner) thông báo thành công/lỗi cho các thao tác quan trọng (lưu, export, payment, upload).
- **NFR-U3:** Editor hỗ trợ placeholder và gợi ý ("Bắt đầu soạn thảo hoặc gõ / để xem lệnh...").

### 3.4 Khả năng bảo trì và mở rộng

- **NFR-M1:** Cấu trúc thư mục rõ ràng (app, components, lib, stores, types, mock); tách API routes theo domain (ai, export, payment).
- **NFR-M2:** TypeScript cho toàn bộ mã nguồn; types tập trung (contract, template, workspace, permissions, upload-source).
- **NFR-M3:** Mock data (JSON) có thể thay thế bằng API thật mà không đổi interface store (chỉ đổi nguồn fetch).

### 3.5 Tương thích

- **NFR-C1:** Ứng dụng chạy trên trình duyệt hiện đại (Chrome, Firefox, Safari, Edge).
- **NFR-C2:** Next.js App Router; React 19; hỗ trợ theme (dark/light/system) qua next-themes.

---

## 4. Ma trận truy vết (Traceability)

| Yêu cầu BRD | Use case / NFR |
|-------------|-----------------|
| Giảm thời gian soạn thảo | UC-ED-01, UC-ED-02, UC-ED-04, UC-TPL-02 |
| Trích dẫn luật, review rủi ro | UC-ED-04, API review, cite-law |
| Tham chiếu nguồn workspace | UC-SRC-01–03, UC-ED-04 (buildSourcesContext) |
| Quota và thanh toán | UC-DASH-02, UC-PAY-01, UC-PAY-02, NFR-S2 |
| Quyền theo role | UC-WS-02, types permissions |

---

## 5. Phụ lục – Dữ liệu mock chính

- **users.json:** users[].userId, name, email, roles, workspaceId, quota, referral.
- **workspaces.json:** workspaces[].workspaceId, name, plan, settings, subscription, quotaLimits, members.
- **templates.json:** templates[].templateId, type, title, contentJSON (doc với clause/field), mergeFields.
- **upload-sources.json:** sources[].sourceId, workspaceId, fileName, title, status, previewText, tags.
- **payments.json:** plans[].planId, price, features; orders (mock lịch sử).
- **contracts.json:** contracts[].contractId, title, contentJSON, metadata, mergeFieldValues (cho editor load).
- **chat-history.json:** chatHistory[].contractId, messages (cho editor khôi phục chat).
- **files.json:** files[].id, name, size, type, uploadDate (cho trang Files).

---

## 6. Liên kết với Roadmap (Alignment)

| Nhóm use case / NFR | Hiện tại (MVP) | Giai đoạn đáp ứng đầy đủ |
|--------------------|----------------|---------------------------|
| Dashboard (UC-DASH-*) | Dữ liệu từ mock | Giai đoạn 1: API thật, frontend gọi API |
| Editor (UC-ED-*) | Content/contract từ mock; AI generate/review qua Next.js API | Giai đoạn 1: load/save contract từ API; Giai đoạn 2: RAG context khi generate |
| Templates (UC-TPL-*) | Danh sách và chi tiết từ mock | Giai đoạn 1: API CRUD templates |
| Sources (UC-SRC-*) | Danh sách và thêm từ mock; AI generate dùng buildSourcesContext (text) | Giai đoạn 1: API sources; Giai đoạn 2: pipeline xử lý, RAG retrieval |
| Payment (UC-PAY-*) | Mock create/status/webhook; quota cập nhật store | Giai đoạn 3: PayOS thật, webhook verify, quota trong DB |
| Workspace & Permissions (UC-WS-*) | Store từ mock | Giai đoạn 1: API workspace/members, auth thật |
| Files (UC-FIL-*) | Mock files.json | Giai đoạn 1: API files (hoặc gộp với sources) |
| NFR (bảo mật, hiệu năng) | Một phần (env key, upload limit) | Giai đoạn 4: test, monitoring, hardening |

---

*Tài liệu SRS được xây dựng từ mã nguồn và cấu trúc hiện tại của LAWZY MVP; đã bổ sung trạng thái triển khai và alignment với roadmap.*
