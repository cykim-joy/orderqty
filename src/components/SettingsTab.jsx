import { useState, useRef } from 'react'
import { Plus, Trash2, Settings, Upload, FileText, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react'

const BADGE_COLORS = {
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  green: 'bg-green-100 text-green-700',
}

const TIER_COLORS = ['bg-amber-100 text-amber-700', 'bg-sky-100 text-sky-700', 'bg-slate-100 text-slate-600', 'bg-rose-100 text-rose-700']
const getTierColor = (tier) => {
  if (!tier) return 'bg-gray-100 text-gray-500'
  const num = parseInt(tier.replace(/\D/g, ''), 10)
  if (!isNaN(num) && num >= 1) return TIER_COLORS[(num - 1) % TIER_COLORS.length]
  return 'bg-gray-100 text-gray-600'
}

export default function SettingsTab({ settings, setSettings }) {
  const [draft, setDraft] = useState(JSON.parse(JSON.stringify(settings)))
  const [inputs, setInputs] = useState({ squads: '', orderStatuses: '' })
  const [scInput, setScInput] = useState({ code: '', tier: '' })
  const [collapsed, setCollapsed] = useState({ squads: false, salesChannels: false, orderStatuses: false })
  const [selected, setSelected] = useState({ squads: [], salesChannels: [], orderStatuses: [] })
  const [csvStatus, setCsvStatus] = useState(null)
  const [saved, setSaved] = useState(false)
  const fileInputRef = useRef(null)

  const toggleCollapse = (key) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))

  const toggleSelect = (key, item) => {
    setSelected(prev => ({
      ...prev,
      [key]: prev[key].includes(item) ? prev[key].filter(i => i !== item) : [...prev[key], item]
    }))
  }

  const toggleSelectAll = (key, items) => {
    setSelected(prev => ({
      ...prev,
      [key]: prev[key].length === items.length ? [] : [...items]
    }))
  }

  const removeSelected = (key) => {
    setDraft(prev => ({
      ...prev,
      [key]: prev[key].filter(i => !selected[key].includes(i))
    }))
    setSelected(prev => ({ ...prev, [key]: [] }))
  }

  const addItem = (key) => {
    const val = inputs[key].trim()
    if (!val || draft[key].includes(val)) return
    setDraft(prev => ({ ...prev, [key]: [...prev[key], val] }))
    setInputs(prev => ({ ...prev, [key]: '' }))
  }

  const removeItem = (key, item) => {
    setDraft(prev => ({ ...prev, [key]: prev[key].filter(i => i !== item) }))
  }

  const addSalesChannel = () => {
    const code = scInput.code.trim()
    if (!code || draft.salesChannels.some(sc => sc.code === code)) return
    setDraft(prev => ({ ...prev, salesChannels: [...prev.salesChannels, { code, tier: scInput.tier.trim() }] }))
    setScInput({ code: '', tier: '' })
  }

  const removeSalesChannel = (code) => {
    setDraft(prev => ({ ...prev, salesChannels: prev.salesChannels.filter(sc => sc.code !== code) }))
  }

  const handleSave = () => {
    setSettings(draft)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleCsvUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const text = ev.target.result
        const lines = text.split(/\r?\n/).filter(l => l.trim())
        if (lines.length < 2) {
          setCsvStatus({ type: 'error', message: '데이터가 없습니다. 헤더 포함 2행 이상이어야 합니다.' })
          return
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/^﻿/, ''))
        const idx = {
          squads:         headers.findIndex(h => h === '스쿼드'),
          salesChannels:  headers.findIndex(h => h === '판매처코드' || h === '판매처 코드'),
          tier:           headers.findIndex(h => h === '티어'),
          orderStatuses:  headers.findIndex(h => h === '발주현황' || h === '발주 현황'),
        }

        if (Object.values(idx).every(i => i < 0)) {
          setCsvStatus({ type: 'error', message: 'CSV 헤더를 인식할 수 없습니다. "스쿼드,판매처코드,티어,발주현황" 형식으로 작성해주세요.' })
          return
        }

        const importedSquads = new Set()
        const importedChannels = new Map() // code → tier
        const importedStatuses = new Set()

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',')
          if (idx.squads >= 0) { const v = (cols[idx.squads] || '').trim(); if (v) importedSquads.add(v) }
          if (idx.salesChannels >= 0) {
            const code = (cols[idx.salesChannels] || '').trim()
            if (code && !importedChannels.has(code)) {
              importedChannels.set(code, idx.tier >= 0 ? (cols[idx.tier] || '').trim() : '')
            }
          }
          if (idx.orderStatuses >= 0) { const v = (cols[idx.orderStatuses] || '').trim(); if (v) importedStatuses.add(v) }
        }

        setDraft(prev => {
          const next = { ...prev }
          if (importedSquads.size > 0)
            next.squads = [...new Set([...prev.squads, ...importedSquads])]
          if (importedChannels.size > 0) {
            const existingCodes = new Set(prev.salesChannels.map(sc => sc.code))
            const updated = prev.salesChannels.map(sc =>
              importedChannels.has(sc.code) ? { ...sc, tier: importedChannels.get(sc.code) || sc.tier } : sc
            )
            const added = [...importedChannels.entries()]
              .filter(([code]) => !existingCodes.has(code))
              .map(([code, tier]) => ({ code, tier }))
            next.salesChannels = [...updated, ...added]
          }
          if (importedStatuses.size > 0)
            next.orderStatuses = [...new Set([...prev.orderStatuses, ...importedStatuses])]
          return next
        })

        const total = importedSquads.size + importedChannels.size + importedStatuses.size
        setCsvStatus({ type: 'success', message: `CSV에서 ${total}개 항목을 불러왔습니다. 저장 버튼을 눌러 적용하세요.` })
        setTimeout(() => setCsvStatus(null), 4000)
      } catch {
        setCsvStatus({ type: 'error', message: 'CSV 파싱 중 오류가 발생했습니다.' })
      }
    }
    reader.readAsText(file, 'UTF-8')
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
          <Settings className="w-4 h-4 text-gray-600" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900">드롭다운 설정</h2>
          <p className="text-xs text-gray-400">스쿼드, 판매처, 발주현황 항목을 관리합니다</p>
        </div>
      </div>

      {/* CSV 업로드 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-1">CSV로 일괄 가져오기</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              첫 행에 헤더 작성 후 아래 행부터 항목을 입력하세요.<br />
              판매처코드와 티어는 같은 행에 작성하면 함께 저장됩니다.
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
              <FileText className="w-3.5 h-3.5 text-gray-400" />
              <code className="text-xs text-gray-600 font-mono">스쿼드,판매처코드,티어,발주현황</code>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <Upload className="w-4 h-4" />
              CSV 업로드
            </button>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
            <button
              onClick={() => {
                const sample = '스쿼드,판매처코드,티어,발주현황\n스쿼드A,CH-001,Tier 1,미발주\n스쿼드B,CH-002,Tier 1,발주완료\n스쿼드C,CH-003,Tier 2,입고예정\n,CH-004,Tier 2,입고완료\n,CH-005,Tier 3,취소'
                const blob = new Blob(['﻿' + sample], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url; a.download = '드롭다운설정_샘플.csv'; a.click()
                URL.revokeObjectURL(url)
              }}
              className="text-xs text-blue-500 hover:text-blue-700 underline"
            >
              샘플 CSV 다운로드
            </button>
          </div>
        </div>
        {csvStatus && (
          <div className={`mt-4 flex items-start gap-2 px-3 py-2.5 rounded-lg text-sm ${csvStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {csvStatus.type === 'success' ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
            {csvStatus.message}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {/* 스쿼드 */}
        <CollapsibleSection label="스쿼드 목록" count={draft.squads.length} color="blue" isOpen={!collapsed.squads} onToggle={() => toggleCollapse('squads')}>
          <div className="flex gap-2 mt-3 mb-3">
            <input type="text" value={inputs.squads} onChange={e => setInputs(p => ({ ...p, squads: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addItem('squads')} placeholder="새 스쿼드 이름 입력"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-300" />
            <button onClick={() => addItem('squads')} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"><Plus className="w-4 h-4" /></button>
          </div>
          {draft.squads.length > 0 && (
            <SelectAllBar
              total={draft.squads.length}
              selectedCount={selected.squads.length}
              onSelectAll={() => toggleSelectAll('squads', draft.squads)}
              onDeleteSelected={() => removeSelected('squads')}
            />
          )}
          <div className="space-y-1.5">
            {draft.squads.length === 0
              ? <p className="text-xs text-gray-400 py-2">항목이 없습니다.</p>
              : draft.squads.map(item => (
                <div key={item} className={`flex items-center justify-between py-1.5 px-3 rounded-lg transition-colors ${selected.squads.includes(item) ? 'bg-red-50 border border-red-100' : 'bg-gray-50'}`}>
                  <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                    <input type="checkbox" checked={selected.squads.includes(item)} onChange={() => toggleSelect('squads', item)}
                      className="w-3.5 h-3.5 rounded border-gray-300 accent-red-500 cursor-pointer" />
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">{item}</span>
                  </label>
                  <button onClick={() => removeItem('squads', item)} className="p-1 text-gray-400 hover:text-red-500 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))
            }
          </div>
        </CollapsibleSection>

        {/* 판매처 코드 (티어 포함) */}
        <CollapsibleSection label="판매처 코드 목록" count={draft.salesChannels.length} color="purple" isOpen={!collapsed.salesChannels} onToggle={() => toggleCollapse('salesChannels')}>
          <div className="flex gap-2 mt-3 mb-2">
            <input type="text" value={scInput.code} onChange={e => setScInput(p => ({ ...p, code: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addSalesChannel()} placeholder="판매처 코드"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-300" />
            <input type="text" value={scInput.tier} onChange={e => setScInput(p => ({ ...p, tier: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addSalesChannel()} placeholder="티어 (예: Tier 1)"
              className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-300" />
            <button onClick={addSalesChannel} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"><Plus className="w-4 h-4" /></button>
          </div>
          <p className="text-xs text-gray-400 mb-3">티어는 선택사항입니다. 나중에 CSV로 일괄 추가할 수 있어요.</p>
          {draft.salesChannels.length > 0 && (
            <SelectAllBar
              total={draft.salesChannels.length}
              selectedCount={selected.salesChannels.length}
              onSelectAll={() => toggleSelectAll('salesChannels', draft.salesChannels.map(sc => sc.code))}
              onDeleteSelected={() => {
                setDraft(prev => ({ ...prev, salesChannels: prev.salesChannels.filter(sc => !selected.salesChannels.includes(sc.code)) }))
                setSelected(prev => ({ ...prev, salesChannels: [] }))
              }}
            />
          )}
          <div className="space-y-1.5">
            {draft.salesChannels.length === 0
              ? <p className="text-xs text-gray-400 py-2">항목이 없습니다.</p>
              : draft.salesChannels.map(sc => (
                <div key={sc.code} className={`flex items-center justify-between py-1.5 px-3 rounded-lg transition-colors ${selected.salesChannels.includes(sc.code) ? 'bg-red-50 border border-red-100' : 'bg-gray-50'}`}>
                  <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                    <input type="checkbox" checked={selected.salesChannels.includes(sc.code)} onChange={() => toggleSelect('salesChannels', sc.code)}
                      className="w-3.5 h-3.5 rounded border-gray-300 accent-red-500 cursor-pointer" />
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">{sc.code}</span>
                    {sc.tier && (
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold ${getTierColor(sc.tier)}`}>{sc.tier}</span>
                    )}
                  </label>
                  <button onClick={() => removeSalesChannel(sc.code)} className="p-1 text-gray-400 hover:text-red-500 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))
            }
          </div>
        </CollapsibleSection>

        {/* 발주 현황 */}
        <CollapsibleSection label="발주 현황 목록" count={draft.orderStatuses.length} color="green" isOpen={!collapsed.orderStatuses} onToggle={() => toggleCollapse('orderStatuses')}>
          <div className="flex gap-2 mt-3 mb-3">
            <input type="text" value={inputs.orderStatuses} onChange={e => setInputs(p => ({ ...p, orderStatuses: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addItem('orderStatuses')} placeholder="새 발주 현황 항목 입력"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-300" />
            <button onClick={() => addItem('orderStatuses')} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"><Plus className="w-4 h-4" /></button>
          </div>
          {draft.orderStatuses.length > 0 && (
            <SelectAllBar
              total={draft.orderStatuses.length}
              selectedCount={selected.orderStatuses.length}
              onSelectAll={() => toggleSelectAll('orderStatuses', draft.orderStatuses)}
              onDeleteSelected={() => removeSelected('orderStatuses')}
            />
          )}
          <div className="space-y-1.5">
            {draft.orderStatuses.length === 0
              ? <p className="text-xs text-gray-400 py-2">항목이 없습니다.</p>
              : draft.orderStatuses.map(item => (
                <div key={item} className={`flex items-center justify-between py-1.5 px-3 rounded-lg transition-colors ${selected.orderStatuses.includes(item) ? 'bg-red-50 border border-red-100' : 'bg-gray-50'}`}>
                  <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                    <input type="checkbox" checked={selected.orderStatuses.includes(item)} onChange={() => toggleSelect('orderStatuses', item)}
                      className="w-3.5 h-3.5 rounded border-gray-300 accent-red-500 cursor-pointer" />
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">{item}</span>
                  </label>
                  <button onClick={() => removeItem('orderStatuses', item)} className="p-1 text-gray-400 hover:text-red-500 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))
            }
          </div>
        </CollapsibleSection>
      </div>

      <div className="mt-6 flex justify-end">
        <button onClick={handleSave}
          className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${saved ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
          {saved ? '✓ 저장됨' : '변경사항 저장'}
        </button>
      </div>
    </div>
  )
}

function SelectAllBar({ total, selectedCount, onSelectAll, onDeleteSelected }) {
  const allSelected = selectedCount === total
  return (
    <div className="flex items-center justify-between mb-2 px-1">
      <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-500 hover:text-gray-700">
        <input type="checkbox" checked={allSelected} onChange={onSelectAll}
          className="w-3.5 h-3.5 rounded border-gray-300 accent-red-500 cursor-pointer" />
        {allSelected ? '전체 해제' : '전체 선택'}
      </label>
      {selectedCount > 0 && (
        <button onClick={onDeleteSelected}
          className="flex items-center gap-1 px-2.5 py-1 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors">
          <Trash2 className="w-3 h-3" />
          선택 삭제 ({selectedCount})
        </button>
      )}
    </div>
  )
}

function CollapsibleSection({ label, count, color, isOpen, onToggle, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-gray-800">{label}</h4>
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${BADGE_COLORS[color]}`}>{count}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && <div className="px-5 pb-4 border-t border-gray-100">{children}</div>}
    </div>
  )
}
