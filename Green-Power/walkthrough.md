# Báo Cáo Kết Quả Triển Khai (Walkthrough) - LAW-F7-01

Chúng tôi đã hoàn thành triển khai toàn bộ phần lõi Backend cho **Projects API & Document Hierarchy Links** (`LAW-F7-01`) theo đúng thiết kế và yêu cầu tiêu chí nghiệm thu (AC).

---

## 1. Các thay đổi mã nguồn đã thực hiện (Changes Made)

### Khởi tạo Modules & Endpoints mới
- **Projects Module:** Tạo mới [projects.service.ts](file:///Users/lyanhquan/code/lawzy/backend/src/modules/projects/projects.service.ts), [projects.controller.ts](file:///Users/lyanhquan/code/lawzy/backend/src/modules/projects/projects.controller.ts), và [projects.module.ts](file:///Users/lyanhquan/code/lawzy/backend/src/modules/projects/projects.module.ts) để quản lý CRUD các dự án liên kết.
- **Đăng ký module:** Cập nhật [app.module.ts](file:///Users/lyanhquan/code/lawzy/backend/src/app.module.ts) để nạp `ProjectsModule`.
- **API liên kết:** Thêm các route `/documents/links`, `/documents/:id/links`, và `/documents/links/:id` trong [documents.controller.ts](file:///Users/lyanhquan/code/lawzy/backend/src/modules/documents/documents.controller.ts) và [documents.service.ts](file:///Users/lyanhquan/code/lawzy/backend/src/modules/documents/documents.service.ts).

### Cơ chế Nghiệp vụ đặc thù
- **Ngăn chặn vòng lặp:** Viết hàm đệ quy `hasPath()` trong `DocumentsService` để phát hiện và ngăn chặn liên kết tạo thành chu kỳ khép kín (Circular Dependency).
- **Soft-delete Broken Links:** Khi lấy danh sách liên kết thông qua `getDocumentLinks`, hệ thống sẽ tự động chuyển trạng thái của liên kết thành `'broken'` nếu tệp tin đích bị xóa tạm thời (soft-deleted).

---

## 2. Kết quả kiểm thử & Nghiệm thu (Validation Logs)

Chúng tôi đã viết kịch bản kiểm thử tích hợp tự động độc lập tại [f7-01-smoke-test.ts](file:///Users/lyanhquan/code/lawzy/backend/scripts/f7-01-smoke-test.ts) để kiểm chứng trực tiếp trên database MySQL. 

Kết quả chạy thực tế:

```bash
$ npx ts-node -r tsconfig-paths/register scripts/f7-01-smoke-test.ts
=== KHỞI ĐỘNG SMOKE TEST LAW-F7-01 ===
1. Khởi tạo Workspace và User thử nghiệm...

2. Kiểm thử AC-2 (Multi-tenant uniqueness)...
✅ [PASS] Tạo thành công dự án GP-GIALAI trên Workspace A (ID: 281147e5-f714-4f1e-b88b-c57da2631ad1)
✅ [PASS] Chặn tạo trùng dự án trên cùng một Workspace thành công.
✅ [PASS] Tạo thành công dự án GP-GIALAI trên Workspace B (ID: f385fac4-f061-4e04-937a-9a477d7fa091)

3. Kiểm thử AC-3 (Circular Dependency)...
✅ [PASS] Tạo liên kết Hợp đồng A -> Phụ lục B thành công.
✅ [PASS] Tạo liên kết Phụ lục B -> Nghiệm thu C thành công.
✅ [PASS] Chặn tạo liên kết vòng lặp C -> A thành công.

4. Kiểm thử AC-4 (Soft-delete broken link)...
   - Trạng thái link B -> C trước khi xóa C: active
   - Đã soft-delete tài liệu C.
   - Trạng thái link B -> C sau khi xóa C: broken
✅ [PASS] Trạng thái liên kết tự động chuyển thành broken khi tệp đích bị soft-deleted.

5. Dọn dẹp dữ liệu kiểm thử...
   🧹 Đã dọn dẹp sạch sẽ DB.

🚀 === KẾT QUẢ: TẤT CẢ CÁC KIỂM THỬ ĐÃ ĐẠT (ALL PASS) ===
```

---

## 3. Trạng thái Build hệ thống
- NestJS backend biên dịch thành công không lỗi:
  ```bash
  $ npm run build
  > backend@0.0.1 build
  > nest build
  (Build success)
  ```

---

# Báo Cáo Kết Quả Triển Khai (Walkthrough) - LAW-F7-02

Chúng tôi đã hoàn thành triển khai **AI Metadata & Entity Extractor Service** (`LAW-F7-02`) theo đúng thiết kế và yêu cầu tiêu chí nghiệm thu (AC).

## 1. Các thay đổi mã nguồn đã thực hiện (Changes Made)

### Trích xuất Metadata Dự án bằng Gemini AI
- **Extractor Service:** Xây dựng [project-metadata-extractor.service.ts](file:///Users/lyanhquan/code/lawzy/backend/src/modules/projects/project-metadata-extractor.service.ts) để:
  - Đọc text từ tệp tin đính kèm vật lý (PDF/Word/Text) lưu trữ trên R2 thông qua `SourceProcessingService.extractText`.
  - Hỗ trợ fallback tự động sang đọc văn bản phân cấp từ JSON cấu trúc TipTap Editor (`contentJSON`) nếu không có tệp đính kèm hoặc đọc tệp bị lỗi.
  - Sử dụng prompt chuyên sâu gửi đến Gemini AI với cấu hình trả về kiểu JSON định dạng (`responseMimeType: 'application/json'`) để trích xuất có cấu trúc: `projectName`, `developerName`, `contractorName`, `capacity`, `location`, và `legalBases`.
  - Lưu trữ kết quả trích xuất trực tiếp vào `document.metadata` hoặc ghi nhận thông tin lỗi vào `metadata.error` để tránh làm gián đoạn tiến trình.

### Tích hợp Trình kích hoạt nền (Background Trigger)
- **Tự động trích xuất:** Tích hợp gọi nền `extractMetadata` trong [documents.service.ts](file:///Users/lyanhquan/code/lawzy/backend/src/modules/documents/documents.service.ts) (phương thức `create` và `update`) khi tài liệu chuyển trạng thái sang `'completed'` hoặc `'signed'`.

---

## 2. Kết quả kiểm thử & Nghiệm thu (Validation Logs)

Chúng tôi đã xây dựng kịch bản kiểm thử tích hợp tự động độc lập tại [f7-02-smoke-test.ts](file:///Users/lyanhquan/code/lawzy/backend/scripts/f7-02-smoke-test.ts).

Kết quả chạy thực tế:

```bash
$ npx ts-node -r tsconfig-paths/register scripts/f7-02-smoke-test.ts
=== KHỞI ĐỘNG SMOKE TEST LAW-F7-02 (AI Metadata Extractor) ===
1. Khởi tạo Workspace và User thử nghiệm...

2. Kiểm thử Trích xuất trực tiếp từ Editor contentJSON...
Document 1 created with ID: 34f8e8db-c0b9-4b4e-b30d-8f9627257e46. Gọi extractor.extractMetadata()...
[ProjectMetadataExtractorService] Bắt đầu trích xuất metadata bằng AI cho Document: 34f8e8db-c0b9-4b4e-b30d-8f9627257e46
[ProjectMetadataExtractorService] Không có tệp đính kèm, trích xuất văn bản từ Editor contentJSON...
[ProjectMetadataExtractorService] Gửi yêu cầu tới Gemini để trích xuất metadata...
[ProjectMetadataExtractorService] Trích xuất và lưu thành công metadata cho document: 34f8e8db-c0b9-4b4e-b30d-8f9627257e46
Kết quả trích xuất từ Gemini: {
  "projectName": "Nhà máy điện mặt trời Lộc Ninh 3",
  "developerName": "Công ty Cổ phần Năng lượng Xanh Lộc Ninh",
  "contractorName": "Công ty TNHH Kỹ thuật và Xây dựng EPC Global",
  "capacity": "50MWp",
  "location": "Huyện Lộc Ninh, Tỉnh Bình Phước, Việt Nam",
  "legalBases": [
    "Luật Xây dựng số 50/2014/QH13",
    "Nghị định số 06/2021/NĐ-CP của Chính phủ"
  ]
}
✅ [PASS] Trích xuất trực tiếp thành công và đầy đủ các trường.
✅ [PASS] Metadata lưu vào DB chính xác.

3. Kiểm thử Background Trigger qua update()...
Cập nhật status của Document 2 thành completed...
[ProjectMetadataExtractorService] Bắt đầu trích xuất metadata bằng AI cho Document: e1f98a04-b6e8-4389-b1ac-7036a4494ad0
Chờ 5 giây để AI chạy background...
[ProjectMetadataExtractorService] Không có tệp đính kèm, trích xuất văn bản từ Editor contentJSON...
[ProjectMetadataExtractorService] Gửi yêu cầu tới Gemini để trích xuất metadata...
[ProjectMetadataExtractorService] Trích xuất và lưu thành công metadata cho document: e1f98a04-b6e8-4389-b1ac-7036a4494ad0
Kiểm tra metadata tự động trích xuất trong DB cho Document 2: {
  "capacity": "50MWp",
  "location": "Huyện Lộc Ninh, Tỉnh Bình Phước, Việt Nam",
  "legalBases": [
    "Luật Xây dựng số 50/2014/QH13",
    "Nghị định số 06/2021/NĐ-CP của Chính phủ"
  ],
  "projectName": "Nhà máy điện mặt trời Lộc Ninh 3",
  "developerName": "Công ty Cổ phần Năng lượng Xanh Lộc Ninh",
  "contractorName": "Công ty TNHH Kỹ thuật và Xây dựng EPC Global"
}
✅ [PASS] Tự động kích hoạt trích xuất metadata khi hoàn thành tài liệu thành công.

4. Kiểm thử đính kèm tệp lỗi và fallback sang Editor contentJSON...
Đã tạo tệp đính kèm lỗi cho Document 3 (ID: c188cfe2-9c17-46a0-a3db-b7b58e0ecde7). Gọi extractor.extractMetadata()...
[ProjectMetadataExtractorService] Bắt đầu trích xuất metadata bằng AI cho Document: c188cfe2-9c17-46a0-a3db-b7b58e0ecde7
[ProjectMetadataExtractorService] Tìm thấy tệp đính kèm vật lý: non_existent_contract.pdf. Tiến hành đọc tệp...
[ProjectMetadataExtractorService] Lỗi trích xuất text từ tệp R2: UnknownError
[ProjectMetadataExtractorService] Không có tệp đính kèm, trích xuất văn bản từ Editor contentJSON...
[ProjectMetadataExtractorService] Gửi yêu cầu tới Gemini để trích xuất metadata...
[ProjectMetadataExtractorService] Trích xuất và lưu thành công metadata cho document: c188cfe2-9c17-46a0-a3db-b7b58e0ecde7
Kết quả trích xuất sau khi fallback: {
  "projectName": "Nhà máy điện mặt trời Lộc Ninh 3",
  "developerName": "Công ty Cổ phần Năng lượng Xanh Lộc Ninh",
  "contractorName": "Công ty TNHH Kỹ thuật và Xây dựng EPC Global",
  "capacity": "50MWp",
  "location": "Huyện Lộc Ninh, Tỉnh Bình Phước, Việt Nam",
  "legalBases": [
    "Luật Xây dựng số 50/2014/QH13",
    "Nghị định số 06/2021/NĐ-CP"
  ]
}
✅ [PASS] Fallback sang contentJSON khi gặp lỗi đọc tệp thành công.

5. Kiểm thử error logging khi tài liệu hoàn toàn không có nội dung...
Gọi extractMetadata cho tài liệu trống...
[ProjectMetadataExtractorService] Bắt đầu trích xuất metadata bằng AI cho Document: 806c6960-8a8f-4826-83ae-302239e0da3e
[ProjectMetadataExtractorService] Không có tệp đính kèm, trích xuất văn bản từ Editor contentJSON...
[ProjectMetadataExtractorService] Không tìm thấy nội dung văn bản cho Document 806c6960-8a8f-4826-83ae-302239e0da3e. Bỏ qua trích xuất.
Kết quả trả về cho tài liệu trống: null
✅ [PASS] Xử lý tài liệu trống thành công (không crash).

🧹 Đã dọn dẹp sạch sẽ DB.

🚀 === KẾT QUẢ: TẤT CẢ CÁC KIỂM THỬ ĐÃ ĐẠT (ALL PASS) ===
```

---

# Báo Cáo Kết Quả Triển Khai (Walkthrough) - LAW-F7-03

Chúng tôi đã hoàn thành triển khai **Engine Đề Xuất Liên Kết Parent-Child Tự Động** (`LAW-F7-03`) theo đúng thiết kế và yêu cầu tiêu chí nghiệm thu (AC).

## 1. Các thay đổi mã nguồn đã thực hiện (Changes Made)

### Xây dựng Engine Gợi Ý Liên Kết (ProjectLinkerSuggestionService)
- **Thuật toán quét Preamble:** Phát triển [project-linker-suggestion.service.ts](file:///Users/lyanhquan/code/lawzy/backend/src/modules/projects/project-linker-suggestion.service.ts) để đọc phần mở đầu (preamble) của tài liệu và gửi yêu cầu tới Gemini AI xác định xem tài liệu hiện tại có tham chiếu đến một hợp đồng hoặc quyết định gốc nào khác không.
- **Chuẩn hóa & So khớp mờ (Fuzzy Matching):** Thiết lập phương thức chuẩn hóa loại bỏ khoảng trắng, các ký tự đặc biệt, và các tiền tố pháp lý thông dụng (hợp đồng số, hđ, số,...) để đối chiếu mã số hiệu hợp đồng (`contractNumber` lưu trong `metadata` của tài liệu) giữa các văn bản trong hệ thống.
- **Tự động lưu trạng thái đề xuất:** Nếu khớp, tạo bản ghi liên kết đề xuất `DocumentLink` dưới trạng thái `'ai_suggested'`.
- **Tránh trùng lặp / Từ chối vĩnh viễn:** Logic sinh đề xuất sẽ tự động bỏ qua nếu đã tồn tại một liên kết với trạng thái bất kỳ (chủ động liên kết, đã đề xuất hoặc đã bị người dùng từ chối dưới trạng thái `'ai_rejected'`).

### Tích hợp Service & REST API
- **REST Endpoints mới:** Thêm các route trong [documents.controller.ts](file:///Users/lyanhquan/code/lawzy/backend/src/modules/documents/documents.controller.ts):
  - `GET /documents/:id/linking-suggestions`: Trả về danh sách liên kết đề xuất từ AI.
  - `POST /documents/:id/accept-link`: Chấp nhận liên kết, chuyển trạng thái liên kết thành `'active'`, đồng thời thiết lập mối quan hệ phân cấp `parentId` (và `projectId` nếu có) trên child document.
  - `POST /documents/:id/reject-link`: Từ chối liên kết, chuyển trạng thái liên kết thành `'ai_rejected'` để chặn AI gợi ý lại trong tương lai.
- **Background Pipeline Trigger:** Tích hợp kích hoạt đề xuất tự động chạy trong nền ngay sau khi tài liệu hoàn tất trích xuất metadata bằng AI trong `create` và `update` của [documents.service.ts](file:///Users/lyanhquan/code/lawzy/backend/src/modules/documents/documents.service.ts).

---

## 2. Kết quả kiểm thử & Nghiệm thu (Validation Logs)

Chúng tôi đã xây dựng kịch bản kiểm thử tích hợp tự động độc lập tại [f7-03-smoke-test.ts](file:///Users/lyanhquan/code/lawzy/backend/scripts/f7-03-smoke-test.ts).

Kết quả chạy thực tế:

```bash
$ npx ts-node -r tsconfig-paths/register scripts/f7-03-smoke-test.ts
=== KHỞI ĐỘNG SMOKE TEST LAW-F7-03 (AI Suggestion Parent-Child) ===
1. Khởi tạo Workspace và User thử nghiệm...

2. Tạo Hợp đồng gốc (Parent)...
Hợp đồng gốc được tạo với ID: 05ddd9a0-f99a-401a-beb4-7556ef9e6351, Số HĐ: 15/2026/HĐ-GP

3. Tạo Phụ lục 01 (Child) chứa nội dung tham chiếu số hợp đồng gốc...
Phụ lục được tạo với ID: 68a9b0f7-67f9-4965-b596-e255e4b56f9b
Gọi linkerService.generateSuggestions()...
[ProjectLinkerSuggestionService] Bắt đầu chạy AI Suggestion Engine cho Document: 68a9b0f7-67f9-4965-b596-e255e4b56f9b
[ProjectLinkerSuggestionService] Gửi yêu cầu tới Gemini để phân tích preamble của document 68a9b0f7-67f9-4965-b596-e255e4b56f9b...
[ProjectLinkerSuggestionService] AI phát hiện số hiệu hợp đồng gốc tham chiếu: 15/2026/HĐ-GP
[ProjectLinkerSuggestionService] Đã tạo liên kết đề xuất (ai_suggested) từ Hợp đồng mua bán điện gốc GP-WIND -> Phụ lục 02 sửa đổi đơn giá
Kết quả sinh đề xuất tự động: [
  {
    "id": "f8008578-c6ab-4928-84de-da99b9a1020f",
    "sourceDocumentId": "05ddd9a0-f99a-401a-beb4-7556ef9e6351",
    "targetDocumentId": "68a9b0f7-67f9-4965-b596-e255e4b56f9b",
    "linkType": "dependency",
    "description": "AI phát hiện số hiệu hợp đồng gốc tham chiếu '15/2026/HĐ-GP' trong phần mở đầu của phụ lục.",
    "status": "ai_suggested",
    "createdAt": "2026-05-30T07:31:16.241Z",
    "sourceDocument": {
      "id": "05ddd9a0-f99a-401a-beb4-7556ef9e6351",
      "title": "Hợp đồng mua bán điện gốc GP-WIND",
      "type": "contract",
      "status": "completed"
    }
  }
]
✅ [PASS] AI phát hiện chính xác số hiệu hợp đồng gốc và tạo liên kết đề xuất (ai_suggested).

4. Kiểm thử lấy danh sách đề xuất qua documentsService.getSuggestions()...
Đề xuất lấy được: [
  {
    "id": "f8008578-c6ab-4928-84de-da99b9a1020f",
    "sourceDocumentId": "05ddd9a0-f99a-401a-beb4-7556ef9e6351",
    "targetDocumentId": "68a9b0f7-67f9-4965-b596-e255e4b56f9b",
    "linkType": "dependency",
    "description": "AI phát hiện số hiệu hợp đồng gốc tham chiếu '15/2026/HĐ-GP' trong phần mở đầu của phụ lục.",
    "status": "ai_suggested",
    "createdAt": "2026-05-30T07:31:16.241Z",
    "sourceDocument": {
      "id": "05ddd9a0-f99a-401a-beb4-7556ef9e6351",
      "title": "Hợp đồng mua bán điện gốc GP-WIND",
      "type": "contract",
      "status": "completed",
      "metadata": {
        "projectName": "Dự án Điện gió Green Power",
        "contractNumber": "15/2026/HĐ-GP"
      }
    }
  }
]
✅ [PASS] Lấy danh sách đề xuất thành công.

5. Kiểm thử Chấp nhận đề xuất liên kết...
[ProjectLinkerSuggestionService] Chấp nhận liên kết đề xuất f8008578-c6ab-4928-84de-da99b9a1020f thành công. Thiết lập parentId: 05ddd9a0-f99a-401a-beb4-7556ef9e6351
Kết quả chấp nhận: {
  "id": "f8008578-c6ab-4928-84de-da99b9a1020f",
  "sourceDocumentId": "05ddd9a0-f99a-401a-beb4-7556ef9e6351",
  "targetDocumentId": "68a9b0f7-67f9-4965-b596-e255e4b56f9b",
  "linkType": "dependency",
  "description": "AI phát hiện số hiệu hợp đồng gốc tham chiếu '15/2026/HĐ-GP' trong phần mở đầu của phụ lục.",
  "status": "active",
  "createdAt": "2026-05-30T07:31:16.241Z"
}
Trạng thái parentId của Child sau khi accept: 05ddd9a0-f99a-401a-beb4-7556ef9e6351
✅ [PASS] Chấp nhận liên kết thành công. Cây cấu trúc tài liệu được thiết lập.

6. Kiểm thử Từ chối đề xuất liên kết...
[ProjectLinkerSuggestionService] Bắt đầu chạy AI Suggestion Engine cho Document: 08aa1980-0369-4b35-a97e-0575033e4377
[ProjectLinkerSuggestionService] Gửi yêu cầu tới Gemini để phân tích preamble của document 08aa1980-0369-4b35-a97e-0575033e4377...
[ProjectLinkerSuggestionService] AI phát hiện số hiệu hợp đồng gốc tham chiếu: 15/2026/HĐ-GP
[ProjectLinkerSuggestionService] Đã tạo liên kết đề xuất (ai_suggested) từ Hợp đồng mua bán điện gốc GP-WIND -> Phụ lục 03 sửa đổi tiến độ
[ProjectLinkerSuggestionService] Từ chối liên kết đề xuất 5428e860-b453-4d45-aeca-208080efcdaf thành công. Trạng thái cập nhật thành: ai_rejected
Kết quả từ chối: {
  "id": "5428e860-b453-4d45-aeca-208080efcdaf",
  "sourceDocumentId": "05ddd9a0-f99a-401a-beb4-7556ef9e6351",
  "targetDocumentId": "08aa1980-0369-4b35-a97e-0575033e4377",
  "linkType": "dependency",
  "description": "AI phát hiện số hiệu hợp đồng gốc tham chiếu '15/2026/HĐ-GP' trong phần mở đầu của phụ lục.",
  "status": "ai_rejected",
  "createdAt": "2026-05-30T07:31:18.685Z"
}
✅ [PASS] Từ chối liên kết thành công. Trạng thái lưu là ai_rejected và không đổi cấu trúc cây.

7. Kiểm thử AI gợi ý loại trừ các liên kết đã bị từ chối trước đó...
[ProjectLinkerSuggestionService] Bắt đầu chạy AI Suggestion Engine cho Document: 08aa1980-0369-4b35-a97e-0575033e4377
[ProjectLinkerSuggestionService] Gửi yêu cầu tới Gemini để phân tích preamble của document 08aa1980-0369-4b35-a97e-0575033e4377...
[ProjectLinkerSuggestionService] AI phát hiện số hiệu hợp đồng gốc tham chiếu: 15/2026/HĐ-GP
[ProjectLinkerSuggestionService] Liên kết giữa Hợp đồng mua bán điện gốc GP-WIND và Phụ lục 03 sửa đổi tiến độ đã tồn tại với trạng thái: ai_rejected
Đề xuất sinh lại sau khi đã từ chối: []
✅ [PASS] Tránh gợi ý trùng lặp liên kết bị từ chối thành công.

8. Dọn dẹp dữ liệu kiểm thử...
🧹 Đã dọn dẹp sạch sẽ DB.

🚀 === KẾT QUẢ: TẤT CẢ CÁC KIỂM THỬ ĐÃ ĐẠT (ALL PASS) ===
```

---

# Báo Cáo Kết Quả Triển Khai (Walkthrough) - LAW-F7-04

Chúng tôi đã hoàn thành triển khai **Clause-level Mapping & Versioning Engine** (`LAW-F7-04`) theo đúng thiết kế và yêu cầu tiêu chí nghiệm thu (AC).

## 1. Các thay đổi mã nguồn đã thực hiện (Changes Made)

### Xây dựng Service So sánh và Ánh xạ Điều khoản (ClauseVersioningService)
- **Quét Node Clause phân cấp:** Phát triển [clause-versioning.service.ts](file:///Users/lyanhquan/code/lawzy/backend/src/modules/projects/clause-versioning.service.ts) thực hiện đệ quy duyệt qua cây JSON cấu trúc TipTap (`contentJSON`) của cả Hợp đồng gốc và Phụ lục để bóc tách tất cả các node có `type: 'clause'` (bao gồm ID tĩnh, Tiêu đề và Nội dung chữ).
- **Phân tích So sánh chéo qua Gemini:** Sử dụng Gemini AI để đối chiếu văn nghĩa điều khoản phụ lục với mục lục điều khoản hợp đồng chính nhằm xác định mối liên kết logic. AI trả về JSON chứa cặp quan hệ đè hiệu lực (`sourceClauseId`, `targetClauseId`) kèm loại tác động (`supersedes` - thay thế, `modifies` - sửa đổi, `extends` - bổ sung).
- **Đánh dấu Trực quan trên JSON gốc (Superseded Status):** Duyệt đệ quy cây JSON gốc và cập nhật động thuộc tính của Node Clause bị sửa đổi thành:
  - `status: 'superseded'`
  - `supersededByDocumentId: childDocId` (ID phụ lục)
  - `supersededByClauseId: targetClauseId` (ID điều khoản phụ lục)
- **Lưu lịch sử Hiệu lực (ClauseMapping):** Tạo bản ghi chi tiết trong bảng `clause_mappings` để lưu vết lịch sử.

### Tích hợp Pipeline tự động chạy trong nền
- **Chạy nền khi liên kết:** Tích hợp trigger chạy trong nền ngay khi một liên kết đồ thị hợp lệ (`linkType = 'dependency'`) được tạo chủ động (qua `createLink`) hoặc được người dùng chấp nhận (qua `acceptSuggestion`) trong [documents.service.ts](file:///Users/lyanhquan/code/lawzy/backend/src/modules/documents/documents.service.ts).
- **REST Endpoint mới:** Thêm API route `@Get(':id/clause-mappings')` để lấy toàn bộ bản đồ hiệu lực điều khoản của tệp tin.

---

## 2. Kết quả kiểm thử & Nghiệm thu (Validation Logs)

Chúng tôi đã xây dựng kịch bản kiểm thử tích hợp tự động độc lập tại [f7-04-smoke-test.ts](file:///Users/lyanhquan/code/lawzy/backend/scripts/f7-04-smoke-test.ts).

Kết quả chạy thực tế:

```bash
$ npx ts-node -r tsconfig-paths/register scripts/f7-04-smoke-test.ts
=== KHỞI ĐỘNG SMOKE TEST LAW-F7-04 (Clause-level Mapping & Versioning) ===
1. Khởi tạo Workspace và User thử nghiệm...

2. Tạo Hợp đồng gốc (Parent) có chứa Clause node...
Hợp đồng gốc created: 1e3b2e14-864d-41db-9472-3fa20a346a6d

3. Tạo Phụ lục (Child) có chứa Clause node sửa đổi...
Phụ lục created: 4633c58d-1e71-4b78-acd9-4c4c924a3567

4. Tạo liên kết đồ thị và kích hoạt phân tích điều khoản...
[ClauseVersioningService] Bắt đầu phân tích điều khoản giữa Parent: 1e3b2e14-864d-41db-9472-3fa20a346a6d và Child: 4633c58d-1e71-4b78-acd9-4c4c924a3567
Đã tạo liên kết Hợp đồng -> Phụ lục. ID: 22dd6938-880a-46c0-9682-07832ad3c416
Chờ 6 giây để AI chạy nền phân tích điều khoản...
[ClauseVersioningService] Gửi yêu cầu tới Gemini để phân tích ánh xạ điều khoản...
[ClauseVersioningService] AI phát hiện 1 ánh xạ điều khoản.
[ClauseVersioningService] Đã cập nhật thành công trạng thái superseded cho các điều khoản bị ghi đè trong Hợp đồng gốc.

5. Xác minh kết quả phân tích trong DB...
Các Clause Mapping trích xuất từ DB: [
  {
    "id": "9340bf1d-461c-4f40-9c2f-78f2bf5865f6",
    "sourceDocId": "1e3b2e14-864d-41db-9472-3fa20a346a6d",
    "targetDocId": "4633c58d-1e71-4b78-acd9-4c4c924a3567",
    "sourceClauseId": "parent-clause-5-uid",
    "targetClauseId": "child-clause-2-uid",
    "sourceClauseKey": "Điều 5. Đơn giá",
    "targetClauseKey": "Mục 2",
    "mappingType": "modifies",
    "status": "active",
    "effectiveDate": null,
    "createdAt": "2026-05-30T07:35:55.921Z",
    "sourceDoc": {
      "id": "1e3b2e14-864d-41db-9472-3fa20a346a6d",
      "title": "Hợp đồng chính xây dựng tuabin gió"
    },
    "targetDoc": {
      "id": "4633c58d-1e71-4b78-acd9-4c4c924a3567",
      "title": "Phụ lục số 02 điều chỉnh đơn giá"
    }
  }
]
✅ [PASS] AI ánh xạ chính xác điều khoản bị đè (Điều 5) và điều khoản thay thế (Mục 2).
Cây JSON cập nhật của Hợp đồng gốc: {
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Đây là hợp đồng chính.",
          "type": "text"
        }
      ]
    },
    {
      "type": "clause",
      "attrs": {
        "id": "parent-clause-5-uid",
        "title": "Điều 5. Đơn giá",
        "status": "superseded",
        "supersededByClauseId": "child-clause-2-uid",
        "supersededByDocumentId": "4633c58d-1e71-4b78-acd9-4c4c924a3567"
      },
      "content": [
        {
          "type": "paragraph",
          "content": [
            {
              "text": "Đơn giá thi công xây dựng tuabin gió được ấn định là 1.000.000 USD/tuabin.",
              "type": "text"
            }
          ]
        }
      ]
    }
  ]
}
✅ [PASS] Cập nhật thuộc tính Node Clause gốc thành superseded và lưu liên kết thành công.

7. Dọn dẹp dữ liệu kiểm thử...
🧹 Đã dọn dẹp sạch sẽ DB.

🚀 === KẾT QUẢ: TẤT CẢ CÁC KIỂM THỬ ĐÃ ĐẠT (ALL PASS) ===
```

---

# Báo Cáo Kết Quả Triển Khai (Walkthrough) - LAW-F7-05

Chúng tôi đã hoàn thành triển khai **Change Propagation & Consistency Validator** (`LAW-F7-05`) theo đúng thiết kế và yêu cầu tiêu chí nghiệm thu (AC).

## 1. Các thay đổi mã nguồn đã thực hiện (Changes Made)

### Xây dựng Service đối chiếu thông số chéo (ConsistencyValidatorService)
- **Kiểm tra thông số dự án:** Tạo service [consistency-validator.service.ts](file:///Users/lyanhquan/code/lawzy/backend/src/modules/projects/consistency-validator.service.ts) để đối chiếu thông tin metadata chéo giữa toàn bộ tài liệu trong cùng một dự án.
- **Phát hiện mâu thuẫn bằng AI:** Gửi thông tin của tất cả tài liệu dự án đến Gemini AI để so sánh các biến pháp lý và kỹ thuật quan trọng (`capacity` - công suất, `location` - địa điểm, `developerName` - chủ đầu tư, `contractorName` - nhà thầu, `projectName` - tên dự án). Bỏ qua các trường null hoặc không đề cập. AI trả về các thông số bị lệch và đề xuất hướng chuẩn hóa.
- **Quản lý Vòng đời Cảnh báo (MismatchAlert Lifecycle):**
  - **Tự động kích hoạt:** Khi phát hiện lệch thông số, ghi nhận cảnh báo lệch mới hoặc chuyển lại trạng thái alert cũ thành `'unresolved'`.
  - **Tự động giải phóng (Auto-resolve):** Khi người dùng cập nhật thông số đồng nhất và chạy lại kiểm tra nhất quán, hệ thống sẽ quét so khớp và tự động chuyển trạng thái của alert tương ứng thành `'resolved'`.

### Bảo mật Phân quyền (RBAC Filtering)
- **Lọc theo quyền truy cập:** Thiết lập cơ chế lọc RBAC trên service `getMismatchAlerts`. Khi người dùng truy vấn danh sách cảnh báo của dự án, hệ thống lọc bỏ toàn bộ các cảnh báo thuộc về các tài liệu mật (`visibility = 'private'`) được tạo bởi người dùng khác để đảm bảo tính an toàn dữ liệu tối đa.

### Đăng ký API Route
- **REST Endpoints mới** trong [projects.controller.ts](file:///Users/lyanhquan/code/lawzy/backend/src/modules/projects/projects.controller.ts):
  - `POST /projects/:id/validate-consistency`: Trình kích hoạt chạy thủ công / cập nhật lại trạng thái thông số chéo trong dự án.
  - `GET /projects/:id/mismatch-alerts`: Lấy danh sách các cảnh báo lệch thông số của dự án đã lọc theo RBAC của người dùng gọi API.

---

## 2. Kết quả kiểm thử & Nghiệm thu (Validation Logs)

Chúng tôi đã xây dựng kịch bản kiểm thử tích hợp tự động độc lập tại [f7-05-smoke-test.ts](file:///Users/lyanhquan/code/lawzy/backend/scripts/f7-05-smoke-test.ts).

Kết quả chạy thực tế:

```bash
$ npx ts-node -r tsconfig-paths/register scripts/f7-05-smoke-test.ts
=== KHỞI ĐỘNG SMOKE TEST LAW-F7-05 (Change Propagation & Consistency) ===
1. Khởi tạo Workspace, Dự án và Users...

2. Tạo các tài liệu có thông số công suất lệch nhau (50MWp vs 45MWp)...

3. Gọi validatorService.validateConsistency()...
[ConsistencyValidatorService] Bắt đầu chạy kiểm tra nhất quán cho dự án: af0e2db0-8e22-4a86-8936-d3153f3dd16a
[ConsistencyValidatorService] Gửi yêu cầu tới Gemini để đối chiếu chéo thông số...
[ConsistencyValidatorService] AI phát hiện 1 trường hợp lệch thông số.
Các cảnh báo lệch thông số thu được: [
  {
    "id": "4109af8d-eee0-4045-a03e-5e52ff34ca05",
    "documentId": "fea1357e-6027-487c-9d86-b5d0541b0302",
    "fieldKey": "capacity",
    "sourceValue": "50MWp",
    "mismatchValue": "45MWp",
    "severity": "high",
    "description": "Công suất trong Biên bản nghiệm thu là 45MWp, bị lệch so với Hợp đồng EPC là 50MWp",
    "status": "unresolved",
    "createdAt": "2026-05-30T07:47:56.022Z",
    "document": {
      "id": "fea1357e-6027-487c-9d86-b5d0541b0302",
      "title": "Biên bản nghiệm thu lắp đặt tuabin",
      "visibility": "workspace",
      "createdBy": "8fc3b649-bd9b-491a-ad0c-7ef588d7c6eb"
    }
  }
]
✅ [PASS] Phát hiện chính xác các sai lệch giá trị công suất và lưu vào bảng MismatchAlert.

4. Kiểm thử phân quyền lọc cảnh báo theo RBAC (AC-3)...
[ConsistencyValidatorService] Bắt đầu chạy kiểm tra nhất quán cho dự án: af0e2db0-8e22-4a86-8936-d3153f3dd16a
[ConsistencyValidatorService] Gửi yêu cầu tới Gemini để đối chiếu chéo thông số...
[ConsistencyValidatorService] AI phát hiện 3 trường hợp lệch thông số.
Cảnh báo hiển thị với User A: [
  {
    "id": "4109af8d-eee0-4045-a03e-5e52ff34ca05",
    "documentId": "fea1357e-6027-487c-9d86-b5d0541b0302",
    "fieldKey": "capacity",
    "sourceValue": "50MWp",
    "mismatchValue": "45MWp",
    "severity": "high",
    "description": "Công suất trong 'Biên bản nghiệm thu lắp đặt tuabin' là 45MWp, bị lệch so với 'Hợp đồng EPC dự án Bình Phước' là 50MWp.",
    "status": "unresolved",
    "createdAt": "2026-05-30T07:47:56.022Z",
    "document": {
      "id": "fea1357e-6027-487c-9d86-b5d0541b0302",
      "title": "Biên bản nghiệm thu lắp đặt tuabin",
      "visibility": "workspace",
      "createdBy": "8fc3b649-bd9b-491a-ad0c-7ef588d7c6eb"
    }
  }
]
Cảnh báo hiển thị với User B: [
  {
    "id": "aaf83326-572e-4990-a586-de64146f31eb",
    "documentId": "83f7748f-5214-4e10-917f-168ee600fb84",
    "fieldKey": "developerName",
    "sourceValue": "Công ty Cổ phần Năng lượng Xanh Lộc Ninh",
    "mismatchValue": "Tên khác hoàn toàn",
    "severity": "high",
    "description": "Tên chủ đầu tư trong 'Báo cáo chi phí phát sinh nội bộ (Secret)' là 'Tên khác hoàn toàn', bị lệch so với 'Hợp đồng EPC dự án Bình Phước' và 'Biên bản nghiệm thu lắp đặt tuabin' là 'Công ty Cổ phần Năng lượng Xanh Lộc Ninh'.",
    "status": "unresolved",
    "createdAt": "2026-05-30T07:48:21.831Z",
    "document": {
      "id": "83f7748f-5214-4e10-917f-168ee600fb84",
      "title": "Báo cáo chi phí phát sinh nội bộ (Secret)",
      "visibility": "private",
      "createdBy": "8c2f80ff-411e-4a5b-a28f-337ceb8a0ffc"
    }
  },
  {
    "id": "c0951e70-8442-44ba-a834-5bb97e242148",
    "documentId": "83f7748f-5214-4e10-917f-168ee600fb84",
    "fieldKey": "capacity",
    "sourceValue": "50MWp",
    "mismatchValue": "99MWp",
    "severity": "high",
    "description": "Công suất trong 'Báo cáo chi phí phát sinh nội bộ (Secret)' là 99MWp, bị lệch so với 'Hợp đồng EPC dự án Bình Phước' là 50MWp.",
    "status": "unresolved",
    "createdAt": "2026-05-30T07:48:21.814Z",
    "document": {
      "id": "83f7748f-5214-4e10-917f-168ee600fb84",
      "title": "Báo cáo chi phí phát sinh nội bộ (Secret)",
      "visibility": "private",
      "createdBy": "8c2f80ff-411e-4a5b-a28f-337ceb8a0ffc"
    }
  },
  {
    "id": "4109af8d-eee0-4045-a03e-5e52ff34ca05",
    "documentId": "fea1357e-6027-487c-9d86-b5d0541b0302",
    "fieldKey": "capacity",
    "sourceValue": "50MWp",
    "mismatchValue": "45MWp",
    "severity": "high",
    "description": "Công suất trong 'Biên bản nghiệm thu lắp đặt tuabin' là 45MWp, bị lệch so với 'Hợp đồng EPC dự án Bình Phước' là 50MWp.",
    "status": "unresolved",
    "createdAt": "2026-05-30T07:47:56.022Z",
    "document": {
      "id": "fea1357e-6027-487c-9d86-b5d0541b0302",
      "title": "Biên bản nghiệm thu lắp đặt tuabin",
      "visibility": "workspace",
      "createdBy": "8fc3b649-bd9b-491a-ad0c-7ef588d7c6eb"
    }
  }
]
✅ [PASS] Phân quyền hiển thị cảnh báo (RBAC) hoạt động chính xác.

5. Đồng nhất lại thông số và chạy lại kiểm tra (AC-2)...
Đã cập nhật công suất của Biên bản nghiệm thu về 50MWp.
[ConsistencyValidatorService] Bắt đầu chạy kiểm tra nhất quán cho dự án: af0e2db0-8e22-4a86-8936-d3153f3dd16a
[ConsistencyValidatorService] Gửi yêu cầu tới Gemini để đối chiếu chéo thông số...
[ConsistencyValidatorService] AI phát hiện 2 trường hợp lệch thông số.
[ConsistencyValidatorService] Tự động giải phóng cảnh báo (resolved) cho alert: 4109af8d-eee0-4045-a03e-5e52ff34ca05 (Trường: capacity)
Cảnh báo sau khi đồng nhất thông số: [
  {
    "id": "aaf83326-572e-4990-a586-de64146f31eb",
    "documentId": "83f7748f-5214-4e10-917f-168ee600fb84",
    "fieldKey": "developerName",
    "sourceValue": "Công ty Cổ phần Năng lượng Xanh Lộc Ninh",
    "mismatchValue": "Tên khác hoàn toàn",
    "severity": "high",
    "description": "Tên chủ đầu tư trong Báo cáo chi phí phát sinh nội bộ (Secret) là 'Tên khác hoàn toàn', bị lệch so với đa số tài liệu khác là 'Công ty Cổ phần Năng lượng Xanh Lộc Ninh'.",
    "status": "unresolved",
    "createdAt": "2026-05-30T07:48:21.831Z",
    "document": {
      "id": "83f7748f-5214-4e10-917f-168ee600fb84",
      "title": "Báo cáo chi phí phát sinh nội bộ (Secret)",
      "visibility": "private",
      "createdBy": "8c2f80ff-411e-4a5b-a28f-337ceb8a0ffc"
    }
  },
  {
    "id": "c0951e70-8442-44ba-a834-5bb97e242148",
    "documentId": "83f7748f-5214-4e10-917f-168ee600fb84",
    "fieldKey": "capacity",
    "sourceValue": "50MWp",
    "mismatchValue": "99MWp",
    "severity": "high",
    "description": "Công suất trong Báo cáo chi phí phát sinh nội bộ (Secret) là 99MWp, bị lệch so với đa số tài liệu khác là 50MWp.",
    "status": "unresolved",
    "createdAt": "2026-05-30T07:48:21.814Z",
    "document": {
      "id": "83f7748f-5214-4e10-917f-168ee600fb84",
      "title": "Báo cáo chi phí phát sinh nội bộ (Secret)",
      "visibility": "private",
      "createdBy": "8c2f80ff-411e-4a5b-a28f-337ceb8a0ffc"
    }
  },
  {
    "id": "4109af8d-eee0-4045-a03e-5e52ff34ca05",
    "documentId": "fea1357e-6027-487c-9d86-b5d0541b0302",
    "fieldKey": "capacity",
    "sourceValue": "50MWp",
    "mismatchValue": "45MWp",
    "severity": "high",
    "description": "Công suất trong 'Biên bản nghiệm thu lắp đặt tuabin' là 45MWp, bị lệch so với 'Hợp đồng EPC dự án Bình Phước' là 50MWp.",
    "status": "resolved",
    "createdAt": "2026-05-30T07:47:56.022Z",
    "document": {
      "id": "fea1357e-6027-487c-9d86-b5d0541b0302",
      "title": "Biên bản nghiệm thu lắp đặt tuabin",
      "visibility": "workspace",
      "createdBy": "8fc3b649-bd9b-491a-ad0c-7ef588d7c6eb"
    }
  }
]
Trạng thái của alert cũ sau khi đồng nhất: resolved
✅ [PASS] Chuyển trạng thái alert thành resolved thành công sau khi đồng nhất thông số.

6. Dọn dẹp dữ liệu kiểm thử...
🧹 Đã dọn dẹp sạch sẽ DB.

🚀 === KẾT QUẢ: TẤT CẢ CÁC KIỂM THỬ ĐÃ ĐẠT (ALL PASS) ===
```

---

# Báo Cáo Kết Quả Triển Khai (Walkthrough) - LAW-F7-06

Chúng tôi đã hoàn thành triển khai **UI Cây Tài Liệu & Lớp Phủ Hiệu Lực Trực Quan** (`LAW-F7-06`) theo đúng thiết kế và yêu cầu tiêu chí nghiệm thu (AC).

## 1. Các thay đổi mã nguồn đã thực hiện (Changes Made)

### Side Sheet So Sánh Điều Khoản Trong Editor
- **Đăng ký sự kiện so sánh:** Lắng nghe sự kiện tùy chỉnh `'lawzy:compare-clause'` được kích hoạt khi click vào badge "Đã bị thay thế" của Clause Block trong [clause.tsx](file:///Users/lyanhquan/code/lawzy/frontend/src/lib/tiptap/extensions/clause.tsx).
- **Hành động bóc tách & Lấy dữ liệu:**
  - Lấy nội dung gốc của điều khoản bị thay thế trực tiếp từ JSON cấu trúc TipTap hiện tại của Editor (`editor.getJSON()`).
  - Gọi API `/documents/:id` để tải tệp phụ lục tương ứng và bóc tách nội dung điều khoản mới.
- **Giao diện So sánh Side-by-side:** Xây dựng Side Sheet so sánh đẹp mắt với hiệu ứng chuyển động mượt mà sử dụng `framer-motion`:
  - Cột trái: Văn bản điều khoản gốc (gạch ngang màu đỏ).
  - Cột phải: Văn bản điều khoản mới thay thế tại phụ lục (nổi bật trên nền cam nhạt ấm áp).

### Màn hình Sơ đồ Cây & Nhất Quán Dự án (Project Details Page)
- **Tạo Route mới:** Thiết lập trang chi tiết tại [page.tsx](file:///Users/lyanhquan/code/lawzy/frontend/src/app/(dashboard)/projects/[id]/page.tsx).
- **Cây phân cấp tài liệu:** Thiết lập thuật toán xây dựng cấu trúc cây đệ quy dựa trên liên kết `parentId` của các tài liệu thuộc dự án và render thụt lề thụ động cực kỳ chuyên nghiệp.
- **Danh sách cảnh báo thông số:** Render các cảnh báo sai lệch (MismatchAlert) từ API `/projects/:id/mismatch-alerts` phân loại theo mức độ nghiêm trọng (severity).
- **Kích hoạt quét thủ công:** Hỗ trợ nút bấm chạy trực tiếp `/projects/:id/validate-consistency` kèm hiệu ứng loading xoay tròn sinh động và tự động cập nhật lại danh sách cảnh báo.

---

## 2. Kết quả kiểm thử & Nghiệm thu (Validation Logs)
- Đã chỉnh sửa TypeScript type definition của `TreeNodeComponent` để đảm bảo tương thích kiểu dữ liệu hoàn hảo.
- Chạy kiểm tra tĩnh Typescript và build NestJS backend thành công không có lỗi biên dịch.
