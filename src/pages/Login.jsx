// src/pages/Login.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { login } = useAuth()
  const navigate   = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/home')
    } catch (err) {
      setError('メールアドレスまたはパスワードが正しくありません')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-dark p-4">
      {/* 背景グロー */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,107,107,0.12) 0%, transparent 70%)' }} />
      </div>

      <div className="relative w-full max-w-sm">
        {/* ロゴ */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">⚔️</div>
          <h1 className="font-display text-4xl text-white tracking-wider">WORK QUEST</h1>
          <p className="text-sm text-gray-500 mt-2 font-mono tracking-widest">by REGALCAST</p>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit}
          className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          <h2 className="font-display text-xl text-white tracking-wide mb-6 text-center">
            冒険を始める
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 font-mono tracking-widest mb-2">
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3
                  text-white placeholder-gray-600 text-sm
                  focus:outline-none focus:border-orange-400 transition-colors"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 font-mono tracking-widest mb-2">
                PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3
                  text-white placeholder-gray-600 text-sm
                  focus:outline-none focus:border-orange-400 transition-colors"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && (
            <p className="mt-3 text-xs text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full py-3 rounded-xl font-bold text-white text-sm tracking-wide
              transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #ff6b6b, #ff9500)',
              boxShadow: '0 4px 20px rgba(255,107,107,0.35)' }}
          >
            {loading ? '認証中...' : 'START GAME ▶'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-600 mt-4">
          アカウントはマネージャーから共有されます
        </p>
      </div>
    </div>
  )
}
