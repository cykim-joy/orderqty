import { useState, useEffect, useCallback } from 'react'
import { Package, Users, BarChart3, Settings } from 'lucide-react'
import { LogOut } from 'lucide-react'
import SKUTab from './components/SKUTab'
import SquadTab from './components/SquadTab'
import FeedbackTab from './components/FeedbackTab'
import SettingsTab from './components/SettingsTab'
import LoginPage from './components/LoginPage'
import { DEFAULT_SETTINGS, migrateSettings } from './utils/storage'
import {
  fetchSkus, upsertSku, deleteSku,
  fetchEntries, upsertEntry, deleteEntry, upsertEntries,
  fetchSettings, saveSettings,
  fetchFeedbackNotes, saveFeedbackNote,
} from './utils/db'

const AUTH_KEY = 'backorder_auth_user'

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(AUTH_KEY)) } catch { return null }
  })
  const [activeTab, setActiveTab] = useState('sku')
  const [skus, setSkus] = useState([])
  const [entries, setEntries] = useState([])
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [feedbackNotes, setFeedbackNotes] = useState({})
  const [loading, setLoading] = useState(true)

  // 초기 데이터 로드
  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([fetchSkus(), fetchEntries(), fetchSettings(), fetchFeedbackNotes()])
      .then(([s, e, st, fn]) => {
        setSkus(s)
        setEntries(e)
        setSettings(migrateSettings(st || DEFAULT_SETTINGS))
        setFeedbackNotes(fn)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user])

  // SKU CRUD
  const handleSetSkus = useCallback(async (updater) => {
    setSkus(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      // 추가/수정된 항목 upsert
      next.forEach(s => { if (!prev.find(p => p.id === s.id) || prev.find(p => p.id === s.id && JSON.stringify(p) !== JSON.stringify(s))) upsertSku(s).catch(console.error) })
      // 삭제된 항목
      prev.forEach(p => { if (!next.find(n => n.id === p.id)) deleteSku(p.id).catch(console.error) })
      return next
    })
  }, [])

  // Entry CRUD
  const handleSetEntries = useCallback(async (updater) => {
    setEntries(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      next.forEach(e => { if (!prev.find(p => p.id === e.id) || prev.find(p => p.id === e.id && JSON.stringify(p) !== JSON.stringify(e))) upsertEntry(e).catch(console.error) })
      prev.forEach(p => { if (!next.find(n => n.id === p.id)) deleteEntry(p.id).catch(console.error) })
      return next
    })
  }, [])

  // Settings
  const handleSetSettings = useCallback((updater) => {
    setSettings(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      saveSettings(next).catch(console.error)
      return next
    })
  }, [])

  // Feedback Notes
  const handleSetFeedbackNotes = useCallback((updater) => {
    setFeedbackNotes(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      // 변경된 월만 저장
      Object.entries(next).forEach(([month, note]) => {
        if (prev[month] !== note) saveFeedbackNote(month, note).catch(console.error)
      })
      return next
    })
  }, [])

  const handleLogin = (userInfo) => {
    localStorage.setItem(AUTH_KEY, JSON.stringify(userInfo))
    setUser(userInfo)
  }

  const handleLogout = () => {
    localStorage.removeItem(AUTH_KEY)
    setUser(null)
  }

  if (!user) return <LoginPage onLogin={handleLogin} />

  const tabs = [
    { id: 'sku', label: 'SKU 관리', icon: Package },
    { id: 'squad', label: '스쿼드별 취합', icon: Users },
    { id: 'feedback', label: '월별 FEEDBACK', icon: BarChart3 },
    { id: 'settings', label: '드롭다운 설정', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900 leading-none">백오더 수량 대시보드</h1>
                <p className="text-xs text-gray-400 mt-0.5">영업지원팀</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {user.picture && (
                <img src={user.picture} alt={user.name} className="w-7 h-7 rounded-full" referrerPolicy="no-referrer" />
              )}
              <span className="text-xs text-gray-500 hidden sm:block">{user.email}</span>
              <button onClick={handleLogout}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                <LogOut className="w-3.5 h-3.5" />
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6 w-fit shadow-sm">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}>
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-gray-400 text-sm">데이터 불러오는 중...</div>
          </div>
        ) : (
          <>
            {activeTab === 'sku' && <SKUTab skus={skus} setSkus={handleSetSkus} />}
            {activeTab === 'squad' && <SquadTab entries={entries} setEntries={handleSetEntries} skus={skus} settings={settings} />}
            {activeTab === 'feedback' && <FeedbackTab entries={entries} skus={skus} feedbackNotes={feedbackNotes} setFeedbackNotes={handleSetFeedbackNotes} />}
            {activeTab === 'settings' && <SettingsTab settings={settings} setSettings={handleSetSettings} />}
          </>
        )}
      </div>
    </div>
  )
}
