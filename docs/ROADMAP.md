# LAWZY — Tầm nhìn & Roadmap

**Dự án:** LAWZY  
**Phiên bản tài liệu:** 1.0  
**Ngày:** 2026-02-10  
**Vai trò:** Product / PM — Định hướng dài hạn và kế hoạch triển khai theo giai đoạn

---

## 1. Tầm nhìn dự án (Vision)

### 1.1 Tuyên bố tầm nhìn

**LAWZY trở thành nền tảng số hàng đầu tại Việt Nam cho việc soạn thảo và quản lý hợp đồng pháp lý** — kết nối luật sư, phòng pháp chế và doanh nghiệp với công cụ thống nhất: thư viện mẫu chuẩn, editor chuyên nghiệp, AI trích dẫn luật và tham chiếu nguồn (RAG), cùng quản lý workspace, quota và thanh toán thật.

### 1.2 Mục tiêu dài hạn (North Star)

| Hướng | Mô tả |
|-------|--------|
| **Chuẩn hóa** | Mọi hợp đồng tạo trên LAWZY tuân thủ BLDS, Luật Thương mại và văn bản hướng dẫn; có trích dẫn và đánh giá rủi ro rõ ràng. |
| **Tự động hóa** | AI hỗ trợ từ prompt → bản nháp → chỉnh sửa → xuất văn bản; tham chiếu nguồn pháp lý nội bộ (RAG) để gợi ý chính xác theo từng workspace. |
| **Hợp tác** | Workspace đa thành viên, phân quyền, (sau này) cộng tác real-time và luồng phê duyệt. |
| **Thương mại hóa** | Gói Free / Pro / Enterprise với quota, thanh toán thật (PayOS), và mô hình doanh thu bền vững. |

### 1.3 Đối tượng và giá trị mang lại

- **Luật sư / Chuyên viên pháp lý:** Giảm thời gian soạn thảo, tăng độ chính xác pháp lý và trích dẫn; một nơi quản lý mẫu + nguồn tham chiếu.
- **Doanh nghiệp (phòng pháp chế):** Chuẩn hóa hợp đồng theo chính sách nội bộ (upload sources + RAG), kiểm soát quota và quyền theo workspace.
- **Sản phẩm:** Mở rộng từ “editor + AI + mock” sang “nền tảng đầy đủ: backend, DB, RAG, payment, analytics”.

---

## 2. Trạng thái hiện tại (Current State)

### 2.1 Đã có (MVP — Giai đoạn 0)

- **Frontend hoàn chỉnh:** Dashboard (tabs Tài liệu / Dung lượng / Quota), Canvas Editor (TipTap, merge fields, chat AI, metadata panel, export Word), Thư viện mẫu (grid, filter, search, chi tiết), Nguồn (upload sources UI, bảng, modal chi tiết), Thanh toán (chọn gói, mock create/status/webhook), Workspace (trang + store), Files, Settings. Giao diện thống nhất, hỗ trợ theme (dark/light).
- **Next.js API routes (BFF):** `/api/ai/generate`, `/api/ai/review`, `/api/ai/cite-law` (gọi Gemini trực tiếp); `/api/export/docx` (TipTap → Word); `/api/extract-text` (PDF/DOC/DOCX → text); `/api/payment/create`, `/api/payment/status/[orderId]`, `/api/payment/webhook` (mock). Không có backend service riêng; không có database.
- **Dữ liệu:** Toàn bộ từ **mock JSON** (`src/mock/*.json`). User/workspace/contracts/templates/sources/payments load trong client hoặc trong API (upload-sources trong generate). Không có persistence thật (chỉ Zustand persist cho auth/quota/workspace trên client).
- **AI:** Gemini (generate, review, cite-law) với system prompt luật Việt Nam; workspace sources đưa vào prompt dạng text context (buildSourcesContext từ previewText), **chưa có RAG** (chưa embedding, chưa vector store, chưa retrieval).
- **Gọi API:** Editor gọi `/api/ai/generate`, `/api/extract-text`; Payment gọi `/api/payment/create` và `/api/payment/webhook`. Các màn khác (Dashboard, Templates, Sources, Files) **chưa gọi API** — chỉ đọc từ mock import.

### 2.2 Chưa có (Gap so với tầm nhìn)

- Backend API riêng (Node/Go/Python…) và database (PostgreSQL/MongoDB…).
- Authentication/authorization thật (session, JWT, SSO).
- Lưu trữ contract, template, user, workspace, source trong DB; API CRUD thật cho từng resource.
- RAG: embedding nguồn (upload sources), vector store, retrieval trước khi gọi LLM; citation từ chunk cụ thể.
- Thanh toán PayOS thật (checkout URL, webhook verify, cập nhật subscription/quota trong DB).
- Test tự động (unit, integration, E2E), CI/CD, monitoring.

