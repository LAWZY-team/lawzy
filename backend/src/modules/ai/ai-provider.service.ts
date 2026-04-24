import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import { getLlmConfig } from '../../config/env';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

@Injectable()
export class AiProviderService {
  private readonly logger = new Logger(AiProviderService.name);
  private aiStudioClient: GoogleGenAI | null = null;
  private vertexClient: GoogleGenAI | null = null;

  constructor() {
    this.initializeClients();
  }

  private initializeClients() {
    const config = getLlmConfig();

    // Init AI Studio
    if (config.apiKey) {
      try {
        this.aiStudioClient = new GoogleGenAI({ apiKey: config.apiKey });
      } catch (err) {
        this.logger.warn('Failed to initialize AI Studio client: ' + (err as Error).message);
      }
    }

    // Init Vertex AI
    if (config.project && config.location && config.credentials) {
      try {
        // Bulletproof ADC initialization: write to a temporary file and set env var
        const tempPath = path.join(process.cwd(), '.gcp-creds.json');
        if (!fs.existsSync(tempPath)) {
          fs.writeFileSync(tempPath, JSON.stringify(config.credentials));
        }
        process.env.GOOGLE_APPLICATION_CREDENTIALS = tempPath;

        this.vertexClient = new GoogleGenAI({
          vertexai: true,
          project: config.project,
          location: config.location,
        });
      } catch (err) {
        this.logger.warn('Failed to initialize Vertex AI client: ' + (err as Error).message);
      }
    }
  }

  /**
   * Lấy instance client hiện hành. Ưu tiên theo cấu hình `LLM_PROVIDER`, tự động fallback nếu lỗi.
   */
  public getClient(): GoogleGenAI {
    const config = getLlmConfig();
    
    if (config.provider === 'VERTEX_AI') {
      if (!this.vertexClient) {
        this.logger.warn('Vertex AI client not available, falling back to AI Studio');
        if (!this.aiStudioClient) {
          throw new InternalServerErrorException('No GenAI client available');
        }
        return this.aiStudioClient;
      }
      return this.vertexClient;
    }

    // Default to AI_STUDIO
    if (!this.aiStudioClient) {
      throw new InternalServerErrorException('AI Studio client not available');
    }
    return this.aiStudioClient;
  }

  public getModelName(): string {
    return getLlmConfig().model;
  }

  /**
   * Gọi AI (generateContent) đi kèm cơ chế Retry Exponential Backoff
   * tự động xử lý khi gặp Rate Limit (429) hoặc Service Overloaded (503).
   */
  public async generateContentWithRetry(params: {
    contents: string | any[];
    config?: any;
    model?: string;
  }) {
    let delayMs = BASE_DELAY_MS;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const client = this.getClient();
        return await client.models.generateContent({
          model: params.model || this.getModelName(),
          contents: params.contents,
          config: params.config,
        });
      } catch (error: any) {
        const statusCode = error.status || error.response?.status;
        const isRetryable = statusCode === 429 || statusCode === 503;
        
        if (isRetryable && attempt < MAX_RETRIES) {
          this.logger.warn(`GenAI API error (${statusCode}). Retry ${attempt}/${MAX_RETRIES} in ${delayMs}ms...`);
          await new Promise(res => setTimeout(res, delayMs));
          delayMs *= 2; // Exponential backoff
          continue;
        }
        throw error;
      }
    }
    throw new InternalServerErrorException('Max retries exceeded for GenAI');
  }

  public async embedContentWithRetry(params: {
    model: string;
    contents: string | any[];
    config?: { taskType?: string; outputDimensionality?: number };
  }) {
    let delayMs = BASE_DELAY_MS;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const client = this.getClient();
        return await client.models.embedContent({
          model: params.model,
          contents: params.contents,
          config: params.config,
        });
      } catch (error: any) {
        const statusCode = error.status || error.response?.status;
        const isRetryable = statusCode === 429 || statusCode === 503;
        
        if (isRetryable && attempt < MAX_RETRIES) {
          this.logger.warn(`GenAI embedContent error (${statusCode}). Retry ${attempt}/${MAX_RETRIES} in ${delayMs}ms...`);
          await new Promise(res => setTimeout(res, delayMs));
          delayMs *= 2;
          continue;
        }
        throw error;
      }
    }
    throw new InternalServerErrorException('Max retries exceeded for GenAI embedding');
  }
}
