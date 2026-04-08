import { Injectable, Logger } from '@nestjs/common';

/** Stable Gemini embedding model (text-embedding-004 was retired → 404). */
const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIMENSIONS = 768;
const BATCH_SIZE = 40;
const EMBED_MAX_RETRIES = 4;
const EMBED_RETRY_BASE_MS = 800;

const sleepMs = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

type EmbedTaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly apiKey = process.env.GEMINI_API_KEY;

  /**
   * L2-normalize vector (recommended for 768-dim Matryoshka outputs from Gemini).
   */
  private normalizeVector(values: number[]): number[] {
    let sumSq = 0;
    for (const x of values) {
      sumSq += x * x;
    }
    const norm = Math.sqrt(sumSq);
    if (norm === 0) {
      return values;
    }
    return values.map((x) => x / norm);
  }

  /**
   * Generate embeddings for a batch of texts (document indexing).
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) {
      this.logger.warn('GEMINI_API_KEY not set – skipping embedding');
      return texts.map(() => []);
    }
    const results: number[][] = [];
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      try {
        const batchResults = await this.batchEmbed(batch, 'RETRIEVAL_DOCUMENT');
        results.push(...batchResults);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Embedding batch failed: ${msg}`);
        results.push(...batch.map(() => []));
      }
    }
    return results;
  }

  /**
   * Single query embedding for semantic search (never throws; [] on failure).
   */
  async embedQuery(text: string): Promise<number[]> {
    if (!this.apiKey?.trim() || !text?.trim()) {
      return [];
    }
    try {
      const vec = await this.embedContentSingle(text.trim(), 'RETRIEVAL_QUERY');
      return vec.length > 0 ? this.normalizeVector(vec) : [];
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Query embedding failed: ${msg}`);
      return [];
    }
  }

  async embedSingle(text: string): Promise<number[]> {
    const [row] = await this.embedBatch([text]);
    return row ?? [];
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) {
      return 0;
    }
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  private async fetchEmbeddingWithRetry(
    url: string,
    body: Record<string, unknown>,
    label: string,
  ): Promise<Response> {
    let delay = EMBED_RETRY_BASE_MS;
    let last: Response | null = null;
    for (let attempt = 0; attempt < EMBED_MAX_RETRIES; attempt++) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      last = response;
      if (response.ok) return response;
      if (response.status === 429 || response.status === 503) {
        this.logger.warn(
          `${label} ${response.status}, retry ${attempt + 1}/${EMBED_MAX_RETRIES}`,
        );
        if (attempt < EMBED_MAX_RETRIES - 1) {
          await sleepMs(delay);
          delay = Math.min(delay * 2, 12_000);
          continue;
        }
      }
      const errText = await response.text();
      this.logger.error(`Embedding API error: ${response.status} ${errText}`);
      throw new Error(`Embedding API failed: ${response.status}`);
    }
    return last as Response;
  }

  private async embedContentSingle(
    text: string,
    taskType: EmbedTaskType,
  ): Promise<number[]> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${this.apiKey}`;
    const body = {
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text }] },
      output_dimensionality: EMBEDDING_DIMENSIONS,
      task_type: taskType,
    };
    const response = await this.fetchEmbeddingWithRetry(
      url,
      body,
      'embedContent',
    );
    const data = (await response.json()) as {
      embedding?: { values: number[] };
      embeddings?: Array<{ values: number[] }>;
    };
    const values = data.embedding?.values ?? data.embeddings?.[0]?.values;
    if (!values?.length) {
      return [];
    }
    return this.normalizeVector(values);
  }

  private async batchEmbed(
    texts: string[],
    taskType: EmbedTaskType,
  ): Promise<number[][]> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents?key=${this.apiKey}`;
    const body = {
      requests: texts.map((text) => ({
        model: `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text }] },
        output_dimensionality: EMBEDDING_DIMENSIONS,
        task_type: taskType,
      })),
    };
    const response = await this.fetchEmbeddingWithRetry(
      url,
      body as Record<string, unknown>,
      'batchEmbed',
    );
    const data = (await response.json()) as {
      embeddings?: Array<{ values: number[] }>;
    };
    const list = data.embeddings ?? [];
    return list.map((e) =>
      e.values?.length ? this.normalizeVector(e.values) : [],
    );
  }
}
