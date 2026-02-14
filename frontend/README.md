# LAWZY

**Nền tảng SaaS quản lý hợp đồng pháp lý theo luật Việt Nam.**

LAWZY giúp doanh nghiệp và chuyên viên pháp lý soạn thảo, review và quản lý hợp đồng chuẩn BLDS, Luật Thương mại và văn bản hiện hành — với editor rich text, merge fields, AI gợi ý và trích dẫn luật.

---

## Trạng thái dự án

- **Hiện tại:** Ứng dụng web (Next.js, React, TypeScript) với giao diện đầy đủ: Dashboard, Canvas Editor, Thư viện mẫu, Nguồn tham chiếu, Thanh toán (mock), Workspace & quyền. Dữ liệu dùng **mock JSON**; AI (Gemini) gọi qua Next.js API routes.
- **Tiếp theo:** Backend API thật, persistence DB, tích hợp RAG cho nguồn pháp lý, và luồng thanh toán thật. Chi tiết theo từng giai đoạn xem **[docs/ROADMAP.md](docs/ROADMAP.md)**.

---

## Tech stack (tóm tắt)

| Nhóm | Công nghệ |
|------|-----------|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| UI | Tailwind CSS 4, shadcn/ui, Lucide |
| Editor | TipTap (ProseMirror), custom MergeField extension |
| State | Zustand (global), TanStack Query (sẵn sàng) |
| AI | Google Gemini API (generate, review, cite-law) |
| Export | docx (Word), pdf-parse / mammoth (extract text) |

---

## Bắt đầu nhanh

```bash
npm install
cp .env.local.example .env.local   # Thêm GEMINI_API_KEY
npm run dev
```

**Biến môi trường:** `GEMINI_API_KEY` (bắt buộc cho AI), `NEXT_PUBLIC_APP_URL` (tùy chọn).

---

## Tài liệu dự án

| Tài liệu | Mô tả |
|----------|--------|
| [BRD](docs/BRD-Business-Requirements-Document.md) | Bài toán kinh doanh, user, mục tiêu, phạm vi |
| [SRS](docs/SRS-Software-Requirements-Specification.md) | Yêu cầu chức năng & phi chức năng, use case, acceptance criteria |
| [API Specification](docs/API-Specification.md) | Endpoint, request/response, bảo mật |
| [Development Specification](docs/DEVELOPMENT-SPECIFICATION.md) | Kiến trúc, cấu trúc mã nguồn, chuẩn code, build/deploy |
| [ROADMAP](docs/ROADMAP.md) | Tầm nhìn, kế hoạch theo giai đoạn (MVP → Backend → RAG → Scale) |

---

## License

Proprietary — LAWZY
