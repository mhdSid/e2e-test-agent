export const VEE_VALIDATE_MARKERS = [
  'useForm',
  'useField',
  'ErrorMessage',
  'defineRule',
  'toTypedSchema',
  'meta.valid',
  'meta.touched',
  'meta.dirty',
  'errors.'
] as const

export const SUBMIT_GATE_PATTERN = /:disabled="([^"]+)"/

export const FORM_TAGS = ['form', 'Form'] as const

export const FILTER_INPUT_HINTS = ['filter', 'search', 'query', 'sort', 'category'] as const

export const VALIDATION_STATES = ['untouched', 'invalid', 'valid'] as const

export const NODE_TYPE = {
  ELEMENT: 1,
  TEXT: 2,
  INTERPOLATION: 5
} as const

// @vue/compiler-dom ElementNode.tagType
export const TAG_TYPE = {
  ELEMENT: 0,
  COMPONENT: 1,
  SLOT: 2,
  TEMPLATE: 3
} as const

// @vue/compiler-dom prop node types (AttributeNode vs DirectiveNode)
export const PROP_TYPE = {
  ATTRIBUTE: 6,
  DIRECTIVE: 7
} as const

export const DIRECTIVES = {
  IF: 'if',
  ELSE_IF: 'else-if',
  ELSE: 'else',
  MODEL: 'model',
  ON: 'on',
  BIND: 'bind'
} as const

export const TESTID_ATTR = 'data-testid'

// Framework components that carry no app state — excluded from contract derivation.
export const FRAMEWORK_COMPONENTS = [
  'RouterLink', 'RouterView', 'router-link', 'router-view',
  'Transition', 'TransitionGroup', 'KeepAlive', 'Teleport', 'Suspense',
  'component', 'Component', 'slot', 'template'
] as const
