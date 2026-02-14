# Business Requirements Document (BRD)

**Dự án:** LAWZY MVP  
**Phiên bản tài liệu:** 1.1  
**Ngày:** 2026-02-10  
**Trạng thái:** Nền tảng SaaS quản lý hợp đồng pháp lý theo luật Việt Nam 2026  
**Tham chiếu:** [ROADMAP.md](ROADMAP.md) — Tầm nhìn và kế hoạch theo giai đoạn

---

## 1. Tổng quan

### 1.1 Mục đích tài liệu

Tài liệu BRD mô tả bối cảnh kinh doanh, bài toán cần giải quyết, đối tượng người dùng, mục tiêu kinh doanh, phạm vi tính năng và các ràng buộc của sản phẩm LAWZY. Tài liệu dùng làm cơ sở cho việc định nghĩa yêu cầu phần mềm (SRS), thiết kế API và triển khai kỹ thuật.

### 1.2 Phạm vi áp dụng

- **Sản phẩm:** LAWZY — nền tảng SaaS quản lý hợp đồng pháp lý.
- **Đối tượng:** Doanh nghiệp, luật sư, chuyên viên pháp lý tại Việt Nam.
- **Luật áp dụng:** Bộ luật Dân sự 2026, Luật Thương mại 2025, Luật TTĐT 2024 và văn bản hướng dẫn hiện hành.

### 1.3 Trạng thái hiện tại và hướng tầm nhìn

