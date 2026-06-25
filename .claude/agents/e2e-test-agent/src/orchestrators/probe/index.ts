import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { chromium, type Browser, type Page } from 'playwright'
import type { Adapter, ProbePageResult } from '../../core/types'
import { LOG, FILES } from '../../core/constants'

const RENDER_TIMEOUT_MS = 8000

type PageFacts = Pick<ProbePageResult, 'heading' | 'testids' | 'forms'>

/**
 * Extract the live, client-rendered DOM facts in the page context.
 * A raw HTTP GET against a Vue SPA returns only the empty `<div id="app">`
 * shell — every selector is rendered by JavaScript, so the probe must run a
 * real browser. `text` is the element's OWN text (direct text nodes only), so
 * leaf selectors yield exact assertion values and containers yield "".
 *
 * Passed to page.evaluate AS A STRING on purpose: tsx/esbuild rewrites inline
 * functions with a `__name` helper that does not exist in the browser context,
 * so a transpiled closure throws `__name is not defined`. A string is evaluated
 * verbatim by the browser and sidesteps that entirely.
 */
// Some apps (e.g. Gora's directive-testable) render `data-test-id` by default and only
// emit `data-testid` when explicitly enabled — so the probe must read BOTH attributes,
// preferring data-testid where present. Querying both keeps the captured inventory aligned
// with whichever attribute the app actually emits; the gate validates against the real DOM.
const TESTID_SELECTOR = '[data-testid], [data-test-id]'
const EXTRACT_SCRIPT = `(() => {
  const clean = (s) => (s || '').replace(/\\s+/g, ' ').trim().slice(0, 120)
  const ownText = (el) => clean(
    Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join('')
  )
  const testid = (el) => el.getAttribute('data-testid') || el.getAttribute('data-test-id')
  const testids = Array.from(document.querySelectorAll('${TESTID_SELECTOR}')).map((el) => ({
    testid: testid(el),
    text: ownText(el)
  }))
  const forms = Array.from(document.querySelectorAll('form')).map((form) => {
    const inputs = Array.from(form.querySelectorAll('input, textarea, select')).map((i) => ({
      name: i.getAttribute('name'),
      type: i.getAttribute('type') || i.tagName.toLowerCase(),
      placeholder: i.getAttribute('placeholder'),
      testid: testid(i),
      required: i.hasAttribute('required')
    }))
    const submitEl = form.querySelector('[type="submit"]')
    return {
      action: form.getAttribute('action'),
      method: (form.getAttribute('method') || 'GET').toUpperCase(),
      inputs,
      submit: submitEl ? testid(submitEl) : null
    }
  })
  const h1 = document.querySelector('h1')
  return { heading: clean(h1 ? h1.textContent : ''), testids, forms }
})()`

function extractPage (page: Page): Promise<PageFacts> {
  return page.evaluate(EXTRACT_SCRIPT) as Promise<PageFacts>
}

async function probeRoute (browser: Browser, baseUrl: string, name: string, path: string): Promise<ProbePageResult> {
  const page = await browser.newPage()
  try {
    const response = await page.goto(baseUrl + path, { waitUntil: 'networkidle' })
    // Wait for the SPA to actually mount something before reading the DOM.
    await page.waitForSelector(TESTID_SELECTOR, { timeout: RENDER_TIMEOUT_MS }).catch(() => undefined)
    const { heading, testids, forms } = await extractPage(page)
    return {
      route: name,
      path,
      statusCode: response?.status() ?? 0,
      heading,
      testids,
      forms
    }
  } finally {
    await page.close()
  }
}

export async function runProbe (
  baseUrl: string,
  outDir: string,
  adapter: Adapter
): Promise<void> {
  const results: ProbePageResult[] = []
  const browser = await chromium.launch()

  try {
    for (const route of adapter.routes) {
      try {
        const result = await probeRoute(browser, baseUrl, route.name, route.path)
        results.push(result)
        console.log(LOG.PROBE_OK(route.path, result.testids.length))
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(LOG.PROBE_ERR(route.path, msg))
        results.push({
          route: route.name,
          path: route.path,
          statusCode: 0,
          heading: '',
          testids: [],
          forms: [],
          error: msg
        })
      }
    }
  } finally {
    await browser.close()
  }

  const out = resolve(outDir, FILES.PROBE)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, JSON.stringify(results, null, 2))
  console.log(LOG.PROBE_DONE(out))
}
