import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import type { GateCheck } from '../../core/types'
import { FILES } from '../../core/constants'
import { stripCodeFences } from '../../core/output'
import { generate } from '../../generators/index'
import { repairSystemPrompt } from './prompts/system'
import { buildRepairUserTurn } from './prompts/user'

const MAX_TOKENS = 8000
const TEMPERATURE = 0.2
const NEEDS_INVESTIGATION = 'NEEDS_INVESTIGATION'

export async function runRepair (
  outDir: string,
  model: string,
  failedChecks: GateCheck[]
): Promise<'fixed' | 'needs-investigation'> {
  const spec = readFileSync(resolve(outDir, FILES.SPEC), 'utf8')

  const result = await generate({
    model,
    system: repairSystemPrompt,
    userTurn: buildRepairUserTurn(spec, failedChecks),
    maxTokens: MAX_TOKENS,
    temperature: TEMPERATURE
  })

  if (result.trimStart().startsWith(NEEDS_INVESTIGATION)) {
    console.log(`  ⚠ repair flagged: ${result.split(':')[1]?.trim() ?? 'unknown reason'}`)
    return 'needs-investigation'
  }

  writeFileSync(resolve(outDir, FILES.SPEC), stripCodeFences(result))
  return 'fixed'
}
