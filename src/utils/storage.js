export const STORAGE_KEYS = {
  SKUS: 'backorder_skus',
  ENTRIES: 'backorder_entries',
  SETTINGS: 'backorder_settings',
  FEEDBACK: 'backorder_feedback',
}

export const load = (key, defaultValue) => {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch {
    return defaultValue
  }
}

export const save = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error('localStorage 저장 실패:', e)
  }
}

export const DEFAULT_SETTINGS = {
  squads: ['Squad 1', 'Squad 2'],
  salesChannels: [{ code: '판매처 코드 예시', tier: '' }],
  orderStatuses: ['미발주', '발주완료', '입고예정', '입고완료', '취소'],
}

// 기존 string[] 형식의 salesChannels를 {code, tier}[] 형식으로 마이그레이션
export const migrateSettings = (settings) => {
  if (!settings) return settings
  return {
    ...settings,
    salesChannels: (settings.salesChannels || []).map(sc =>
      typeof sc === 'string' ? { code: sc, tier: '' } : sc
    ),
  }
}
