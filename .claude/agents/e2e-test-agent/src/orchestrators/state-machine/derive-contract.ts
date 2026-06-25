import { readFileSync, existsSync } from 'fs'
import { resolve, dirname, extname } from 'path'
import { parse as parseSfc } from '@vue/compiler-sfc'
import type { ComponentUsage, ComponentContract, ComponentStateContract } from './types'
import { deriveConventionStates } from './conventions'
import { parseTemplate } from './parse-template'

/**
 * AUTO-DERIVED component contracts — no hand-maintained manifest.
 *
 * For each component used on a page we infer its state contract two ways and merge:
 *   1. Conventions — the state-bearing props bound at the call site (works for any
 *      component, including a custom Pinia wrapper).
 *   2. SFC discovery — if the component's source resolves to a real file (relative,
 *      or via a configured monorepo alias), we parse its own template and treat its
 *      internal v-if branches + its children's bound props as states.
 *
 * Opaque externals (a compiled DS package with no resolvable source) degrade to
 * convention-only. Adding a workspace alias upgrades them to SFC-derived — the
 * design scales from this demo to a monorepo without editing a table.
 */

const ALIAS_FALLBACKS = ['@/', '~/'] as const
const sfcCache = new Map<string, ComponentStateContract[]>()

function withVueExt (base: string): string[] {
  if (extname(base)) return [base]
  return [`${base}.vue`, `${base}.ts`, resolve(base, 'index.vue'), resolve(base, 'index.ts')]
}

function resolveSource (
  spec: string | undefined,
  importerFile: string,
  aliases: Record<string, string>
): string | null {
  if (!spec) return null

  let base: string | null = null

  if (spec.startsWith('.')) {
    base = resolve(dirname(importerFile), spec)
  } else {
    for (const [alias, target] of Object.entries(aliases)) {
      const prefix = alias.endsWith('/') ? alias : `${alias}/`
      if (spec === alias || spec.startsWith(prefix)) {
        base = resolve(target, spec.slice(alias.replace(/\/$/, '').length).replace(/^\//, ''))
        break
      }
    }
    if (!base) {
      for (const fb of ALIAS_FALLBACKS) {
        if (spec.startsWith(fb)) {
          const srcRoot = `${importerFile.split('/src/')[0]}/src`
          base = resolve(srcRoot, spec.slice(fb.length))
          break
        }
      }
    }
  }

  if (!base) return null
  return withVueExt(base).find(existsSync) ?? null
}

function dedupe (states: ComponentStateContract[]): ComponentStateContract[] {
  const seen = new Set<string>()
  return states.filter((s) => {
    const key = `${s.name}|${s.triggeredBy}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Parse a resolved component SFC into states: its own branches + children's state props. */
function sfcStates (sourcePath: string): ComponentStateContract[] {
  const cached = sfcCache.get(sourcePath)
  if (cached) return cached

  const states: ComponentStateContract[] = []
  try {
    const { descriptor } = parseSfc(readFileSync(sourcePath, 'utf8'))
    const { states: branches, components } = parseTemplate(descriptor.template?.content ?? '')

    for (const branch of branches) {
      if (branch.isElse) continue
      states.push({
        name: `when ${branch.condition}`,
        triggeredBy: branch.condition,
        assertion: `renders [${branch.visibleTestids.join(', ')}]`
      })
    }
    for (const child of components) {
      states.push(...deriveConventionStates(child.props))
    }
  } catch {
    // unparseable source → contribute nothing, conventions still apply
  }

  const result = dedupe(states)
  sfcCache.set(sourcePath, result)
  return result
}

export function deriveContracts (
  usages: ComponentUsage[],
  importMap: Record<string, string>,
  importerFile: string,
  aliases: Record<string, string> = {}
): ComponentContract[] {
  const byComponent = new Map<string, ComponentUsage[]>()
  for (const usage of usages) {
    const group = byComponent.get(usage.component) ?? []
    group.push(usage)
    byComponent.set(usage.component, group)
  }

  const contracts: ComponentContract[] = []

  for (const [component, group] of byComponent) {
    const convention = dedupe(group.flatMap((u) => deriveConventionStates(u.props)))
    const sourcePath = resolveSource(importMap[component], importerFile, aliases)
    const sfc = sourcePath ? sfcStates(sourcePath) : []

    const states = dedupe([...sfc, ...convention])
    if (states.length === 0) continue // layout-only component (no state to assert)

    const source = sfc.length && convention.length
      ? 'sfc+convention'
      : sfc.length ? 'sfc' : 'convention'

    contracts.push({ component, source, states })
  }

  return contracts
}
