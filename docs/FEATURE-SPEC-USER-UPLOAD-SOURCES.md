# Đặc tả tính năng: Nguồn pháp lý upload của người dùng (User Upload Sources)

**Phiên bản:** 1.0  
**Ngày:** 2026-02-09  
**Mục tiêu:** Cho phép người dùng upload tài liệu (PDF, DOCX, TXT, …) làm nguồn dữ liệu tham chiếu riêng cho workspace; AI soạn hợp đồng sẽ tìm kiếm, trích dẫn chính xác từ các nguồn này và hiển thị bằng chứng (citation) trong UI.

---

## 1. Tổng quan và phân biệt nguồn

**Nguồn upload của người dùng (User Upload Sources)** là tập tài liệu do user/workspace upload: chính sách bảo mật, quy định nội bộ, văn bản pháp lý, hợp đồng mẫu nội bộ, v.v. Chúng là **dữ liệu tham chiếu pháp lý/nghiệp vụ** mà AI phải ưu tiên dùng để trích dẫn điều khoản, số trang, ngữ cảnh khi soạn hợp đồng. Mỗi workspace có bộ nguồn riêng, không chia sẻ với workspace khác; việc parse, embedding và index được thực hiện theo workspace.

**Thư viện mẫu hợp đồng (Community Contract Templates)** là bộ template do LAWZY/cộng đồng cung cấp: cấu trúc hợp đồng sẵn có (điều khoản, merge fields, format) để user chọn và tái sử dụng. AI dùng thư viện này để **định hình cấu trúc và bố cục** hợp đồng, không phải để “trích dẫn từng đoạn” như nguồn upload. Khi generate, AI phải phân biệt rõ: (1) **Template** → chọn cấu trúc/điều khoản mẫu; (2) **User Upload Sources** → tìm đoạn văn bản cụ thể để cite (file + trang + đoạn) và đưa vào nội dung hợp đồng, kèm reference.

---

## 2. Mô tả hành vi và luồng (UX + logic)

### 2.1 Luồng tổng quát

Tính năng tối ưu UX theo chuỗi: **Upload → Parse/Process → Index → Reference khi soạn hợp đồng**. Người dùng vào màn “Nguồn của tôi” (hoặc panel trong workspace), kéo thả hoặc chọn nhiều file (PDF, DOCX, TXT, …). Hệ thống nhận file, lưu theo workspace, chạy pipeline: extract text (PDF/DOCX), OCR nếu ảnh/scan, chunk theo đoạn có ý nghĩa (theo heading/đoạn), embed từng chunk bằng model embedding, lưu vào vector store có namespace theo `workspaceId`. Metadata mỗi nguồn (title, tag, status parse, page/section) được lưu để hiển thị trong UI và để AI trích dẫn chính xác. Khi user trong editor yêu cầu “Soạn hợp đồng SaaS, tham chiếu chính sách bảo mật của công ty”, backend trước khi gọi model soạn hợp đồng sẽ **semantic search** trong vector store của workspace đó với query mở rộng (ví dụ: “điều khoản bảo mật, privacy, SaaS”), lấy top-k chunk liên quan, đưa vào context của prompt với format chuẩn (file name, page, đoạn text). AI được hướng dẫn trong system prompt: ưu tiên trích dẫn từ các đoạn này, gắn mỗi đoạn trích với `sourceId`, `fileName`, `pageNumber`, `excerpt`. Output hợp đồng (JSON) bao gồm `citations` array; frontend render đoạn trích có thể click để mở side panel xem nguồn (file + trang + ngữ cảnh).

### 2.2 Find & Cite trong quá trình generate

Khi user yêu cầu soạn hợp đồng (ví dụ “Trong điều khoản bảo mật, cần tuân thủ chính sách công ty”), AI phải tìm và trích dẫn nội dung từ nguồn upload. Backend thực hiện: (1) Lấy `workspaceId` từ session/request; (2) Từ prompt/user message, tạo query search (có thể dùng prompt + contract type + clause keywords); (3) Gọi vector search theo `workspaceId`, trả về danh sách chunk có `sourceId`, `fileName`, `pageNumber`, `text`; (4) Đưa các chunk này vào system/user prompt dưới dạng “Nguồn tham chiếu từ workspace” với format cố định; (5) Trong system prompt, yêu cầu AI khi viết mỗi đoạn liên quan phải gắn citation: `[Source: fileName, trang X]: đoạn trích`. Response JSON có cấu trúc `content.sections[].citations[]` với `sourceId`, `fileName`, `pageNumber`, `excerpt`, `usedInClause`. Frontend khi render section hiển thị citation dạng badge/link; click vào mở panel “Nguồn” hiển thị file gốc (preview PDF/DOCX hoặc text) và highlight đoạn tương ứng (page + excerpt), tạo bằng chứng rõ ràng cho người dùng.