---

## 3. Roadmap theo giai đoạn

### Giai đoạn 1 — Backend cơ sở & API thật (Foundation)

**Mục tiêu:** Có backend service và database; frontend chuyển từ mock sang gọi API thật cho user, workspace, contract, template, source. Giữ nguyên luồng AI qua Next.js hoặc chuyển sang gọi backend.

| Hạng mục | Nội dung chi tiết | Ưu tiên |
|----------|-------------------|---------|
| **Backend service** | Thiết kế API (REST hoặc tương thích OpenAPI); chọn stack (Node/Next API routes mở rộng, hoặc service riêng). Triển khai đăng ký/đăng nhập (session hoặc JWT), middleware auth. | P0 |
| **Database** | Chọn DB (PostgreSQL khuyến nghị); schema cho User, Workspace, WorkspaceMember, Contract, Template, UploadSource, Subscription/Order. Migration và seed dữ liệu mẫu. | P0 |
| **API CRUD** | Endpoint cho: users (me, update profile), workspaces (list, get, create, update, members CRUD), contracts (list, get, create, update, delete), templates (list, get, filter), upload-sources (list, get, create, update status, delete). Pagination, filter, sort theo đặc tả. | P0 |
| **Frontend chuyển sang API** | Thay `import mock from '@/mock/...'` bằng client (fetch hoặc TanStack Query); gọi API cho dashboard (recent docs, stats), templates (list, detail), sources (list, add, detail), files (list nếu có API). Store (auth, workspace) đồng bộ với API (login/logout, chọn workspace). | P0 |
| **Lưu hợp đồng** | API tạo/cập nhật contract (contentJSON, metadata, mergeFieldValues); editor gọi save thật, load contract từ API khi mở /editor/[id]. | P0 |
| **Tài liệu** | Cập nhật API Specification với endpoint mới; Development Spec: kiến trúc 2 tầng (frontend + backend), env, cách chạy backend. | P1 |

**Kết quả kỳ vọng:** Người dùng đăng nhập thật; dữ liệu contract, template, source lưu và lấy từ DB; dashboard/templates/sources/editor load từ API. AI vẫn có thể gọi từ Next.js (proxy tới backend) hoặc từ backend.

---

### Giai đoạn 2 — RAG cho nguồn pháp lý (AI & Sources)

**Mục tiêu:** Upload sources được xử lý (extract text, chunk), embedding và lưu vào vector store; khi generate hợp đồng, retrieval theo query/prompt và đưa context có chọn lọc vào LLM; citation từ chunk/trang cụ thể.

| Hạng mục | Nội dung chi tiết | Ưu tiên |
|----------|-------------------|---------|
| **Pipeline xử lý nguồn** | Upload file → lưu object storage (hoặc filesystem); job extract text (PDF/DOC/DOCX); chunking (theo trang hoặc semantic); lưu chunk + metadata (sourceId, pageNumber, section) vào DB. | P0 |
| **Embedding & vector store** | Chọn embedding model (e.g. OpenAI, Gemini embedding, hoặc open-source); vector DB (Pgvector, Pinecone, Weaviate, v.v.). Lưu embedding cho từng chunk; index theo workspace (và có thể sourceId). | P0 |
| **Retrieval khi generate** | Khi gọi generate: từ prompt + metadata (contract type, tags) tạo query; retrieval top-k chunk trong workspace; build context (có trích dẫn sourceId, page, excerpt). Gửi context vào Gemini (hoặc LLM trên backend) thay/song song với buildSourcesContext hiện tại (previewText). | P0 |
| **Citation trong output** | AI output có sourceCitations với sourceId, fileName, pageNumber, excerpt, usedInClause; frontend hiển thị (đã có trong buildContractSummaryMessage). Đảm bảo RAG trả về đúng chunk được dùng. | P0 |
| **API & BFF** | API backend: upload file, trigger process, get source status, list chunks (nếu cần). Next.js có thể proxy hoặc gọi backend; /api/ai/generate có thể chuyển sang gọi backend (backend gọi RAG + LLM). | P0 |
| **Tài liệu** | SRS: bổ sung use case RAG (retrieval, citation); API Spec: endpoint upload/process/sources, (nếu có) endpoint generate qua backend; Development Spec: kiến trúc RAG (pipeline, vector store). | P1 |

**Kết quả kỳ vọng:** Nguồn upload được chunk và embed; khi soạn hợp đồng, AI nhận context từ vector retrieval và trích dẫn chính xác nguồn/trang; UX citation rõ ràng.

---

### Giai đoạn 3 — Thanh toán thật & Quota (Monetization)

