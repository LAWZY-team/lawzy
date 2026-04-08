import { S3Client, type ServiceOutputTypes } from '@aws-sdk/client-s3';

function isTransientNetworkError(err: unknown): boolean {
  if (err == null || typeof err !== 'object') return false;
  const e = err as { code?: string; name?: string; message?: string };
  const m = `${e.code ?? ''} ${e.name ?? ''} ${e.message ?? ''}`;
  return (
    m.includes('EAI_AGAIN') ||
    m.includes('ETIMEDOUT') ||
    m.includes('ECONNRESET') ||
    m.includes('ENOTFOUND') ||
    m.includes('ECONNREFUSED') ||
    m.includes('NetworkingError') ||
    m.includes('socket hang up') ||
    m.includes('TimeoutError')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Sends an S3 command with exponential backoff on transient DNS / TCP errors
 * (common in Docker: getaddrinfo EAI_AGAIN).
 */
export async function s3SendWithRetry(
  client: S3Client,
  command: Parameters<S3Client['send']>[0],
): Promise<ServiceOutputTypes> {
  const attempts = Math.max(
    1,
    Math.min(8, Number(process.env.R2_RETRY_ATTEMPTS) || 5),
  );
  const baseMs = Math.max(100, Number(process.env.R2_RETRY_MS) || 400);
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return (await client.send(command)) as ServiceOutputTypes;
    } catch (e) {
      last = e;
      if (!isTransientNetworkError(e) || i === attempts - 1) {
        throw e;
      }
      await sleep(baseMs * 2 ** i);
    }
  }
  throw last;
}
