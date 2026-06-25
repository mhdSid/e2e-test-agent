import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Row { id: number; name: string; revenue: number; region: string }

export const useDashboardStore = defineStore('dashboard', () => {
  const rows = ref<Row[]>([])
  const loading = ref(false)
  const selectedRegion = ref<string>('')
  const dateFrom = ref<string>('')
  const error = ref<string | null>(null)

  const filtered = computed(() =>
    selectedRegion.value
      ? rows.value.filter((r) => r.region === selectedRegion.value)
      : rows.value
  )
  const isEmpty = computed(() => filtered.value.length === 0)
  const hasError = computed(() => error.value !== null)
  const totalRevenue = computed(() => filtered.value.reduce((s, r) => s + r.revenue, 0))

  function setRegion(r: string): void { selectedRegion.value = r }
  return { rows, loading, selectedRegion, dateFrom, error, filtered, isEmpty, hasError, totalRevenue, setRegion }
})
