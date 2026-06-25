import type { ProbePageResult } from '../../../core/types'
import type { StateMachine } from '../../state-machine/types'
import { summarizeStateMachines } from '../../state-machine/summarize'

export function buildGenerateUserTurn (
  planMd: string,
  probe: ProbePageResult[],
  machines: StateMachine[],
  baseUrl: string
): string {
  return `Generate the Playwright spec for this application.

Output the complete file and nothing else. Begin the file exactly with:
import { test, expect } from '@playwright/test'

Base URL: ${baseUrl}

The test plan says WHAT to cover. The state machine gives the exact selectors,
the mutually-exclusive states (expect-absent), and the form submit gating. The
probe gives the exact text values to assert. Use selectors from the probe or the
state machine only.

<test-plan>
${planMd}
</test-plan>

<state-machine>
${summarizeStateMachines(machines)}
</state-machine>

<probe>
${JSON.stringify(probe, null, 2)}
</probe>`
}
