# Business Requirements Document (BRD)

**Dự án:** LAWZY MVP  
**Phiên bản:** 1.2  
**Ngày:** 2026-03-23

---

## 1. Tổng quan

LAWZY — nền tảng SaaS quản lý hợp đồng pháp lý theo luật Việt Nam. Đối tượng: doanh nghiệp, luật sư, chuyên viên pháp lý. Luật: BLDS 2026, Luật Thương mại 2025, Luật TTĐT 2024.

---

## 2. Bài toán & Mục tiêu

- Tạo hợp đồng nhanh, chuẩn pháp lý
- Review rủi ro, trích dẫn luật
- Tham chiếu nguồn pháp lý (upload sources, RAG)
- Quản lý quota, thanh toán (Free/Pro/Enterprise)

BO-1 đến BO-5: Giảm thời gian soạn thảo, tăng độ chính xác, adoption, MRR, tùy biến nguồn.

---

## 3. Phạm vi MVP

In scope: Dashboard, Editor, AI, Templates, Upload Sources, Payment (mock/real), Permissions, Workspace. Out of scope: Backend thật (đã có), SSO, real-time, ký điện tử, mobile app.

---

## 4. Membership & Payment (PLAN_MEMBERSHIP_PLANS_PAYMENT)

- **Admin**: Quản lý gói (CRUD), đơn thanh toán
- **User**: Gói đang dùng, lịch sử, nâng cấp
- **Plans**: MembershipPlan (slug, price, quotaLimits); Payment model
- **PayOS**: Tích hợp webhook; cập nhật Workspace.plan, quotaLimits
- **Phụ lục**: Gói theo seat (Team), AI Top-up, Admin activate

---

## 5. Ràng buộc

- Luật VN; AI tham khảo; Next.js, TypeScript, NestJS; upload 10MB; PDF/DOC/DOCX.
