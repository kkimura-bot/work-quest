// src/pages/Register.jsx — 招待リンクからの新規登録
import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

export default function Register() {
  const [params]    = useSearchParams()
  const navigate    = useNavigate()
  const inviteCode  = params.get('code')

  const [invite, setInvite]   = useState(null)
  const [invalid, setInvalid] = useState(false)
  const [form, setForm]       = useState({ name: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  // 招待コードを確認
  useEffect(() => {
    if (!inviteCode) { setInvalid(true); return }
    getDoc(doc(db, 'invites', inviteCode)).then(snap => {
      if (!snap.exists()) { setInvalid(true); return }
      const data = snap.data()
      // 有効期限チェック（7日間）
      const created = data.createdAt?.toDate?.() || new Date(0)
      const expired = (Date.now() - created.getTime()) > 7 * 24 * 60 * 60 * 1000
      if (expired || data.used) { setInvalid(true); return }
      setInvite(data)
    })
  }, [inviteCode])

  const handleRegister = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('パスワードが一致しません'); return }
    if (form.password.length < 8)       { setError('パスワードは8文字以上にしてください'); return }
    if (!form.name.trim())              { setError('名前を入力してください'); return }

    setLoading(true)
    setError('')
    try {
      // Firebaseアカウント作成
      const cred = await createUserWithEmailAndPassword(auth, invite.email, form.password)

      // Firestoreにユーザー情報を登録
      await setDoc(doc(db, 'users', cred.user.uid), {
        name:      form.name.trim(),
        email:     invite.email,
        role:      invite.role || 'member',
        xp:        0,
        createdAt: serverTimestamp(),
      })

      // 招待コードを使用済みにする
      await deleteDoc(doc(db, 'invites', inviteCode))

      navigate('/home')
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('このメールアドレスは既に登録されています')
      } else {
        setError('登録に失敗しました: ' + err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  // 無効な招待コード
  if (invalid) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#1a1a2e' }}>
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm text-center shadow-2xl">
        <div className="text-5xl mb-4">❌</div>
        <h2 className="font-bold text-xl mb-2">招待リンクが無効です</h2>
        <p className="text-gray-500 text-sm">リンクの有効期限が切れているか、すでに使用済みです。<br/>管理者に再発行を依頼してください。</p>
      </div>
    </div>
  )

  if (!invite) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#1a1a2e' }}>
      <div className="text-white font-mono">Loading...</div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#1a1a2e' }}>
      <div className="w-full max-w-sm">
        {/* ロゴ */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚔️</div>
          <div className="font-display text-white text-2xl tracking-wide">REGAL QUEST</div>
          <div className="text-white/40 text-sm mt-1">アカウント登録</div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-2xl">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-5 text-sm">
            <div className="font-bold text-orange-700 mb-0.5">招待されました！</div>
            <div className="text-orange-600">{invite.email} として登録します</div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-gray-400 tracking-widest mb-1.5">表示名 *</label>
              <input value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400"
                placeholder="例：山田 太郎" required />
            </div>
            <div>
              <label className="block text-xs font-mono text-gray-400 tracking-widest mb-1.5">パスワード *（8文字以上）</label>
              <input type="password" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400"
                placeholder="8文字以上・英数字混在" required />
            </div>
            <div>
              <label className="block text-xs font-mono text-gray-400 tracking-widest mb-1.5">パスワード確認 *</label>
              <input type="password" value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400"
                placeholder="もう一度入力" required />
            </div>

            {error && (
              <div className="text-red-500 text-sm bg-red-50 rounded-xl px-3 py-2">{error}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60 mt-2"
              style={{ background: 'linear-gradient(135deg,#ff6b6b,#ff9500)' }}>
              {loading ? '登録中…' : '冒険を始める ⚔️'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
