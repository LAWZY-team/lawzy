# Cẩm Nang Tích Hợp AI: Migration sang `@google/genai` (Unified SDK) & Vertex AI

Tài liệu này ghi chú toàn bộ quá trình chuyển đổi, tích hợp và các kiến thức vận hành hệ thống AI cho nền tảng Lawzy, đảm bảo chạy ổn định trên Production (Docker/Coolify) và tận dụng hiệu quả $2,000 Credit từ Google for Startups.

---

## Phần 1: Các Thay Đổi Kiến Trúc Codebase

### 1. Phân tách và gom lớp LLM Client (`AiProviderService`)
Chúng ta đã tạo ra một service tập trung `AiProviderService` (@Global module) để thay mặt thao tác với `GoogleGenAI`.
- **Chuyển đổi Linh hoạt (Provider Toggle):** Tự động chọn `AI_STUDIO` hoặc `VERTEX_AI` dựa trên biến môi trường `LLM_PROVIDER`.
- **Fallback tự động:** Nếu chế độ Vertex AI khởi tạo thất bại do thiếu chứng thực, hệ thống sẽ tự động fallback về AI Studio.
- **Exponential Backoff Retry:** Tích hợp logic retry tự xử lý các mã lỗi phổ biến như `429` (Quota limit) và `503` (Service Overloaded), giúp bảo vệ client khỏi việc văng lỗi trực tiếp.
- **Cập nhật SDK Mới:** Tương thích với interface của `@google/genai` (thay vì `@google/generative-ai` cũ), trong đó property `vertexai` nhận `boolean`, `result.text` là string getter thay vì function, v.v.

### 2. Xử lý Chứng thực Động (Env Parsing)
- Biến `GOOGLE_CREDS_JSON` chứa chuỗi JSON (Authorized User Crendentials). 
- **Cách xử lý tại Runtime:** Trong module Initialization, chuỗi này được ép xuống thành file tạm `.gcp-creds.json` trong ổ đĩa cứng, sau đó trỏ biến `GOOGLE_APPLICATION_CREDENTIALS` về đường dẫn này. Nhờ vậy thư viện `google-auth-library` bên dưới tự động nhận cấu hình Application Default Credentials (ADC) cực chuẩn 100% chuẩn mực Google.

### 3. Cập nhật các AI Flow của Ứng dụng
- `EmbeddingService`: Chuyển từ Raw JS `fetch` thuần sang sử dụng trực tiếp SDK mới `aiProvider.embedContentWithRetry` (Mảng Vector nhúng không còn dùng `.batchEmbedContents` riêng biệt mà hàm `embed` của genAI Mới tự động wrap dạng mảng).
- `AiSanitizerService`: Các lời gọi text generation đều được ủy thác xuyên suốt cho lớp Provider thống nhất thay vì init SDK rải rác.
- **Dọn dẹp thư viện:** Đã xoá sổ `@google/generative-ai` bằng `npm uninstall` để đồng nhất thư viện.

---

## Phần 2: Kiến Thức Vận Hành Trên Production (Server/VPS)

### 1. Tại sao các bước setup trên VPS là bắt buộc?
Bạn có thể tự hỏi: *"Tại sao không tự viết file JSON mà phải cài gcloud rồi login phức tạp vậy?"*

- **Xác thực qua OAuth 2.0:** Khác với API Key (tĩnh, vĩnh viễn và dễ dàng), Vertex AI yêu cầu xác thực mạnh quy chuẩn bảo mật Enterprise. Bước `gcloud auth application-default login` giúp Google xác minh danh tính tài khoản cá nhân của bạn để cấp một `refresh_token` chạy trên Server.
- **Đóng gói Quota Project:** Nếu chỉ lấy JSON cơ bản từ Google Auth, hệ thống sẽ không biết charge tiền/quota vào bộ phận nào của Google Cloud. Lệnh `--billing-project` hoặc thiết lập quota-project trói buộc Project ID Lawzy vào thông tin chứng thực, giúp bạn hưởng trực tiếp cục $2,000 Credit mà không bị rớt vào luồng Free Tier.
- **Tính Chính Danh:** Chốt lại với Google rằng: "Tôi là chủ sở hữu, và tôi uỷ quyền (authorize) cho server này gọi API dưới danh nghĩa của tôi".

