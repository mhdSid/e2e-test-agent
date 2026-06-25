// Uses useRouter (navigation) but NOT useRoute (route state). The word-boundary match in
// moduleReadsRoute must NOT taint these bindings to `route` just because 'useRouter'
// contains the substring 'useRoute'.
function useRouter (): { push: (p: string) => void } {
  return { push () {} }
}
function ref<T> (v: T): { value: T } {
  return { value: v }
}

export function useNav (): { open: { value: boolean }; go: () => void } {
  const router = useRouter()
  const open = ref(false)
  function go (): void {
    router.push('/x')
  }
  return { open, go }
}