**Mục tiêu:** Tích hợp PayOS (hoặc cổng VN khác); luồng thanh toán thật từ chọn gói → checkout → webhook → cập nhật subscription và quota trong DB; frontend hiển thị quota/plan thật.

| Hạng mục | Nội dung chi tiết | Ưu tiên |
|----------|-------------------|---------|
| **PayOS integration** | Đăng ký PayOS; cấu hình webhook URL; implement create payment (link checkout), verify webhook signature; cập nhật Order và Subscription trong DB; trừ quota / nâng plan theo gói. | P0 |
| **Quota & subscription trong DB** | Model Subscription, Order; logic quota (daily limit/remaining, storage) theo plan; API đọc/update quota; reset daily theo cron hoặc logic. | P0 |
| **Frontend** | Trang payment giữ flow; sau thanh toán redirect về status; từ webhook backend cập nhật DB; frontend gọi API me/workspace để lấy quota/subscription mới. | P0 |
| **Tài liệu** | API Spec: webhook verify, payload; BRD/SRS: ràng buộc thanh toán thật. | P1 |

**Kết quả kỳ vọng:** User nâng cấp Pro/Enterprise qua PayOS; webhook cập nhật DB; quota và plan phản ánh đúng trong app.

---

### Giai đoạn 4 — Chất lượng, scale & mở rộng (Quality & Scale)

**Mục tiêu:** Ổn định chất lượng, hiệu năng và trải nghiệm; sẵn sàng scale và mở rộng tính năng (real-time, export PDF, ký điện tử, v.v.).

| Hạng mục | Nội dung chi tiết | Ưu tiên |
|----------|-------------------|---------|
| **Testing** | Unit test (lib, utils, hooks); integration test API; E2E (login, tạo hợp đồng, export, payment flow). CI chạy test trên push/PR. | P0 |
| **Monitoring & observability** | Logging, error tracking (e.g. Sentry); metric cơ bản (latency API, tỷ lệ lỗi); alert khi API/DB down. | P1 |
| **Performance** | Tối ưu query DB, index; cache (Redis nếu cần) cho template/source list; frontend: lazy load, tối ưu bundle. | P1 |
| **Mở rộng tính năng** | Theo BRD/SRS: real-time collaboration (optional), export PDF, Google Docs, luồng phê duyệt, ký điện tử, advanced search. Ưu tiên theo feedback và thị trường. | P2 |

**Kết quả kỳ vọng:** Ứng dụng ổn định, có test và monitoring; sẵn sàng thêm tính năng lớn mà không phá vỡ kiến trúc.

---

## 4. Tóm tắt timeline (định hướng)

| Giai đoạn | Tên | Trọng tâm | Phụ thuộc |
|-----------|-----|-----------|-----------|
| **0** | **MVP (hiện tại)** | Frontend + mock + AI qua Next.js | — |
| **1** | **Backend & API thật** | DB, auth, CRUD, frontend gọi API | — |
| **2** | **RAG** | Pipeline nguồn, embedding, retrieval, citation | Giai đoạn 1 (source/contract trong DB) |
| **3** | **Payment & Quota thật** | PayOS, webhook, subscription trong DB | Giai đoạn 1 |
| **4** | **Quality & Scale** | Test, monitoring, performance, tính năng mở rộng | Giai đoạn 1–3 |

Thứ tự có thể điều chỉnh: ví dụ RAG (2) và Payment (3) có thể song song sau khi Giai đoạn 1 xong. Tài liệu BRD, SRS, API Specification và Development Specification được cập nhật để phản ánh “hiện tại = MVP mock” và “hướng tới = backend, RAG, payment thật” mà không xóa bớt nội dung chi tiết hiện có.

---

## 5. Liên kết với tài liệu khác

- **BRD:** Phạm vi và mục tiêu kinh doanh được mở rộng theo từng giai đoạn roadmap; mục “Current state & Vision” tham chiếu tài liệu này.
- **SRS:** Use case và NFR giữ nguyên chi tiết; bổ sung mục “Implementation state” và “Roadmap alignment” để biết yêu cầu nào đã đáp ứng (mock) và sẽ đáp ứng đầy đủ ở giai đoạn nào.
- **API Specification:** Đánh dấu rõ endpoint nào đang tồn tại (Next.js BFF, mock), endpoint nào sẽ xuất hiện khi có backend (CRUD, auth, RAG, webhook verify).
- **Development Specification:** Thêm mục “Roadmap & kiến trúc tương lai” (backend, DB, RAG pipeline, payment service); giữ nguyên chi tiết cấu trúc mã nguồn và chuẩn code hiện tại.

---

*Tài liệu Roadmap được soạn từ góc nhìn PM, dựa trên trạng thái hiện tại của codebase và tầm nhìn sản phẩm LAWZY.*
