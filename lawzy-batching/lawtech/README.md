# Lawzy Legal Frontend

Next.js frontend for the Batching Information MVP.

## Getting Started

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Current Flow

- `/dashboard` lists mock FDI cases.
- `/cases/new` opens the Master Form, template selector, preview, and export panel.
- Export calls `NEXT_PUBLIC_API_URL /batch` when configured. Without an API URL, it returns a mock download so the frontend can be tested while the NestJS backend is still being installed.

## Environment

Create `.env.local` when wiring real services:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Scripts

```bash
npm run dev
npm run build
npm run lint
```

