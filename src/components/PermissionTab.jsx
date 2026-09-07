import { useState } from 'react'
import { Shield, Plus, Trash2, AlertCircle, CheckCircle, UserCheck, UserX } from 'lucide-react'
import { addAuthorizedEmail, removeAuthorizedEmail } from '../utils/db'

export default function PermissionTab({ authorizedEmails, setAuthorizedEmails, currentUser }) {
  const [emailInput, setEmailInput] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const isListEmpty  = authorizedEmails.length === 0
  const isMeAuthed   = isListEmpty || authorizedEmails.some(e => e.email === currentUser?.email?.toLowerCase())
  const canManage    = isMeAuthed

  const handleAdd = async () => {
    setError('')
    const email = emailInput.trim().toLowerCase()
    if (!email) { setError('이메일을 입력해주세요.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('올바른 이메일 형식이 아닙니다.'); return }
    if (authorizedEmails.some(e => e.email === email)) { setError('이미 등록된 이메일입니다.'); return }

    setSaving(true)
    try {
      const added = await addAuthorizedEmail({ email, name: nameInput.trim() })
      setAuthorizedEmails(prev => [...prev, added])
      setEmailInput('')
      setNameInput('')
    } catch (err) {
      setError('저장 중 오류가 발생했습니다: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (item) => {
    if (!window.confirm(`"${item.email}" 의 수정 권한을 제거하시겠습니까?`)) return
    try {
      await removeAuthorizedEmail(item.id)
      setAuthorizedEmails(prev => prev.filter(e => e.id !== item.id))
    } catch (err) {
      setError('삭제 중 오류가 발생했습니다: ' + err.message)
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">

      {/* 헤더 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-blue-600" />
          </div>
          <h2 className="text-base font-semibold text-gray-900">수정 권한 관리</h2>
        </div>
        <p className="text-sm text-gray-500 ml-11">
          아래 등록된 Google 계정만 데이터를 추가·수정·삭제할 수 있습니다.
          목록이 비어 있으면 모든 로그인 사용자가 편집 가능합니다.
        </p>
      </div>

      {/* 내 상태 배너 */}
      <div className={`flex items-center gap-3 px-5 py-3.5 rounded-xl border text-sm font-medium
        ${isMeAuthed
          ? 'bg-green-50 border-green-200 text-green-700'
          : 'bg-red-50 border-red-200 text-red-600'}`}>
        {isMeAuthed
          ? <><UserCheck className="w-4 h-4 shrink-0" /> 현재 계정({currentUser?.email})은 수정 권한이 있습니다.</>
          : <><UserX   className="w-4 h-4 shrink-0" /> 현재 계정({currentUser?.email})은 수정 권한이 없습니다. 관리자에게 문의하세요.</>
        }
      </div>

      {/* 빈 목록 안내 */}
      {isListEmpty && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>등록된 계정이 없어 현재 모든 사용자가 수정 가능합니다. 아래에서 허용할 계정을 추가하세요.</span>
        </div>
      )}

      {/* 권한 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">수정 가능 계정</span>
          <span className="text-xs text-gray-400">{authorizedEmails.length}명 등록됨</span>
        </div>

        {authorizedEmails.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-400 text-sm">
            아직 등록된 계정이 없습니다
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {authorizedEmails.map(item => {
              const isMe = item.email === currentUser?.email?.toLowerCase()
              return (
                <li key={item.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/60">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold uppercase">
                      {(item.name || item.email)[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {item.name || <span className="text-gray-400 font-normal">이름 없음</span>}
                        {isMe && <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium">나</span>}
                      </p>
                      <p className="text-xs text-gray-400">{item.email}</p>
                    </div>
                  </div>
                  {canManage && (
                    <button
                      onClick={() => handleRemove(item)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      title="권한 제거"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* 계정 추가 폼 */}
      {canManage && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">계정 추가</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="이름 (선택)"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="email"
              placeholder="Google 이메일 주소"
              value={emailInput}
              onChange={e => { setEmailInput(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                ${error ? 'border-red-400' : 'border-gray-200'}`}
            />
            <button
              onClick={handleAdd}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              추가
            </button>
          </div>
          {error && (
            <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />{error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
