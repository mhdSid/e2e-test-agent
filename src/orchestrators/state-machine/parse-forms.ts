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

/** The handler bound to `@submit` on a <form>, if any. */
function getSubmitHandler (node: any): string | null {
  const onSubmit = (node.props ?? []).find(
    (p: any) => p.name === DIRECTIVES.ON && p.arg?.content === 'submit'
  )
  return onSubmit?.exp?.content ? analyzeExpression(onSubmit.exp.content).roots[0] ?? null : null
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
 * The field↔error link is a structural symbol match (the error guard reads the same
 * symbol the field binds); `roots` are the signals the guard reads (e.g. `errors`),
 * which feed the structural validation-role detection — no `errors.(\w+)` regex.
 */
function findErrorElements (node: any, out: { testid: string; symbol: string; roots: string[] }[]): void {
  if (node.type === NODE_TYPE.ELEMENT) {
    const testid = getTestid(node)
    const cond = getIfCondition(node)
    if (testid && cond) {
      const symbol = bindingSymbol(cond)
      if (symbol) out.push({ testid, symbol, roots: analyzeExpression(cond).roots })
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

export function parseForms (
  templateContent: string,
  handlerNavigations: Record<string, string[]> = {}
): FormState[] {
  const ast = parse(templateContent)
  const formNodes: any[] = []
  for (const child of ast.children ?? []) findForms(child, formNodes)

  return formNodes.map((formNode) => {
    const fieldNodes: any[] = []
    findFields(formNode, fieldNodes)

    const errors: { testid: string; symbol: string; roots: string[] }[] = []
    findErrorElements(formNode, errors)

    const allFields: ValidationField[] = fieldNodes.map((input) => {
      const symbol = bindingSymbol(getModel(input)) ?? getTestid(input) ?? 'unknown'
      const errorTestid = errors.find((e) => e.symbol === symbol)?.testid ?? null
      return {
        testid: getTestid(input) ?? 'unknown',
        name: symbol,
        required: isRequired(input),
        errorTestid
      }
    })

    // a real validation field has a schema-backed error element OR a required flag.
    // inputs with neither (e.g. a coupon box) are not part of the validation contract.
    const fields = allFields.filter((f) => f.errorTestid !== null || f.required)

    const submit = findSubmit(formNode)
    const submitHandler = getSubmitHandler(formNode)
    const submitNavigatesTo = submitHandler ? handlerNavigations[submitHandler]?.[0] ?? null : null

    // Structural validation role: the signals that gate the submit (:disabled) or drive
    // an error element. The graph turns these into `validation` provenance — no keywords.
    const gateRoots = submit.gate ? analyzeExpression(submit.gate).roots : []
    const errorRoots = errors.flatMap((e) => e.roots)
    const validationRoots = [...new Set([...gateRoots, ...errorRoots])]

    return {
      formTestid: getTestid(formNode) ?? 'form',
      submitTestid: submit.testid,
      submitGatedBy: submit.gate,
      submitNavigatesTo,
      validated: errors.length > 0 || submit.gate !== null,
      validationRoots,
      fields
    }
  })
}
