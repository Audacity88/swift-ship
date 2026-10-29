#!/bin/sh
# Run after pnpm install. Mutations affect only a disposable source copy;
# tracked, staged, dirty and untracked caller files are never rewritten.
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT"
case "${MUTATION_SELFTEST:-0}" in
  0|1) ;;
  *) echo 'MUTATION_SELFTEST must be 0 or 1' >&2; exit 2 ;;
esac
[ -d node_modules ] || { echo 'Install repository dependencies first (pnpm install).' >&2; exit 2; }
WORK=$(mktemp -d "$ROOT/.mutation-check.XXXXXX")
cleanup() { rm -rf -- "$WORK"; }
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP
cp -R src "$WORK/src"
cp package.json jest.config.js "$WORK/"
ln -s "$ROOT/node_modules" "$WORK/node_modules"
# No .env files are copied or loaded. Use only synthetic local placeholders.
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
export NEXT_PUBLIC_SUPABASE_ANON_KEY=mutation-placeholder
export SUPABASE_SERVICE_ROLE_KEY=mutation-placeholder
export OPENAI_API_KEY=mutation-placeholder
export NEXT_PUBLIC_RADAR_PUBLISHABLE_KEY=mutation-placeholder
export NEXT_TELEMETRY_DISABLED=1

mutate() {
  node - "$WORK" "$1" <<'NODE'
const fs = require('fs');
const path = require('path');
const mutations = {
  ownership: ['src/lib/auth/ticket-access.ts', 'return ticket.customer_id === userId', 'return true'],
  deletion: ['src/app/api/shipments/[id]/route.ts', "if (agentError || agent?.role !== 'admin')", 'if (false)'],
  pagination: ['src/app/api/tickets/route.ts', '.range((page - 1) * pageSize, page * pageSize - 1)', '.range(0, pageSize - 1)'],
};
const [file, before, after] = mutations[process.argv[3]];
const target = path.join(process.argv[2], file);
const source = fs.readFileSync(target, 'utf8');
if (source.split(before).length !== 2) throw new Error('Mutation anchor missing or ambiguous: ' + file);
fs.writeFileSync(target, source.replace(before, after));
NODE
}
run_tests() {
  (cd "$WORK" && pnpm exec jest \
    src/__tests__/security/ticket-authorization.test.ts \
    src/__tests__/security/shipment-delete.test.ts \
    src/__tests__/security/ticket-list.test.ts \
    --runInBand --no-cache --testTimeout=10000 --json --outputFile="$WORK/result.json")
}
if [ "${MUTATION_SELFTEST:-0}" = 1 ]; then
  echo 'SELFTEST: break ownership in the disposable copy before the baseline.'
  mutate ownership
fi
if ! run_tests >"$WORK/baseline.log" 2>&1; then
  cat "$WORK/baseline.log"
  echo 'FAIL: unmutated baseline failed (or selftest break was detected).' >&2
  exit 1
fi
echo 'PASS: baseline tests'
failed=0
for mutation in ownership deletion pagination; do
  # Restore the disposable source copy before every independent mutation.
  cp "$ROOT/src/lib/auth/ticket-access.ts" "$WORK/src/lib/auth/ticket-access.ts"
  cp "$ROOT/src/app/api/shipments/[id]/route.ts" "$WORK/src/app/api/shipments/[id]/route.ts"
  cp "$ROOT/src/app/api/tickets/route.ts" "$WORK/src/app/api/tickets/route.ts"
  mutate "$mutation"
  rm -f "$WORK/result.json"
  if run_tests >"$WORK/mutant.log" 2>&1; then
    echo "SURVIVED: $mutation" >&2
    failed=1
  elif node - "$WORK/result.json" <<'NODE'
const fs = require('fs');
const result = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
// Compilation/setup crashes do not count as a mutation killed by an assertion.
process.exit(result.numFailedTests > 0 && result.numRuntimeErrorTestSuites === 0 ? 0 : 1);
NODE
  then
    echo "KILLED: $mutation"
  else
    cat "$WORK/mutant.log"
    echo "ERROR: $mutation did not produce a test assertion failure" >&2
    failed=1
  fi
done
[ "$failed" -eq 0 ] || exit 1
echo 'PASS: all 3 mutations killed; caller source tree untouched'