- **Hiện tại (MVP):** Ứng dụng web với giao diện đầy đủ (Dashboard, Editor, Templates, Sources, Payment, Workspace, Settings); dữ liệu dùng **mock JSON**; AI (Gemini) gọi qua Next.js API routes; workspace sources đưa vào prompt dạng text context, **chưa có RAG** (embedding, vector store, retrieval). Chi tiết trạng thái và gap so với tầm nhìn xem [ROADMAP.md — Mục 2](ROADMAP.md#2-trạng-thái-hiện-tại-current-state).
- **Hướng tầm nhìn:** Backend API và database thật; authentication/authorization; RAG cho nguồn pháp lý (embedding, retrieval, citation); thanh toán PayOS thật và quota/subscription trong DB; chất lượng và scale (test, monitoring, mở rộng tính năng). Lộ trình theo từng giai đoạn trong [ROADMAP.md — Mục 3](ROADMAP.md#3-roadmap-theo-giai-đoạn).

---

## 2. Problem Statement (Bài toán)

### 2.1 Bối cảnh

- Soạn thảo và quản lý hợp đồng pháp lý tại Việt Nam đòi hỏi tuân thủ chặt chẽ BLDS, Luật Thương mại và các văn bản liên quan.
- Doanh nghiệp và phòng pháp chế thường thiếu công cụ tập trung để: tạo hợp đồng từ mẫu, trích dẫn luật, review rủi ro và xuất văn bản chuẩn.
- Việc tham chiếu nguồn pháp lý nội bộ (chính sách, quy định công ty) khi soạn hợp đồng thường thủ công, dễ sai sót.

### 2.2 Bài toán cốt lõi

1. **Tạo hợp đồng nhanh, chuẩn pháp lý:** Cần công cụ cho phép tạo/sửa hợp đồng từ thư viện mẫu, với trường trộn (merge fields) và gợi ý điều khoản theo luật Việt Nam.
2. **Review rủi ro và trích dẫn luật:** Cần hỗ trợ phân tích rủi ro theo từng điều khoản và trích dẫn điều, khoản luật chính xác.
3. **Tham chiếu nguồn pháp lý:** Cần cho phép workspace tải lên tài liệu tham chiếu (PDF, DOCX) để AI sử dụng khi soạn hợp đồng và ghi nhận trích dẫn nguồn.
4. **Quản lý quota và thanh toán:** Cần mô hình gói (Free, Pro, Enterprise), quota theo ngày/dung lượng và luồng thanh toán (mock/real) để mở rộng thương mại.

### 2.3 Giả định và ràng buộc kinh doanh

- Hệ thống hướng tới luật Việt Nam 2026; các phiên bản luật khác có thể bổ sung sau.
- AI (Gemini) dùng cho gợi ý và soạn thảo; quyết định pháp lý cuối cùng thuộc về người dùng.
- MVP hiện tại dùng dữ liệu mock; tích hợp backend thật và thanh toán thật (PayOS) là bước tiếp theo.

---

## 3. Đối tượng người dùng (User Personas)

### 3.1 Luật sư / Chuyên viên pháp lý (Primary)

- **Mục tiêu:** Soạn hợp đồng nhanh, đúng luật, có trích dẫn và đánh giá rủi ro.
- **Hành vi:** Sử dụng thư viện mẫu, chỉnh sửa trong editor, gọi AI để tạo/sửa nội dung, xuất Word, xem lịch sử phiên bản.
- **Pain point:** Thiếu công cụ all-in-one cho hợp đồng chuẩn VN.

### 3.2 Admin workspace / Quản lý (Secondary)

- **Mục tiêu:** Quản lý thành viên, quota, gói dịch vụ và nguồn tham chiếu (upload sources).
- **Hành vi:** Mời thành viên, phân quyền (admin/editor/viewer), nâng cấp gói, theo dõi dung lượng và quota.
- **Pain point:** Cần một nơi tập trung để cấu hình workspace và billing.

### 3.3 Người xem / Viewer (Tertiary)

- **Mục tiêu:** Xem tài liệu và hợp đồng được chia sẻ trong workspace.
- **Hành vi:** Chỉ xem, không chỉnh sửa; có thể comment (khi tính năng mở rộng).

---

## 4. Mục tiêu kinh doanh

| ID | Mục tiêu | Đo lường |
|----|----------|----------|
| BO-1 | Giảm thời gian soạn thảo hợp đồng chuẩn VN | Số phút trung bình từ “bắt đầu” đến “xuất bản” |
| BO-2 | Tăng độ chính xác pháp lý (trích dẫn, rủi ro) | Tỷ lệ hợp đồng có trích dẫn luật và tag rủi ro |
| BO-3 | Tăng adoption trong doanh nghiệp vừa và nhỏ | Số workspace active, số tài liệu tạo/tháng |
| BO-4 | Tạo doanh thu từ gói Pro/Enterprise | MRR, conversion từ Free lên Pro |
| BO-5 | Cho phép tùy biến theo nguồn pháp lý nội bộ | Số nguồn upload/workspace và số lần AI trích dẫn nguồn |

---

## 5. Phạm vi tính năng (Feature Scope)

### 5.1 Trong phạm vi MVP (In Scope)

- **Dashboard:** Thống kê tài liệu, quota (theo ngày/dung lượng), referral, tài liệu gần đây, quick actions (tạo HĐ, duyệt template, mời thành viên).
- **Canvas Editor:** Soạn thảo rich text (TipTap), merge fields (kéo thả, hiển thị), metadata (loại, tags, risk, visibility), lịch sử phiên bản, xuất Word (.docx).
- **AI:** Tạo hợp đồng từ prompt, review rủi ro, trích dẫn luật (cite law); tích hợp workspace sources và file đính kèm khi generate.
- **Thư viện mẫu (Templates):** Grid/list, lọc theo type/industry/law, tìm kiếm, xem chi tiết; mở editor từ template với merge fields sẵn.
- **Nguồn (Upload Sources):** Upload PDF/DOCX/TXT, trạng thái (pending/processing/ready/error), xem chi tiết; dùng làm ngữ cảnh cho AI khi generate.
- **Thanh toán (Mock):** Chọn gói (Free/Pro/Enterprise), tạo link thanh toán, trang trạng thái, webhook mô phỏng, cập nhật quota sau “thanh toán”.
- **Quyền (Permissions):** Role admin/editor/viewer; phân quyền theo tài liệu, workspace, billing; hooks và component kiểm tra quyền.
- **Workspace:** Quản lý workspace, thành viên, cài đặt (visibility, approval, số thành viên tối đa); subscription và quota theo workspace.

### 5.2 Ngoài phạm vi MVP (Out of Scope)

- Backend API thật và database persistence (hiện dùng mock JSON).
- Xác thực đăng nhập thật (SSO, OAuth).
- Thanh toán PayOS thật và xác minh chữ ký webhook.
- Cộng tác real-time (multi-user editing).
- Xuất Google Docs, PDF.
- Ký điện tử và lưu trữ hợp đồng đã ký.
- Mobile app riêng; ưu tiên responsive web.

---

## 6. Ràng buộc và giả định

### 6.1 Ràng buộc kinh doanh

- Sản phẩm phải tuân thủ luật Việt Nam (BLDS 2026, Luật Thương mại 2025, v.v.).
- Nội dung AI tạo ra mang tính tham khảo; người dùng chịu trách nhiệm pháp lý cuối cùng.
- Dữ liệu mock có thể thay thế bằng API/DB mà không thay đổi nghiệp vụ cốt lõi đã mô tả.

### 6.2 Ràng buộc kỹ thuật

- Frontend: Next.js (App Router), TypeScript, React.
- AI: Google Gemini API (cần GEMINI_API_KEY).
- Export Word: thư viện docx; extract text: pdf-parse, mammoth (PDF/DOC/DOCX).
- Kích thước file upload (extract text): tối đa 10MB; định dạng: PDF, DOC, DOCX.

### 6.3 Giả định

- Người dùng có trình duyệt hiện đại và kết nối internet ổn định.
- Workspace đã được tạo và người dùng đã được gán vào workspace (trong MVP dùng mock).
- Quota và subscription được cập nhật sau khi “thanh toán” thành công (mock hoặc real).

---

## 7. Tóm tắt

LAWZY MVP là nền tảng SaaS giúp soạn thảo và quản lý hợp đồng pháp lý theo luật Việt Nam 2026. Đối tượng chính là luật sư và chuyên viên pháp lý; mục tiêu là giảm thời gian soạn thảo, tăng độ chính xác pháp lý và tạo doanh thu từ gói Pro/Enterprise. Phạm vi MVP gồm dashboard, editor với AI, thư viện mẫu, nguồn upload, thanh toán mock và quản lý workspace/quyền. Các tài liệu SRS, API Specification và Development Specification chi tiết hóa yêu cầu và hướng dẫn triển khai; **ROADMAP.md** định hướng tầm nhìn và kế hoạch từ MVP (frontend + mock) sang backend thật, RAG và thanh toán thật.

---

## 8. Liên kết với Roadmap

| Mục tiêu BRD | Giai đoạn roadmap tương ứng |
|--------------|-----------------------------|
| Phạm vi MVP (mock, UI đầy đủ) | Giai đoạn 0 — đã có |
| Backend API, DB, auth, CRUD thật | Giai đoạn 1 |
| RAG: embedding, retrieval, citation từ nguồn | Giai đoạn 2 |
| Thanh toán PayOS thật, quota trong DB | Giai đoạn 3 |
| Test, monitoring, scale, tính năng mở rộng | Giai đoạn 4 |

---

*Tài liệu này được tạo từ cấu trúc và mã nguồn hiện có của dự án LAWZY; đã bổ sung trạng thái hiện tại và tham chiếu tầm nhìn/roadmap.*
