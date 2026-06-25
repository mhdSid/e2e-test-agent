import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import type { ProbePageResult } from '../../core/types'
import type { StateMachine } from '../state-machine/types'
import { FILES, LOG } from '../../core/constants'
import { generate } from '../../generators/index'
import { planSystemPrompt } from './prompts/system'
import { buildPlanUserTurn } from './prompts/user'

const MAX_TOKENS = 4000
const TEMPERATURE = 0.2

function readStateMachine (outDir: string): StateMachine[] {
  const path = resolve(outDir, FILES.STATE_MACHINE)
  if (!existsSync(path)) return []
  return JSON.parse(readFileSync(path, 'utf8'))
}

export async function runPlan (outDir: string, model: string): Promise<void> {
  const probe: ProbePageResult[] = JSON.parse(
    readFileSync(resolve(outDir, FILES.PROBE), 'utf8')
  )
  const machines = readStateMachine(outDir)

  const text = await generate({
    model,
    system: planSystemPrompt,
    userTurn: buildPlanUserTurn(probe, machines),
    maxTokens: MAX_TOKENS,
    temperature: TEMPERATURE
  })

  const out = resolve(outDir, FILES.PLAN)
  writeFileSync(out, text)
  console.log(LOG.PLAN_DONE(out))
}