---

## 3. Upload Sources UI

### 3.1 Vị trí và cấu trúc

- **Vị trí:** Trang/mục riêng trong dashboard: **“Nguồn của tôi”** / **“Upload Sources”** (sidebar), và/hoặc panel có thể mở từ editor (icon “Nguồn” bên cạnh chat) để vừa xem danh sách vừa soạn hợp đồng.
- **Panel chính gồm:**
  - **Khu vực upload:** Drag-and-drop hoặc nút “Thêm file” hỗ trợ nhiều file một lần; định dạng: PDF, DOCX, DOC, TXT. Hiển thị giới hạn dung lượng (ví dụ 20MB/file) và định dạng được phép.
  - **Danh sách nguồn:** Bảng/card list mỗi item gồm: **title** (editable, mặc định = tên file), **tag** (multi-tag tự nhập hoặc gợi ý: “Chính sách”, “Hợp đồng mẫu”, “Pháp lý”), **status** (pending / processing / ready / error), **ngày upload**, **hành động:** Xem chi tiết, Đổi tên, Xóa. Cột “Trạng thái” hiển thị: “Đang xử lý…”, “Sẵn sàng”, “Lỗi: [message]”.
  - **Chi tiết nguồn (khi click vào một item):** Preview (nếu đã process): text hoặc PDF preview; metadata: số trang, số chunk, ngày process; nút Re-process nếu cần.

### 3.2 Hành vi UI

- Upload: Gửi file lên API `POST /api/workspaces/[workspaceId]/sources/upload` (multipart); response trả về `sourceId` và status `processing`. UI thêm một row “Đang xử lý” với progress (có thể polling hoặc WebSocket).
- Rename: Inline edit title hoặc modal; gọi `PATCH /api/workspaces/[workspaceId]/sources/[sourceId]` với `{ title }`.
- Delete: Xác nhận; gọi `DELETE .../sources/[sourceId]`; xóa cả file lưu và index vector tương ứng.
- Tag: Cho phép thêm/xóa tag; lưu qua PATCH. Tag dùng để lọc danh sách và (tùy chọn) để AI ưu tiên nguồn theo ngữ cảnh (ví dụ tag “Privacy” khi soạn điều khoản bảo mật).

---

## 4. Source Processing (Backend pipeline)

### 4.1 Quy trình xử lý

1. **Ingest:** Nhận file, lưu vào storage (theo workspace, path: `workspaces/{workspaceId}/sources/{sourceId}/{originalFileName}`). Tạo bản ghi `UploadSource` trong DB: `sourceId`, `workspaceId`, `fileName`, `title`, `mimeType`, `fileSize`, `status: pending`, `createdAt`, `createdBy`.
2. **Extract text:**
   - **PDF:** Dùng thư viện extract text (e.g. pdf-parse, pdfjs). Nếu trang không có text layer (scan/ảnh), gọi OCR (e.g. Tesseract hoặc cloud OCR) cho trang đó; lưu text theo từng trang.
   - **DOCX:** Parse XML (e.g. mammoth hoặc officegen) lấy text và (nếu có) heading structure để chunk theo section.
   - **TXT:** UTF-8 decode, chuẩn hóa line breaks.
3. **Chunking:** Chia nội dung thành chunk có kích thước giới hạn (ví dụ 500–800 token) với overlap nhỏ (50–100 token). Ưu tiên cắt theo ranh giới câu/đoạn; với PDF/DOCX giữ metadata `pageNumber` (và section title nếu có) cho mỗi chunk. Mỗi chunk lưu: `sourceId`, `pageNumber`, `sectionTitle?`, `text`, `startOffset`, `endOffset`.
4. **Embedding:** Embed từng chunk bằng model embedding (e.g. text-embedding-004 hoặc model do LAWZY chọn); vector lưu vào vector store (e.g. Pinecone, pgvector, hoặc in-memory cho MVP) với namespace/index prefix theo `workspaceId` để query đúng workspace.
5. **Metadata DB:** Cập nhật bản ghi `UploadSource`: `status: ready`, `pageCount`, `chunkCount`, `processedAt`. Lưu bảng `SourceChunk`: `chunkId`, `sourceId`, `pageNumber`, `sectionTitle`, `text`, `embeddingId` (hoặc ref đến vector store).

