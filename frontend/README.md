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

**Biến môi trường:** `GEMINI_API_KEY` (bắt buộc cho AI). Các biến public cho URL và SEO:

| Biến | Production | UAT | Local dev |
|------|------------|-----|-----------|
| `NEXT_PUBLIC_APP_URL` | `https://lawzy.vn` | `https://uat.lawzy.vn` | `http://localhost:3000` |
| `NEXT_PUBLIC_SITE_ENV` | `production` | `uat` | (bỏ trống → `development`) |
| `NEXT_PUBLIC_ALLOW_ROBOT_INDEXING` | `true` | `false` | (bỏ trống → không index) |

- **`robots.ts` / `sitemap.ts`:** Production cho phép crawl và submit `https://lawzy.vn/sitemap.xml`; UAT `Disallow: /` và sitemap rỗng.
- **UAT:** Root metadata `noindex` + `src/proxy.ts` header `X-Robots-Tag` khi `Host` chứa `uat.`.

### Search Console (sau deploy)

1. Property production: thêm sitemap `https://lawzy.vn/sitemap.xml`, kiểm tra URL Inspection vài trang landing.
2. UAT: Removals hoặc prefix `https://uat.lawzy.vn/` nếu đã lỡ index; xác nhận `https://uat.lawzy.vn/robots.txt` trả `Disallow: /`.
3. Validate `robots.txt` và vài URL trong sitemap trả 200.

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
