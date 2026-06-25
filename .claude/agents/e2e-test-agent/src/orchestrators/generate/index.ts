import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import type { ProbePageResult } from '../../core/types'
import type { StateMachine } from '../state-machine/types'
import { FILES, LOG } from '../../core/constants'
import { stripCodeFences } from '../../core/output'
import { generate } from '../../generators/index'
import { generateSystemPrompt } from './prompts/system'
import { buildGenerateUserTurn } from './prompts/user'

const MAX_TOKENS = 8000
const TEMPERATURE = 0.2

function readStateMachine (outDir: string): StateMachine[] {
  const path = resolve(outDir, FILES.STATE_MACHINE)
  if (!existsSync(path)) return []
  return JSON.parse(readFileSync(path, 'utf8'))
}

export async function runGenerate (
  outDir: string,
  model: string,
  baseUrl: string
): Promise<void> {
  const planMd = readFileSync(resolve(outDir, FILES.PLAN), 'utf8')
  const probe: ProbePageResult[] = JSON.parse(
    readFileSync(resolve(outDir, FILES.PROBE), 'utf8')
  )
  const machines = readStateMachine(outDir)

  const spec = await generate({
    model,
    system: generateSystemPrompt,
    userTurn: buildGenerateUserTurn(planMd, probe, machines, baseUrl),
    maxTokens: MAX_TOKENS,
    temperature: TEMPERATURE
  })

  const out = resolve(outDir, FILES.SPEC)
  writeFileSync(out, stripCodeFences(spec))
  console.log(LOG.GEN_DONE(out))
}
