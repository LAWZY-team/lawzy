# API Specification

**Dự án:** LAWZY MVP  
**Phiên bản:** 1.1  
**Ngày:** 2026-02-10  
**Cơ sở:** Next.js App Router (Route Handlers) — REST-style JSON APIs  
**Tham chiếu:** [ROADMAP.md](ROADMAP.md) — Giai đoạn 1 (backend API thật), 2 (RAG), 3 (payment thật)

---

## 1. Tổng quan

### 1.1 Trạng thái API hiện tại và hướng phát triển

- **Hiện tại:** Tất cả endpoint dưới đây là **Next.js Route Handlers** (BFF trong cùng repo). Không có backend service riêng; không có database. Dữ liệu cho AI generate (workspace sources) lấy từ mock `upload-sources.json`; payment là mock (PayOSService trả checkoutUrl/status giả). **Chưa có RAG:** context nguồn đưa vào prompt dạng text (buildSourcesContext), chưa embedding/vector store/retrieval.
- **Hướng phát triển (theo ROADMAP):** Giai đoạn 1 — Backend API thật (auth, CRUD users, workspaces, contracts, templates, sources); frontend gọi API thay mock. Giai đoạn 2 — RAG: pipeline xử lý nguồn, embedding, retrieval; endpoint generate có thể chuyển sang backend hoặc BFF gọi backend. Giai đoạn 3 — Payment thật: webhook verify, cập nhật subscription/quota trong DB. Tài liệu này giữ nguyên đặc tả chi tiết từng endpoint hiện có; khi có backend, sẽ bổ sung section “Backend API (tương lai)” với endpoint mới (auth, CRUD, RAG, webhook verify) mà không xóa nội dung hiện tại.

### 1.2 Base URL

- **Development:** `http://localhost:3000` (hoặc `NEXT_PUBLIC_APP_URL`)
- **API prefix:** Tất cả endpoint dưới `/api/...`

### 1.3 Định dạng chung

- **Request:** JSON `Content-Type: application/json` (trừ extract-text dùng `multipart/form-data`).
- **Response:** JSON, hoặc binary (export docx) với header phù hợp.
- **Mã lỗi:** 400 (Bad Request), 500 (Internal Server Error); body `{ "error": "message" }`.

### 1.4 Bảo mật

- **AI routes:** Chạy trên server; `GEMINI_API_KEY` từ `process.env`, không gửi ra client.
- **Payment webhook:** Hiện không xác minh chữ ký (mock). Khi tích hợp PayOS thật (Giai đoạn 3) cần verify signature.
- **Authentication:** MVP chưa có auth middleware; Giai đoạn 1 sẽ bổ sung session/JWT và middleware cho endpoint cần bảo vệ.

---

## 2. AI APIs

### 2.1 POST /api/ai/generate

Tạo hoặc cập nhật nội dung hợp đồng từ prompt, có thể kèm nội dung hiện tại, merge fields và nguồn đính kèm.

#### Request

| Method | Body | Mô tả |
|--------|------|--------|
| POST | JSON | metadata, prompt, workspaceId, existingContent, mergeFieldValues, attachedSources |

**Body (JSON):**

```json
{
  "metadata": {
    "contractType": "string",
    "parties": [{ "role": "string", "name": "string" }],
    "lawVersions": ["BLDS 2026"],
    "tags": ["string"]
  },
  "prompt": "Soạn hợp đồng NDA giữa bên A và bên B...",
  "workspaceId": "org001",
  "existingContent": "Văn bản hợp đồng hiện tại (optional)",
  "mergeFieldValues": {
    "CONTRACT_NUMBER": "001",
    "PARTY_A_NAME": "Công ty A"
  },
  "attachedSources": [
    { "fileName": "policy.pdf", "text": "Nội dung đã extract từ file..." }
  ]
}
```

- **metadata** (required): object, ít nhất contractType.
- **prompt** (optional): string, mô tả yêu cầu.
- **workspaceId** (optional): string, mặc định `"org001"`; dùng để lấy danh sách upload sources (status ready) và build context cho AI.
- **existingContent** (optional): string, nội dung hiện tại để AI cập nhật/chỉnh sửa.
- **mergeFieldValues** (optional): object key-value; AI dùng đúng key này trong output merge fields.
- **attachedSources** (optional): array of `{ fileName: string, text: string }`; nội dung file user đính kèm trong chat.

#### Response

**200 OK** — Kết quả theo format AI (contract_generation):

```json
{
  "type": "contract_generation",
  "content": {
    "title": "HỢP ĐỒNG DỊCH VỤ",
    "sections": [
      {
        "heading": "Điều 1. Đối tượng",
        "content": "Nội dung... {{PARTY_A_NAME}} ...",
        "mergeFields": ["{{PARTY_A_NAME}}"],
        "suggestedClauses": [],
        "citations": []
      }
    ]
  },
  "metadata": {
    "contractType": "SaaS",
    "prompt": "...",
    "sourceCitations": [
      { "sourceId": "src001", "fileName": "Policy.pdf", "pageNumber": 1, "excerpt": "...", "usedInClause": "Điều 2." }
    ],
    "lawReferences": [
      { "law": "BLDS 2026", "article": "Điều 385", "text": "..." }
    ],
    "riskTags": [
      { "tag": "payment_terms", "level": "medium", "reason": "..." }
    ]
  }
}
```

