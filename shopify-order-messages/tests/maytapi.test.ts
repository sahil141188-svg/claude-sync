import { afterEach, describe, expect, it, vi } from 'vitest';
import { MaytapiProvider, parseMaytapiWebhook } from '@/lib/maytapi';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('parseMaytapiWebhook', () => {
  it('reads a customer reply', () => {
    const r = parseMaytapiWebhook({
      type: 'message',
      message: { type: 'text', text: ' YES ', fromMe: false },
      user: { phone: '919876543210', id: '919876543210@c.us' },
      conversation: '919876543210@c.us',
    });
    expect(r.replies).toEqual([{ from: '+919876543210', text: 'YES' }]);
  });

  it('ignores our own messages and group chats', () => {
    expect(parseMaytapiWebhook({ type: 'message', message: { text: 'hi', fromMe: true }, user: { phone: '919876543210' } }).replies).toEqual([]);
    expect(
      parseMaytapiWebhook({ type: 'message', message: { text: 'YES' }, user: { phone: '919876543210' }, conversation: '1203@g.us' }).replies
    ).toEqual([]);
  });

  it('maps acks to delivery statuses', () => {
    const r = parseMaytapiWebhook({
      type: 'ack',
      data: [
        { msgId: 'a', ackType: 'delivered' },
        { msgId: 'b', ackType: 'read' },
        { msgId: 'c', ackCode: 1 },
        { msgId: 'd', ackType: 'something-new' },
      ],
    });
    expect(r.acks).toEqual([
      { msgId: 'a', status: 'delivered' },
      { msgId: 'b', status: 'read' },
      { msgId: 'c', status: 'sent' },
    ]);
  });

  it('returns nothing for unknown payloads', () => {
    expect(parseMaytapiWebhook({ type: 'status', status: 'active' })).toEqual({ replies: [], acks: [] });
    expect(parseMaytapiWebhook(null)).toEqual({ replies: [], acks: [] });
  });
});

describe('MaytapiProvider', () => {
  it('sends the rendered message text and returns the message id', async () => {
    vi.stubEnv('MAYTAPI_PRODUCT_ID', 'prod');
    vi.stubEnv('MAYTAPI_PHONE_ID', '34178');
    vi.stubEnv('MAYTAPI_API_TOKEN', 'tok');
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: true, data: { msgId: 'm1' } }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const res = await new MaytapiProvider().sendTemplate('+919876543210', 'order_processing', ['Ravi', '1042']);
    expect(res).toEqual({ ok: true, messageId: 'm1', testMode: false });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.maytapi.com/api/prod/34178/sendMessage');
    expect((init.headers as Record<string, string>)['x-maytapi-key']).toBe('tok');
    const body = JSON.parse(String(init.body));
    expect(body.to_number).toBe('919876543210');
    expect(body.message).toContain('Hi Ravi, your order #1042 is being checked and packed');
  });

  it('reports a clear error when not configured or rejected', async () => {
    expect((await new MaytapiProvider().sendTemplate('+919876543210', 'order_processing', ['Ravi', '1'])).ok).toBe(false);
    vi.stubEnv('MAYTAPI_PRODUCT_ID', 'p');
    vi.stubEnv('MAYTAPI_PHONE_ID', '1');
    vi.stubEnv('MAYTAPI_API_TOKEN', 't');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: false, message: 'Phone is not active' }), { status: 400 })));
    const res = await new MaytapiProvider().sendTemplate('+919876543210', 'order_processing', ['Ravi', '1']);
    expect(res).toMatchObject({ ok: false, error: 'Maytapi 400: Phone is not active' });
  });
});
