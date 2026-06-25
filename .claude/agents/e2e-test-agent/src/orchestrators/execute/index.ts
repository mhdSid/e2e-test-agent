import { spawnSync } from 'child_process'
import { readFileSync, existsSync, rmSync } from 'fs'
import { resolve } from 'path'
import { tmpdir } from 'os'

export interface TestFailure {
  title: string
  error: string
  location: string
}

export interface ExecuteResult {
  passed: boolean
  total: number
  failed: number
  failures: TestFailure[]
}

const ANSI = /\[[0-9;]*m/g
const MAX_ERR = 1200

function clean (msg: string): string {
  return msg.replace(ANSI, '').trim().slice(0, MAX_ERR)
}

/** Walk Playwright's JSON report, collecting every spec that did not pass. */
function collectFailures (node: any, out: TestFailure[], file: string): void {
  const here = node.file ?? file
  for (const spec of node.specs ?? []) {
    if (spec.ok) continue
    const result = (spec.tests ?? [])
      .flatMap((t: any) => t.results ?? [])
      .find((r: any) => r.error)
    out.push({
      title: spec.title,
      error: clean(result?.error?.message ?? 'test did not pass (no error captured)'),
      location: `${here}:${spec.line ?? '?'}`
    })
  }
  for (const child of node.suites ?? []) collectFailures(child, out, here)
}

/**
 * EXECUTION GATE — actually run the generated spec in Playwright and report runtime
 * failures, so the pipeline verifies behaviour (not just static shape) and feeds real
 * assertion failures back into the repair loop. Playwright's webServer config starts /
 * reuses the example app, so this is self-contained.
 */
export async function runExecute (outDir: string, baseUrl: string): Promise<ExecuteResult> {
  const jsonPath = resolve(tmpdir(), `e2e-agent-pw-${process.pid}.json`)
  rmSync(jsonPath, { force: true })

  const proc = spawnSync('yarn', ['playwright', 'test', '--reporter=json'], {
    cwd: process.cwd(),
    env: { ...process.env, E2E_BASE_URL: baseUrl, PLAYWRIGHT_JSON_OUTPUT_NAME: jsonPath },
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  })

  if (!existsSync(jsonPath)) {
    // Playwright never produced a report → the spec failed to even load/compile.
    return {
      passed: false,
      total: 0,
      failed: 1,
      failures: [{
        title: 'spec failed to run',
        error: clean(`${proc.stderr ?? ''}\n${proc.stdout ?? ''}`).slice(-MAX_ERR),
        location: outDir
      }]
    }
  }

  const report = JSON.parse(readFileSync(jsonPath, 'utf8'))
  rmSync(jsonPath, { force: true })

  const failures: TestFailure[] = []
  for (const suite of report.suites ?? []) collectFailures(suite, failures, suite.file ?? '')

  const expected = report.stats?.expected ?? 0
  const unexpected = report.stats?.unexpected ?? 0
  return {
    passed: proc.status === 0 && failures.length === 0,
    total: expected + unexpected,
    failed: failures.length,
    failures
  }
}
