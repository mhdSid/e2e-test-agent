import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import type { GateResult, GateCheck, ProbePageResult } from '../../core/types'
import type { StateMachine } from '../state-machine/types'
import { stateMachineTestids } from '../state-machine/index'
import {
  FILES,
  GATE,
  ASSERTION_MATCHERS,
  SCENARIO_PATTERN,
  TEST_PATTERN,
  TESTID_PATTERN,
  LOG
} from '../../core/constants'

function checkPlanCoverage (spec: string, plan: string): GateCheck {
  const scenarios = (plan.match(SCENARIO_PATTERN) ?? []).length
  const tests = (spec.match(TEST_PATTERN) ?? []).length
  // Every planned scenario must be coded; splitting one scenario into several
  // tests is fine, so require at-least-one-per-scenario rather than exact parity.
  const passed = scenarios > 0 && tests >= scenarios
  return {
    name: GATE.PLAN_COVERAGE,
    passed,
    detail: scenarios === 0
      ? 'no scenarios found in plan (expected ### IDs)'
      : `${tests} tests for ${scenarios} scenarios`
  }
}

function checkAssertionDensity (spec: string): GateCheck {
  const blocks = spec.split(TEST_PATTERN).slice(1)
  const weak = blocks.filter((b) => !ASSERTION_MATCHERS.some((m) => b.includes(m)))
  const passed = weak.length === 0
  const names = weak.map((b) => b.match(/['"`]([^'"`]+)['"`]/)?.[1] ?? 'unknown')
  return {
    name: GATE.ASSERTION_DENSITY,
    passed,
    detail: passed
      ? `all ${blocks.length} tests use value assertions`
      : `weak assertions in: ${names.join(', ')}`
  }
}

function checkSelectorValidity (
  spec: string,
  probe: ProbePageResult[],
  machines: StateMachine[]
): GateCheck {
  // Valid selectors = those the probe rendered PLUS those the state machine knows
  // can render in some reachable state (the probe only sees default states).
  const valid = new Set<string>([
    ...probe.flatMap((r) => r.testids.map((t) => t.testid)),
    ...stateMachineTestids(machines)
  ])
  const used = [...spec.matchAll(TESTID_PATTERN)].map((m) => m[1])
  const unknown = [...new Set(used.filter((id) => !valid.has(id)))]
  const passed = unknown.length === 0
  return {
    name: GATE.SELECTOR_VALIDITY,
    passed,
    detail: passed
      ? `all ${new Set(used).size} selectors verified (probe + state machine)`
      : `unknown selectors: ${unknown.join(', ')}`
  }
}

function readJsonIfExists<T> (path: string, fallback: T): T {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : fallback
}

export function runGate (outDir: string): GateResult {
  const spec = readFileSync(resolve(outDir, FILES.SPEC), 'utf8')
  const plan = readFileSync(resolve(outDir, FILES.PLAN), 'utf8')
  const probe: ProbePageResult[] = JSON.parse(
    readFileSync(resolve(outDir, FILES.PROBE), 'utf8')
  )
  const machines: StateMachine[] = readJsonIfExists(resolve(outDir, FILES.STATE_MACHINE), [])

  const checks: GateCheck[] = [
    checkPlanCoverage(spec, plan),
    checkAssertionDensity(spec),
    checkSelectorValidity(spec, probe, machines)
  ]

  const passed = checks.every((c) => c.passed)

  for (const check of checks) {
    console.log(`  ${check.passed ? '✓' : '✗'} ${check.name}: ${check.detail}`)
  }
  console.log(passed ? LOG.GATE_PASS : LOG.GATE_FAIL)

  return { passed, checks }
}
