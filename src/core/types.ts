export interface ProbeTestId {
  testid: string
  text: string
}

export interface ProbeFormInput {
  name: string | null
  type: string
  placeholder: string | null
  testid: string | null
  required: boolean
}

export interface ProbeForm {
  action: string | null
  method: string
  inputs: ProbeFormInput[]
  submit: string | null
}

export interface ProbePageResult {
  route: string
  path: string
  statusCode: number
  heading: string
  testids: ProbeTestId[]
  forms: ProbeForm[]
  note?: string
  error?: string
}

export interface AdapterRoute {
  name: string
  path: string
  /** SFC this route renders — parsed into a deterministic state machine (ground truth). */
  sfc?: string
}

export interface AdapterJourneyPost {
  name: string
  path: string
  body: Record<string, string>
}

export interface Adapter {
  routes: readonly AdapterRoute[]
  journeyPosts: readonly AdapterJourneyPost[]
  /**
   * Import aliases for auto-resolving component sources in a monorepo, e.g.
   * { '@/': 'example/src', '@gora/design-system': 'packages/design-system/src' }.
   * Components that resolve to a real file get an SFC-derived contract; the rest
   * fall back to convention-derived contracts. No hand-maintained manifest.
   */
  aliases?: Readonly<Record<string, string>>
}

export interface GateCheck {
  name: string
  passed: boolean
  detail: string
}

export interface GateResult {
  passed: boolean
  checks: GateCheck[]
}

export interface GeneratorRequest {
  model: string
  system: string
  userTurn: string
  prefill?: string
  maxTokens: number
  temperature: number
}

export interface PipelineOptions {
  baseUrl: string
  outDir: string
  model: string
  adapter: string
  skipPlan: boolean
  skipGenerate: boolean
}
