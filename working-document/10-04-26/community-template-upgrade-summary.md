# Community Template Upgrade - 10-04-26

## Muc tieu

Tong hop cac thay doi da thuc hien cho tinh nang community templates, bao gom:
- ho tro upload va preview `PDF` + `DOCX`
- chuyen file upload thanh structured template co the dung lai trong editor
- sanitize cac truong thong tin da bi dien san
- sua cac bug UX lien quan den editor, chuyen template, va nut CTA tren trang templates

## 1. Nang cap upload community/internal templates

### Backend

Da mo rong `contract-templates` de nhan:
- `.pdf`
- `.docx`

Da bo sung pipeline xu ly trong `backend/src/modules/contract-templates/`:
- `extract-contract-template-text.ts`
  - PDF: extract bang `pdf-parse`
  - DOCX: extract bang `mammoth`
- `sanitize-contract-template-fields.ts`
  - phat hien cac cap `Label: Value`
  - chuyen value thanh placeholder merge field
  - ho tro nhan dien nhan tieng Viet va da bo sung them nhan tieng Anh pho bien
- `build-contract-template-json.ts`
  - sinh `contentJSON`
  - sinh `mergeFields`
  - dua ve format tuong thich voi editor

### Structured template persistence

Khi upload thanh cong, he thong khong chi luu blob file goc ma con luu them:
- `contentJSON`
- `mergeFields`
- `metadata` bo sung
  - `sourceFileName`
  - `mimeType`
  - `processingStatus`
  - `publishStatus`
  - `sanitizedFieldCount`
  - `structuredAt`

Da them endpoint:
- `GET /contract-templates/:scope/:id/structured`

Endpoint nay duoc dung de nap structured content vao editor cho `community` va `internal`.

## 2. Preview va UX tren trang templates

### Upload modal

Da cap nhat:
- `frontend/src/components/templates/community-template-upload-modal.tsx`

Thay doi:
- cho phep chon `PDF` va `DOCX`
- hien thi preview truoc khi upload
- hien thi ro loai file dang chon

### Preview modal

Da cap nhat:
- `frontend/src/components/templates/community-template-preview-modal.tsx`
- `frontend/src/components/templates/community-template-document-preview.tsx`

Thay doi:
- neu template da co `structured content` thi uu tien preview noi dung da sanitize
- PDF van preview bang `iframe`
- DOCX preview bang `mammoth` o client
- giu lai cac action:
  - xem
  - tai file goc trong modal
  - luu ve workspace
  - xoa neu co quyen
- bo sung nut `Su dung mau`

### Helper file type

Da tao:
- `frontend/src/lib/templates/community-contract-template-file.ts`

Muc dich:
- centralize logic nhan dien file `pdf/docx`
- tranh lap logic o nhieu component

## 3. Editor integration

Da cap nhat:
- `frontend/src/app/(dashboard)/editor/[id]/page.tsx`
- `frontend/src/lib/api/contract-templates.ts`

Ho tro query params moi:
- `?contractTemplate=<id>&contractTemplateScope=community`
- `?contractTemplate=<id>&contractTemplateScope=internal`

Flow moi:
- click `Su dung mau`
- vao `/editor/new?...`
- fetch structured template tu `contract-templates`
- convert qua `templateContentToEditorContent()`
- day merge fields vao right panel

## 4. Sanitize truong thong tin

Da bo sung co che tu dong an cac gia tri da dien san, vi du:
- `Ten: Quan` -> `Ten: {{TEN}}`
- `Name: John Doe` -> `Name: {{NAME}}`

Muc tieu:
- tranh lo du lieu nguoi dung upload len community
- bien noi dung thanh mau co the dung lai

Da mo rong nhan dien cho cac nhom nhan:
- thong tin ca nhan
- thong tin cong ty
- tax / registration
- contact
- representative
- bank / account
- signing / effective date
- employee / employer / client / contractor

## 5. Fix loi backend trong qua trinh upload

Da gap loi:
- `P2003` o truong `created_by`

Nguyen nhan:
- `Template.createdBy` la foreign key toi `User.id`
- co truong hop request upload mang `userId` khong map duoc toi user ton tai

