// Self-contained Pinia-shaped store (defineStore is stubbed; the extractor follows the
// import graph and reads state()/getters structurally, not by where defineStore comes from).
function defineStore<T> (id: string, opts: T): T {
  return opts
}

interface Lesson {
  id: number
  name: string
  imageUrl: string
}

export const useLessonStore = defineStore('lesson', {
  state: () => ({
    recommendedLessonList: [] as Lesson[],
    count: 0,
    region: '',
    ready: false,
    status: 'idle' as 'idle' | 'confirmed' | 'pending'
  }),
  getters: {
    hasLesson: (state) => state.recommendedLessonList.length > 0,
    isConfirmed: (state) => state.status === 'confirmed'
  }
})
