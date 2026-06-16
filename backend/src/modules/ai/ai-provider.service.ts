import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import { getLlmConfig, getEffectiveLlmProvider } from '../../config/env';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

@Injectable()
export class AiProviderService {
  private readonly logger = new Logger(AiProviderService.name);
  private aiStudioClient: GoogleGenAI | null = null;
  private vertexClient: GoogleGenAI | null = null;
  private vertexAuthFailed = false;

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
        fs.writeFileSync(tempPath, JSON.stringify(config.credentials));
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
    const effectiveProvider = getEffectiveLlmProvider(config);

    if (effectiveProvider === 'VERTEX_AI' && !this.vertexAuthFailed) {
      if (!this.vertexClient) {
        this.logger.warn('Vertex AI client not available, falling back to AI Studio');
        if (!this.aiStudioClient) {
          throw new InternalServerErrorException(
            'No GenAI client available. Configure GEMINI_API_KEY or valid GOOGLE_CREDS_JSON.',
          );
        }
        return this.aiStudioClient;
      }
      return this.vertexClient;
    }

    if (!this.aiStudioClient) {
      throw new InternalServerErrorException(
        'AI Studio client not available. Set GEMINI_API_KEY on the backend.',
      );
    }
    return this.aiStudioClient;
  }

  public getModelName(): string {
    return getLlmConfig().model;
  }

  public markVertexAuthFailed() {
    this.vertexAuthFailed = true;
    this.logger.warn('Vertex AI authentication failure manually flagged.');
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
        const errorStr = String(error?.message || error?.stack || error || '');
        const isAuthError = errorStr.includes('invalid_grant') || 
                            errorStr.includes('invalid_rapt') || 
                            errorStr.includes('unauthorized') || 
                            errorStr.includes('auth') ||
                            errorStr.includes('credential');

        if (isAuthError && !this.vertexAuthFailed && this.aiStudioClient) {
          this.logger.warn(`Vertex AI generateContent authentication failure detected (${errorStr}). Falling back to AI Studio (Gemini API Key) automatically.`);
          this.vertexAuthFailed = true;
          attempt = 0; // Retry immediately using fallback
          continue;
        }

        const statusCode = error.status || error.response?.status || error.error?.code || error.code;
        const is429 = statusCode === 429 || 
                      statusCode === 'RESOURCE_EXHAUSTED' || 
                      errorStr.includes('429') || 
                      errorStr.includes('RESOURCE_EXHAUSTED') || 
                      errorStr.includes('rate-limit') ||
                      errorStr.includes('quota');
        const is503 = statusCode === 503 || errorStr.includes('503');
        const isRetryable = is429 || is503;
        
        if (isRetryable && attempt < MAX_RETRIES) {
          let backoffDelay = delayMs;
          if (is429) {
            let parsedDelaySeconds: number | null = null;
            try {
              // Handle structured object if error is already an object or stringified JSON
              const errObj = typeof error === 'string' ? JSON.parse(error) : error;
              const details = errObj?.error?.details || errObj?.details;
              if (Array.isArray(details)) {
                const retryInfo = details.find((d: any) => d?.['@type'] === 'type.googleapis.com/google.rpc.RetryInfo' || d?.type === 'type.googleapis.com/google.rpc.RetryInfo');
                if (retryInfo?.retryDelay) {
                  const seconds = parseInt(retryInfo.retryDelay.replace('s', ''), 10);
                  if (!isNaN(seconds)) {
                    parsedDelaySeconds = seconds;
                  }
                }
              }
            } catch {
              // Ignore
            }

            if (parsedDelaySeconds === null) {
              const match = errorStr.match(/retry in ([\d\.]+)s/i);
              if (match && match[1]) {
                const seconds = parseFloat(match[1]);
                if (!isNaN(seconds)) {
                  parsedDelaySeconds = Math.ceil(seconds);
                }
              }
            }

            if (parsedDelaySeconds !== null) {
              backoffDelay = (parsedDelaySeconds + 1) * 1000;
              this.logger.warn(`Quota rate limit hit. Google API requested retry delay: ${parsedDelaySeconds}s. Sleeping for ${backoffDelay}ms to recover...`);
            } else {
              backoffDelay = Math.max(delayMs, 10000); // Wait at least 10s on rate limit
            }
          }

          this.logger.warn(`GenAI API error (${statusCode || '429'}). Retry ${attempt}/${MAX_RETRIES} in ${backoffDelay}ms...`);
          await new Promise(res => setTimeout(res, backoffDelay));
          delayMs = backoffDelay * 2;
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
        const errorStr = String(error?.message || error?.stack || error || '');
        const isAuthError = errorStr.includes('invalid_grant') || 
                            errorStr.includes('invalid_rapt') || 
                            errorStr.includes('unauthorized') || 
                            errorStr.includes('auth') ||
                            errorStr.includes('credential');

        if (isAuthError && !this.vertexAuthFailed && this.aiStudioClient) {
          this.logger.warn(`Vertex AI embedContent authentication failure detected (${errorStr}). Falling back to AI Studio (Gemini API Key) automatically.`);
          this.vertexAuthFailed = true;
          attempt = 0; // Retry immediately using fallback
          continue;
        }

        const statusCode = error.status || error.response?.status || error.error?.code || error.code;
        const is429 = statusCode === 429 || 
                      statusCode === 'RESOURCE_EXHAUSTED' || 
                      errorStr.includes('429') || 
                      errorStr.includes('RESOURCE_EXHAUSTED') || 
                      errorStr.includes('rate-limit') ||
                      errorStr.includes('quota');
        const is503 = statusCode === 503 || errorStr.includes('503');
        const isRetryable = is429 || is503;
        
        if (isRetryable && attempt < MAX_RETRIES) {
          let backoffDelay = delayMs;
          if (is429) {
            let parsedDelaySeconds: number | null = null;
            try {
              const errObj = typeof error === 'string' ? JSON.parse(error) : error;
              const details = errObj?.error?.details || errObj?.details;
              if (Array.isArray(details)) {
                const retryInfo = details.find((d: any) => d?.['@type'] === 'type.googleapis.com/google.rpc.RetryInfo' || d?.type === 'type.googleapis.com/google.rpc.RetryInfo');
                if (retryInfo?.retryDelay) {
                  const seconds = parseInt(retryInfo.retryDelay.replace('s', ''), 10);
                  if (!isNaN(seconds)) {
                    parsedDelaySeconds = seconds;
                  }
                }
              }
            } catch {
              // Ignore
            }

            if (parsedDelaySeconds === null) {
              const match = errorStr.match(/retry in ([\d\.]+)s/i);
              if (match && match[1]) {
                const seconds = parseFloat(match[1]);
                if (!isNaN(seconds)) {
                  parsedDelaySeconds = Math.ceil(seconds);
                }
              }
            }

            if (parsedDelaySeconds !== null) {
              backoffDelay = (parsedDelaySeconds + 1) * 1000;
              this.logger.warn(`Quota rate limit hit. Google API requested retry delay: ${parsedDelaySeconds}s. Sleeping for ${backoffDelay}ms to recover...`);
            } else {
              backoffDelay = Math.max(delayMs, 10000); // Wait at least 10s on rate limit
            }
          }

          this.logger.warn(`GenAI embedContent error (${statusCode || '429'}). Retry ${attempt}/${MAX_RETRIES} in ${backoffDelay}ms...`);
          await new Promise(res => setTimeout(res, backoffDelay));
          delayMs = backoffDelay * 2;
          continue;
        }
        throw error;
      }
    }
    throw new InternalServerErrorException('Max retries exceeded for GenAI embedding');
  }
}
