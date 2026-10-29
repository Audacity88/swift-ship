import { GET as getSLA, POST as pauseSLA, PUT as resumeSLA } from '@/app/api/tickets/[id]/sla/route';
import { GET as getComments, POST as createComment } from '@/app/api/tickets/[id]/comments/route';
import { getRouteSupabase } from '@/lib/supabase-server';

jest.mock('@/lib/supabase-server', () => ({ getRouteSupabase: jest.fn() }));
jest.mock('next/server', () => ({ NextResponse: {
  json: (body: any, options: any = {}) => ({ status: options.status || 200, body })
} }));

const params = { params: Promise.resolve({ id: 'ticket-a' }) };
const request = (body: any = {}) => ({ json: async () => body, url: 'http://localhost/api/tickets/ticket-a/comments' } as any);
const rpc = jest.fn();
const getUser = jest.fn();
const from = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: 'caller', type: 'forged-auth-type' } }, error: null });
  (getRouteSupabase as jest.Mock).mockResolvedValue({ auth: { getUser }, rpc, from });
});

test('SLA GET executes with the authenticated Supabase client', async () => {
  rpc.mockResolvedValue({ data: [{ priority: 'high', created_at: '2026-10-30T00:00:00Z' }], error: null });
  const response = await getSLA(request(), params) as any;
  expect(response.status).toBe(200);
  expect(response.body.data.response.target).toBe(240);
  expect(rpc).toHaveBeenCalledWith('execute_sql', expect.objectContaining({ query_params: ['ticket-a'] }));
});

test.each([
  ['pause', pauseSLA, null],
  ['resume', resumeSLA, '2026-10-30T00:00:00Z']
] as const)('SLA %s passes the client through every transaction query', async (_name, handler, paused_at) => {
  rpc.mockResolvedValueOnce({ data: [{ started_at: '2026-10-29T00:00:00Z', paused_at, total_paused_time: 0 }], error: null })
    .mockResolvedValueOnce({ data: [{ id: 'state-a' }], error: null })
    .mockResolvedValueOnce({ data: [], error: null });
  const response = await handler(request({ reason: 'synthetic pause' }), params) as any;
  expect(response.status).toBe(200);
  expect(response.body.data).toEqual({ id: 'state-a' });
  expect(rpc).toHaveBeenCalledTimes(3);
  expect(rpc.mock.calls[2][1].query_params).toContain('caller');
});

function mockComments(agent: any = null, queryError: any = null) {
  const range = jest.fn();
  const insert = jest.fn();
  const select = jest.fn();
  from.mockImplementation((table: string) => {
    const result = table === 'agents' ? { data: agent, error: queryError } :
      table === 'tickets' ? { data: { id: 'ticket-a' }, error: null } :
      { data: { id: 'message-a' }, error: null };
    const chain: any = {
      select(...args: any[]) { select(table, ...args); return this; },
      eq() { return this; }, order() { return this; }, update() { return this; },
      insert(value: any) { insert(table, value); return this; },
      single: async () => result, maybeSingle: async () => result,
      range(...args: any[]) { range(...args); return Promise.resolve({ data: [{ id: 'message-a' }], count: 42, error: queryError }); },
      then(resolve: any) { return Promise.resolve(result).then(resolve); }
    };
    return chain;
  });
  return { range, insert, select };
}

test('comments use inclusive range pagination and return rows with an exact total', async () => {
  const { range, select } = mockComments();
  const response = await getComments({ url: 'http://localhost/comments?page=3&limit=10' } as any, params) as any;
  expect(response.status).toBe(200);
  expect(range).toHaveBeenCalledWith(20, 29);
  expect(select).toHaveBeenCalledWith('messages', '*', { count: 'exact' });
  expect(response.body).toEqual({ data: [{ id: 'message-a' }], pagination: { total: 42, page: 3, limit: 10, totalPages: 5 } });
});

test.each(['page=0', 'page=NaN', 'limit=-1', 'limit=101'])('comments reject malformed pagination: %s', async query => {
  mockComments();
  expect((await getComments({ url: `http://localhost/comments?${query}` } as any, params) as any).status).toBe(400);
  expect(from).not.toHaveBeenCalled();
});

test.each([[null, 'customer'], [{ id: 'caller' }, 'agent']])('comment author and audit actor use persisted agent membership', async (agent, expectedType) => {
  const { insert } = mockComments(agent);
  expect((await createComment(request({ content: 'synthetic comment' }), params) as any).status).toBe(200);
  expect(insert).toHaveBeenCalledWith('messages', expect.objectContaining({ author_type: expectedType, author_id: 'caller' }));
  expect(insert).toHaveBeenCalledWith('audit_logs', expect.objectContaining({ actor_type: expectedType }));
});

test('customers cannot create internal agent notes', async () => {
  const { insert } = mockComments();
  expect((await createComment(request({ content: 'synthetic', isInternal: true }), params) as any).status).toBe(403);
  expect(insert).not.toHaveBeenCalled();
});

test('agent lookup errors stop writes instead of guessing an author type', async () => {
  const { insert } = mockComments(null, { message: 'synthetic database error' });
  expect((await createComment(request({ content: 'synthetic' }), params) as any).status).toBe(500);
  expect(insert).not.toHaveBeenCalled();
});
