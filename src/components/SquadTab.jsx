import { useState, useMemo, useRef } from 'react'
import { Plus, Pencil, Trash2, X, CheckSquare, Square, ChevronDown, Filter, Upload, Download, CheckCircle, AlertCircle } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

const EMPTY_FORM = {
  skuId: '', squad: '', manager: '', salesChannel: '',
  backorderQty: '', securedQty: 0, orderStatus: '', secured: false, month: ''
}

const now = new Date()
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

const TIER_COLORS = ['bg-amber-100 text-amber-700', 'bg-sky-100 text-sky-700', 'bg-slate-100 text-slate-600', 'bg-rose-100 text-rose-700']
const getTierColor = (tier) => {
  if (!tier) return 'bg-gray-100 text-gray-500'
  const num = parseInt(tier.replace(/\D/g, ''), 10)
  if (!isNaN(num) && num >= 1) return TIER_COLORS[(num - 1) % TIER_COLORS.length]
  return 'bg-gray-100 text-gray-600'
}

export default function SquadTab({ entries, setEntries, skus, settings }) {
  const [filterSquad, setFilterSquad] = useState('전체')
  const [filterTier, setFilterTier] = useState('전체')
  const [filterMonth, setFilterMonth] = useState(currentMonth)
  const [filterSku, setFilterSku] = useState('전체')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_FORM, month: currentMonth })
  const [errors, setErrors] = useState({})
  const [csvStatus, setCsvStatus] = useState(null)
  const csvFileRef = useRef(null)
  // 인라인 확보 수량 편집: {id: 입력중인 값}
  const [pendingSecured, setPendingSecured] = useState({})

  const monthOptions = useMemo(() => {
    const months = []
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
    return months
  }, [])

  // salesChannels가 {code, tier}[] 또는 string[] 혼용일 수 있으므로 안전하게 처리
  const salesChannelObjects = useMemo(() =>
    (settings.salesChannels || []).map(sc =>
      typeof sc === 'string' ? { code: sc, tier: '' } : sc
    ), [settings.salesChannels])

  const tierOfChannel = (code) => salesChannelObjects.find(sc => sc.code === code)?.tier || ''

  const uniqueTiers = useMemo(() =>
    [...new Set(salesChannelObjects.map(sc => sc.tier).filter(Boolean))].sort()
  , [salesChannelObjects])

  const skuOptions = useMemo(() => {
    const ids = [...new Set(entries.map(e => e.skuId))]
    return ids.map(id => skus.find(s => s.id === id)).filter(Boolean)
      .sort((a, b) => a.productName.localeCompare(b.productName))
  }, [entries, skus])

  const filtered = useMemo(() => entries.filter(e => {
    const squadMatch = filterSquad === '전체' || e.squad === filterSquad
    const monthMatch = !filterMonth || (e.month || '').slice(0, 7) === filterMonth
    const tierMatch  = filterTier  === '전체' || tierOfChannel(e.salesChannel) === filterTier
    const skuMatch   = filterSku   === '전체' || e.skuId === filterSku
    return squadMatch && monthMatch && tierMatch && skuMatch
  }), [entries, filterSquad, filterMonth, filterTier, filterSku, salesChannelObjects])

  const openAdd = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, month: filterMonth || currentMonth })
    setErrors({})
    setShowModal(true)
  }

  const openEdit = (entry) => {
    setEditingId(entry.id)
    setForm({ skuId: entry.skuId, squad: entry.squad, manager: entry.manager,
      salesChannel: entry.salesChannel, backorderQty: entry.backorderQty,
      securedQty: entry.securedQty || 0,
      orderStatus: entry.orderStatus, secured: entry.secured, month: entry.month })
    setErrors({})
    setShowModal(true)
  }

  const validate = () => {
    const e = {}
    if (!form.skuId) e.skuId = '필수'
    if (!form.squad) e.squad = '필수'
    if (!form.manager.trim()) e.manager = '필수'
    if (!form.salesChannel) e.salesChannel = '필수'
    if (!form.backorderQty || Number(form.backorderQty) < 0) e.backorderQty = '올바른 수량을 입력하세요'
    if (!form.orderStatus) e.orderStatus = '필수'
    if (!form.month) e.month = '필수'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    const data = {
      ...form,
      backorderQty: Number(form.backorderQty),
      securedQty: Math.min(Number(form.securedQty) || 0, Number(form.backorderQty)),
    }
    if (editingId) {
      setEntries(prev => prev.map(e => e.id === editingId ? { ...e, ...data } : e))
    } else {
      setEntries(prev => [...prev, { id: uuidv4(), ...data, createdAt: new Date().toISOString() }])
    }
    setShowModal(false)
  }

  const handleDelete = (id) => {
    if (window.confirm('이 항목을 삭제하시겠습니까?')) {
      setEntries(prev => prev.filter(e => e.id !== id))
    }
  }

  const toggleSecured = (id) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, secured: !e.secured } : e))
  }

  const getSku = (skuId) => skus.find(s => s.id === skuId)

  const handleTemplateDownload = async () => {
    // ExcelJS를 CDN에서 동적 로드 (npm 설치 불필요)
    if (!window.ExcelJS) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script')
        s.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js'
        s.onload = resolve; s.onerror = reject
        document.head.appendChild(s)
      })
    }
    const ExcelJS = window.ExcelJS
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('스쿼드별취합')

    // 열 너비 설정 (getColumn은 1-based index)
    ;[1,2,3,4,5,6,7].forEach(i => { ws.getColumn(i).width = 15 })
    ws.getColumn(3).width = 18 // C열(EAN) 숫자 길어서 조금 넓게

    // 열 전체에 서식 적용 — addRow 이전에 설정해야 반영됨
    ws.getColumn(1).numFmt = 'yyyy-mm-dd' // A열: 간단한 날짜
    ws.getColumn(3).numFmt = '0'           // C열: 숫자 (지수 표기 방지)

    // 헤더 행
    const HEADERS = ['PO Date', '스쿼드', 'EAN코드', '담당자', '판매처코드', '백오더수량', '발주현황']
    const headerRow = ws.addRow(HEADERS)
    headerRow.eachCell(cell => {
      cell.font = { size: 10.5, bold: true }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9EEF6' } }
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } } }
      cell.alignment = { vertical: 'middle' }
    })

    // 샘플 데이터 행
    const sampleRow = ws.addRow([
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
      settings.squads[0] || '스쿼드1',
      '8801234567890',
      '홍길동',
      salesChannelObjects[0]?.code || 'CH-001',
      100,
      settings.orderStatuses[0] || '미발주',
    ])
    sampleRow.eachCell(cell => {
      cell.font = { size: 10.5 }
    })

    // 다운로드
    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = '스쿼드별취합_양식.xlsx'; a.click()
    URL.revokeObjectURL(url)
  }

  // 따옴표로 묶인 필드(쉼표 포함)를 올바르게 분리하는 CSV 파서
  const parseCSVLine = (line) => {
    const result = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    result.push(current.trim())
    return result
  }


  const handleCsvUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const lines = ev.target.result.split(/\r?\n/)
          .filter(l => l.trim() && !l.trim().startsWith('#'))
        if (lines.length < 2) {
          setCsvStatus({ type: 'error', message: '데이터가 없습니다. 헤더 포함 2행 이상이어야 합니다.' })
          return
        }
        const headers = parseCSVLine(lines[0]).map(h => h.replace(/^﻿/, ''))
        const idx = {
          month:        headers.findIndex(h => h === '월' || h === 'PO Date' || h === 'PO date'),
          squad:        headers.findIndex(h => h === '스쿼드'),
          ean:          headers.findIndex(h => h === 'EAN코드' || h === 'EAN 코드'),
          manager:      headers.findIndex(h => h === '담당자'),
          salesChannel: headers.findIndex(h => h === '판매처코드' || h === '판매처 코드'),
          backorderQty: headers.findIndex(h => h === '백오더수량' || h === '백오더 수량'),
          securedQty:   headers.findIndex(h => h === '확보수량' || h === '확보 수량'),
          orderStatus:  headers.findIndex(h => h === '발주현황' || h === '발주 현황'),
          secured:      headers.findIndex(h => h === '확보여부' || h === '확보 여부'),
        }
        if (idx.ean < 0 || idx.backorderQty < 0) {
          setCsvStatus({ type: 'error', message: 'CSV 헤더를 인식할 수 없습니다. 양식을 다운로드해서 사용해주세요.' })
          return
        }

        const newEntries = []
        const warnings = []

        for (let i = 1; i < lines.length; i++) {
          const cols = parseCSVLine(lines[i])
          const ean = (cols[idx.ean] || '').trim()
          const sku = skus.find(s => s.eanCode === ean)
          if (!sku) { warnings.push(`행 ${i + 1}: EAN "${ean}" 미등록 → 건너뜀`); continue }

          // 쉼표 포함 숫자(예: "15,000") → 쉼표 제거 후 변환
          const qtyRaw = (cols[idx.backorderQty] || '').replace(/,/g, '')
          const qty = Number(qtyRaw)
          if (isNaN(qty) || qty < 0) { warnings.push(`행 ${i + 1}: 수량 오류 → 건너뜀`); continue }

          const securedVal  = (cols[idx.secured] || '').trim().toUpperCase()
          const sqRaw       = idx.securedQty >= 0 ? (cols[idx.securedQty] || '').replace(/,/g, '') : '0'
          const securedQtyN = Math.min(Math.max(0, Number(sqRaw) || 0), qty)
          newEntries.push({
            id: uuidv4(),
            createdAt: new Date().toISOString(),
            month:        idx.month >= 0        ? (cols[idx.month] || '').trim()         : currentMonth,
            squad:        idx.squad >= 0        ? (cols[idx.squad] || '').trim()        : '',
            skuId:        sku.id,
            manager:      idx.manager >= 0      ? (cols[idx.manager] || '').trim()      : '',
            salesChannel: idx.salesChannel >= 0 ? (cols[idx.salesChannel] || '').trim() : '',
            backorderQty: qty,
            securedQty:   securedQtyN,
            orderStatus:  idx.orderStatus >= 0  ? (cols[idx.orderStatus] || '').trim()  : '',
            secured:      securedVal === 'Y' || securedVal === 'O',
          })
        }

        if (newEntries.length === 0) {
          setCsvStatus({ type: 'error', message: `가져온 항목이 없습니다.${warnings.length ? ' ' + warnings[0] : ''}` })
          return
        }

        setEntries(prev => [...prev, ...newEntries])
        const msg = `${newEntries.length}개 항목을 추가했습니다.${warnings.length ? ` (${warnings.length}행 건너뜀)` : ''}`
        setCsvStatus({ type: 'success', message: msg })
        setTimeout(() => setCsvStatus(null), 4000)
      } catch {
        setCsvStatus({ type: 'error', message: 'CSV 파싱 중 오류가 발생했습니다.' })
      }
    }
    reader.readAsText(file, 'UTF-8')
  }

  // 일반 select (string[])
  const Select = ({ id, label, required, options, placeholder, value, onChange }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <select value={value} onChange={onChange}
          className={`w-full px-3 py-2 border rounded-lg text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8 ${errors[id] ? 'border-red-400' : 'border-gray-200 hover:border-gray-300'}`}
        >
          <option value="">{placeholder}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
      {errors[id] && <p className="text-xs text-red-500 mt-1">{errors[id]}</p>}
    </div>
  )

  const totalBackorder   = filtered.reduce((sum, e) => sum + Number(e.backorderQty || 0), 0)
  const totalSecuredQty  = filtered.reduce((sum, e) => sum + Number(e.securedQty  || 0), 0)
  const totalRemaining   = filtered.reduce((sum, e) => sum + Math.max(0, Number(e.backorderQty || 0) - Number(e.securedQty || 0)), 0)
  const securedCount     = filtered.filter(e => e.secured).length

  // 행 배경색: 부분확보=노랑, 전체확보=초록, 미확보=기본
  const getRowBg = (entry) => {
    const sq = Number(entry.securedQty || 0)
    const bq = Number(entry.backorderQty || 0)
    if (entry.secured || sq >= bq && sq > 0) return 'bg-green-50/40'
    if (sq > 0)  return 'bg-amber-50/50'
    return ''
  }

  // 인라인 확보 수량 저장 (blur 시)
  const commitSecuredQty = (entry) => {
    const raw = pendingSecured[entry.id]
    if (raw === undefined) return
    const val = Math.max(0, Math.min(Number(raw) || 0, Number(entry.backorderQty || 0)))
    setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, securedQty: val } : e))
    setPendingSecured(prev => { const n = { ...prev }; delete n[entry.id]; return n })
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '총 백오더 수량', value: totalBackorder.toLocaleString(), sub: `${filtered.length}건`, color: 'blue' },
          { label: '확보 수량', value: totalSecuredQty.toLocaleString(), sub: `확보 완료 ${securedCount}건`, color: 'green' },
          { label: '미확보 수량', value: totalRemaining.toLocaleString(), sub: `${filtered.length - securedCount}건 미완료`, color: 'orange' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 px-5 py-4 shadow-sm">
            <p className="text-xs text-gray-500 font-medium">{card.label}</p>
            <p className={`text-2xl font-bold mt-1 text-${card.color}-600`}>{card.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3 flex-wrap">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />

            {/* 월 필터 */}
            <div className="relative">
              <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                className="pl-3 pr-7 py-1.5 border border-gray-200 rounded-lg text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">전체 월</option>
                {monthOptions.map(m => <option key={m} value={m}>{m.replace('-', '년 ')}월</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>

            {/* 스쿼드 필터 */}
            <div className="relative">
              <select value={filterSquad} onChange={e => setFilterSquad(e.target.value)}
                className="pl-3 pr-7 py-1.5 border border-gray-200 rounded-lg text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="전체">전체 스쿼드</option>
                {settings.squads.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>

            {/* 티어 필터 (티어가 등록된 경우만 표시) */}
            {uniqueTiers.length > 0 && (
              <div className="relative">
                <select value={filterTier} onChange={e => setFilterTier(e.target.value)}
                  className="pl-3 pr-7 py-1.5 border border-gray-200 rounded-lg text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="전체">전체 티어</option>
                  {uniqueTiers.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            )}

            {/* 품목 필터 */}
            {skuOptions.length > 0 && (
              <div className="relative">
                <select value={filterSku} onChange={e => setFilterSku(e.target.value)}
                  className="pl-3 pr-7 py-1.5 border border-gray-200 rounded-lg text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="전체">전체 품목</option>
                  {skuOptions.map(s => <option key={s.id} value={s.id}>{s.productName}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleTemplateDownload}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />
              양식 다운로드
            </button>
            <button onClick={() => csvFileRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              <Upload className="w-4 h-4" />
              CSV 업로드
            </button>
            <input ref={csvFileRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
            <button onClick={openAdd}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" />
              항목 추가
            </button>
          </div>
        </div>

        {/* CSV 상태 메시지 */}
        {csvStatus && (
          <div className={`mx-6 mb-3 flex items-start gap-2 px-3 py-2.5 rounded-lg text-sm ${csvStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {csvStatus.type === 'success'
              ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
            {csvStatus.message}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">스쿼드</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">SKU (품목명)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">담당자</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">판매처 코드</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">백오더 수량</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">확보 수량</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">미확보</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">발주 현황</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">확보 여부</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">PO Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-16 text-center">
                    <UsersIcon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">항목을 추가해주세요</p>
                  </td>
                </tr>
              ) : (
                filtered.map(entry => {
                  const sku = getSku(entry.skuId)
                  const tier = tierOfChannel(entry.salesChannel)
                  return (
                    <tr key={entry.id} className={`hover:bg-gray-50/60 transition-colors ${getRowBg(entry)}`}>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">{entry.squad}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900 text-xs">{sku?.productName || <span className="text-red-400">SKU 삭제됨</span>}</p>
                          <p className="text-gray-400 text-xs font-mono">{sku?.eanCode || ''}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{entry.manager}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{entry.salesChannel}</span>
                          {tier && (
                            <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold ${getTierColor(tier)}`}>{tier}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{Number(entry.backorderQty).toLocaleString()}</td>
                      {/* 확보 수량 — 인라인 입력 */}
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number" min="0" max={entry.backorderQty}
                          value={pendingSecured[entry.id] !== undefined ? pendingSecured[entry.id] : (entry.securedQty || 0)}
                          onChange={ev => setPendingSecured(prev => ({ ...prev, [entry.id]: ev.target.value }))}
                          onBlur={() => commitSecuredQty(entry)}
                          onKeyDown={ev => { if (ev.key === 'Enter') { ev.target.blur() } }}
                          className="w-20 px-2 py-1 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white"
                        />
                      </td>
                      {/* 미확보 수량 — 자동계산 */}
                      <td className="px-4 py-3 text-right">
                        {(() => {
                          const sq = Number(entry.securedQty || 0)
                          const bq = Number(entry.backorderQty || 0)
                          const rem = bq - sq
                          if (entry.secured || rem <= 0) return <span className="text-xs font-medium text-green-600">완료</span>
                          if (sq > 0) return <span className="text-sm font-semibold text-amber-600">{rem.toLocaleString()}</span>
                          return <span className="text-sm text-gray-400">{rem.toLocaleString()}</span>
                        })()}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={entry.orderStatus} /></td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => toggleSecured(entry.id)} className="transition-colors">
                          {entry.secured
                            ? <CheckSquare className="w-5 h-5 text-green-500 mx-auto" />
                            : <Square className="w-5 h-5 text-gray-300 hover:text-gray-400 mx-auto" />
                          }
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{entry.month}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(entry)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(entry.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="text-base font-semibold text-gray-900">{editingId ? '항목 수정' : '항목 추가'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* Month */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">월 <span className="text-red-500">*</span></label>
                <input type="month" value={form.month} onChange={e => setForm(p => ({ ...p, month: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.month ? 'border-red-400' : 'border-gray-200'}`} />
                {errors.month && <p className="text-xs text-red-500 mt-1">{errors.month}</p>}
              </div>

              {/* SKU */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select value={form.skuId} onChange={e => setForm(p => ({ ...p, skuId: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8 ${errors.skuId ? 'border-red-400' : 'border-gray-200'}`}>
                    <option value="">SKU 선택</option>
                    {skus.map(s => <option key={s.id} value={s.id}>{s.productName} ({s.eanCode})</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {errors.skuId && <p className="text-xs text-red-500 mt-1">{errors.skuId}</p>}
                {skus.length === 0 && <p className="text-xs text-amber-600 mt-1">⚠ SKU 관리 탭에서 먼저 SKU를 등록하세요</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Select id="squad" label="스쿼드" required options={settings.squads} placeholder="스쿼드 선택"
                  value={form.squad} onChange={e => setForm(p => ({ ...p, squad: e.target.value }))} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">담당자 <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="이름 입력" value={form.manager}
                    onChange={e => setForm(p => ({ ...p, manager: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.manager ? 'border-red-400' : 'border-gray-200'}`} />
                  {errors.manager && <p className="text-xs text-red-500 mt-1">{errors.manager}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* 판매처 코드 (티어 포함 표시) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">판매처 코드 <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select value={form.salesChannel} onChange={e => setForm(p => ({ ...p, salesChannel: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8 ${errors.salesChannel ? 'border-red-400' : 'border-gray-200'}`}>
                      <option value="">판매처 선택</option>
                      {salesChannelObjects.map(sc => (
                        <option key={sc.code} value={sc.code}>
                          {sc.tier ? `${sc.code} (${sc.tier})` : sc.code}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  {errors.salesChannel && <p className="text-xs text-red-500 mt-1">{errors.salesChannel}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">백오더 수량 <span className="text-red-500">*</span></label>
                  <input type="number" min="0" placeholder="0" value={form.backorderQty}
                    onChange={e => setForm(p => ({ ...p, backorderQty: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.backorderQty ? 'border-red-400' : 'border-gray-200'}`} />
                  {errors.backorderQty && <p className="text-xs text-red-500 mt-1">{errors.backorderQty}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">확보 수량</label>
                  <input type="number" min="0" max={Number(form.backorderQty) || undefined} placeholder="0" value={form.securedQty}
                    onChange={e => setForm(p => ({ ...p, securedQty: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  {Number(form.backorderQty) > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      미확보: {Math.max(0, Number(form.backorderQty) - Number(form.securedQty || 0)).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              <Select id="orderStatus" label="발주 현황" required options={settings.orderStatuses} placeholder="발주 현황 선택"
                value={form.orderStatus} onChange={e => setForm(p => ({ ...p, orderStatus: e.target.value }))} />

              <div className="flex items-center gap-3 py-2">
                <button type="button" onClick={() => setForm(p => ({ ...p, secured: !p.secured }))} className="flex items-center gap-2 text-sm">
                  {form.secured ? <CheckSquare className="w-5 h-5 text-green-500" /> : <Square className="w-5 h-5 text-gray-400" />}
                  <span className={form.secured ? 'text-green-700 font-medium' : 'text-gray-600'}>확보 완료</span>
                </button>
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50">취소</button>
              <button onClick={handleSave} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">{editingId ? '수정 완료' : '추가'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function UsersIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  )
}

const STATUS_STYLES = {
  '미발주': 'bg-gray-100 text-gray-600',
  '발주완료': 'bg-blue-100 text-blue-700',
  '입고예정': 'bg-yellow-100 text-yellow-700',
  '입고완료': 'bg-green-100 text-green-700',
  '취소': 'bg-red-100 text-red-600',
}

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${style}`}>{status}</span>
}
