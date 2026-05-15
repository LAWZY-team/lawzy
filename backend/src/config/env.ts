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
    process.env.R2_BUCKET
  );
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
  const provider = process.env.LLM_PROVIDER?.toUpperCase() === 'VERTEX_AI' ? 'VERTEX_AI' : 'AI_STUDIO';
  
  let credentials;
  if (process.env.GOOGLE_CREDS_JSON) {
    try {
      credentials = JSON.parse(process.env.GOOGLE_CREDS_JSON);
    } catch (error) {
      console.warn('Failed to parse GOOGLE_CREDS_JSON:', error);
    }
  }

  return {
    provider,
    apiKey: process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_SANITIZER,
    project: process.env.GCP_PROJECT_ID || 'gen-lang-client-0520939714',
    location: process.env.GCP_LOCATION || 'us-central1',
    credentials,
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  };
}
