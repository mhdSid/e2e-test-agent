/**
 * Raw rules injected verbatim into system prompts.
 * Kept here so orchestrators compose them without restating.
 * Each rule is a self-contained string — no prose, no examples.
 */

export const SELECTOR_RULES = [
  'Every getByTestId() selector must exist in the probe. Never invent a selector.',
  'Do not use CSS selectors, XPath, or text-based locators. Use getByTestId() only.'
] as const

export const ASSERTION_RULES = [
  'Every test must have at least one value assertion: toHaveText / toContainText / toHaveCount / toHaveAttribute / toHaveURL / toBeChecked.',
  'Never use toBeTruthy, toBeDefined, or toBeVisible as the sole assertion.',
  'Assert exact values observed in the probe. Never use placeholder text or invented strings.',
  'A boolean HTML attribute (required, disabled, checked, readonly) renders with an empty value. Assert toHaveAttribute("required", "") — never "true".',
  'When an element interpolates a runtime value next to a static label, assert toContainText on a stable substring, or toHaveText only when you supplied the value yourself.',
  'One behavior per test. Do not bundle unrelated assertions.'
] as const

export const STRUCTURE_RULES = [
  'One test per scenario in the test plan. Match the plan 1:1. Do not generate extra tests.',
  'Group tests in describe blocks matching the route or feature from the plan.',
  'Use @playwright/test only. No other test frameworks or assertion libraries.'
] as const

export const OUTPUT_RULES = [
  'Output only the file content. No markdown fences. No commentary. No explanations.',
  'The output must compile and run as written with zero modifications.'
] as const

export const MOUNT_RULES = [
  'When filling forms, use values that exercise the behavior under test — not placeholder text.',
  'When testing POST-response pages, fill and submit the form rather than navigating directly.'
] as const

export function composeRules (...groups: readonly (readonly string[])[]): string {
  return groups
    .flatMap((group) => group)
    .map((rule) => `- ${rule}`)
    .join('\n')
}