**500 Internal Server Error:**

```json
{ "error": "API key not configured" }
```
hoặc
```json
{ "error": "Failed to generate contract" }
```

#### Ràng buộc

- Cần `GEMINI_API_KEY` trong env.
- Workspace sources lấy từ mock `upload-sources.json` (filter workspaceId + status === 'ready'); context build bằng `buildSourcesContext`.

---

### 2.2 POST /api/ai/review

Phân tích rủi ro hợp đồng (theo từng điều khoản).

#### Request

| Method | Body |
|--------|------|
| POST | JSON: `content`, `metadata` |

**Body:**

```json
{
  "content": "Điều 5. Thanh toán: Bên B thanh toán 100% trước khi sử dụng...",
  "metadata": { "contractType": "SaaS" }
}
```

#### Response

**200 OK** — Ví dụ (format AI contract_review):

```json
{
  "type": "contract_review",
  "risks": [
    {
      "clause": "Điều 5. Thanh toán",
      "level": "high",
      "reason": "Thanh toán 100% trước có thể gây rủi ro...",
      "suggestion": "Nên chia 2 đợt: 50% trước, 50% sau 30 ngày",
      "lawReference": { "law": "BLDS 2026", "article": "Điều 428" }
    }
  ],
  "overallRisk": "medium"
}
```

**500:** `{ "error": "API key not configured" }` hoặc `{ "error": "Failed to review contract" }`.

---

### 2.3 POST /api/ai/cite-law

Trích dẫn điều khoản luật theo câu hỏi.

#### Request

| Method | Body |
|--------|------|
| POST | JSON: `query` |

**Body:**

```json
{ "query": "Điều khoản về chấm dứt hợp đồng trong BLDS" }
```

#### Response

**200 OK** — JSON do Gemini trả về (format theo system prompt, ví dụ điều/khoản và nội dung).

**500:** `{ "error": "API key not configured" }` hoặc `{ "error": "Failed to cite law" }`.

---

## 3. Export API

### 3.1 POST /api/export/docx

Xuất nội dung editor (TipTap JSON) sang file Word (.docx).

#### Request

| Method | Body |
|--------|------|
| POST | JSON: `content` (JSONContent), `metadata` (optional: `title`) |

**Body:**

```json
{
  "content": {
    "type": "doc",
    "content": [
      { "type": "heading", "attrs": { "level": 1 }, "content": [{ "type": "text", "text": "HỢP ĐỒNG" }] },
      { "type": "paragraph", "content": [
        { "type": "text", "text": "Bên A: " },
        { "type": "mergeField", "attrs": { "fieldKey": "PARTY_A_NAME" } }
      ]}
    ]
  },
  "metadata": { "title": "Hợp đồng dịch vụ" }
}
```

- **content** (optional): TipTap JSONContent; mặc định `{ type: 'doc', content: [] }`.
- **metadata.title** (optional): dùng làm tên file; mặc định `"contract.docx"`.

#### Response

- **200 OK:** Binary body (application/vnd.openxmlformats-officedocument.wordprocessingml.document), header:
  - `Content-Disposition: attachment; filename="<title>.docx"` (filename URL-encoded).

- **500:** `{ "error": "Failed to export document" }`.

#### Ghi chú

- Merge field node (type `mergeField` hoặc `field`) được xuất ra dạng `{{FIELD_KEY}}` trong Word (docx-converter).

---

## 4. Extract Text API

### 4.1 POST /api/extract-text

Trích xuất văn bản từ file PDF, DOC hoặc DOCX (dùng cho đính kèm trong chat AI).

#### Request

| Method | Content-Type | Body |
|--------|--------------|------|
| POST | multipart/form-data | field name: `file` (File) |

#### Ràng buộc

- **Kích thước tối đa:** 10MB.
- **Loại cho phép:** `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`; hoặc extension `.pdf`, `.doc`, `.docx`.

#### Response

**200 OK:**

```json
{
  "text": "Nội dung văn bản đã trích xuất...",
  "fileName": "document.pdf"
}
```

**400 Bad Request:**

- Không gửi file: `{ "error": "No file provided" }`.
- File quá lớn: `{ "error": "File too large. Max 10MB" }`.
- Loại file không hợp lệ: `{ "error": "Only PDF, DOC and DOCX are allowed" }`.
- File .doc legacy không đọc được: `{ "error": "File Word 97-2003 (.doc) không đọc được..." }`.

**500:** `{ "error": "Failed to extract text" }`.

#### Implementation note

- PDF: thư viện pdf-parse.
- DOC/DOCX: mammoth.extractRawText.

---

## 5. Payment APIs (Mock)

### 5.1 POST /api/payment/create

