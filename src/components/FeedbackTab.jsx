import { useState, useMemo } from 'react'
import { ChevronDown, TrendingDown, TrendingUp, Package, CheckCircle, AlertCircle, Save, Minus } from 'lucide-react'

const now = new Date()
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

function getPrevMonth(month) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// 증감률 계산: null = 비교 불가
function calcChange(curr, prev) {
  if (prev === 0 && curr === 0) return null
  if (prev === 0) return null // 전월 0이면 % 표시 불가
  return Math.round(((curr - prev) / prev) * 100)
}

export default function FeedbackTab({ entries, skus, feedbackNotes, setFeedbackNotes }) {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [noteText, setNoteText] = useState(() => feedbackNotes[currentMonth] || '')
  const [saved, setSaved] = useState(false)

  const monthOptions = useMemo(() => {
    const months = []
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
    return months
  }, [])

  const handleMonthChange = (month) => {
    setSelectedMonth(month)
    setNoteText(feedbackNotes[month] || '')
    setSaved(false)
  }

  const handleSaveNote = () => {
    setFeedbackNotes(prev => ({ ...prev, [selectedMonth]: noteText }))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const prevMonth = useMemo(() => getPrevMonth(selectedMonth), [selectedMonth])

  // 선택 월 집계
  const monthEntries = useMemo(() => entries.filter(e => (e.month || '').slice(0, 7) === selectedMonth), [entries, selectedMonth])
  const prevEntries  = useMemo(() => entries.filter(e => (e.month || '').slice(0, 7) === prevMonth), [entries, prevMonth])

  const calcMetrics = (ents, skuList) => {
    const total    = ents.reduce((s, e) => s + Number(e.backorderQty || 0), 0)
    const secured  = ents.filter(e => e.secured).reduce((s, e) => s + Number(e.backorderQty || 0), 0)
    const unsecured = total - secured
    const skuMap = {}
    ents.forEach(e => {
      if (!skuMap[e.skuId]) skuMap[e.skuId] = { total: 0, secured: 0 }
      skuMap[e.skuId].total   += Number(e.backorderQty || 0)
      if (e.secured) skuMap[e.skuId].secured += Number(e.backorderQty || 0)
    })
    const cost = Object.entries(skuMap).reduce((sum, [id, v]) => {
      const sku = skuList.find(s => s.id === id)
      return sku?.unitPrice ? sum + (v.total - v.secured) * Number(sku.unitPrice) : sum
    }, 0)
    return { total, secured, unsecured, cost }
  }

  const curr = useMemo(() => calcMetrics(monthEntries, skus), [monthEntries, skus])
  const prev = useMemo(() => calcMetrics(prevEntries,  skus), [prevEntries, skus])
  const hasPrev = prevEntries.length > 0

  const securedRate = curr.total > 0 ? Math.round((curr.secured / curr.total) * 100) : 0

  // SKU별 집계
  const skuSummary = useMemo(() => {
    const map = {}
    monthEntries.forEach(e => {
      if (!map[e.skuId]) map[e.skuId] = { skuId: e.skuId, total: 0, secured: 0 }
      map[e.skuId].total += Number(e.backorderQty || 0)
      if (e.secured) map[e.skuId].secured += Number(e.backorderQty || 0)
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [monthEntries])

  // 스쿼드별 집계
  const squadSummary = useMemo(() => {
    const map = {}
    monthEntries.forEach(e => {
      if (!map[e.squad]) map[e.squad] = { total: 0, secured: 0 }
      map[e.squad].total += Number(e.backorderQty || 0)
      if (e.secured) map[e.squad].secured += Number(e.backorderQty || 0)
    })
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total)
  }, [monthEntries])

  const displayMonth = selectedMonth ? selectedMonth.replace('-', '년 ') + '월' : ''
  const displayPrevMonth = prevMonth ? prevMonth.replace('-', '년 ') + '월' : ''

  return (
    <div className="space-y-4">
      {/* Month Selector */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <select value={selectedMonth} onChange={e => handleMonthChange(e.target.value)}
            className="pl-4 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
            {monthOptions.map(m => (
              <option key={m} value={m}>{m.replace('-', '년 ')}월</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">{displayMonth} 백오더 회고</h2>
        {monthEntries.length === 0 && (
          <span className="text-sm text-gray-400">— 이 월의 데이터가 없습니다</span>
        )}
        {hasPrev && (
          <span className="text-xs text-gray-400 ml-1">전월({displayPrevMonth}) 대비</span>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={<Package className="w-5 h-5 text-blue-500" />}
          label="총 백오더 수량"
          value={curr.total.toLocaleString()}
          sub={`${monthEntries.length}건`}
          color="blue"
          change={hasPrev ? calcChange(curr.total, prev.total) : null}
        />
        <KPICard
          icon={<CheckCircle className="w-5 h-5 text-green-500" />}
          label="확보 완료 수량"
          value={curr.secured.toLocaleString()}
          sub={`확보율 ${securedRate}%`}
          color="green"
          change={hasPrev ? calcChange(curr.secured, prev.secured) : null}
          invertColor // 확보 수량은 증가가 좋음
        />
        <KPICard
          icon={<AlertCircle className="w-5 h-5 text-orange-500" />}
          label="미확보 수량"
          value={curr.unsecured.toLocaleString()}
          sub={`미확보율 ${100 - securedRate}%`}
          color="orange"
          change={hasPrev ? calcChange(curr.unsecured, prev.unsecured) : null}
        />
        <KPICard
          icon={<TrendingDown className="w-5 h-5 text-red-500" />}
          label="기회비용 (추정)"
          value={curr.cost > 0 ? `₩${curr.cost.toLocaleString()}` : '-'}
          sub={curr.cost > 0 ? '미확보 수량 × 단가' : '단가 미등록'}
          color="red"
          change={hasPrev && curr.cost > 0 ? calcChange(curr.cost, prev.cost) : null}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* SKU별 집계 */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">SKU별 백오더 현황</h3>
          </div>
          {skuSummary.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-400 text-sm">데이터가 없습니다</p>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">SKU</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">총 백오더</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">확보</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">미확보</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">기회비용</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {skuSummary.map(item => {
                    const sku = skus.find(s => s.id === item.skuId)
                    const unsecured = item.total - item.secured
                    const cost = sku?.unitPrice ? unsecured * Number(sku.unitPrice) : null
                    return (
                      <tr key={item.skuId} className="hover:bg-gray-50/60">
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-gray-900 text-xs">{sku?.productName || <span className="text-red-400">삭제된 SKU</span>}</p>
                          <p className="text-gray-400 text-xs font-mono">{sku?.eanCode}</p>
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold text-gray-900">{item.total.toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-right text-green-600 font-medium">{item.secured.toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-right text-orange-600 font-medium">{unsecured.toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-right">
                          {cost != null
                            ? <span className="text-red-600 font-medium">₩{cost.toLocaleString()}</span>
                            : <span className="text-gray-300 text-xs">단가 미등록</span>
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* 스쿼드별 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">스쿼드별 현황</h3>
            </div>
            {squadSummary.length === 0 ? (
              <div className="py-6 text-center"><p className="text-gray-400 text-xs">데이터가 없습니다</p></div>
            ) : (
              <div className="px-5 py-3 space-y-3">
                {squadSummary.map(([squad, data]) => {
                  const rate = data.total > 0 ? Math.round((data.secured / data.total) * 100) : 0
                  return (
                    <div key={squad}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700">{squad}</span>
                        <span className="text-xs text-gray-500">{data.total.toLocaleString()} / {data.secured.toLocaleString()} 확보</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${rate}%` }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 text-right">{rate}%</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 회고 메모 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">회고 메모</h3>
              <p className="text-xs text-gray-400 mt-0.5">{displayMonth} 백오더 회고 내용을 기록하세요</p>
            </div>
            <div className="px-5 py-4">
              <textarea
                value={noteText}
                onChange={e => { setNoteText(e.target.value); setSaved(false) }}
                placeholder={`${displayMonth} 백오더 현황 회고\n\n- 주요 이슈:\n- 원인 분석:\n- 개선 방안:`}
                rows={8}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 placeholder-gray-300"
              />
              <button onClick={handleSaveNote}
                className={`mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${saved ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                <Save className="w-4 h-4" />
                {saved ? '저장 완료!' : '메모 저장'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function KPICard({ icon, label, value, sub, color, change, invertColor }) {
  const bgColors = {
    blue: 'border-blue-100 bg-blue-50/50',
    green: 'border-green-100 bg-green-50/50',
    orange: 'border-orange-100 bg-orange-50/50',
    red: 'border-red-100 bg-red-50/50',
  }

  // change: null = 없음, 양수 = 증가, 음수 = 감소, 0 = 변동없음
  // invertColor: true이면 증가가 좋음(초록), false/기본이면 감소가 좋음(초록)
  let changeBadge = null
  if (change !== null && change !== undefined) {
    if (change === 0) {
      changeBadge = (
        <span className="inline-flex items-center gap-0.5 text-xs text-gray-400 font-medium">
          <Minus className="w-3 h-3" />0%
        </span>
      )
    } else {
      const isPositive = change > 0
      const isGood = invertColor ? isPositive : !isPositive
      const colorClass = isGood ? 'text-green-600' : 'text-red-500'
      const Icon = isPositive ? TrendingUp : TrendingDown
      changeBadge = (
        <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${colorClass}`}>
          <Icon className="w-3.5 h-3.5" />
          {isPositive ? '+' : ''}{change}%
        </span>
      )
    }
  }

  return (
    <div className={`rounded-xl border px-5 py-4 shadow-sm ${bgColors[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <p className="text-xs text-gray-500 font-medium">{label}</p>
        </div>
        {changeBadge && (
          <div className="shrink-0">{changeBadge}</div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  )
}
