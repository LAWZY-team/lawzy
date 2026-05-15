````md
# CLAUDE.md

This file provides guidance to Claude (claude.ai/code) when working with code in this repository.

---

## Project Overview

**Lawzy Legal — Batching Information** is a legal-tech web app for a Vietnamese law firm. Its core feature lets an intern/paralegal fill a single **Master Form** once and auto-populate all 13 FDI (foreign-direct-investment) company-registration document templates, eliminating ~1.5 days of manual copy-paste work per case.

Planning documents (BRD/SRS, sprint plan, tech stack spec) live as `.html` files at the repo root. NOTE: frontend Nextjs and backend Nestjs

---

## Commands

### Frontend (`lawtech/`)

```bash
npm run dev          # dev server on http://localhost:3000
npm run build        # production build
npm run lint         # ESLint
```
````

Copy `.env.local.example` → `.env.local` and fill in Supabase + backend values before running.

---

### Backend (NestJS) (`lawtech-backend/`)

```bash
npm run start:dev     # start dev server (watch mode)
npm run build         # build to dist/
npm run start:prod    # run production build
npm run lint
```

### With Docker

```bash
docker build -t lawtech-backend .
docker run -p 8000:8000 --env-file .env lawtech-backend
```

Health check:

```
GET http://localhost:8000/health
```

---

## Planned Architecture (3-Service)

```
Frontend (Next.js 14)     →   Backend (NestJS)              →   Supabase (DB + Auth + Storage)
Vercel                        Render / Railway / Docker          xxx.supabase.co
lawtech-app.vercel.app        lawtech-api.onrender.com
```

---

## Request Flow — Batch Fill

```
User
 → Next.js API route (optional)
 → POST /batch (NestJS)
 → docxtemplater fills .docx
 → LibreOffice converts to PDF
 → zip files
 → upload to Supabase Storage
 → return signed URL
```

---

## Tech Stack

### Frontend

- **Next.js 14**, TypeScript, Tailwind CSS
- **shadcn/ui**
- **React Hook Form + Zod**
- **@supabase/supabase-js**
- **docx-preview**
- **@tanstack/react-query**
- **file-saver**

---

### Backend (NestJS)

- **NestJS (Node.js, TypeScript)**
- **docxtemplater + pizzip** — fill `.docx` templates
- **libreoffice-convert** — convert `.docx` → `.pdf`
- **JSZip** — bundle files into `.zip`
- **@supabase/supabase-js** — upload to storage
- Runs in Docker (LibreOffice required)

---

### Data & Auth

- **Supabase**
  - PostgreSQL
  - Auth (Magic Link / Email)
  - Storage

- **Row Level Security (RLS)**

---

## Planned Directory Structure

### Frontend (`lawtech/`)

```
app/
  (auth)/login/
  dashboard/
  cases/[id]/
  admin/templates/

components/
  forms/MasterForm.tsx
  preview/DocPreview.tsx
  export/ExportPanel.tsx

lib/
  supabase.ts
  api.ts            # calls NestJS backend
```

---

### Backend (`lawtech-backend/`)

```
src/
  modules/
    batch/
      batch.controller.ts
      batch.service.ts

    doc/
      doc.service.ts        # fill docx

    pdf/
      pdf.service.ts        # convert pdf

    storage/
      storage.service.ts    # supabase upload

  main.ts

Dockerfile
```

---

## Database Schema

```sql
cases         (id, name, created_by → auth.users, created_at, status)
general_info  (id, case_id → cases, data jsonb, updated_at)
templates     (id, code, name, file_path, field_mappings jsonb, language, is_required, is_active)
documents     (id, case_id → cases, template_id → templates, output_path, status, generated_at)
```

- `general_info.data`: JSONB chứa toàn bộ Master Form
- `templates.field_mappings`:

```json
{
  "{{company_name_vi}}": "company.name_vi"
}
```

---

## Supabase Storage Buckets

| Bucket       | Access      | Path                   |
| ------------ | ----------- | ---------------------- |
| `templates/` | public read | `vi/mau-01.docx`       |
| `outputs/`   | private     | `{case_id}/export.zip` |

Signed URL:

```ts
supabase.storage.from("outputs").createSignedUrl(`${caseId}/export.zip`, 3600);
```

---

## Placeholder Convention

```
{{snake_case_key}}
```

Handled via **docxtemplater**:

```ts
doc.setData(data);
doc.render();
```

⚠️ Notes:

- Placeholder phải nằm trong cùng 1 run (Word dễ split text)
- Tránh format inline phá vỡ placeholder

---

## Auth & RBAC

- **Intern**
  - chỉ thấy case của mình (`created_by = auth.uid()`)

- **Leader**
  - thấy tất cả
  - set qua:

```js
user_metadata: {
  role: "leader";
}
```

- Access sai case → **403**

- Backend sử dụng:

```
SUPABASE_SERVICE_KEY
```

---

## Environment Variables

### Frontend

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_API_URL
BACKEND_SECRET
```

---

### Backend

```
SUPABASE_URL
SUPABASE_SERVICE_KEY
BACKEND_SECRET
```

---

## Key Constraints from SRS

- Batch fill 13 documents ≤ **10s**
- Export zip ≤ **30s**
- Capital sum = **100%** (validate client-side)
- Preserve `.docx` formatting 100%
- No auto-translation (user nhập EN sẵn)
- Auto-save mỗi 30s
- Delete phải confirm dialog
- Browser: Chrome 110+, Edge 110+, Safari 16+

---

## Deployment Notes

- LibreOffice làm Docker image ~400MB
- Cold start (Render free): ~30s

Recommendations:

- Ping `/health` trước khi demo
- Hoặc dùng paid tier

---

## Recommended Dev Flow

1. Setup Supabase (SQL + buckets)
2. FE + Backend dev song song
3. FE dùng mock JSON trước
4. Connect `/batch` khi backend ready

---
