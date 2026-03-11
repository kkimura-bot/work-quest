// src/pages/Login.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getAuth, sendPasswordResetEmail } from 'firebase/auth'

export default function Login() {
  const { login } = useAuth()
  const navigate   = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [resetMode, setResetMode]   = useState(false)
  const [resetSent, setResetSent]   = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

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

  const handleReset = async (e) => {
    e.preventDefault()
    if (!email) { setError('メールアドレスを入力してください'); return }
    setError('')
    setResetLoading(true)
    try {
      await sendPasswordResetEmail(getAuth(), email)
      setResetSent(true)
    } catch (err) {
      setError('メールアドレスが見つかりません')
    } finally {
      setResetLoading(false)
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
          <h1 className="font-display text-4xl text-white tracking-wider">REGAL QUEST</h1>
          <p className="text-sm text-gray-500 mt-2 font-mono tracking-widest">by REGALCAST</p>
        </div>

        {/* パスワードリセット送信済み */}
        {resetSent ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm text-center">
            <div className="text-4xl mb-4">📧</div>
            <h2 className="font-display text-xl text-white mb-3">メールを送信しました</h2>
            <p className="text-sm text-gray-400 mb-6">
              {email} にパスワードリセット用のリンクを送りました。メールをご確認ください。
            </p>
            <button
              onClick={() => { setResetMode(false); setResetSent(false); setError('') }}
              className="w-full py-3 rounded-xl font-bold text-white text-sm tracking-wide transition-all"
              style={{ background: 'linear-gradient(135deg, #ff6b6b, #ff9500)' }}
            >
              ログインに戻る
            </button>
          </div>

        /* パスワードリセットフォーム */
        ) : resetMode ? (
          <form onSubmit={handleReset}
            className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
            <h2 className="font-display text-xl text-white tracking-wide mb-2 text-center">
              パスワードリセット
            </h2>
            <p className="text-xs text-gray-400 text-center mb-6">
              登録メールアドレスにリセット用リンクを送ります
            </p>

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

            {error && (
              <p className="mt-3 text-xs text-red-400 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={resetLoading}
              className="mt-6 w-full py-3 rounded-xl font-bold text-white text-sm tracking-wide
                transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #ff6b6b, #ff9500)',
                boxShadow: '0 4px 20px rgba(255,107,107,0.35)' }}
            >
              {resetLoading ? '送信中...' : 'リセットメールを送る 📧'}
            </button>

            <button
              type="button"
              onClick={() => { setResetMode(false); setError('') }}
              className="mt-3 w-full py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              ← ログインに戻る
            </button>
          </form>

        /* 通常ログインフォーム */
        ) : (
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

            {/* パスワードを忘れた */}
            <div className="mt-3 text-right">
              <button
                type="button"
                onClick={() => { setResetMode(true); setError('') }}
                className="text-xs text-gray-500 hover:text-orange-400 transition-colors"
              >
                パスワードを忘れた方はこちら
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full py-3 rounded-xl font-bold text-white text-sm tracking-wide
                transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #ff6b6b, #ff9500)',
                boxShadow: '0 4px 20px rgba(255,107,107,0.35)' }}
            >
              {loading ? '認証中...' : 'START GAME ▶'}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-gray-600 mt-4">
          アカウントはマネージャーから共有されます
        </p>
      </div>
    </div>
  )
}
