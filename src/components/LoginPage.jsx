import { useEffect, useRef } from 'react'
import { Package } from 'lucide-react'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const ALLOWED_DOMAIN = 'celimax.co.kr'

export default function LoginPage({ onLogin }) {
  const btnRef = useRef(null)

  useEffect(() => {
    const initGoogle = () => {
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (response) => {
          // JWT 디코딩 (base64)
          const payload = JSON.parse(atob(response.credential.split('.')[1]))
          const email = payload.email || ''
          if (email.endsWith('@' + ALLOWED_DOMAIN)) {
            onLogin({ email, name: payload.name, picture: payload.picture })
          } else {
            alert(`${ALLOWED_DOMAIN} 계정만 접근 가능합니다.\n현재 계정: ${email}`)
          }
        },
      })
      window.google.accounts.id.renderButton(btnRef.current, {
        theme: 'outline',
        size: 'large',
        width: 280,
        text: 'signin_with',
        locale: 'ko',
      })
    }

    if (window.google) {
      initGoogle()
    } else {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.onload = initGoogle
      document.head.appendChild(script)
    }
  }, [onLogin])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-10 w-full max-w-sm flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
            <Package className="w-7 h-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-bold text-gray-900">백오더 수량 대시보드</h1>
            <p className="text-xs text-gray-400 mt-0.5">영업지원팀</p>
          </div>
        </div>

        <div className="w-full border-t border-gray-100" />

        {/* Google 로그인 버튼 */}
        <div className="flex flex-col items-center gap-3 w-full">
          <p className="text-sm text-gray-500">celimax 계정으로 로그인하세요</p>
          <div ref={btnRef} />
        </div>

        <p className="text-xs text-gray-300 text-center">
          @celimax.co.kr 계정만 접근 가능합니다
        </p>
      </div>
    </div>
  )
}
