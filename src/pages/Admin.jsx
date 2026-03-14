// src/pages/Admin.jsx — super_admin専用管理画面（招待機能付き）
import { useEffect, useState } from 'react'
import { collection, onSnapshot, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth, isSuperAdmin } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'

const ROLES = [
  { value: 'member',      label: 'メンバー',        color: 'bg-gray-100 text-gray-600' },
  { value: 'leader',      label: 'チームリーダー',   color: 'bg-green-100 text-green-700' },
  { value: 'manager',     label: 'マネージャー',     color: 'bg-purple-100 text-purple-700' },
  { value: 'super_admin', label: 'スーパー管理者',   color: 'bg-yellow-100 text-yellow-700' },
]

const BASE_URL = 'https://startling-tulumba-38290b.netlify.app'

function generateCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

export default function Admin() {
  const { user }    = useAuth()
  const navigate    = useNavigate()
  const [users, setUsers]       = useState([])
  const [saving, setSaving]     = useState(null)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' })
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied]         = useState(false)

  useEffect(() => {
    if (user && !isSuperAdmin(user)) navigate('/home', { replace: true })
  }, [user])

  useEffect(() => {
    return onSnapshot(collection(db, 'users'), snap =>
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [])

  // 招待リンク生成
  const createInvite = async (e) => {
    e.preventDefault()
    const code = generateCode()
    await addDoc(collection(db, 'invites'), {
      code,
      email:     inviteForm.email,
      role:      inviteForm.role,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      used:      false,
    })
    // ドキュメントIDではなくcodeでリンクを生成
    const link = `${BASE_URL}/register?code=${code}`
    setInviteLink(link)
  }

  // 招待リンクをFirestoreに保存する際、codeをドキュメントIDにする
  const createInviteWithCode = async (e) => {
    e.preventDefault()
    const code = generateCode()
    await addDoc(collection(db, 'invites'), {
      code,
      email:     inviteForm.email,
      role:      inviteForm.role,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      used:      false,
    })
    const link = `${BASE_URL}/register?code=${code}`
    setInviteLink(link)
  }

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const changeRole = async (userId, newRole) => {
    if (userId === user?.uid && newRole !== 'super_admin') {
      if (!window.confirm('自分のロールを変更すると管理者権限を失います。続けますか？')) return
    }
    setSaving(userId)
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole })
    } finally {
      setSaving(null)
    }
  }

  const toggleDisable = async (userId, isDisabled) => {
    if (userId === user?.uid) { alert('自分自身は変更できません'); return }
    if (!isDisabled && !window.confirm('このアカウントを無効化しますか？')) return
    await updateDoc(doc(db, 'users', userId), { disabled: !isDisabled })
  }

  return (
    <AppLayout>
      <header className="sticky top-0 z-10 bg-white/85 backdrop-blur border-b border-gray-200
        px-7 py-3.5 flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] text-gray-400 tracking-widest">REGAL QUEST / ADMIN</div>
          <div className="font-display text-xl tracking-wide">管理者設定 👑</div>
        </div>
        <button onClick={() => { setShowInvite(true); setInviteLink('') }}
          className="flex items-center gap-1.5 text-white text-sm font-bold px-4 py-2 rounded-xl"
          style={{ background:'linear-gradient(135deg,#f7971e,#ffd200)', boxShadow:'0 4px 16px rgba(247,151,30,0.35)', color:'#333' }}>
          ＋ メンバーを招待
        </button>
      </header>

      <main className="p-7 flex flex-col gap-6">
        {/* ロール説明 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ROLES.map(r => (
            <div key={r.value} className={`rounded-2xl p-4 border ${r.value === 'super_admin' ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200 bg-white'}`}>
              <div className={`inline-block text-xs font-bold px-2 py-0.5 rounded mb-2 ${r.color}`}>{r.label}</div>
              <div className="text-xs text-gray-500">
                {r.value === 'super_admin' && '全権限・アカウント管理・招待・ロール変更'}
                {r.value === 'manager' && 'メンバー管理・ミッション作成・日報コメント'}
                {r.value === 'leader' && 'チーム内クエスト編集・日報コメント'}
                {r.value === 'member' && 'クエスト・日報・フィードバック・ランキング'}
              </div>
            </div>
          ))}
        </div>

        {/* メンバー一覧 */}
        <div>
          <h2 className="font-display text-base tracking-wide mb-3">
            メンバー管理
            <span className="font-mono text-[10px] text-gray-400 ml-2">{users.length}人</span>
          </h2>
          <div className="flex flex-col gap-3">
            {users.map(u => {
              const rc = ROLES.find(r => r.value === u.role) || ROLES[0]
              const isMe = u.id === user?.uid
              const isDisabled = u.disabled === true
              return (
                <div key={u.id}
                  className={`bg-white rounded-2xl border p-4 flex items-center gap-4
                    ${isDisabled ? 'opacity-50' : ''}
                    ${isMe ? 'border-yellow-300 bg-yellow-50/30' : 'border-gray-200'}`}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: u.role === 'super_admin' ? 'linear-gradient(135deg,#f7971e,#ffd200)'
                      : u.role === 'manager' ? 'linear-gradient(135deg,#667eea,#764ba2)'
                      : 'linear-gradient(135deg,#ff6b6b,#ff9500)' }}>
                    {u.role === 'super_admin' ? '👑' : u.role === 'manager' ? '🏰' : '🧙'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm">{u.name || '名前なし'}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${rc.color}`}>{rc.label}</span>
                      {isMe && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-bold">自分</span>}
                      {isDisabled && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">無効化中</span>}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{u.email}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select value={u.role || 'member'}
                      onChange={e => changeRole(u.id, e.target.value)}
                      disabled={saving === u.id}
                      className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-yellow-400 cursor-pointer">
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                    {!isMe && (
                      <button onClick={() => toggleDisable(u.id, isDisabled)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors
                          ${isDisabled ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}>
                        {isDisabled ? '有効化' : '無効化'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>

      {/* 招待モーダル */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowInvite(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-lg tracking-wide mb-5">✉️ メンバーを招待</h3>

            {!inviteLink ? (
              <form onSubmit={createInviteWithCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1.5">招待するメールアドレス *</label>
                  <input type="email" value={inviteForm.email}
                    onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-yellow-400"
                    placeholder="例：yamada@regalcast.in" required />
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1.5">ロール</label>
                  <select value={inviteForm.role}
                    onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400">
                    {ROLES.filter(r => r.value !== 'super_admin').map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-gray-400">
                  招待リンクを生成します。リンクをコピーしてメールやSlackで送ってください。有効期限は7日間です。
                </p>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowInvite(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500">
                    キャンセル
                  </button>
                  <button type="submit"
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                    style={{ background:'linear-gradient(135deg,#f7971e,#ffd200)', color:'#333' }}>
                    リンクを生成 🔗
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700 font-bold">
                  ✅ 招待リンクを生成しました！
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1.5">招待リンク（有効期限：7日間）</label>
                  <div className="flex gap-2">
                    <input readOnly value={inviteLink}
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs bg-gray-50 text-gray-600" />
                    <button onClick={copyLink}
                      className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-colors"
                      style={{ background: copied ? '#22c55e' : 'linear-gradient(135deg,#f7971e,#ffd200)', color: copied ? 'white' : '#333' }}>
                      {copied ? '✅ コピー済み' : 'コピー'}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  このリンクを招待したいメンバーにメールやSlackで送ってください。メンバーがリンクを開くと、名前とパスワードを設定して登録できます。
                </p>
                <div className="flex gap-3">
                  <button onClick={() => { setInviteLink(''); setInviteForm({ email: '', role: 'member' }) }}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500">
                    別の人を招待
                  </button>
                  <button onClick={() => setShowInvite(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                    style={{ background:'linear-gradient(135deg,#667eea,#764ba2)' }}>
                    閉じる
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  )
}
