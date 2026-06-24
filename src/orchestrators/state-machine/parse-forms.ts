import { parse } from '@vue/compiler-dom'
import type { FormState, ValidationField } from './types'
import { analyzeExpression } from './graph/expression'
import { NODE_TYPE, DIRECTIVES, TESTID_ATTR } from './constants'

function getTestid (node: any): string | null {
  return node.props?.find((p: any) => p.name === TESTID_ATTR)?.value?.content ?? null
}

function getModel (node: any): string | null {
  return (node.props ?? []).find((p: any) => p.name === DIRECTIVES.MODEL)?.exp?.content ?? null
}

function isRequired (node: any): boolean {
  return (node.props ?? []).some((p: any) => p.name === 'required')
}

function getIfCondition (node: any): string | null {
  return (node.props ?? []).find((p: any) => p.name === DIRECTIVES.IF)?.exp?.content ?? null
}

/** The symbol a binding/guard hinges on — the leaf of a member access, else the root. */
function bindingSymbol (expr: string | null): string | null {
  if (!expr) return null
  const refs = analyzeExpression(expr)
  return refs.accesses[0]?.leaf ?? refs.roots[0] ?? null
}

/** A field is any element with v-model — not a hard-coded tag list. */
function findFields (node: any, out: any[]): void {
  if (node.type === NODE_TYPE.ELEMENT && getModel(node)) out.push(node)
  for (const child of node.children ?? []) findFields(child, out)
}

/**
 * Error elements: any element with a testid whose v-if guard hinges on a symbol.
 * The field↔error link is then a structural symbol match (the error guard reads the
 * same symbol the field binds) — no `errors.(\w+)` regex, no library-name matching.
 */
function findErrorElements (node: any, out: { testid: string; symbol: string }[]): void {
  if (node.type === NODE_TYPE.ELEMENT) {
    const testid = getTestid(node)
    const cond = getIfCondition(node)
    if (testid && cond) {
      const symbol = bindingSymbol(cond)
      if (symbol) out.push({ testid, symbol })
    }
  }
  for (const child of node.children ?? []) findErrorElements(child, out)
}

function findForms (node: any, forms: any[]): void {
  if (node.type === NODE_TYPE.ELEMENT && (node.tag === 'form' || node.tag === 'Form')) forms.push(node)
  for (const child of node.children ?? []) findForms(child, forms)
}

function findSubmit (node: any): { testid: string | null; gate: string | null } {
  if (node.type === NODE_TYPE.ELEMENT) {
    const isSubmit = (node.props ?? []).some(
      (p: any) => p.name === 'type' && p.value?.content === 'submit'
    )
    if (isSubmit) {
      const gateProp = (node.props ?? []).find(
        (p: any) => p.name === DIRECTIVES.BIND && p.arg?.content === 'disabled'
      )
      return { testid: getTestid(node), gate: gateProp?.exp?.content ?? null }
    }
  }
  for (const child of node.children ?? []) {
    const found = findSubmit(child)
    if (found.testid) return found
  }
  return { testid: null, gate: null }
}

export function parseForms (templateContent: string): FormState[] {
  const ast = parse(templateContent)
  const formNodes: any[] = []
  for (const child of ast.children ?? []) findForms(child, formNodes)

  return formNodes.map((formNode) => {
    const fieldNodes: any[] = []
    findFields(formNode, fieldNodes)

    const errors: { testid: string; symbol: string }[] = []
    findErrorElements(formNode, errors)

    const fields: ValidationField[] = fieldNodes.map((input) => {
      const symbol = bindingSymbol(getModel(input)) ?? getTestid(input) ?? 'unknown'
      return {
        testid: getTestid(input) ?? 'unknown',
        name: symbol,
        required: isRequired(input),
        errorTestid: errors.find((e) => e.symbol === symbol)?.testid ?? null,
        states: ['untouched', 'invalid', 'valid']
      }
    })

    const submit = findSubmit(formNode)

    return {
      formTestid: getTestid(formNode) ?? 'form',
      submitTestid: submit.testid,
      submitGatedBy: submit.gate,
      fields
    }
  })
}