Da xu ly:
- resolve user truoc khi insert template
- voi `community`: neu khong tim thay user thi de `createdBy = null` thay vi fail ca upload
- voi `internal`: van giu validate chat hon

## 6. Fix bug UX trong editor

### Bug 1: Mo template A roi mo template B van hien A

Nguyen nhan chinh:
- race condition khi load template trong `editor/[id]/page.tsx`
- request cu resolve muon va de state cu de len state moi

Da fix:
- them cancel stale load
- reset state truoc khi load template moi
- reset editor content tam thoi de tranh nhap nhay noi dung cu

### Bug 2: Save lan dau tu `/editor/new` bi nhay manh

Nguyen nhan chinh:
- save lan dau tao document moi
- URL doi sang `/editor/{id}`
- trang lai fetch nguoc document vua tao
- gay cam giac reload/jump lon

Da fix:
- them `pendingEditorBootstrapRef`
- bootstrap document moi bang local state ngay sau khi tao
- tranh round-trip fetch dau tien ngay luc vua doi URL

### Bug 3: Dang o `/editor/new?template=...` ma URL tu nhay sang `/editor/{id}`

Nguyen nhan chinh:
- route template entry bi dinh voi flow `guest draft restore` va `auto-migrate`

Da fix:
- neu dang vao bang `template` hoac `contractTemplate` thi:
  - khong restore guest draft cu
  - khong auto-save local session theo flow guest draft
  - khong auto-migrate guest draft thanh document that

Muc tieu:
- khi user bam `Su dung mau`, editor phai dung yen o `/editor/new?...`
- chi doi sang `/editor/{id}` khi user thuc su bam `Save`

## 7. Dieu chinh CTA tren trang templates

Da cap nhat:
- `frontend/src/components/templates/community-template-grid.tsx`
- `frontend/src/components/templates/community-templates-tab.tsx`

Thay doi:
- tren card/list view cua trang templates
- nut `Tai xuong` duoc doi thanh `Su dung`
- nut nay di thang vao editor theo `contractTemplate + scope`

Luu y:
- chuc nang tai file goc van duoc giu trong modal `Xem`

## 8. i18n va typing

Da cap nhat:
- `frontend/src/lib/i18n/vi.ts`
- `frontend/src/lib/i18n/en.ts`
- `frontend/src/lib/api/contract-templates.ts`
- `backend/src/modules/contract-templates/contract-templates.types.ts`

Muc dich:
- bo sung copy moi cho preview/upload/structured template
- bo sung typing cho `mimeType`, `hasStructuredContent`, `processingStatus`, `publishStatus`
- bo sung typing cho structured contract template response

## 9. File chinh da sua / tao

### Backend

- `backend/src/modules/contract-templates/contract-templates.controller.ts`
- `backend/src/modules/contract-templates/contract-templates.service.ts`
- `backend/src/modules/contract-templates/contract-templates.types.ts`
- `backend/src/modules/contract-templates/extract-contract-template-text.ts`
- `backend/src/modules/contract-templates/sanitize-contract-template-fields.ts`
- `backend/src/modules/contract-templates/build-contract-template-json.ts`

### Frontend

- `frontend/src/components/templates/community-template-upload-modal.tsx`
- `frontend/src/components/templates/community-template-preview-modal.tsx`
- `frontend/src/components/templates/community-template-document-preview.tsx`
- `frontend/src/components/templates/community-template-grid.tsx`
- `frontend/src/components/templates/community-templates-tab.tsx`
- `frontend/src/components/templates/community-template-filters.tsx`
- `frontend/src/lib/templates/community-contract-template-file.ts`
- `frontend/src/lib/api/contract-templates.ts`
- `frontend/src/app/(dashboard)/editor/[id]/page.tsx`
- `frontend/src/lib/i18n/vi.ts`
- `frontend/src/lib/i18n/en.ts`

## 10. Ghi chu

- Trong qua trinh lam, da co thu them `docx-preview` nhung khong su dung vi phat sinh van de environment lock; preview DOCX hien tai dang dung `mammoth`.
- Khong sua plan file.
- Da uu tien fix dung vao UX that te ma anh test:
  - chuyen template A/B
  - save lan dau
  - tu nhay URL
  - CTA tren trang templates
