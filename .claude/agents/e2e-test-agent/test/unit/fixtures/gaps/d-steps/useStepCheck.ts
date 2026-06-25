// A composable whose state derives from the route (route.query.step). The bindings
// it returns must classify as `route` provenance — moduleReadsRoute follows the
// import graph and detects this source reads `useRoute`.
function useRoute (): { query: Record<string, string> } {
  return { query: {} }
}
function computed<T> (fn: () => T): { value: T } {
  return { value: fn() }
}

export function useStepCheck (): { isStep1: { value: boolean }; isStep2: { value: boolean } } {
  const route = useRoute()
  return {
    isStep1: computed(() => route.query.step === '1'),
    isStep2: computed(() => route.query.step === '2')
  }
}