### 2. Giải đáp về `refresh_token`: Nó có tự thay đổi không?
Câu hỏi này chạm vào yếu điểm lớn nhất của việc vận hành Production:

- **Cơ chế:** `refresh_token` là một mã ủy quyền có "vòng đời rất dài" (gần như vĩnh viễn nếu không có tác động từ người dùng). Nó KHÔNG tự thay đổi sau mỗi lần request.
- **Nhiệm vụ của Token:** Khi backend NestJS gọi API Vertex, *SDK của Google* sẽ mang `refresh_token` giấu kín này xin máy chủ cấp một `access_token` (vé thông hành ngắn hạn, thường chỉ sống 1 giờ). Mã `access_token` mới chính là token thực thi gắn kèm trong các Network Header `Bearer XXX`.
- **Tự động Cập nhật:** Quá trình check token hết hạn và bứng cái mới diễn ra HOÀN TOÀN TỰ ĐỘNG, xuyên suốt bên trong lòng thư viện. Bạn không cần làm gì hay update môi trường ENV mỗi ngày.
- **Khi nào Token Chết?** File cấu hình chứng thực này chỉ bị vô hiệu hóa khi:
    1. Bạn đổi mật khẩu tài khoản Google.
    2. Bạn vào trang Tài khoản -> Bảo mật để xóa thủ công quyền của ứng dụng.
    3. (Nếu dùng OAuth Config chế độ "Testing") Token chết cứng sau 7 ngày. Phải thiết lập Google Cloud OAuth Screen lên "Production".
Lúc nó chết, bạn dĩ nhiên phải lên Server chạy lại cú pháp Log-in lấy JSON mới.

### 3. Mẫu Nội dung Mồi cho Backend (Prompting AI/Antigravity)
Sử dụng đoạn Text chuẩn chỉnh này cung cấp Context cho các tác vụ thay đổi hạ tầng AI sau này với các Robot Code (Như Cursor, Antigravity):

> **Về phần Setup VPS & Authentication:**
> Hệ thống Lawzy đã được thiết lập xác thực qua Application Default Credentials (ADC) trực tiếp trên môi trường Linux. Thay vì sử dụng Service Account Key (JSON tĩnh) dễ bị chặn bởi chính sách Organization, chúng tôi đã sử dụng phương thức `gcloud auth` để tạo ra một Authorized User JSON.
> 
> File credentials này chứa `refresh_token` và `quota_project_id` chuẩn chỉnh. Nội dung này được đưa vào biến môi trường `GOOGLE_CREDS_JSON`. Backend NestJS sử dụng thư viện `@google/genai` (Unified SDK) để đọc chuỗi JSON này qua file proxy. SDK sẽ tự động xử lý việc trao đổi access token định kỳ với Google API mà không cần can thiệp thủ công, đảm bảo hệ thống chạy 24/7 ổn định trên môi trường Docker/Coolify.

### 4. Cách kiểm soát (Audit) nếu JSON Env bị Lỗi
Khi copy/paste JSON String dài vào các biến môi trường của Coolify Server, làm sao để biết API Vertex còn "sống"?

1. **Log Khởi tạo (Startup Hook):** Backend có thể cắm thêm một dòng `console.log("AI Provider: Vertex AI initialized successfully")` sau lúc cố gắng parse JSON thành API Provider.
2. **Health Check API:** Đề xuất mở thêm một route `/api/ai/health`. Khi Ping vào đây, AI Module sẽ thử gọi nhẹ nhàng 1 lệnh `countTokens("Hi")` hoặc `embedContent`.
    - Kết quả trả về `1` -> Token sống khỏe ru.
    - Lỗi văng `401 Unauthorized` -> Hệ thống sẽ báo tín hiệu Token đã bốc hơi, người vận hành cần vào chạy lại bước `gcloud auth`. 

---

> [!TIP]
> Tóm lại, Refresh Token chính là cốt lõi của công nghệ giúp các hệ thống lớn duy trì kết nối bất tận mà không bắt Admin login thao tác mỗi ngày. JSON này cần được giữ tuyệt mật (không commit lên Git).
