import {
  SELECTOR_RULES,
  ASSERTION_RULES,
  OUTPUT_RULES,
  composeRules
} from '../../../rules/index'

export const planSystemPrompt = `You generate E2E test plans for web applications.
You receive two ground-truth inputs:
- a probe: live DOM captured per route (exact selectors and text values)
- a state machine: every reachable state and a deterministic list of scenarios

The state machine's scenarios are the coverage checklist. Every scenario must
map to at least one plan entry. Use the probe for the exact selectors and values.
Output a test plan in markdown: scenarios only, no code.

${composeRules(SELECTOR_RULES, ASSERTION_RULES, OUTPUT_RULES)}

Group scenarios by route. Name each ### H1, ### P2, ### B3 etc.
Flag non-200 status routes as boundary or error scenarios.`
