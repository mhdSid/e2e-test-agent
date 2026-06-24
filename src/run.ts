import type { PipelineOptions } from './core/types'
import { LOG } from './core/constants'
import { resolveAdapter } from './adapters/index'
import { runProbe } from './orchestrators/probe/index'
import { runStateMachine } from './orchestrators/state-machine/index'
import { runPlan } from './orchestrators/plan/index'
import { runGenerate } from './orchestrators/generate/index'
import { runGate } from './orchestrators/gate/index'
import { runRepair } from './orchestrators/repair/index'

const MAX_REPAIR_ATTEMPTS = 2

export async function run (opts: PipelineOptions): Promise<void> {
  const adapter = resolveAdapter(opts.adapter)

  console.log(LOG.STAGE('probe'))
  await runProbe(opts.baseUrl, opts.outDir, adapter)

  console.log(LOG.STAGE('statemachine'))
  runStateMachine(opts.outDir, adapter)

  if (!opts.skipPlan) {
    console.log(LOG.STAGE('plan'))
    await runPlan(opts.outDir, opts.model)
  }

  if (!opts.skipGenerate) {
    console.log(LOG.STAGE('generate'))
    await runGenerate(opts.outDir, opts.model, opts.baseUrl)
  }

  let attempt = 0

  while (attempt <= MAX_REPAIR_ATTEMPTS) {
    console.log(LOG.STAGE(`gate (attempt ${attempt + 1})`))
    const result = runGate(opts.outDir)

    if (result.passed) return

    if (attempt === MAX_REPAIR_ATTEMPTS) {
      process.exitCode = 1
      return
    }

    const failed = result.checks.filter((c) => !c.passed)
    console.log(LOG.STAGE(`repair (attempt ${attempt + 1})`))
    const outcome = await runRepair(opts.outDir, opts.model, failed)

    if (outcome === 'needs-investigation') {
      process.exitCode = 1
      return
    }

    attempt++
  }
}