### 4.2 Lỗi và retry

- Nếu extract/OCR lỗi: set `status: error`, `errorMessage`; hiển thị trong UI và cho phép user xóa hoặc re-upload.
- Re-process: API `POST .../sources/[sourceId]/reprocess` chạy lại từ bước 2; ghi đè chunk cũ và embedding cũ cho `sourceId` đó.

---

## 5. Integration with Contract Generation

### 5.1 API generate hợp đồng

- Request hiện tại: `POST /api/ai/generate` với `{ metadata, prompt }`. Mở rộng: thêm `workspaceId` (hoặc lấy từ session), và tùy chọn `contractType`, `clauseFocus` (để tạo query search tốt hơn).
- **Bước trước khi gọi AI:**
  1. Kiểm tra workspace có bật “Nguồn của tôi” và có ít nhất một source `status: ready`.
  2. Tạo search query: nối `prompt` + `metadata.contractType` + từ khóa (ví dụ “điều khoản, điều kiện, bảo mật, thanh toán”). Có thể tách query theo clause (bảo mật, thanh toán, …) để search nhiều lần.
  3. Gọi vector search trong index của `workspaceId`, top-k (ví dụ k=10–15), trả về chunk kèm `sourceId`, `fileName`, `pageNumber`, `text`.
  4. Format context “User upload sources” cho prompt:
     ```
     [Nguồn tham chiếu từ workspace - chỉ trích dẫn từ đây khi phù hợp]
     ---
     [1] File: PrivacyPolicy.pdf, Trang 12
     Đoạn: "..."
     ---
     [2] File: InternalPolicy.docx, Mục 3.2
     Đoạn: "..."
     ```
  5. Gửi vào model: system prompt (có hướng dẫn cite nguồn) + user message (prompt user) + context nguồn. Yêu cầu output JSON có `content.sections[].content` và `content.sections[].citations[]` với `sourceId`, `fileName`, `pageNumber`, `excerpt`, `usedInClause`.

### 5.2 System prompt (bổ sung)

- Đoạn mô tả nguồn: “Nếu có [Nguồn tham chiếu từ workspace] dưới đây, bạn PHẢI ưu tiên trích dẫn chính xác từ các đoạn đó khi soạn hợp đồng. Mỗi đoạn trích phải gắn với file và trang tương ứng. Thư viện mẫu hợp đồng chỉ dùng để tham khảo cấu trúc/điều khoản mẫu, KHÔNG thay thế việc trích dẫn từ nguồn upload khi nội dung liên quan có trong nguồn.”
- Format output: Mỗi section có thể có `citations: [{ sourceId, fileName, pageNumber, excerpt, usedInClause }]`.

### 5.3 Frontend editor

- Khi nhận response generate: parse `sections` và `citations`. Render nội dung section; với mỗi citation hiển thị badge hoặc inline link dạng “[PrivacyPolicy.pdf, tr.12]”. Click vào citation mở **Reference panel** (drawer/sheet): tiêu đề “Nguồn: fileName”, hiển thị trang (PDF preview hoặc text) và highlight đoạn `excerpt`, giúp user kiểm chứng.

---

## 6. Source Prioritization

- **Thứ tự ưu tiên khi AI soạn hợp đồng:**
  1. **User Upload Sources:** Nếu semantic search trả về chunk liên quan, AI phải dùng và cite các đoạn này trước cho nội dung tương ứng.
  2. **Thư viện luật / e-library LAWZY:** Chỉ dùng khi không có nguồn upload phù hợp hoặc cần bổ sung trích dẫn luật chung (BLDS, Luật Thương mại, …).
  3. **Thư viện mẫu hợp đồng:** Dùng để lấy cấu trúc, tên điều khoản, merge fields; không dùng để “copy nguyên văn” thay cho nguồn upload khi user đã có tài liệu tham chiếu.

- Trong code: Khi build context cho AI, luôn đưa “User upload context” lên trước và ghi rõ “ưu tiên trích dẫn”; đoạn “e-library/template” đưa sau với ghi chú “cấu trúc và tham khảo chung”.

---

## 7. Reference Display & UI Evidence

