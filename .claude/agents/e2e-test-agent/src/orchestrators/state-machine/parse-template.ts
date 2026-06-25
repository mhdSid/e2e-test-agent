import { parse } from '@vue/compiler-dom'
import type { StateNode, ComponentUsage, ComponentProp, StateRecipe } from './types'
import type { Provenance } from './graph/types'
import { analyzeExpression } from './graph/expression'
import { NODE_TYPE, TAG_TYPE, PROP_TYPE, DIRECTIVES, TESTID_ATTR, FRAMEWORK_COMPONENTS } from './constants'

/** A guard → provenance classifier, injected so parse-template stays graph-agnostic. */
type Classify = (condition: string) => Provenance

/** Negate a comparison so an `else` carries the recipe that makes its sibling `if` false. */
function negateRecipe (recipe: StateRecipe[]): StateRecipe[] {
  const flip: Record<string, string> = {
    '===': '!==', '!==': '===', '==': '!=', '!=': '==',
    '>': '<=', '>=': '<', '<': '>=', '<=': '>',
    truthy: 'falsy', falsy: 'truthy'
  }
  return recipe.map((c) => ({ ...c, operator: flip[c.operator] ?? c.operator }))
}

interface ParsedTemplate {
  states: StateNode[]
  components: ComponentUsage[]
  allTestids: string[]
  /** testid → static literal text around interpolations, e.g. "Name:" for `Name: {{ x }}`. */
  texts: Record<string, string>
}

type IfKind = 'if' | 'else-if' | 'else'

// Per-parse config: a directive (e.g. 'testable') that renders to data-testid at runtime.
let testidDirective = 'testable'

