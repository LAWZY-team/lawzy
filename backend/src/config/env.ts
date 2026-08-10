export interface R2Env {
  endpointUrl: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region: string;
  blogImagePrefix: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function getR2Env(): R2Env {
  const blogImagePrefixRaw = process.env.BLOG_IMAGE_PREFIX?.trim() || 'blog/';
  const blogImagePrefix = blogImagePrefixRaw.endsWith('/')
    ? blogImagePrefixRaw
    : `${blogImagePrefixRaw}/`;
  return {
    endpointUrl: requireEnv('R2_ENDPOINT_URL'),
    accessKeyId: requireEnv('R2_ACCESS_KEY'),
    secretAccessKey: requireEnv('R2_SECRET_KEY'),
    bucket: requireEnv('R2_BUCKET'),
    region: requireEnv('R2_REGION'),
    blogImagePrefix,
  };
}

export function isR2Configured(): boolean {
  return !!(
    process.env.R2_ENDPOINT_URL &&
    process.env.R2_ACCESS_KEY &&
    process.env.R2_SECRET_KEY &&
    process.env.R2_BUCKET &&
    process.env.R2_REGION
  );
}

/**
 * Parse Google service-account / ADC JSON from env (Coolify often stores as one line).
 * Enable "Is Multiline" in Coolify, or paste minified JSON with escaped \\n in private_key.
 */
export function parseGoogleCredsJson(raw: string): Record<string, unknown> | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const candidates = [trimmed];
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    candidates.push(trimmed.slice(1, -1));
  }
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      /* try next */
    }
  }
  try {
    const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* not base64 JSON */
  }
  return undefined;
}

export interface GeminiSanitizerEnv {
  apiKey: string;
  model: string;
}

// only use gemini-2.5-flash
// key from HMQ
export function getGeminiSanitizerEnv(): GeminiSanitizerEnv {
  return {
    apiKey: requireEnv('GEMINI_API_KEY_SANITIZER'),
    model: 'gemini-2.5-flash',
  };
}

export interface LlmConfig {
  provider: 'VERTEX_AI' | 'AI_STUDIO';
  apiKey?: string;
  project?: string;
  location?: string;
  credentials?: Record<string, any>;
  model: string;
}

export function getLlmConfig(): LlmConfig {
  const provider =
    process.env.LLM_PROVIDER?.toUpperCase() === 'VERTEX_AI'
      ? 'VERTEX_AI'
      : 'AI_STUDIO';

  const credentials = process.env.GOOGLE_CREDS_JSON
    ? parseGoogleCredsJson(process.env.GOOGLE_CREDS_JSON)
    : undefined;

  if (process.env.GOOGLE_CREDS_JSON && !credentials) {
    console.warn(
      'GOOGLE_CREDS_JSON is set but could not be parsed. Enable multiline in Coolify or use minified JSON.',
    );
  }

  return {
    provider,
    apiKey: process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_SANITIZER,
    project: process.env.GCP_PROJECT_ID || 'gen-lang-client-0520939714',
    location: process.env.GCP_LOCATION || 'us-central1',
    credentials,
    model: process.env.GEMINI_MODEL || 'gemini-2.5-pro',
  };
}

/** Vertex only when creds + project/location exist; otherwise AI Studio. */
export function getEffectiveLlmProvider(
  config: LlmConfig,
): 'VERTEX_AI' | 'AI_STUDIO' {
  if (
    config.provider === 'VERTEX_AI' &&
    config.credentials &&
    config.project &&
    config.location
  ) {
    return 'VERTEX_AI';
  }
  return 'AI_STUDIO';
}
