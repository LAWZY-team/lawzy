/**
 * Smoke test: create a real payOS payment link (production API).
 *
 * Usage (from backend/):
 *   PAYOS_CLIENT_ID=... PAYOS_API_KEY=... PAYOS_CHECKSUM_KEY=... npx ts-node -r dotenv/config scripts/payos-smoke.ts
 *
 * Or put variables in backend/.env and run:
 *   npx ts-node -r dotenv/config scripts/payos-smoke.ts
 */
import 'dotenv/config';
import { PayOS } from '@payos/node';

async function main() {
  const clientId = process.env.PAYOS_CLIENT_ID?.trim();
  const apiKey = process.env.PAYOS_API_KEY?.trim();
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY?.trim();
  if (!clientId || !apiKey || !checksumKey) {
    console.error(
      'Missing PAYOS_CLIENT_ID, PAYOS_API_KEY, or PAYOS_CHECKSUM_KEY in environment.',
    );
    process.exit(1);
  }

  const payos = new PayOS({
    clientId,
    apiKey,
    checksumKey,
    baseURL:
      process.env.PAYOS_BASE_URL?.trim() || 'https://api-merchant.payos.vn',
  });

  const orderCode = Date.now();
  const base =
    process.env.FRONTEND_URL?.replace(/\/$/, '') || 'http://localhost:3000';

  const res = await payos.paymentRequests.create({
    orderCode,
    amount: 2000,
    description: 'LawzyTest',
    returnUrl: `${base}/payment/status/${orderCode}`,
    cancelUrl: `${base}/payment`,
  });

  console.log('OK — payment link created');
  console.log('orderCode:', orderCode);
  console.log('checkoutUrl:', res.checkoutUrl);
  console.log('paymentLinkId:', res.paymentLinkId);
}

main().catch((e) => {
  console.error('payOS smoke test failed:', e?.message ?? e);
  process.exit(1);
});
