# Hướng dẫn áp dụng phong cách Legora cho Lawzy Landing (chỉ styling)

> **Tham chiếu:** [Legora](https://legora.com/) — phân tích pattern giao diện, không sao chép asset/nội dung.  
> **Phạm vi:** Typography, khoảng trắng, hierarchy, cách trình bày số liệu, layout section — **giữ nguyên palette Lawzy** (cam, nền `#faf9f5`, `foreground` / `muted-foreground`, v.v.) và **giữ nguyên chuỗi i18n / copy**.  
> **Bối cảnh sản phẩm:** Lawzy startup với hai dòng: **CLM** (`/products/clm`) và **LPMS** (`/products/lpms`); trang chủ đã có `ProductOverviewSection` + hero CTA — tài liệu này tập trung **làm chuyên nghiệp & thân thiện hơn** theo nhịp Legora, không đổi wording.

---

## Phần 1 — Phân tích pattern thiết kế Legora (học theo, không copy)

### 1.1 Nhịp trang (page rhythm)

| Pattern Legora | Ý nghĩa cho Lawzy |
|----------------|------------------|
| Hero cực rõ: một câu value lớn + subhead ngắn + CTA chính | Tăng contrast kích thước giữa H1 và subtitle; CTA nhóm gọn, khoảng cách đều. |
| Khối “eyebrow” (dòng nhỏ phía trên headline) giới thiệu khái niệm (vd. aOS™) | Dùng badge/label nhỏ hoặc `SectionEyebrow` với tracking rõ hơn **trước** section quan trọng (products, investors). |
| Section xen kẽ: editorial (chữ + ảnh) ↔ grid sản phẩm ↔ social proof ↔ số liệu | Tránh nhiều section liên tiếp cùng một “mật độ” chữ; xen padding dọc khác nhau (compact vs relaxed). |
| Footer / nav giàu link nhưng phân cấp rõ | Giữ footer Lawzy; có thể tăng spacing nhóm link theo cột. |

### 1.2 Typography & “trải chữ”

| Pattern | Legora | Áp dụng Lawzy (giữ font Geist hiện tại) |
|---------|--------|----------------------------------------|
| H1 | Rất lớn, line-height thoáng, ít dòng | `hero-section`: tăng `max-width` subtitle nếu cần cân đối với title; kiểm tra `text-pretty` / `balance` cho heading. |
| H2 section | Bold, tracking hơi chặt | `SectionHeader`: thống nhất scale `text-2xl → md:text-4xl`, tránh nhảy cỡ giữa section. |
| Body | Dòng đọc dài vừa phải, màu phụ rõ | `text-muted-foreground` + `leading-relaxed` / `max-w-*` cố định theo section (vd. `max-w-2xl` cho subtitle center). |
| Label / “Trusted by” | Uppercase, letter-spacing rộng, cỡ nhỏ | `hero_trust` và nhãn phụ: `text-xs uppercase tracking-widest` (đã gần — chuẩn hóa token). |
| Link phụ kiểu “↳ Read more” | Micro-pattern nhấn mạnh hành động | **Không bắt buộc đổi copy**; nếu sau này thêm link, dùng style `text-sm font-medium` + icon mũi tên nhỏ (đã có pattern `ArrowRight`). |

### 1.3 Whitespace (khoảng trắng)

- **Padding section dọc:** Legora dùng khoảng “thở” lớn giữa các block; Lawzy đã có `spacingMap` trong `landing-section.tsx` (`relaxed` / `compact`) — hướng Legora = **tăng delta** giữa hero → product (vd. hero `pb` lớn hơn một bậc ở `lg`) và **nhất quán** `compact` cho các strip ngắn (investors, newspaper).
- **Ngang:** `sectionContainer` (`max-w-7xl` + `px-*`) — có thể tăng `px` ở `xl` hoặc giảm `max-w` của **text block** (không phải full bleed ảnh) để giống cột editorial Legora.
- **Giữa card:** `gap-6` → ở `lg` có thể `gap-8` để “đắt” hơn visually.

### 1.4 Số liệu & ROI block (Legora có khối % / giờ / $)

- **Cấu trúc:** Số lớn (display) + nhãn ngắn phía dưới + (tuỳ chọn) mô tả một dòng.
- **Typography số:** `font-variant-numeric: tabular-nums`, font-weight đậm, cỡ `text-4xl`–`text-5xl` trên desktop, màu `foreground` hoặc accent **cam Lawzy** chỉ cho số chính.
- **Lawzy hiện tại:** `Investors` chưa có stat grid — nếu sau này có block số liệu, map theo pattern trên; **không đổi copy** nghĩa là chỉ thêm block khi có nội dung được phê duyệt.

### 1.5 Thẻ sản phẩm & grid (hai product như Legora “suite”)

- Card: viền nhẹ, bo lớn (`rounded-3xl`), shadow vừa — Lawzy đã có; Legora thường **phẳng hơn** ở nền tối — với nền sáng Lawzy: giảm `shadow-lg` xuống `shadow-md` hoặc ring mảnh để “premium” hơn.
- Icon trong khung vuông bo góc nhỏ — đã có `bg-orange-50` — giữ **màu Lawzy**.
- CTA trong card: một primary action rõ; secondary tối thiểu.

### 1.6 Header / navigation

- Legora: nav sạch, CTA nổi bật. Lawzy: `landing-header` floating + blur — có thể tăng contrast border khi scroll (`md:border-b`) và **spacing** giữa logo – nav – actions để thoáng hơn (không đổi nhãn).

### 1.7 Motion

- Legora: transition nhẹ, ít “lòe”. Lawzy hero có `motion` — giữ nhưng **duration ngắn**, tránh lặp vô hạn gây mệt (badge đã comment — ok).

---

## Phần 2 — Inventory Lawzy (để biết sửa file nào)

| Khu vực | File chính |
|---------|------------|
| Trang chủ landing | `frontend/src/app/(landing)/page.tsx` |
| Layout i18n | `frontend/src/app/(landing)/layout.tsx` |
| Hero | `frontend/src/components/landing/hero-section.tsx` |
| Hai product overview | `frontend/src/components/landing/product-overview-section.tsx` |
| Section primitives | `frontend/src/components/landing/landing-section.tsx` (`Section`, `SectionHeader`, `sectionContainer`, `SectionEyebrow`) |
| Header / footer | `landing-header.tsx`, `landing-footer.tsx` |
| CLM / LPMS | `frontend/src/app/(landing)/products/clm/page.tsx`, `.../lpms/page.tsx` |
| Font toàn app | `frontend/src/app/layout.tsx` (Geist) — **không đổi font** trừ khi có quyết định brand riêng. |

**Màu / nền giữ:** `landing-light`, `bg-[#faf9f5]`, `text-orange-600`, `border-orange-300`, v.v.

---

## Phầc 3 — Nguyên tắc “Legora-like” trong giới hạn Lawzy

1. **Một focal point mỗi section:** một headline chính + một supporting paragraph; tránh hai đoạn cùng trọng số visual.  
2. **Scale ladder cố định:** H1 hero > H2 section > H3 card > body > caption — bước nhảy cỡ rõ (≥ 1 bậc Tailwind giữa các tầng).  
3. **Độ dài dòng:** subtitle/paragraph `max-w-prose` hoặc `max-w-2xl`/`3xl` có chủ đích theo layout center/left.  
4. **Số & chứng chỉ (sau này):** bảng 2–4 cột, số tabular, nhãn `text-sm text-muted-foreground`.  
5. **Hai product = một “platform story”:** layout (eyebrow + title section + 2 cột card) thể hiện startup có nhiều sản phẩm — **copy keys không đổi**, chỉ tinh chỉnh class Tailwind / cấu trúc wrapper.

---

## Phần 4 — IMPLEMENTATION CHECKLIST (tick từng bước)

> Tick `[ ]` → `[x]` khi hoàn thành. Thứ tự gợi ý từ foundation → trang → product pages.

### A. Foundation & token spacing (không đổi màu brand)

- [ ] **A1.** Mở `landing-section.tsx`, ghi chú lại `spacingMap` và `marginMap`; quyết định rule: section “hero-like” dùng padding đỉnh/đáy lớn hơn `compact` một bậc ở breakpoint `lg+`.  
- [ ] **A2.** Thêm hoặc chuẩn hóa một class utility nội bộ (trong component) cho **section subtitle** width: ví dụ `max-w-2xl` vs `max-w-3xl` — document trong comment ngắn trong file.  
- [ ] **A3.** Rà soát `SectionEyebrow`: đồng bộ `tracking` và `text-muted-foreground` với label “Trusted by” trong hero để cùng một “voice” typographic.  
- [ ] **A4.** (Tuỳ chọn) Thêm `tabular-nums` vào một class shared cho mọi **số** trong landing (wrapper hoặc `@utility` trong CSS nếu project đã dùng Tailwind v4 `@utility`).

### B. Hero (`hero-section.tsx`) — nhịp Legora, giữ copy

- [ ] **B1.** Kiểm tra `h1`: `leading-tight` / `lg:leading-[1.15]` và `max-w-4xl` — điều chỉnh `max-w`/`text-balance` để không cảm giác “chữ trôi” trên màn rộng.  
- [ ] **B2.** Khoảng cách `mt-*` giữa title → subtitle → CTA: áp dụng scale 4–5–6–8 (Legora: khoảng cách rõ ràng).  
- [ ] **B3.** Nhóm CTA: `gap-3` → `gap-4` ở `sm+`; đảm bảo touch target đủ lớn (button `size="lg"` đã tốt).  
- [ ] **B4.** Strip “Trusted by”: tách rõ hơn bằng `border-t border-transparent` hoặc `mt` lớn hơn + `opacity` logo đồng nhất (đã có grayscale hover — giữ).  
- [ ] **B5.** Radial gradient / line top: giữ palette cam hiện có; chỉ tinh `opacity` nếu hero quá “nặng” so với nền.

### C. Product overview — hai product, startup suite

- [ ] **C1.** `ProductOverviewSection`: trước `SectionHeader`, cân nhắc thêm `SectionEyebrow` hoặc badge nhỏ **chỉ styling** (cùng key `products_title` không tách — nếu không thêm copy mới thì chỉ điều chỉnh `SectionHeader` `titleClassName` / spacing).  
- [ ] **C2.** `SectionHeader` `margin="tight"` + `subtitle`: tăng `space-y` trong header cho đúng nhịp Legora (headline “nặng”, subtitle “nhẹ” xa hơn một chút).  
- [ ] **C3.** Grid `md:grid-cols-2`: tại `lg` tăng `gap` (vd. `gap-8`); card `hover:-translate-y-1` — giảm biên độ xuống `-translate-y-0.5` nếu muốn cảm giác enterprise hơn.  
- [ ] **C4.** Card: thử `shadow-md` + `ring-1 ring-black/5` thay cho `shadow-lg` để gần aesthetic “flat premium”.  
- [ ] **C5.** Icon box: đồng kích thước với LPMS highlights (`h-11 w-11` vs `h-12 w-12`) — thống nhất một token.

### D. Các section khác trên home

- [ ] **D1.** `Investors`: sau `SectionHeader`, điều chỉnh `mt` marquee và padding section cho đồng bộ với `ProductOverviewSection`.  
- [ ] **D2.** `BlogCardsSection`, `Newspaper`, `SurveySection`: cùng một rule `spacing` (`compact` vs `relaxed`) — ghi trong checklist nào đã chọn.  
- [ ] **D3.** `LandingFooter`: tăng `gap-y` giữa các cột trên mobile; desktop căn chỉnh theo grid Legora-style (không đổi text link).

### E. Trang product CLM / LPMS

- [ ] **E1.** Hero product (`pt`, `pb`, `Badge`): căn chỉnh vertical rhythm **giống nhau** giữa CLM và LPMS (hiện CLM có ảnh hero lớn — padding dưới ảnh có thể cần thêm để không “dính” section tiếp theo).  
- [ ] **E2.** `h1` product page: đồng scale với hero home hoặc một bậc nhỏ hơn — document một bảng so sánh cỡ chữ.  
- [ ] **E3.** LPMS highlight cards: đồng bộ shadow/border với `ProductCard` trên home.  
- [ ] **E4.** CLM: các section import (`ClmFeaturesSection`, `CostSection`, …) — rà từng `Section` spacing để không “double compact” gây cảm giác chật.

### F. Header & floating UI

- [ ] **F1.** `landing-header`: `min-h`, `gap` nav, trạng thái scrolled — tăng readability (font-medium → consistent `text-sm` / `text-base`).  
- [ ] **F2.** `FloatingActions`: không che nội dung quan trọng; z-index và `bottom` offset kiểm tra trên mobile.

### G. QA đa ngôn ngữ & a11y (styling impact)

- [ ] **G1.** Với locale dài hơn (VI/EN), kiểm tra không overflow button/card sau khi tăng gap/font.  
- [ ] **G2.** Contrast `text-muted-foreground` trên `#faf9f5` và trên `bg-white` — đảm bảo ≥ WCAG AA nếu chỉnh opacity.  
- [ ] **G3.** `prefers-reduced-motion`: kiểm tra animation hero không gây khó chịu khi user bật reduce motion (bổ sung nếu thiếu).

### H. Đóng gói & handoff

- [ ] **H1.** Chụp before/after (375 / 768 / 1440) cho home + CLM + LPMS.  
- [ ] **H2.** Cập nhật mục “Đã chọn spacing rule” ngay dưới đây cho team.

**Ghi chú spacing đã chọn (điền khi xong):**

- Home hero `pb`: _______________  
- Section mặc định: `relaxed` / `compact`: _______________  
- Product grid `gap` tại `lg`: _______________

---

## Phần 5 — Tiêu chí “xong” (definition of done)

- [ ] Trang chủ và hai trang product **nhìn đồng bộ** về typographic scale và vertical rhythm.  
- [ ] Không thay đổi **chuỗi translation** / JSON i18n (trừ khi có task copy riêng).  
- [ ] Màu Lawzy (cam, nền kem, muted) **không** bị thay bằng palette Legora.  
- [ ] Hai sản phẩm được **nhìn nhận rõ** là hai dòng sản phẩm của cùng startup (layout + hierarchy), không cần đổi wording.  
- [ ] Checklist Phần 4 tick ≥ 80% mục A–E trước khi merge.

---

## Phần 6 — Mapping nhanh Legora → component Lawzy

| Ý Legora | Component / file Lawzy |
|----------|----------------------|
| Hero lớn + CTA | `hero-section.tsx` |
| “Suite” / nhiều product | `product-overview-section.tsx` |
| Section title + lead | `SectionHeader` trong `landing-section.tsx` |
| Eyebrow / label section | `SectionEyebrow` |
| Trust / logo strip | `hero-section` (trust) + `investors.tsx` |
| ROI / stats (tương lai) | Section mới hoặc mở rộng `investors` — chỉ khi có copy được duyệt |
| Product detail | `products/clm/page.tsx`, `products/lpms/page.tsx` |

---

*Tài liệu này là single source of truth cho iteration styling Legora-like trên `(landing)`; cập nhật version và ngày khi checklist thay đổi đáng kể.*

**Version:** 1.0  
**Ngày:** 2026-05-13
