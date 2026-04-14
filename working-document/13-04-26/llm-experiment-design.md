# LLM Output Format Experiment: JSON vs Markdown
## Overview
This document contains the step-by-step implementation, system architecture, logging database schema, and the test comparison tools built for A/B testing contract generation output in Lawzy.

## 1. System Architecture
An isolated module `LlmExperimentModule` was created in the backend to ensure a clean sandbox. This module connects directly to Prisma and Google Generative AI to launch parallel generation requests without interfering with the existing contract pipeline (`AiSanitizerService`).

## 2. Updated Prisma Schema
A new table `llm_experiment_logs` tracks both standard LLM metadata and parse success.

```prisma
model LlmExperimentLog {
  id            String   @id @default(uuid())
  promptHash    String   @map("prompt_hash")
  format        String   // 'json' or 'markdown'
  inputTokens   Int      @map("input_tokens")
  outputTokens  Int      @map("output_tokens")
  latencyMs     Int      @map("latency_ms")
  isSuccess     Boolean  @map("is_success")
  rawOutput     String   @db.LongText @map("raw_output")
  errorMessage  String?  @db.Text @map("error_message")
  createdAt     DateTime @default(now()) @map("created_at")

  @@index([promptHash])
  @@index([format])
  @@map("llm_experiment_logs")
}
```

## 3. Dual LLM Call (Key Snippet)
Below is the core function comparing JSON parsing vs Markdown parsing.

```typescript
  async generateAndLog(prompt: string, format: 'json' | 'markdown', promptHash: string) {
    const isJson = format === 'json';
    const formatInstruction = isJson
      ? `\n\nReturn EXACTLY a valid JSON object matching the predefined contract structure.`
      : `\n\nReturn the contract STRICTLY as a Markdown document. Use '#' for the title, '## Article X' or '## Điều X' for clauses, and standard '-' for bullet points. Do NOT output JSON.`;

    const fullPrompt = prompt + formatInstruction;

    const model = this.genAI.getGenerativeModel({
      model: env.model,
      generationConfig: {
        responseMimeType: isJson ? 'application/json' : 'text/plain',
      },
    });

    // Run query, trace time, track tokens and success...
```

## 4. Markdown Parser Layer
This layer converts the generated Markdown back into Tiptap's JSON node standard (`type: 'doc', content: [...]`), checking for headers like `###` and matching "Điều X" or "Article X" clauses.

```typescript
export function parseMarkdownToTiptap(markdownText: string): DocContent {
  const lines = markdownText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const content: any[] = [];
  let currentClause: { title: string; lines: string[] } | null = null;
  // ... maps # and ## headers into Tiptap `heading`
  // ... maps Article titles into `clause` node
  // ... sets everything else to left-aligned `paragraph`
```

## 5. Parallel A/B Testing Endpoints
The new controller offers headless testing points:
* `POST /llm-experiment/run-test`: Enter any context text to spawn twin generation variants (Markdown and JSON).
* `GET /llm-experiment/metrics`: Pull metrics on Average Return Token Size, Success Rate, Average Latency, grouped by Format (JSON vs Md).

### Example Response from `/llm-experiment/metrics`
```json
{
  "json": {
    "count": 10,
    "successRate": 90,
    "avgInputTokens": 450,
    "avgOutputTokens": 1050,
    "avgLatency": 6000
  },
  "markdown": {
    "count": 10,
    "successRate": 100,
    "avgInputTokens": 450,
    "avgOutputTokens": 600,
    "avgLatency": 3500
  },
  "totalTests": 10
}
```

## 6. How it affects the Frontend
Once the experiment validates that Markdown parses reliably and drops the required output token count, we will integrate `parseMarkdownToTiptap` directly into `frontend/src/components/templates/community-template-preview-modal.tsx` or its backend equivalent `build-contract-template-json.ts`, substituting the heavy structured JSON approach entirely and saving Gemini tokens effectively.
