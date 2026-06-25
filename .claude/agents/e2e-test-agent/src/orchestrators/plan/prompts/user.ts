import type { ProbePageResult } from '../../../core/types'
import type { StateMachine } from '../../state-machine/types'
import { summarizeStateMachines } from '../../state-machine/summarize'

export function buildPlanUserTurn (
  probe: ProbePageResult[],
  machines: StateMachine[]
): string {
  return `Generate the E2E test plan for this application.

The probe is the live DOM captured per route (exact selectors + text values).
The state machine is the deterministic set of every reachable state and the
scenarios you must cover — treat it as the checklist. Every scenario below must
map to at least one plan entry.

<state-machine>
${summarizeStateMachines(machines)}
</state-machine>

<probe>
${JSON.stringify(probe, null, 2)}
</probe>`
}
