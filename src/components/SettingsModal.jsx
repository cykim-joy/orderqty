import { useState } from 'react'
import { X, Plus, Trash2, Settings } from 'lucide-react'

export default function SettingsModal({ settings, setSettings, onClose }) {
  const [draft, setDraft] = useState(JSON.parse(JSON.stringify(settings)))
  const [inputs, setInputs] = useState({ squads: '', salesChannels: '', orderStatuses: '' })

  const addItem = (key) => {
    const val = inputs[key].trim()
    if (!val) return
    if (draft[key].includes(val)) return
    setDraft(prev => ({ ...prev, [key]: [...prev[key], val] }))
    setInputs(prev => ({ ...prev, [key]: '' }))
  }

  const removeItem = (key, item) => {
    setDraft(prev => ({ ...prev, [key]: prev[key].filter(i => i !== item) }))
  }

  const handleSave = () => {
    setSettings(draft)
    onClose()
  }

  const SECTIONS = [
    { key: 'squads', label: '스쿼드 목록', placeholder: '새 스쿼드 이름 입력', color: 'blue' },
    { key: 'salesChannels', label: '판매처 코드 목록', placeholder: '새 판매처 코드 입력', color: 'purple' },
    { key: 'orderStatuses', label: '발주 현황 목록', placeholder: '새 발주 현황 항목 입력', color: 'green' },
  ]

  const BADGE_COLORS = {
    blue: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
    green: 'bg-green-100 text-green-700',
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-500" />
            <h3 className="text-base font-semibold text-gray-900">드롭다운 설정</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {SECTIONS.map(({ key, label, placeholder, color }) => (
            <div key={key}>
              <h4 className="text-sm font-semibold text-gray-800 mb-3">{label}</h4>

              {/* Add Input */}
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={inputs[key]}
                  onChange={e => setInputs(prev => ({ ...prev, [key]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addItem(key)}
                  placeholder={placeholder}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-300"
                />
                <button
                  onClick={() => addItem(key)}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Items */}
              <div className="space-y-1.5">
                {draft[key].length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">항목이 없습니다. 위에서 추가하세요.</p>
                ) : (
                  draft[key].map(item => (
                    <div key={item} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded-lg">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${BADGE_COLORS[color]}`}>
                        {item}
                      </span>
                      <button
                        onClick={() => removeItem(key, item)}
                        className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50">취소</button>
          <button onClick={handleSave} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">저장</button>
        </div>
      </div>
    </div>
  )
}
