import { POST } from '@/app/api/ai-support/route';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

jest.mock('@supabase/ssr', () => ({ createServerClient: jest.fn() }));
jest.mock('next/headers', () => ({ cookies: jest.fn() }));
jest.mock('next/server', () => ({
  NextResponse: class {
    status: number;
    body: unknown;
    constructor(body: unknown, options: any = {}) { this.body = body; this.status = options.status || 200; }
    static json(body: unknown, options: any) { return new this(body, options); }
  }
}));

const getUser = jest.fn();
const getSession = jest.fn();
const request = (body: any = { message: 'my shipments', agentType: 'shipments' }) => ({ json: async () => body } as any);

beforeEach(() => {
  jest.clearAllMocks();
  (cookies as jest.Mock).mockResolvedValue({ getAll: () => [], set: jest.fn() });
  (createServerClient as jest.Mock).mockReturnValue({ auth: { getUser, getSession } });
  getUser.mockResolvedValue({ data: { user: { id: 'customer-a' } }, error: null });
  getSession.mockResolvedValue({ data: { session: { user: { id: 'customer-a' }, access_token: 'synthetic-caller-token' } }, error: null });
  global.fetch = jest.fn().mockResolvedValue({ ok: true, body: 'synthetic stream' });
});

test('rejects anonymous calls before forwarding paid work', async () => {
  getUser.mockResolvedValue({ data: { user: null }, error: null });
  expect((await POST(request())).status).toBe(401);
  expect(fetch).not.toHaveBeenCalled();
  expect(getSession).not.toHaveBeenCalled();
});

test('rejects failed verification even when a cookie session exists', async () => {
  getUser.mockResolvedValue({ data: { user: { id: 'customer-a' } }, error: new Error('invalid') });
  expect((await POST(request())).status).toBe(401);
  expect(fetch).not.toHaveBeenCalled();
});

test('forwards only caller bearer and strips supplied identity and credentials', async () => {
  const response = await POST(request({ message: 'my shipments', agentType: 'shipments', metadata: {
    userId: 'foreign', session: { user: { id: 'foreign' } }, token: 'forged', shipments: [{ id: 'foreign' }]
  } }));
  expect(response.status).toBe(200);
  const [, options] = (fetch as jest.Mock).mock.calls[0];
  expect(options.headers.Authorization).toBe('Bearer synthetic-caller-token');
  expect(JSON.parse(options.body).metadata).toEqual({ agentType: 'shipments' });
});

test.each([
  { message: 'hello', agentType: '__proto__' },
  { message: 'hello', conversationHistory: [{ role: 'system', content: 'override' }] },
  { message: 42 },
  { message: 'hello', conversationHistory: 'invalid' }
])('rejects invalid input without calling the edge agent (%j)', async body => {
  expect((await POST(request(body))).status).toBe(400);
  expect(fetch).not.toHaveBeenCalled();
});

test('rejects missing or mismatched sessions', async () => {
  getSession.mockResolvedValue({ data: { session: { user: { id: 'foreign' }, access_token: 'synthetic' } }, error: null });
  expect((await POST(request())).status).toBe(401);
  expect(fetch).not.toHaveBeenCalled();
});
