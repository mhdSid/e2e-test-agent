import type { GateCheck } from '../../../core/types'

export function buildRepairUserTurn (spec: string, failedChecks: GateCheck[]): string {
  const checkList = failedChecks
    .map((c) => `- ${c.name}: ${c.detail}`)
    .join('\n')

  return `The following gate checks failed. Fix the spec.

Failed checks:
${checkList}

Current spec:
\`\`\`typescript
${spec}
\`\`\``
}
