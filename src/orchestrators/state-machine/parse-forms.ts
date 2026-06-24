import { parse } from '@vue/compiler-dom'
import type { FormState, ValidationField } from './types'
import { NODE_TYPE, DIRECTIVES, TESTID_ATTR, VEE_VALIDATE_MARKERS, SUBMIT_GATE_PATTERN } from './constants'

function getTestid (node: any): string | null {
  return node.props?.find((p: any) => p.name === TESTID_ATTR)?.value?.content ?? null
}

function hasModel (node: any): boolean {
  return (node.props ?? []).some((p: any) => p.name === DIRECTIVES.MODEL)
}

function isRequired (node: any): boolean {
  return (node.props ?? []).some((p: any) => p.name === 'required')
}

function getModelName (node: any): string {
  const model = (node.props ?? []).find((p: any) => p.name === DIRECTIVES.MODEL)
  return model?.exp?.content ?? getTestid(node) ?? 'unknown'
}

function findInputs (node: any, inputs: any[]): void {
  if (node.type === NODE_TYPE.ELEMENT) {
    const tag: string = node.tag ?? ''
    if ((tag === 'input' || tag === 'textarea' || tag === 'select' || tag.includes('Field')) && hasModel(node)) {
      inputs.push(node)
    }
  }
  for (const child of node.children ?? []) {
    findInputs(child, inputs)
  }
}

function findErrorTestids (node: any, map: Map<string, string>): void {
  if (node.type === NODE_TYPE.ELEMENT) {
    const testid = getTestid(node)
    // <span v-if="errors.email" data-testid="error-email">
    for (const prop of node.props ?? []) {
      if (prop.name === DIRECTIVES.IF) {
        const cond: string = prop.exp?.content ?? ''
        const errMatch = cond.match(/errors\.(\w+)/)
        if (errMatch && testid) map.set(errMatch[1], testid)
      }
    }
    // <ErrorMessage name="email" />
    if ((node.tag ?? '').includes('ErrorMessage')) {
      const nameProp = (node.props ?? []).find((p: any) => p.name === 'name')
      const name = nameProp?.value?.content
      if (name && testid) map.set(name, testid)
    }
  }
  for (const child of node.children ?? []) {
    findErrorTestids(child, map)
  }
}

function findForms (node: any, forms: any[]): void {
  if (node.type === NODE_TYPE.ELEMENT) {
    const tag: string = node.tag ?? ''
    if (tag === 'form' || tag === 'Form') forms.push(node)
  }
  for (const child of node.children ?? []) {
    findForms(child, forms)
  }
}

function findSubmit (node: any): { testid: string | null; gate: string | null } {
  let result = { testid: null as string | null, gate: null as string | null }
  if (node.type === NODE_TYPE.ELEMENT) {
    const isSubmit = (node.props ?? []).some(
      (p: any) => p.name === 'type' && p.value?.content === 'submit'
    )
    if (isSubmit) {
      result.testid = getTestid(node)
      for (const prop of node.props ?? []) {
        if (prop.name === DIRECTIVES.BIND && prop.arg?.content === 'disabled') {
          result.gate = prop.exp?.content ?? null
        }
      }
      return result
    }
  }
  for (const child of node.children ?? []) {
    const found = findSubmit(child)
    if (found.testid) return found
  }
  return result
}

export function parseForms (templateContent: string, scriptContent: string): FormState[] {
  const ast = parse(templateContent)
  const formNodes: any[] = []
  for (const child of ast.children ?? []) findForms(child, formNodes)

  const usesVeeValidate = VEE_VALIDATE_MARKERS.some(
    (marker) => scriptContent.includes(marker) || templateContent.includes(marker)
  )

  return formNodes.map((formNode) => {
    const inputs: any[] = []
    findInputs(formNode, inputs)

    const errorMap = new Map<string, string>()
    findErrorTestids(formNode, errorMap)

    const fields: ValidationField[] = inputs.map((input) => {
      const name = getModelName(input)
      const cleanName = name.replace(/^form\./, '').replace(/\.value$/, '')
      return {
        testid: getTestid(input) ?? 'unknown',
        name: cleanName,
        required: isRequired(input),
        errorTestid: errorMap.get(cleanName) ?? null,
        states: ['untouched', 'invalid', 'valid']
      }
    })

    const submit = findSubmit(formNode)

    return {
      formTestid: getTestid(formNode) ?? 'form',
      submitTestid: submit.testid,
      submitGatedBy: submit.gate,
      fields,
      usesVeeValidate
    }
  })
}
