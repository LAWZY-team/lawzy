export interface R2Env {
  endpointUrl: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function getR2Env(): R2Env {
  return {
    endpointUrl: requireEnv('R2_ENDPOINT_URL'),
    accessKeyId: requireEnv('R2_ACCESS_KEY'),
    secretAccessKey: requireEnv('R2_SECRET_KEY'),
    bucket: requireEnv('R2_BUCKET'),
    region: requireEnv('R2_REGION'),
  };
}