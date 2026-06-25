// A store-proxy composable: wraps a Pinia store in get/set accessors. The store
// flows in as a call argument — provenance must taint through to `store`.
export default function gen (store: { bar: number[] }): { bar: { value: number[] } } {
  return {
    bar: {
      get value () {
        return store.bar
      }
    }
  }
}
