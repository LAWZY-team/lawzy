# Lawzy Demo Route Tracker

Updated: 2026-07-24

## Objective

Create a standalone `localhost/demo` route for developing a simplified contract workflow demo. The route must not depend on current CLM or LPMS product surfaces and must not require login.

## Scope

- Standalone frontend route: `/demo`
- No auth guard, no CLM sidebar, no LPMS layout
- Notion-style monochrome interface
- Lawzy logo asset
- Maison-inspired demo flows adapted for non-legal business users:
  - contract list and simple status tracking
  - create contract from template
  - fill contract fields
  - live document preview
  - basic post-signature obligations

## Explicitly Out

- Smart import
- Clause library
- Attribute catalog
- Workflow settings and LOA configuration
- Complex approvals, role matrix, guest collaboration

## Implementation Notes

- Phase 1 uses client-side state and `localStorage` only.
- No Prisma schema or backend module changes yet because the route can work independently without persistence.
- If server persistence is needed later, add a separate Nest module with `demo_`-prefixed models/endpoints and no relation to `User`, `Workspace`, `Document`, or existing CLM/LPMS tables unless explicitly approved.

## Files Added

- `frontend/src/app/demo/page.tsx`
- `frontend/src/components/demo/demo-types.ts`
- `frontend/src/components/demo/demo-data.ts`
- `frontend/src/components/demo/demo-utils.ts`
- `frontend/src/components/demo/demo-shell.tsx`
- `docs/demo-route-tracker.md`

## Verification Checklist

- [x] `/demo` opens without login via `Invoke-WebRequest http://localhost:3000/demo` returning HTTP 200
- [ ] `/clm` behavior unchanged
- [ ] `/lpms` behavior unchanged
- [x] TypeScript passes via `frontend/node_modules/.bin/tsc.cmd --noEmit`
- [x] UI remains monochrome and does not copy Maison colors
- [x] Demo sample data maps to Maison-like examples in simplified form

## 2026-07-24 Progress

- Added standalone route and demo components.
- Added three simplified Maison-inspired sample templates:
  - service contract
  - labor contract
  - NDA
- Added seeded contracts and obligations.
- Kept implementation frontend-only for Phase 1 to avoid auth, workspace, schema, and backend coupling.
- Note: plain `npm run type-check` cannot run in this machine session because global npm points to a missing `npm-cli.js`; direct local `tsc.cmd` works.
- Verified targeted lint with `frontend/node_modules/.bin/eslint.cmd` for all new demo source files.

## 2026-07-24 Sidebar And Vietnamese Pass

- Chuyển toàn bộ nội dung hiển thị chính sang tiếng Việt có dấu.
- Làm lại sidebar theo cấu trúc gần với Maison nhưng đã bỏ các mục ngoài phạm vi:
  - bỏ Smart Import
  - bỏ Clause Library
  - bỏ Attributes
  - bỏ Workflow Settings
- Các mục còn lại trên sidebar:
  - Bảng điều khiển
  - Hợp đồng
  - Kho lưu trữ
  - Lịch
  - Tìm kiếm
  - Mẫu hợp đồng
  - Kho tri thức
  - Đối tác
- Phóng lớn logo Lawzy trên sidebar và bỏ các chữ hiển thị có nội dung "demo".
- Bổ sung các màn chức năng tương ứng cho sidebar: danh sách hợp đồng, kho lưu trữ, lịch việc, tìm kiếm, mẫu hợp đồng, kho tri thức và danh bạ đối tác.
- Verified again:
  - `frontend/node_modules/.bin/tsc.cmd --noEmit`
  - `frontend/node_modules/.bin/eslint.cmd src/app/demo/page.tsx src/components/demo/demo-shell.tsx src/components/demo/demo-data.ts src/components/demo/demo-utils.ts src/components/demo/demo-types.ts`
  - `Invoke-WebRequest http://localhost:3000/demo` returns HTTP 200.

## 2026-07-24 Maison Feature Parity Pass

Source checked:

- `D:\Workspace\maisonrmi-demo\frontend\src\components\layout\app-sidebar.tsx`
- `D:\Workspace\maisonrmi-demo\frontend\src\router.tsx`
- `D:\Workspace\maisonrmi-demo\frontend\src\pages\contracts\contract-detail-page.tsx`

Maison sidebar items:

- Dashboard
- Contracts
- Repository
- Smart Import
- Calendar
- Search
- Templates
- Clause Library
- Attributes
- Knowledge Base
- Parties
- Workflow Settings

Excluded by user request:

- Smart Import
- Clause Library
- Attributes
- Workflow Settings

Implemented in `/demo`:

- Dashboard -> `Bảng điều khiển`
- Contracts -> `Hợp đồng`
- Repository -> `Kho lưu trữ`
- Calendar -> `Lịch`
- Search -> `Tìm kiếm`
- Templates -> `Mẫu hợp đồng`
- Knowledge Base -> `Kho tri thức`
- Parties -> `Đối tác`

Maison contract detail tabs checked:

- Fill
- Content
- Versions
- Comments
- Approvals
- Obligations
- Attachments
- Related
- Audit

Implemented in the simplified `/demo` contract workspace:

- Fill -> `Điền dữ liệu`
- Content -> `Nội dung`
- Versions -> `Phiên bản`
- Comments/Suggestions -> `Góp ý`
- Approvals -> `Ký duyệt`
- Obligations -> `Nghĩa vụ`
- Attachments -> `Tệp`
- Related -> `Liên quan`
- Audit -> `Nhật ký`

Backend status:

- No backend code has been added for the standalone route yet.
- `localhost:3000/demo` is currently served by the Next.js frontend only.
- Data is seeded in `frontend/src/components/demo/demo-data.ts` and persisted in browser `localStorage`.
- The existing NestJS backend and Prisma schema are unchanged.

## 2026-07-24 Customer Demo Readiness Pass

Added localStorage-backed interactions for a more credible business demo:

- Advanced Search:
  - searches contract title, counterparty, owner, status, template name and category
  - searches rendered contract text after field substitution
  - filters by status, template category, and search scope
- Repository:
  - filters active and expiring contracts
  - filters by counterparty
  - shows open post-signature obligations
  - opens the contract workspace for follow-up
- Contract workspace:
  - lifecycle actions: ready to sign, signed/active, expiring soon
  - print/export via browser print
  - save version snapshots
  - add internal comments
  - toggle obligations done/open
  - add attachment records
  - auto audit logs for status changes, comments, versions and attachments

Validation:

- `frontend/node_modules/.bin/tsc.cmd --noEmit`
- `frontend/node_modules/.bin/eslint.cmd src/app/demo/page.tsx src/components/demo/demo-shell.tsx src/components/demo/demo-data.ts src/components/demo/demo-utils.ts src/components/demo/demo-types.ts`
- `Invoke-WebRequest http://localhost:3000/demo` returns HTTP 200.