function stripQuotes (s: string): string {
  return s.replace(/^['"`]|['"`]$/g, '')
}

/**
 * The testid for a node: a literal `data-testid` attribute (unchanged, current behavior)
 * OR the configured directive (`v-testable="'x'"` → "x"). Both supported so apps using
 * either convention work; the directive value is taken 1:1, matching the runtime DOM.
 */
function getTestid (node: any): string | null {
  const attr = node.props?.find((p: any) => p.name === TESTID_ATTR)?.value?.content
  if (attr) return attr
  if (testidDirective) {
    const dir = node.props?.find((p: any) => p.type === PROP_TYPE.DIRECTIVE && p.name === testidDirective)
    const raw = dir?.exp?.content ?? dir?.arg?.content
    if (raw) return stripQuotes(raw)
  }
  return null
}

function getIfDirective (node: any): { kind: IfKind; condition: string } | null {
  for (const prop of node.props ?? []) {
    if (prop.name === DIRECTIVES.IF) return { kind: 'if', condition: prop.exp?.content ?? '' }
    if (prop.name === DIRECTIVES.ELSE_IF) return { kind: 'else-if', condition: prop.exp?.content ?? '' }
    if (prop.name === DIRECTIVES.ELSE) return { kind: 'else', condition: '' }
  }
  return null
}

function hasConditional (node: any): boolean {
  return getIfDirective(node) !== null
}

function isWhitespaceText (node: any): boolean {
  return node.type === NODE_TYPE.TEXT && (node.content ?? '').trim() === ''
}

/**
 * Collect testids visible WITHIN a branch, but STOP at nested conditional
 * boundaries — a child with its own v-if/v-else is a separate sub-state,
 * not part of this branch's always-visible set.
 */
function collectScopedTestids (node: any, includeRoot: boolean): string[] {
  const ids: string[] = []

  if (!includeRoot && hasConditional(node)) return ids

  const own = getTestid(node)
  if (own) ids.push(own)

  for (const child of node.children ?? []) {
    if (hasConditional(child)) continue
    ids.push(...collectScopedTestids(child, false))
  }

  return ids
}

/**
 * Capture every prop a component is used with (static attrs, :bind, v-model).
 * Conventions decide later which props are state-bearing — here we just record
 * the raw call-site facts. Conditionals and event handlers are not props.
 */
function getComponentProps (node: any): ComponentProp[] {
  const props: ComponentProp[] = []
  for (const prop of node.props ?? []) {
    if (prop.type === PROP_TYPE.ATTRIBUTE) {
      if (prop.name === TESTID_ATTR) continue
      props.push({ name: prop.name, bound: false, value: prop.value?.content ?? null })
    } else if (prop.type === PROP_TYPE.DIRECTIVE) {
      if (prop.name === DIRECTIVES.BIND && prop.arg?.content) {
        props.push({ name: prop.arg.content, bound: true, value: prop.exp?.content ?? null })
      } else if (prop.name === DIRECTIVES.MODEL) {
        props.push({ name: prop.arg?.content ?? 'modelValue', bound: true, value: prop.exp?.content ?? null })
      }
    }
  }
  return props
}

/**
 * Collect component usages — anything @vue/compiler-dom classifies as a component
 * (tagType COMPONENT), DS-prefixed or custom, minus framework components. The old
 * code only saw G-prefixed tags; custom Pinia wrappers were invisible.
 */
function collectComponent (node: any, components: ComponentUsage[]): void {
  if (node.type !== NODE_TYPE.ELEMENT) return
  if (node.tagType !== TAG_TYPE.COMPONENT) return
  const tag: string = node.tag ?? ''
  if ((FRAMEWORK_COMPONENTS as readonly string[]).includes(tag)) return
  components.push({
    component: tag,
    testid: getTestid(node),
    props: getComponentProps(node)
  })
}

/**
 * Walk a node's children in order so that v-if / v-else-if / v-else ADJACENCY is
 * visible: a `v-if` opens a chain, following `v-else-if`/`v-else` siblings continue
 * it, and any non-conditional element closes it. Whitespace-only text between
 * branches does not break the chain (matches Vue's compiler semantics).
 *
 * Only states sharing a chainId are mutually exclusive — that is the fact the
 * scenario synthesizer relies on to decide what each state must hide.
 */
function walkChildren (
  children: any[],
  states: StateNode[],
  components: ComponentUsage[],
  depth: number,
  parentCondition: string | null,
  classify: Classify
): void {
  let currentChain: string | null = null
  let chainCondition: string | null = null
  let chainConditions: string[] = []

  for (const child of children) {
    if (isWhitespaceText(child)) continue
    if (child.type !== NODE_TYPE.ELEMENT) continue

    const ifInfo = getIfDirective(child)

    if (ifInfo) {
      if (ifInfo.kind === 'if' || currentChain === null) {
        currentChain = `chain_${states.length}`
        // remember the chain's opening discriminator so v-else-if/v-else
        // inherit the SAME provenance as the `if` they negate.
        chainCondition = ifInfo.condition
        chainConditions = [ifInfo.condition]
      } else if (ifInfo.kind === 'else-if') {
        chainConditions.push(ifInfo.condition)
      }
      const isElse = ifInfo.kind === 'else'
      const id = isElse
        ? `ELSE_${states.length}`
        : `IF_${ifInfo.condition.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}`

      // recipe: an `if`/`else-if` uses its own guard; an `else` requires EVERY
      // prior branch in the chain to be false — so negate all of them and union.
      const recipe: StateRecipe[] = isElse
        ? chainConditions.flatMap((c) => negateRecipe(analyzeExpression(c).comparisons))
        : analyzeExpression(ifInfo.condition).comparisons

      states.push({
        id,
        condition: ifInfo.condition,
        isElse,
        visibleTestids: collectScopedTestids(child, true),
        // else / else-if inherit the chain's opening condition for provenance:
        // they are flipped by the same signal as the `if`, only the value differs.
        provenance: classify(ifInfo.condition || chainCondition || parentCondition || ''),
        recipe,
        depth,
        parentCondition,
        chainId: currentChain
      })

      walkChildren(child.children ?? [], states, components, depth + 1, ifInfo.condition || parentCondition, classify)
    } else {
      currentChain = null
      chainConditions = []
      walkChildren(child.children ?? [], states, components, depth, parentCondition, classify)
    }

    collectComponent(child, components)
  }
}

function collectAll (node: any, ids: string[]): void {
  const own = getTestid(node)
  if (own) ids.push(own)
  for (const child of node.children ?? []) collectAll(child, ids)
}

/**
 * Static literal text for each testid — the parts NOT inside {{ interpolation }}.
 * The probe captures runtime text only for states it can reach; this gives the
 * generator the literal label (e.g. "Name:") for states it cannot, so an
 * assertion becomes "Name: Alice" instead of a guessed "Alice".
 */
function collectTexts (node: any, texts: Record<string, string>): void {
  if (node.type === NODE_TYPE.ELEMENT) {
    const id = getTestid(node)
    if (id) {
      const literal = (node.children ?? [])
        .filter((c: any) => c.type === NODE_TYPE.TEXT)
        .map((c: any) => c.content ?? '')
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (literal) texts[id] = literal
    }
  }
  for (const child of node.children ?? []) collectTexts(child, texts)
}

export function parseTemplate (
  templateContent: string,
  classify: Classify = () => 'data',
  directive = 'testable'
): ParsedTemplate {
  testidDirective = directive
  const ast = parse(templateContent)
  const states: StateNode[] = []
  const components: ComponentUsage[] = []

  walkChildren(ast.children ?? [], states, components, 0, null, classify)

  const allTestids: string[] = []
  const texts: Record<string, string> = {}
  for (const child of ast.children ?? []) {
    collectAll(child, allTestids)
    collectTexts(child, texts)
  }

  return { states, components, allTestids, texts }
}
