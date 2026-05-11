# Lawtech Backend

NestJS service for the Batching Information document workflow.

## Commands

```bash
npm install
npm run start:dev
```

The service listens on `http://localhost:8000` by default.

## Endpoints

- `GET /health` - service health check.
- `POST /batch` - batch fill entry point used by the frontend export panel.

The current `/batch` implementation returns a mock download URL so the frontend can be tested before real `.docx` templates, LibreOffice conversion, and Supabase Storage are connected.

## Environment

Copy `.env.example` to `.env` and fill Supabase values when storage integration starts.