Tạo đơn thanh toán (mock: trả về orderId và checkoutUrl redirect đến trang status).

#### Request

| Method | Body |
|--------|------|
| POST | JSON: `userId`, `plan`, `amount` (optional) |

**Body:**

```json
{
  "userId": "u123",
  "plan": "pro",
  "amount": 1200000
}
```

- **userId** (required): string.
- **plan** (required): string, ví dụ "pro", "free".
- **amount** (optional): number; mặc định 1200000 (VND).

#### Response

**200 OK:**

```json
{
  "orderId": "ord1739123456789",
  "checkoutUrl": "/payment/status/ord1739123456789",
  "status": "pending"
}
```

**400:** `{ "error": "Missing required fields" }`.

**500:** `{ "error": "Failed to create payment" }`.

#### Logic mock

- PayOSService.createPayment tạo orderId = `ord${Date.now()}`, checkoutUrl = `/payment/status/${orderId}`.

---

### 5.2 GET /api/payment/status/[orderId]

Lấy trạng thái đơn hàng (mock).

#### Request

| Method | URL |
|--------|-----|
| GET | /api/payment/status/:orderId |

#### Response

**200 OK:**

```json
{
  "orderId": "ord1739123456789",
  "status": "pending",
  "amount": 1200000,
  "currency": "VND",
  "createdAt": "2026-02-10T12:00:00.000Z"
}
```

**500:** `{ "error": "Failed to check payment status" }`.

---

### 5.3 POST /api/payment/webhook

Nhận webhook từ cổng thanh toán (mock: chỉ log và trả success). Production cần verify signature và cập nhật DB/quota.

#### Request

| Method | Body |
|--------|------|
| POST | JSON: `orderId`, `status` |

**Body:**

```json
{
  "orderId": "ord1739123456789",
  "status": "success"
}
```

#### Response

**200 OK:**

```json
{
  "success": true,
  "orderId": "ord1739123456789",
  "status": "success",
  "message": "Webhook processed successfully"
}
```

**500:** `{ "error": "Failed to process webhook" }`.

---

## 6. Bảng tóm tắt Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| POST | /api/ai/generate | Tạo/cập nhật hợp đồng bằng AI |
| POST | /api/ai/review | Review rủi ro hợp đồng |
| POST | /api/ai/cite-law | Trích dẫn luật theo query |
| POST | /api/export/docx | Xuất TipTap JSON sang .docx |
| POST | /api/extract-text | Trích văn bản từ PDF/DOC/DOCX (multipart) |
| POST | /api/payment/create | Tạo thanh toán (mock) |
| GET | /api/payment/status/[orderId] | Trạng thái đơn (mock) |
| POST | /api/payment/webhook | Webhook thanh toán (mock) |

---

## 7. Ràng buộc bảo mật (Security)

- **Env:** Không commit `GEMINI_API_KEY`; dùng `.env.local` (và exclude trong .gitignore).
- **Rate limiting:** Chưa triển khai; khuyến nghị thêm cho /api/ai/* và /api/extract-text khi lên production.
- **Upload:** Chỉ xử lý file trong giới hạn 10MB và MIME/extension đã liệt kê; không thực thi file.
- **Webhook:** Khi dùng PayOS thật (Roadmap Giai đoạn 3), kiểm tra signature trước khi cập nhật order/quota.

---

## 8. Hướng phát triển API (theo Roadmap)

| Hạng mục | Hiện tại | Giai đoạn 1 (Backend) | Giai đoạn 2 (RAG) | Giai đoạn 3 (Payment) |
|----------|----------|------------------------|-------------------|------------------------|
| **Auth** | Không | POST /auth/login, /auth/logout, GET /users/me; middleware bảo vệ route | — | — |
| **Users, Workspaces, Members** | Mock | CRUD API; frontend gọi thay mock | — | — |
| **Contracts, Templates** | Mock | CRUD API; load/save từ DB | — | — |
| **Upload Sources** | Mock + buildSourcesContext (text) | CRUD API; lưu file, trạng thái processing | Pipeline chunk/embed, retrieval; generate dùng RAG context | — |
| **AI Generate/Review/Cite** | Next.js route, Gemini trực tiếp, context từ mock text | Có thể proxy sang backend hoặc giữ BFF; backend gọi Gemini | Backend (hoặc BFF) gọi RAG retrieval rồi LLM; citation từ chunk | — |
| **Payment** | Mock create/status/webhook | — | — | PayOS thật; webhook verify; API subscription/quota |
| **Export docx, Extract text** | Next.js route | Có thể chuyển sang backend hoặc giữ BFF | — | — |

Chi tiết từng giai đoạn xem [ROADMAP.md](ROADMAP.md). Đặc tả endpoint backend mới (path, method, body, response) sẽ được bổ sung trong bản cập nhật API Specification khi triển khai Giai đoạn 1.

---

*Tài liệu API được suy ra từ mã nguồn trong `src/app/api/` và `src/lib/`; đã bổ sung trạng thái hiện tại và bảng hướng phát triển theo roadmap.*
