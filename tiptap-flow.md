# Đánh giá việc sử dụng Tiptap Editor tại màn hình `/editor`

Dựa vào mã nguồn của dự án (cụ thể tại `canvas-editor.tsx`, `globals.css`, và `result-to-tiptap-content.ts`), dưới đây là đánh giá công tâm, minh bạch về 4 vấn đề bạn đã nêu:

## 1. Vấn đề thường xuyên không canh giữa được "Độc lập - Tự do - Hạnh phúc"
**Đánh giá nguyên nhân:**
- Trong `canvas-editor.tsx`, class hằng số `CONTRACT_BODY_CLASSES` được thiết lập cho editor: `"[&_p]:text-[15px] [&_p]:leading-relaxed [&_p]:mb-4 [&_p]:text-justify"`. Do đó, mặc định tất cả các paragraph (`<p>`) đều bị ép thuộc tính `text-justify` (canh đều 2 bên).
- Khi LLM sinh ra văn bản, dòng chữ "Độc lập - Tự do - Hạnh phúc" thường được đưa vào paragraph thông thường. Vì tính chất của `text-justify` trên các dòng chữ ngắn, text sẽ bị kéo lệch sang trái thay vì nằm ở giữa.
- Trong file `result-to-tiptap-content.ts`, hàm xử lý nội dung từ LLM (`parseMarkdownToTipTap`) không hề gán thuộc tính `textAlign: 'center'` cho các node chữ này. Tương tự, nếu dùng legacy JSON format, nó còn bị gán cứng là `attrs: { textAlign: 'left' }`.

**Kết luận:** Vấn đề này thuộc về xung đột CSS và luồng parse data chưa tự động nhận diện được Quốc hiệu/Tiêu ngữ để set style phù hợp. Bạn phải tự bôi đen và dùng tool căn giữa thủ công để ghi đè class Tailwind.

## 2. Tạo table không mượt mà, thoải mái như Google Docs / MS Word
**Đánh giá nguyên nhân:**
- Dự án sử dụng `@tiptap/extension-table` mặc định. Bản thân extension này của Tiptap rất thô sơ, chủ yếu phục vụ việc tạo cấu trúc HTML `<table>` mà thiếu đi các UI/UX tương tác kéo thả mượt mà như các trình soạn thảo chuyên nghiệp.
- Việc thao tác trên table (chọn nhiều ô, merge cell, thêm/xóa dòng cột) trong Tiptap rất cứng. Dù bạn có viết thêm Context Menu (như logic đang có trong `canvas-editor.tsx`) thì trải nghiệm native (ví dụ: bôi đen một lúc nhiều cell bằng chuột) vẫn rất kém.
- File `globals.css` ép table là `table-layout: fixed; min-width: 100%`, dẫn đến việc khi dùng tay nắm kéo resize cột (qua element `.column-resize-handle`), table thường xuyên bị giật lag và nhảy layout không như ý muốn.

**Kết luận:** Đây là hạn chế lớn nhất của Tiptap so với các engine WYSIWYG truyền thống (như TinyMCE hay CKEditor). Để mượt như Word, thường các dự án lớn phải code lại toàn bộ module Table rất phức tạp.

## 3. Đảm bảo nội dung đúng khổ trang A4 ngoài thực tế
**Đánh giá nguyên nhân:**
- Frontend đang mô phỏng trang A4 bằng cách cố định chiều rộng (`max-w-[850px]`) và định nghĩa hằng số `PAGE_HEIGHT_PX = 1122`.
- **Thực tế:** Tiptap Editor cơ bản chỉ là một thẻ `<div>` kéo dài (Continuous Scroll) giống như một trang web. Nó **không có khái niệm ngắt trang (Pagination)** ở chế độ soạn thảo. Bạn không thể thấy điểm kết thúc của trang 1 và bắt đầu của trang 2.
- Vì vậy, "Những gì bạn thấy" trên editor sẽ không bao giờ khớp 100% với "Những gì bạn nhận được" khi in ra hoặc xuất file Word/PDF. Việc ngắt dòng có thể giống nhưng việc ngắt trang chắc chắn sẽ có sai số khi MS Word hay Trình duyệt PDF tự động tính toán lại layout lúc in.

**Kết luận:** Phương án fix width hiện tại là tốt nhất ở mức web-based editor. Tuy nhiên, nó không "đảm bảo 100% đúng khổ A4" về mặt ngắt trang khi làm việc. Cần phải có thông báo cho User hiểu rằng ngắt trang thực tế sẽ phụ thuộc vào file xuất ra.

## 4. Đảm bảo flow từ lúc nhận từ LLM tới lúc hiển thị Frontend ổn định và chính xác
**Đánh giá nguyên nhân:**
- Luồng dữ liệu đi qua file: `frontend/src/lib/editor/result-to-tiptap-content.ts` (hàm `parseMarkdownToTipTap`).
- **Điểm yếu (Rủi ro cao):** Hệ thống đang tự viết (custom script) một hàm parse Markdown bằng vòng lặp `while` và các lệnh `startsWith()`, `split()`.
- Phương pháp này **không phải là một AST Markdown Parser thực thụ**. Nó xử lý theo từng dòng string. Do đó, nếu LLM (vốn có tính chất không thể kiểm soát 100% format output) trả về markdown hơi khác biệt một chút (ví dụ: nested list, table có merge cells, hay text in đậm bị ngắt quãng sai syntax), hàm parser này sẽ bị "gãy", dẫn đến việc render mất chữ hoặc sai cấu trúc UI nghiêm trọng.
- Logic bóc tách các biến số `{{KEY}}` (bằng regex `inlineContentFromString`) cũng là một giải pháp thủ công, chạy ổn trên Happy Path nhưng dễ lỗi nếu LLM sinh ra các cặp ngoặc nhọn bị thừa/thiếu.

**Kết luận:** Luồng này **chưa thực sự ổn định và chính xác 100%**. Để đảm bảo không bị lỗi vặt khi LLM sinh dữ liệu, dự án nên sử dụng một thư viện Parser Markdown-to-AST chuẩn (như `marked` hoặc `remark`) để chuyển đổi thành cấu trúc Tiptap JSONContent thay vì tự code bằng string manipulation.
