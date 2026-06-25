import type { StateMachine } from './types'

const list = (ids: string[]): string => (ids.length ? `[${ids.join(', ')}]` : '[]')

function summarizeOne (m: StateMachine): string {
  const lines: string[] = []
  lines.push(`## route ${m.route}  (${m.file})`)

  if (m.forms.length) {
    for (const f of m.forms) {
      lines.push(
        `form ${f.formTestid}: submit=${f.submitTestid ?? 'none'} gatedBy=${f.submitGatedBy ?? 'none'}`
      )
      for (const field of f.fields) {
        lines.push(
          `  field ${field.name} (${field.testid}) required=${field.required} ` +
          `error=${field.errorTestid ?? 'none'}`
        )
      }
    }
  }

  if (m.transitions.length) {
    lines.push('transitions (drive actuator → flips state):')
    for (const t of m.transitions) {
      lines.push(`  ${t.actuatorTestid ?? t.via} writes ${t.signal} → ${t.flipsStateIds.join(', ')}`)
    }
  }

  const labels = Object.entries(m.texts)
  if (labels.length) {
    lines.push('literal labels (static text shown BEFORE any interpolated value):')
    for (const [testid, text] of labels) lines.push(`  ${testid} → "${text}"`)
    lines.push('  → assert these with toContainText("label"), or toHaveText("label <value>") only when you supplied <value> via a journey. Never assert the bare label as the full text.')
  }

  if (m.journeys.length) {
    lines.push('reachability (deterministic steps to drive the app into each state — use these, do not guess):')
    for (const j of m.journeys) {
      const tag = j.crossRoute ? ' [cross-route]' : ''
      lines.push(`  ${j.stateId}${tag}: ${j.steps.join('  →  ')}`)
    }
  }

  lines.push('scenarios (cover every one):')
  for (const sc of m.scenarios) {
    lines.push(`  - [${sc.id}] (${sc.provenance}) ${sc.description}`)
    lines.push(`      setup: ${sc.setup}`)
    lines.push(`      expect visible ${list(sc.expectVisible)} absent ${list(sc.expectAbsent)}`)
  }

  return lines.join('\n')
}

/** Compact, token-frugal view of the state machines for the plan/generate prompts. */
export function summarizeStateMachines (machines: StateMachine[]): string {
  if (machines.length === 0) return '(no state machine available)'
  return machines.map(summarizeOne).join('\n\n')
}