- **Trong bản draft hợp đồng (editor):** Mỗi đoạn được AI trích từ nguồn upload có citation inline (ví dụ superscript [1] hoặc badge “PrivacyPolicy.pdf, tr.12”). Click vào:
  - Mở panel bên phải hoặc drawer: tiêu đề “Nguồn: [fileName]”, hiển thị vị trí (trang + đoạn). Nếu backend lưu được bản text theo trang, hiển thị đoạn đó với highlight; nếu có file gốc, có thể embed PDF viewer đến đúng trang (query param `page=12`).
- **Trong chat (assistant message):** Có thể tóm tắt ngắn “Đã tham chiếu PrivacyPolicy.pdf trang 12 cho điều khoản bảo mật” và link “Xem nguồn” mở cùng Reference panel.

---

## 8. Security & Privacy

- **Lưu trữ file:** File upload lưu theo `workspaceId`; path không thể truy cập từ workspace khác. Dùng storage (S3/GCS) với bucket hoặc prefix theo workspace; IAM/signed URL nếu cần truy cập đọc từ frontend.
- **Truy cập:** Mọi API nguồn (upload, list, get, delete) kiểm tra user thuộc workspace và có quyền (ví dụ editor trở lên mới upload/xóa). Chỉ member cùng workspace mới search được nguồn khi generate.
- **Index vector:** Namespace/index theo `workspaceId`; query luôn filter `workspaceId` để không lộ dữ liệu workspace khác.
- **Audit:** Log sự kiện upload, delete, re-process theo workspace và user cho sau này audit.

---

## 9. Data model (gợi ý)

### 9.1 Bảng / types

- **UploadSource:**  
  `sourceId`, `workspaceId`, `fileName`, `title`, `mimeType`, `fileSize`, `storagePath`, `status` (pending | processing | ready | error), `errorMessage?`, `pageCount?`, `chunkCount?`, `tags[]`, `createdAt`, `createdBy`, `processedAt?`

- **SourceChunk:**  
  `chunkId`, `sourceId`, `workspaceId`, `pageNumber`, `sectionTitle?`, `text`, `startOffset`, `endOffset`, `embeddingId` (ref vector store)

- **Vector store:**  
  Id hoặc key gồm `workspaceId` + `chunkId`; metadata: `sourceId`, `fileName`, `pageNumber`, `sectionTitle?` để filter và trả về trong search.

### 9.2 API endpoints (gợi ý)

| Method | Path | Mô tả |
|--------|------|--------|
| POST | `/api/workspaces/[workspaceId]/sources/upload` | Upload file(s), trả về sourceId, trigger processing |
| GET | `/api/workspaces/[workspaceId]/sources` | List nguồn (filter by tag, status) |
| GET | `/api/workspaces/[workspaceId]/sources/[sourceId]` | Chi tiết + metadata chunks |
| PATCH | `/api/workspaces/[workspaceId]/sources/[sourceId]` | Update title, tags |
| DELETE | `/api/workspaces/[workspaceId]/sources/[sourceId]` | Xóa file + chunks + vectors |
| POST | `/api/workspaces/[workspaceId]/sources/[sourceId]/reprocess` | Chạy lại pipeline |
| POST | `/api/ai/generate` | (Mở rộng) Nhận workspaceId; trước khi gọi model gọi internal semantic search và inject context nguồn |

---

## 10. Tóm tắt kiểm tra triển khai

- [ ] UI: Trang/panel “Nguồn của tôi” với upload, list (title, tag, status), rename, delete.
- [ ] Backend: Ingest, extract (PDF/DOCX/TXT, OCR nếu cần), chunk, embed, lưu vector theo workspace.
- [ ] Generate: Trước khi gọi AI, search vector theo workspace + prompt, inject context nguồn vào prompt; output có citations (sourceId, fileName, pageNumber, excerpt).
- [ ] Frontend editor: Render citation clickable; panel “Nguồn” hiển thị file/trang/đoạn tương ứng.
- [ ] Phân biệt rõ: User Upload Sources = trích dẫn nội dung; Thư viện mẫu = cấu trúc hợp đồng; ưu tiên nguồn upload khi có.
- [ ] Bảo mật: File và index theo workspace; kiểm tra quyền trên mọi API.

---

**Tham chiếu trong codebase:** Types: `src/types/upload-source.ts` (UploadSource, SourceChunk, SourceCitation). Mock: `src/mock/upload-sources.json`.

*Tài liệu này là đặc tả tính năng để dev bắt tay triển khai và để AI sử dụng nguồn upload trong workflow soạn hợp đồng LAWZY.*
