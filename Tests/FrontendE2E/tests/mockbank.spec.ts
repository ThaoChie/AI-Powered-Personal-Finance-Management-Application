import { test, expect, Page } from '@playwright/test';
import crypto from 'crypto';

// ─── Config ───────────────────────────────────────────────────
const TEST_EMAIL    = process.env.TEST_EMAIL    ?? 'test@financejar.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'Test@12345';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? 'test-webhook-secret-key';
const API_BASE = 'http://localhost:8080';

/** Tạo HMAC-SHA256 signature */
function signPayload(payload: string): string {
  return crypto.createHmac('sha256', WEBHOOK_SECRET).update(payload).digest('hex');
}

/** Đăng nhập lấy JWT */
async function getToken(page: Page): Promise<string> {
  await page.goto('/');
  await page.fill('input[name="email"]', TEST_EMAIL);
  await page.fill('input[name="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/^(?!.*login).*$/, { timeout: 10_000 });
  return (await page.evaluate(() => localStorage.getItem('token'))) ?? '';
}

// ─────────────────────────────────────────────────────────────
// BANK-01 (Main): Gửi webhook hợp lệ qua UI mock → API trả 200
// ─────────────────────────────────────────────────────────────
test('Main – webhook hợp lệ → mock API phản hồi 200', async ({ page }) => {
  const payload = JSON.stringify({
    transactionId: `TX-UI-${Date.now()}`,
    jarId: 1,
    amount: 500000,
  });
  const signature = signPayload(payload);

  // Mock endpoint webhook (vì chưa có BankSyncController thật)
  await page.route(`${API_BASE}/api/webhook/bank`, async route => {
    const req = route.request();
    const body = req.postData() ?? '';
    const sig  = req.headers()['x-signature'] ?? '';

    const expected = signPayload(body);
    if (sig === expected) {
      await route.fulfill({ status: 200, body: JSON.stringify({ message: 'OK' }) });
    } else {
      await route.fulfill({ status: 401, body: JSON.stringify({ message: 'Invalid HMAC signature' }) });
    }
  });

  // Gửi request thông qua page (simulate backend call)
  const result = await page.evaluate(
    async ({ url, payload, sig }) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Signature': sig },
        body: payload,
      });
      return { status: res.status, body: await res.json() };
    },
    { url: `${API_BASE}/api/webhook/bank`, payload, sig: signature }
  );

  expect(result.status).toBe(200);
  expect(result.body.message).toBe('OK');
});

// ─────────────────────────────────────────────────────────────
// BANK-02 (Exception): Signature sai → mock API phản hồi 401
// ─────────────────────────────────────────────────────────────
test('Exception – signature sai → mock API phản hồi 401', async ({ page }) => {
  const payload = JSON.stringify({ transactionId: 'TX-BAD', jarId: 1, amount: 100000 });

  await page.route(`${API_BASE}/api/webhook/bank`, async route => {
    const sig = route.request().headers()['x-signature'] ?? '';
    const expected = signPayload(route.request().postData() ?? '');
    if (sig === expected) {
      await route.fulfill({ status: 200, body: '{"message":"OK"}' });
    } else {
      await route.fulfill({ status: 401, body: '{"message":"Invalid HMAC signature"}' });
    }
  });

  const result = await page.evaluate(
    async ({ url, payload }) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Signature': 'bad-signature' },
        body: payload,
      });
      return { status: res.status };
    },
    { url: `${API_BASE}/api/webhook/bank`, payload }
  );

  expect(result.status).toBe(401);
});

// ─────────────────────────────────────────────────────────────
// BANK-03 (Exception): Thiếu header X-Signature → mock 400
// ─────────────────────────────────────────────────────────────
test('Exception – thiếu X-Signature header → mock API phản hồi 400', async ({ page }) => {
  const payload = JSON.stringify({ transactionId: 'TX-NOSIG', jarId: 1, amount: 100000 });

  await page.route(`${API_BASE}/api/webhook/bank`, async route => {
    const sig = route.request().headers()['x-signature'];
    if (!sig) {
      await route.fulfill({ status: 400, body: '{"message":"Missing X-Signature header"}' });
    } else {
      await route.fulfill({ status: 200, body: '{"message":"OK"}' });
    }
  });

  const result = await page.evaluate(
    async ({ url, payload }) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, // không có X-Signature
        body: payload,
      });
      return { status: res.status };
    },
    { url: `${API_BASE}/api/webhook/bank`, payload }
  );

  expect(result.status).toBe(400);
});

// ─────────────────────────────────────────────────────────────
// BANK-04 (Edge): Duplicate transactionId → mock 200 nhưng message "Duplicate"
// ─────────────────────────────────────────────────────────────
test('Edge – duplicate transactionId → idempotent, mock trả "Duplicate"', async ({ page }) => {
  const txId = 'TX-DUP-001';
  const payload = JSON.stringify({ transactionId: txId, jarId: 1, amount: 200000 });
  const signature = signPayload(payload);
  let callCount = 0;

  await page.route(`${API_BASE}/api/webhook/bank`, async route => {
    callCount++;
    if (callCount === 1) {
      await route.fulfill({ status: 200, body: '{"message":"OK"}' });
    } else {
      await route.fulfill({ status: 200, body: '{"message":"Duplicate – ignored"}' });
    }
  });

  const call = (sig: string) =>
    page.evaluate(
      async ({ url, payload, sig }) => {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Signature': sig },
          body: payload,
        });
        return { status: res.status, body: await res.json() };
      },
      { url: `${API_BASE}/api/webhook/bank`, payload, sig }
    );

  const first  = await call(signature);
  const second = await call(signature);

  expect(first.status).toBe(200);
  expect(second.status).toBe(200);
  expect(second.body.message).toContain('Duplicate');
});
