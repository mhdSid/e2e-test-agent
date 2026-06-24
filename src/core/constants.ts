export const VERSION = '1.0.0'

export const PROGRAM_NAME = 'e2e-agent'

export const COMMANDS = {
  PROBE: 'probe',
  STATE_MACHINE: 'statemachine',
  PLAN: 'plan',
  GENERATE: 'generate',
  GATE: 'gate',
  RUN: 'run'
} as const

export const DESCRIPTIONS = {
  PROGRAM: 'E2E test generation agent — probe → statemachine → plan → generate → gate',
  PROBE: 'Render every route in a real browser and extract live selectors, forms and headings',
  STATE_MACHINE: 'Parse routed SFCs into a deterministic state graph (ground truth)',
  PLAN: 'Generate a human-readable test plan from probe + state machine',
  GENERATE: 'Generate Playwright spec from the test plan, probe and state machine',
  GATE: 'Run deterministic quality gates on the generated spec',
  RUN: 'Run the full pipeline: probe → statemachine → plan → generate → gate'
} as const

export const OPTIONS = {
  BASE_URL: '--base-url <url>',
  BASE_URL_DESC: 'Base URL of the running app',
  BASE_URL_DEFAULT: 'http://localhost:5173',
  OUT_DIR: '--out-dir <path>',
  OUT_DIR_DESC: 'Output directory for generated files',
  OUT_DIR_DEFAULT: 'test/integration/__playwright',
  MODEL: '--model <model>',
  MODEL_DESC: 'Anthropic model string',
  MODEL_DEFAULT: 'claude-sonnet-4-6',
  ADAPTER: '--adapter <name>',
  ADAPTER_DESC: 'App adapter to use',
  ADAPTER_DEFAULT: 'vue-demo',
  SKIP_PLAN: '--skip-plan',
  SKIP_PLAN_DESC: 'Skip plan generation, use existing test-plan.md',
  SKIP_GENERATE: '--skip-generate',
  SKIP_GENERATE_DESC: 'Skip code generation, use existing tests.spec.ts'
} as const

export const FILES = {
  PROBE: 'probe.json',
  STATE_MACHINE: 'state-machine.json',
  PLAN: 'test-plan.md',
  SPEC: 'tests.spec.ts',
  PR_COMMENT: 'pr-comment.md'
} as const

export const GATE = {
  PLAN_COVERAGE: 'Plan coverage',
  ASSERTION_DENSITY: 'Assertion density',
  SELECTOR_VALIDITY: 'Selector validity'
} as const

export const ASSERTION_MATCHERS = [
  'toHaveText',
  'toContainText',
  'toHaveCount',
  'toHaveAttribute',
  'toHaveURL',
  'toBeChecked'
] as const

export const SCENARIO_PATTERN = /###\s+[A-Z]+\d+/g

export const TEST_PATTERN = /\btest\s*\(/g

// Quote-agnostic: matches getByTestId('x'), getByTestId("x") and getByTestId(`x`).
// The double-quote-only version let single-quoted (often invented) selectors bypass the gate.
export const TESTID_PATTERN = /getByTestId\(\s*['"`]([^'"`]+)['"`]\s*\)/g

export const HTTP = {
  GET: 'GET',
  POST: 'POST',
  CONTENT_TYPE_FORM: 'application/x-www-form-urlencoded'
} as const

export const ADAPTERS = {
  VUE_DEMO: 'vue-demo'
} as const

export const LOG = {
  PROBE_OK: (path: string, n: number) => `  ✓ ${path} — ${n} testids`,
  PROBE_ERR: (path: string, msg: string) => `  ✗ ${path}: ${msg}`,
  PROBE_DONE: (out: string) => `probe → ${out}`,
  PLAN_DONE: (out: string) => `plan  → ${out}`,
  GEN_DONE: (out: string) => `spec  → ${out}`,
  GATE_PASS: '✅ gate passed',
  GATE_FAIL: '❌ gate failed',
  STAGE: (name: string) => `\n── ${name} ${'─'.repeat(40 - name.length)}`
} as const
