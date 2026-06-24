#!/usr/bin/env tsx
import { Command } from 'commander'
import { resolveAdapter } from '../adapters/index'
import { runProbe } from '../orchestrators/probe/index'
import { runStateMachine } from '../orchestrators/state-machine/index'
import { runPlan } from '../orchestrators/plan/index'
import { runGenerate } from '../orchestrators/generate/index'
import { runGate } from '../orchestrators/gate/index'
import { run } from '../run'
import {
  VERSION,
  PROGRAM_NAME,
  COMMANDS,
  DESCRIPTIONS,
  OPTIONS
} from '../core/constants'

const program = new Command()

program
  .name(PROGRAM_NAME)
  .description(DESCRIPTIONS.PROGRAM)
  .version(VERSION)

program
  .command(COMMANDS.PROBE)
  .description(DESCRIPTIONS.PROBE)
  .option(OPTIONS.BASE_URL, OPTIONS.BASE_URL_DESC, OPTIONS.BASE_URL_DEFAULT)
  .option(OPTIONS.OUT_DIR, OPTIONS.OUT_DIR_DESC, OPTIONS.OUT_DIR_DEFAULT)
  .option(OPTIONS.ADAPTER, OPTIONS.ADAPTER_DESC, OPTIONS.ADAPTER_DEFAULT)
  .action(async (opts: { baseUrl: string; outDir: string; adapter: string }) => {
    await runProbe(opts.baseUrl, opts.outDir, resolveAdapter(opts.adapter))
  })

program
  .command(COMMANDS.STATE_MACHINE)
  .description(DESCRIPTIONS.STATE_MACHINE)
  .option(OPTIONS.OUT_DIR, OPTIONS.OUT_DIR_DESC, OPTIONS.OUT_DIR_DEFAULT)
  .option(OPTIONS.ADAPTER, OPTIONS.ADAPTER_DESC, OPTIONS.ADAPTER_DEFAULT)
  .action((opts: { outDir: string; adapter: string }) => {
    runStateMachine(opts.outDir, resolveAdapter(opts.adapter))
  })

program
  .command(COMMANDS.PLAN)
  .description(DESCRIPTIONS.PLAN)
  .option(OPTIONS.OUT_DIR, OPTIONS.OUT_DIR_DESC, OPTIONS.OUT_DIR_DEFAULT)
  .option(OPTIONS.MODEL, OPTIONS.MODEL_DESC, OPTIONS.MODEL_DEFAULT)
  .action(async (opts: { outDir: string; model: string }) => {
    await runPlan(opts.outDir, opts.model)
  })

program
  .command(COMMANDS.GENERATE)
  .description(DESCRIPTIONS.GENERATE)
  .option(OPTIONS.BASE_URL, OPTIONS.BASE_URL_DESC, OPTIONS.BASE_URL_DEFAULT)
  .option(OPTIONS.OUT_DIR, OPTIONS.OUT_DIR_DESC, OPTIONS.OUT_DIR_DEFAULT)
  .option(OPTIONS.MODEL, OPTIONS.MODEL_DESC, OPTIONS.MODEL_DEFAULT)
  .action(async (opts: { baseUrl: string; outDir: string; model: string }) => {
    await runGenerate(opts.outDir, opts.model, opts.baseUrl)
  })

program
  .command(COMMANDS.GATE)
  .description(DESCRIPTIONS.GATE)
  .option(OPTIONS.OUT_DIR, OPTIONS.OUT_DIR_DESC, OPTIONS.OUT_DIR_DEFAULT)
  .action((opts: { outDir: string }) => {
    const result = runGate(opts.outDir)
    if (!result.passed) process.exitCode = 1
  })

program
  .command(COMMANDS.RUN)
  .description(DESCRIPTIONS.RUN)
  .option(OPTIONS.BASE_URL, OPTIONS.BASE_URL_DESC, OPTIONS.BASE_URL_DEFAULT)
  .option(OPTIONS.OUT_DIR, OPTIONS.OUT_DIR_DESC, OPTIONS.OUT_DIR_DEFAULT)
  .option(OPTIONS.MODEL, OPTIONS.MODEL_DESC, OPTIONS.MODEL_DEFAULT)
  .option(OPTIONS.ADAPTER, OPTIONS.ADAPTER_DESC, OPTIONS.ADAPTER_DEFAULT)
  .option(OPTIONS.SKIP_PLAN, OPTIONS.SKIP_PLAN_DESC)
  .option(OPTIONS.SKIP_GENERATE, OPTIONS.SKIP_GENERATE_DESC)
  .action(async (opts: {
    baseUrl: string
    outDir: string
    model: string
    adapter: string
    skipPlan: boolean
    skipGenerate: boolean
  }) => {
    await run({
      baseUrl: opts.baseUrl,
      outDir: opts.outDir,
      model: opts.model,
      adapter: opts.adapter,
      skipPlan: opts.skipPlan ?? false,
      skipGenerate: opts.skipGenerate ?? false
    })
  })

program.parseAsync(process.argv).catch((err: Error) => {
  console.error(err.message)
  process.exitCode = 1
})
