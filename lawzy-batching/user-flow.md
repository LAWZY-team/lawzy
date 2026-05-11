**CHIẾN LƯỢC TRIỂN KHAI, KIỂM THỬ VỚI NHÓM VĂN PHÒNG LUẬT/LUẬT SƯ**

- **Vấn đề về bảo mật**

Vấn đề về bảo mật và niềm tin là điều đầu tiên mà Văn phòng Luật quan tâm.

Một số câu hỏi gợi mở:

- Hiện tại các giải pháp lưu trữ điện tử tại Việt Nam đã đáp ứng đúng tinh thần của Nghị định về Dữ liệu lưu trữ điện tử hay chưa?
- Trường hợp các văn phòng Luật

**Hướng giải quyết 1: Human in the loop**  
\- Người dùng tự chọn trường thủ công trước, làm một lần cho nhiều lần với các hồ sơ tương tự.  
VD:  
1\. **Hệ thống scan** -> đọc và phát hiện ra những trường cần điền  
\*Trường = thông tin lặp đi lặp lại, cần customize cho từng khách hàng  
2\. Cho người dùng **kiểm tra đã đủ/đúng chưa** => người dùng chỉnh sửa lại và confirm.  
<br/>**Có thể kéo được tất cả một lúc không?**  
\- Sẽ có 1 file tổng hợp tất cả tài liệu đính kèm  
\- Quăng 13 files =>

**Yêu cầu:**  
\- Cần điền được **một lúc các trường giống nhau** trong các files khác nhau của một bộ hồ sơ.

VD: Trường tên công ty được lặp lại nhiều lần ở nhiều files (hợp đồng, phụ lục, biên bản,...) của bộ hồ sơ.

\*Phải có sự liên kết giữa các files. Nhiều files, có files nào lặp lại thì chỉ được tạo đúng 1 field, không được tạo duplicate field tương tự.

\- Cần điền được **một lúc các trường giống nhau trong cùng 1 file.**

VD: Trường tên công ty được lặp lại nhiều lần trong 1 hợp đồng

**Tiêu chí kiểm tra:**  
**Tiêu chí hệ thống**

- Xác định đúng/đủ không sót trường cần điền
- Xác định đúng chỗ trống nào cần điền trường nào.  
   VD: chỗ trống điền tên công ty nhưng lại xác định sai -> điền trường MST vào => không đạt chuẩn

Cấu trúc đầu vào của bộ hồ sơ  
**\=> Trường hợp: Template trống**  
**\=> Trường hợp: File đã được điền sẵn**  
Human in the loop:  
\- Người dùng có thể chủ động bôi đen một cụm => hệ thống tự động scaan => hệ thống recommend thành một field.  
<br/>**Tiêu chí khác:**

- Về thời gian
- Về format

**User flow**
   UC ID	Use Case Name	Actor	Pre-condition	Main Flow	Alternative Flow / Edge Case	Success Criteria
UC-01	Upload hồ sơ (Dossier Creation)	User (Law staff)	User đăng nhập hệ thống	"1. User upload 1 hoặc nhiều files
2. System parse + OCR3. Tạo 1 dossier"	- File lỗi / không đọc được- Format không hỗ trợ	Tất cả files được load và hiển thị trong 1 dossier
UC-02	Auto-detect fields	System	Dossier đã được tạo	"1. System scan toàn bộ files
2. Detect vùng cần điền
3. Extract candidate fields4. Group thành field chung"	- Miss field- Detect sai loại field	≥ X% fields được detect đúng và hiển thị
UC-03	Field clustering (SSOT creation)	System	Fields đã detect	1. System group các field giống nhau2. Tạo 1 field duy nhất3. Link tất cả occurrences	- Duplicate field- Group sai field	Không có duplicate field trong system
UC-04	Review & chỉnh sửa field mapping	User	Fields đã được system tạo	"1. User xem danh sách field
2. Highlight trên document
3. Merge / Split field4. Rename field5. Confirm mapping"	- User không đồng ý mapping- Field ambiguous	Mapping cuối cùng phản ánh đúng logic nghiệp vụ
UC-05	Tạo field thủ công	User	Có vùng chưa detect	"1. User bôi đen vùng text/trống
2. Click “Create Field”
3. System suggest field4. User confirm"	- User link nhầm field- Duplicate field mới	Field mới được tạo và linked đúng
UC-06	Link field giữa nhiều files	System + User	Có nhiều files trong dossier	"1. System tự động link occurrences
2. User kiểm tra
3. User chỉnh sửa nếu cần"	- Field không được link hết- Link sai context	1 field áp dụng cho tất cả vị trí đúng
UC-07	Điền dữ liệu (Fill once apply all)	User	Field đã được xác nhận	"1. User nhập giá trị vào field
2. System auto-fill tất cả occurrences
3. Highlight update real-time"	- Field không fill hết- Fill sai vị trí	1 input → apply đúng toàn bộ
UC-08	Conflict detection (data inconsistency)	System + User	Có dữ liệu sẵn trong file	"1. System detect value khác nhau
2. Prompt user lựa chọn:- Use global- Override- Keep separate"	- User chọn sai → data conflict	Data cuối cùng consistent theo lựa chọn
UC-09	Validate dữ liệu & format	System	User đã nhập dữ liệu	"1. Check format (MST, ngày, etc.)
2. Check logic consistency
3. Highlight lỗi"	- False positive validation- Missing validation rule	Dữ liệu hợp lệ trước khi export
UC-10	Preview & audit	User	Data đã hoàn chỉnh	1. Preview toàn bộ hồ sơ2. Toggle highlight field3. Xem audit log	- Không track được thay đổi	User verify được toàn bộ thay đổi
UC-11	Export hồ sơ	User	Hồ sơ đã validated	1. User chọn format export2. System generate file3. Download	- Export lỗi format- Mất dữ liệu	File export đúng format và đầy đủ
UC-12	Audit log tracking	System	Có thao tác trên field	1. Log tất cả actions2. Track user + timestamp3. Hiển thị lịch sử	- Thiếu log- Không truy vết được	Đảm bảo compliance & traceability