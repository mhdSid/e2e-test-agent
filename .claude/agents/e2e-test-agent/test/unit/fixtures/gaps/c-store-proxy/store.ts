// Self-contained Pinia-shaped store: moduleDefinesStore follows the import graph and
// only checks the source defines a store (text 'defineStore'), not where it comes from.
function defineStore (id: string, setup: () => unknown): () => unknown {
  return setup
}

export const useQuxStore = defineStore('qux', () => ({ bar: [] as number[] }))
