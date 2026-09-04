import { useState } from 'react'
import { Plus, Pencil, Trash2, Search, X, Package } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

const EMPTY_FORM = { eanCode: '', productName: '', adminProductName: '', unitPrice: '' }

// 컴포넌트 밖에 정의해야 리렌더링 시 remount 방지
function Field({ id, label, required, errors = {}, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={id}
        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
          errors[id] ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'
        }`}
        {...props}
      />
      {errors[id] && <p className="text-xs text-red-500 mt-1">{errors[id]}</p>}
    </div>
  )
}

export default function SKUTab({ skus, setSkus }) {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  const filtered = skus.filter(s =>
    s.eanCode.toLowerCase().includes(search.toLowerCase()) ||
    s.productName.toLowerCase().includes(search.toLowerCase()) ||
    s.adminProductName.toLowerCase().includes(search.toLowerCase())
  )

  const openAdd = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setShowModal(true)
  }

  const openEdit = (sku) => {
    setEditingId(sku.id)
    setForm({ eanCode: sku.eanCode, productName: sku.productName, adminProductName: sku.adminProductName, unitPrice: sku.unitPrice || '' })
    setErrors({})
    setShowModal(true)
  }

  const validate = () => {
    const e = {}
    if (!form.eanCode.trim()) e.eanCode = '필수 항목입니다'
    if (!form.productName.trim()) e.productName = '필수 항목입니다'
    if (!form.adminProductName.trim()) e.adminProductName = '필수 항목입니다'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    if (editingId) {
      setSkus(prev => prev.map(s => s.id === editingId ? { ...s, ...form } : s))
    } else {
      setSkus(prev => [...prev, { id: uuidv4(), ...form, createdAt: new Date().toISOString() }])
    }
    setShowModal(false)
  }

  const handleDelete = (id) => {
    if (window.confirm('이 SKU를 삭제하시겠습니까?\n관련된 취합 데이터에 영향을 줄 수 있습니다.')) {
      setSkus(prev => prev.filter(s => s.id !== id))
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <h2 className="text-base font-semibold text-gray-900">SKU 관리</h2>
          <p className="text-xs text-gray-400 mt-0.5">백오더 수량 취합이 필요한 SKU를 등록하세요</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{skus.length}개 등록됨</span>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            SKU 추가
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="EAN, 품목명, 어드민 품목명 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-48">EAN CODE</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">품목명</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">어드민 품목명</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">단가</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center">
                  <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">{search ? '검색 결과가 없습니다' : 'SKU를 추가해주세요'}</p>
                </td>
              </tr>
            ) : (
              filtered.map(sku => (
                <tr key={sku.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-3.5 font-mono text-gray-800 text-xs">{sku.eanCode}</td>
                  <td className="px-6 py-3.5 text-gray-900 font-medium">{sku.productName}</td>
                  <td className="px-6 py-3.5 text-gray-500">{sku.adminProductName}</td>
                  <td className="px-6 py-3.5 text-gray-600">
                    {sku.unitPrice ? `$${Number(sku.unitPrice).toLocaleString()}` : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(sku)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(sku.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">{editingId ? 'SKU 수정' : 'SKU 추가'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <Field id="eanCode" label="EAN CODE" required errors={errors} placeholder="EAN CODE 입력"
                value={form.eanCode} onChange={e => setForm(p => ({ ...p, eanCode: e.target.value }))} />
              <Field id="productName" label="품목명" required errors={errors} placeholder="품목명 입력"
                value={form.productName} onChange={e => setForm(p => ({ ...p, productName: e.target.value }))} />
              <Field id="adminProductName" label="어드민 품목명" required errors={errors} placeholder="어드민 품목명 입력"
                value={form.adminProductName} onChange={e => setForm(p => ({ ...p, adminProductName: e.target.value }))} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  단가 <span className="text-gray-400 font-normal text-xs">(기회비용 계산에 사용)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" min="0" placeholder="0"
                    value={form.unitPrice} onChange={e => setForm(p => ({ ...p, unitPrice: e.target.value }))}
                    className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-300" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">취소</button>
              <button onClick={handleSave} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">{editingId ? '수정 완료' : '추가'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
