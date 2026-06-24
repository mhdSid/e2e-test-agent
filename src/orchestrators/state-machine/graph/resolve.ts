import { existsSync } from 'fs'
import { resolve, dirname, extname } from 'path'

const ALIAS_FALLBACKS = ['@/', '~/']
const EXTS = ['.vue', '.ts', '.js']

/**
 * Resolve an import specifier to a real file path: relative imports against the
 * importer, bare specifiers against configured monorepo aliases (with a `@/`→src
 * fallback). Returns null for unresolvable (external/compiled) modules. This is the
 * interprocedural seam — what lets us follow signals/components into local sources.
 */
export function resolveModule (
  spec: string,
  importerFile: string,
  aliases: Record<string, string> = {}
): string | null {
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
          base = resolve(`${importerFile.split('/src/')[0]}/src`, spec.slice(fb.length))
          break
        }
      }
    }
  }

  if (!base) return null
  const candidates = extname(base)
    ? [base]
    : [...EXTS.map((e) => base + e), ...EXTS.map((e) => resolve(base as string, `index${e}`))]
  return candidates.find(existsSync) ?? null
}
