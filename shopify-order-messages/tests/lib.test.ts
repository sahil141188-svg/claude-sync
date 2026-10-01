import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { formatAmount } from '@/lib/format';
import { normalizePhone } from '@/lib/phone';
import { detectPaymentMethod, hasCheckoutOptIn, orderNumber, refundAmount, verifyShopifyHmac } from '@/lib/shopify';
import { TEMPLATE_KEYS, TEMPLATES, assertVars, renderTemplate, sampleVars } from '@/lib/templates';
import { laterStatus } from '@/lib/types';

describe('normalizePhone', () => {
  it.each([
    ['9876543210', '+919876543210'],
    ['098765 43210', '+919876543210'],
    ['+91 98765-43210', '+919876543210'],
    ['919876543210', '+919876543210'],
    ['00919876543210', '+919876543210'],
    ['+971501234567', '+971501234567'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(['', null, 'abc', '12345'])('rejects %s', (input) => {
    expect(normalizePhone(input as string | null)).toBeNull();
  });
});

describe('verifyShopifyHmac', () => {
  const secret = 'shhh';
  const body = JSON.stringify({ id: 1, name: '#1001' });
  const good = crypto.createHmac('sha256', secret).update(body).digest('base64');

  it('accepts a valid signature', () => expect(verifyShopifyHmac(Buffer.from(body), good, secret)).toBe(true));
  it('rejects a tampered body', () => expect(verifyShopifyHmac(Buffer.from(body + ' '), good, secret)).toBe(false));
  it('rejects a missing secret', () => expect(verifyShopifyHmac(Buffer.from(body), good, undefined)).toBe(false));
  it('rejects a missing header', () => expect(verifyShopifyHmac(Buffer.from(body), null, secret)).toBe(false));
});

describe('shopify helpers', () => {
  it('detects COD', () => {
    expect(detectPaymentMethod({ id: 1, name: '#1', payment_gateway_names: ['Cash on Delivery (COD)'] })).toBe('cod');
    expect(detectPaymentMethod({ id: 1, name: '#1', payment_gateway_names: ['razorpay'] })).toBe('prepaid');
    expect(detectPaymentMethod({ id: 1, name: '#1', gateway: 'Codeshop Pay' })).toBe('prepaid');
  });
  it('strips # from order numbers', () => expect(orderNumber({ name: '#1042' })).toBe('1042'));
  it('reads opt-in note attribute', () => {
    expect(hasCheckoutOptIn({ id: 1, name: '#1', note_attributes: [{ name: 'WhatsApp opt in', value: 'yes' }] })).toBe(true);
    expect(hasCheckoutOptIn({ id: 1, name: '#1' })).toBe(false);
  });
  it('sums successful refund transactions', () => {
    expect(
      refundAmount({
        id: 1,
        order_id: 1,
        transactions: [
          { amount: '100.00', kind: 'refund', status: 'success' },
          { amount: '50.00', kind: 'refund', status: 'failure' },
        ],
      })
    ).toBe(100);
  });
});

describe('templates', () => {
  it('has nine lowercase_snake_case templates', () => {
    expect(TEMPLATE_KEYS).toHaveLength(9);
    for (const k of TEMPLATE_KEYS) expect(k).toMatch(/^[a-z]+(_[a-z]+)*$/);
  });
  it('only review_request is marketing', () => {
    expect(TEMPLATE_KEYS.filter((k) => TEMPLATES[k].category === 'marketing')).toEqual(['review_request']);
  });
  it('variable count matches placeholders, and no body starts or ends with a variable', () => {
    for (const k of TEMPLATE_KEYS) {
      const placeholders = new Set(TEMPLATES[k].body.match(/\{\{\d+\}\}/g));
      expect(placeholders.size).toBe(TEMPLATES[k].variables.length);
      expect(TEMPLATES[k].body.trim()).not.toMatch(/^\{\{|\}\}$/);
    }
  });
  it('has no emojis', () => {
    for (const k of TEMPLATE_KEYS) expect(TEMPLATES[k].body).not.toMatch(/\p{Extended_Pictographic}/u);
  });
  it('renders samples', () => {
    expect(renderTemplate('order_shipped', sampleVars('order_shipped'))).toContain('Track it here: https://');
  });
  it('rejects wrong variable counts', () => {
    expect(() => assertVars('order_processing', ['Ravi'])).toThrow();
  });
});

describe('misc', () => {
  it('formats rupees', () => {
    expect(formatAmount('899.00')).toBe('899');
    expect(formatAmount(1299.5)).toBe('1,299.50');
  });
  it('never moves an order backwards', () => {
    expect(laterStatus('shipped', 'confirmed')).toBe('shipped');
    expect(laterStatus('delivered', 'cancelled')).toBe('cancelled');
    expect(laterStatus('cancelled', 'shipped')).toBe('cancelled');
  });
});

describe('review product name', async () => {
  const { productName } = await import('@/lib/order-events');
  it('drops a leading brand name', () => {
    expect(productName('Robotek 20W Fast Charger')).toBe('20W Fast Charger');
    expect(productName(null)).toBe('product');
  });
});

describe('shopify admin auth', () => {
  it('exchanges client credentials for a token and tags the order', async () => {
    const { vi } = await import('vitest');
    vi.stubEnv('SHOPIFY_STORE_DOMAIN', 'robotek1.myshopify.com');
    vi.stubEnv('SHOPIFY_ADMIN_ACCESS_TOKEN', '');
    vi.stubEnv('SHOPIFY_CLIENT_ID', 'cid');
    vi.stubEnv('SHOPIFY_CLIENT_SECRET', 'csecret');
    const calls: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      if (url.endsWith('/admin/oauth/access_token')) {
        return new Response(JSON.stringify({ access_token: 'tok123', expires_in: 86399 }), { status: 200 });
      }
      return new Response(JSON.stringify({ data: { tagsAdd: { userErrors: [] } } }), { status: 200 });
    }));
    const { addOrderTags } = await import('@/lib/shopify');
    expect(await addOrderTags(1, ['cod-confirmed'])).toEqual({ ok: true });
    expect(String(calls[0].init.body)).toContain('grant_type=client_credentials');
    expect((calls[1].init.headers as Record<string, string>)['X-Shopify-Access-Token']).toBe('tok123');
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
});
