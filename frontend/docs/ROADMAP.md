# LAWZY — Tầm nhìn & Roadmap

**Phiên bản:** 1.1  
**Ngày:** 2026-03-23

---

## 1. Tầm nhìn

LAWZY trở thành nền tảng số hàng đầu tại VN cho soạn thảo và quản lý hợp đồng pháp lý — thư viện mẫu chuẩn, editor chuyên nghiệp, AI trích dẫn luật, RAG tham chiếu nguồn, workspace, quota, thanh toán thật.

---

## 2. Trạng thái hiện tại

- **Đã có**: Frontend + Backend NestJS; MySQL; Auth; Plans, Payments (MembershipPlan, Payment); Dashboard, Editor, Templates, Sources, Files; proxy /api/proxy → backend
- **Chưa có**: RAG (embedding, retrieval); PayOS thật (có mock); ChatConversation (nhiều luồng); CMS Articles hoàn chỉnh

---

## 3. Roadmap theo giai đoạn

| Giai đoạn | Nội dung |
|-----------|----------|
| **1 (Foundation)** | Backend, DB, auth — ✅ Done |
| **2 (RAG)** | Pipeline nguồn, embedding, retrieval, citation |
| **3 (Payment)** | PayOS thật, webhook verify, quota trong DB |
| **4 (Quality)** | Test, monitoring, mở rộng (ChatConversation, CMS, auth UI upgrade) |

---

## 4. Kế hoạch bổ sung (từ docs)

- **Chat AI (ANALYSIS)**: ChatConversation model, sidebar conversations, AgentThinkingSteps
- **CMS (cms-admin-plan)**: Articles CRUD, /news, /policy/[slug]
- **Auth (auth-pages-upgrade-plan)**: AuthLayout, ProgressSteps, AccountTypeSelector, Register 4 bước
- **Membership**: Gói seat, AI Top-up, Admin activate
