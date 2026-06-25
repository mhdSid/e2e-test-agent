// The single network helper for the api layer (no separate dai-core). `get(apiUrl, request,
// opts)` is the call shape the seed scanner keys on — its return type is the endpoint's
// Response type. At runtime it issues a real GET (request → query string) so a Playwright
// client mock or the Node SSR proxy can intercept and return the seeded body.
export interface RequestOptions {
  auth?: boolean
  disableVerifyUser?: boolean
}

export async function get<T> (apiUrl: string, request: Record<string, unknown>, opts?: RequestOptions | false): Promise<T> {
  void opts
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(request)) {
    if (value !== undefined && value !== null) params.set(key, String(value))
  }
  const qs = params.toString()
  const res = await fetch(qs ? `${apiUrl}?${qs}` : apiUrl)
  return await res.json() as T
}
