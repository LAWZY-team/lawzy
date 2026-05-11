# Local Testing Guide

## Prerequisites
- Backend .env configured with SUPABASE_URL and SUPABASE_SERVICE_KEY
- Frontend .env.local configured with NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and NEXT_PUBLIC_API_URL
- Database migration (001_initial_schema.sql) already run ✅

## Step 1: Start Backend

```bash
cd lawtech-backend
npm install
npm run start:dev
```

Backend will run on http://localhost:8000

**Verify backend is running:**
```bash
curl http://localhost:8000/health
```

Should return: `{"status":"ok"}`

## Step 2: Start Frontend

Open a new terminal:

```bash
cd lawtech
npm install
npm run dev
```

Frontend will run on http://localhost:3000

## Step 3: Test Basic Flow

1. **Open browser:** http://localhost:3000
2. **Login** (if auth is configured) or navigate to dashboard
3. **Create a new case** or open existing case
4. **Fill Master Form** with company information
5. **Select templates** to generate
6. **Click "Batch Fill"**
7. **Download** the generated ZIP file

## Expected Behavior

- Backend processes templates using real docxtemplater
- Documents are filled with data from Master Form
- ZIP file is uploaded to Supabase Storage
- Signed URL is returned for download

## Troubleshooting

**Backend errors:**
- Check SUPABASE_SERVICE_KEY is correct (starts with eyJhbGc...)
- Verify database migration ran successfully
- Check backend logs for specific errors

**Frontend errors:**
- Verify NEXT_PUBLIC_API_URL=http://localhost:8000
- Check browser console for API errors
- Ensure backend is running before testing

**Template errors:**
- Templates need to be uploaded first (use seed.sql or upload via API)
- Template files must exist in Supabase Storage templates bucket

## Next Steps

To upload a real template for testing:

```bash
curl -X POST http://localhost:8000/templates/upload \
  -F "file=@your-template.docx" \
  -F "code=M01" \
  -F "name=Test Template" \
  -F "language=vi" \
  -F "isRequired=true"
```

Or run the seed.sql file to insert template metadata (you'll need to upload actual .docx files to Supabase Storage manually).
