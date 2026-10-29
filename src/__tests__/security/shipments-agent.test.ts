import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const own = { id: 'own', customer_id: 'customer-a', status: 'in_transit', metadata: {}, tracking_number: 'SSE-2026-0000001' };
const foreign = { ...own, id: 'foreign', customer_id: 'customer-b', origin: 'private foreign address' };

function loadAgent() {
  const completions = jest.fn(async () => (async function* () { yield { choices: [{ delta: { content: 'stub' } }] }; })());
  class OpenAI { chat = { completions: { create: completions } }; }
  const exported = { exports: {} as any };
  const source = fs.readFileSync('supabase/functions/shipments-agent/shipments-agent.ts', 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(js, { module: exported, exports: exported.exports,
    console: { warn() {}, error() {} }, Deno: { env: { get: () => undefined } },
    require(path: string) {
      if (path.endsWith('deps.ts')) return { OpenAI, traceable: (fn: any) => fn, wrapOpenAI: (value: any) => value };
      if (path.endsWith('formatters.ts')) return { formatShipments: JSON.stringify };
      throw new Error('Unexpected dependency');
    }
  });
  const queries: any[] = [];
  const client = { from: jest.fn(() => {
    const filters: any[] = [];
    const query: any = {
      select() { return this; }, update() { return this; },
      eq(...args: any[]) { filters.push(args); return this; }, ilike() { return this; },
      single: async () => ({ data: filters.some(([key, value]) => key === 'customer_id' && value === 'customer-a') ? own : foreign }),
      order: async () => ({ data: filters.some(([key, value]) => key === 'customer_id' && value === 'customer-a') ? [own] : [own, foreign] })
    };
    queries.push(filters);
    return query;
  }) };
  const agent = exported.exports.ShipmentsAgent.getInstance('placeholder', client, 'customer-a');
  return { agent, client, queries, completions, Agent: exported.exports.ShipmentsAgent };
}

test.each(['my shipments', 'all shipments', 'SSE-2026-0000001 details'])('scopes %s and discards forged shipment metadata', async content => {
  const { agent, queries, completions } = loadAgent();
  const response = await agent.process({ messages: [{ role: 'user', content }], metadata: { userId: 'customer-b', shipments: [foreign] } });
  expect(response.metadata.shipments).toEqual(content.includes('details') ? [own] : [own]);
  expect(queries[0]).toContainEqual(['customer_id', 'customer-a']);
  expect(JSON.stringify(completions.mock.calls)).not.toContain('private foreign address');
});

test('cancel lookup and write both constrain the verified customer', async () => {
  const { agent, queries } = loadAgent();
  expect((await agent.cancelShipment('SSE-2026-0000001', 'customer-b')).success).toBe(true);
  expect(queries).toHaveLength(2);
  queries.forEach(filters => expect(filters).toContainEqual(['customer_id', 'customer-a']));
});

test('fresh agent instances cannot retain another callers client', () => {
  const { agent, client, Agent } = loadAgent();
  expect(Agent.getInstance('placeholder', client, 'customer-b')).not.toBe(agent);
  expect(() => Agent.getInstance('placeholder', client, '')).toThrow('Authenticated caller is required');
});
