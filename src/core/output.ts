/**
 * Defensive cleanup for model-produced source files. We ask for raw file content
 * (no fences), but strip a stray ```ts / ``` wrapper if one slips through so the
 * spec is always written as runnable code.
 */
export function stripCodeFences (text: string): string {
  const trimmed = text.trim()
  const fenced = trimmed.match(/^```[a-zA-Z]*\s*\n([\s\S]*?)\n```$/)
  const body = fenced ? fenced[1] : trimmed
  return `${body.trim()}\n`
}
