import { Injectable, Logger } from '@nestjs/common';
import { AiProviderService } from '../ai/ai-provider.service';

/** Stable Gemini embedding model (text-embedding-004 was retired → 404). */
const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIMENSIONS = 768;
const BATCH_SIZE = 40;

const sleepMs = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

type EmbedTaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(private readonly aiProvider: AiProviderService) {}

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
    if (!text?.trim()) {
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

  private async embedContentSingle(
    text: string,
    taskType: EmbedTaskType,
  ): Promise<number[]> {
    // Gọi phương thức từ AiProviderService thay vì tự retry với fetch
    const response = await this.aiProvider.embedContentWithRetry({
      model: EMBEDDING_MODEL,
      contents: text,
      config: {
        taskType: taskType,
        outputDimensionality: EMBEDDING_DIMENSIONS,
      },
    });

    const values = response.embeddings?.[0]?.values;
    if (!values?.length) {
      return [];
    }
    return this.normalizeVector(values);
  }

  private async batchEmbed(
    texts: string[],
    taskType: EmbedTaskType,
  ): Promise<number[][]> {
    const response = await this.aiProvider.embedContentWithRetry({
      model: EMBEDDING_MODEL,
      contents: texts,
      config: {
        taskType: taskType,
        outputDimensionality: EMBEDDING_DIMENSIONS,
      },
    });

    const list = response.embeddings ?? [];
    return list.map((e) =>
      e.values?.length ? this.normalizeVector(e.values) : [],
    );
  }
}
