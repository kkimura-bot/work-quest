// src/pages/Admin.jsx — super_admin専用管理画面
import { useEffect, useState } from 'react'
import { collection, onSnapshot, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth, isSuperAdmin } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'

const ROLES = [
  { value: 'member',      label: 'メンバー',   color: 'bg-gray-100 text-gray-600' },
  { value: 'leader',      label: 'チームリーダー', color: 'bg-green-100 text-green-700' },
  { value: 'manager',     label: 'マネージャー', color: 'bg-purple-100 text-purple-700' },
  { value: 'super_admin', label: 'スーパー管理者', color: 'bg-yellow-100 text-yellow-700' },
]

export default function Admin() {
  const { user }        = useAuth()
  const navigate        = useNavigate()
  const [users, setUsers] = useState([])
  const [saving, setSaving] = useState(null)

  // super_admin以外はアクセス拒否
  useEffect(() => {
    if (user && !isSuperAdmin(user)) navigate('/home', { replace: true })
  }, [user])

  useEffect(() => {
    return onSnapshot(collection(db, 'users'), snap =>
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [])

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

  const disableUser = async (userId) => {
    if (userId === user?.uid) { alert('自分自身は無効化できません'); return }
    if (!window.confirm('このアカウントを無効化しますか？（データは保持されます）')) return
    await updateDoc(doc(db, 'users', userId), { disabled: true })
  }

  const enableUser = async (userId) => {
    await updateDoc(doc(db, 'users', userId), { disabled: false })
  }

  const roleConfig = (role) => ROLES.find(r => r.value === role) || ROLES[0]

  return (
    <AppLayout>
      <header className="sticky top-0 z-10 bg-white/85 backdrop-blur border-b border-gray-200
        px-7 py-3.5 flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] text-gray-400 tracking-widest">REGAL QUEST / ADMIN</div>
          <div className="font-display text-xl tracking-wide">管理者設定 👑</div>
        </div>
      </header>

      <main className="p-7 flex flex-col gap-6">
        {/* ロール説明 */}
        <div className="grid grid-cols-4 gap-3">
          {ROLES.map(r => (
            <div key={r.value} className={`rounded-2xl p-4 border ${r.value === 'super_admin' ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200 bg-white'}`}>
              <div className={`inline-block text-xs font-bold px-2 py-0.5 rounded mb-2 ${r.color}`}>{r.label}</div>
              <div className="text-xs text-gray-500">
                {r.value === 'super_admin' && '全権限・アカウント管理・ロール変更'}
                {r.value === 'manager' && 'メンバー管理・ミッション作成・日報コメント'}
                {r.value === 'leader' && 'チーム内のクエスト編集・日報コメント'}
                {r.value === 'member' && '通常業務・クエスト・日報・フィードバック'}
              </div>
            </div>
          ))}
        </div>

        {/* メンバー一覧 */}
        <div>
          <h2 className="font-display text-base tracking-wide mb-3">メンバー管理</h2>
          <div className="flex flex-col gap-3">
            {users.map(u => {
              const rc = roleConfig(u.role)
              const isMe = u.id === user?.uid
              const isDisabled = u.disabled === true
              return (
                <div key={u.id}
                  className={`bg-white rounded-2xl border p-4 flex items-center gap-4
                    ${isDisabled ? 'opacity-50 border-gray-200' : 'border-gray-200'}
                    ${isMe ? 'border-yellow-300 bg-yellow-50/30' : ''}`}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
                    {u.role === 'super_admin' ? '👑' : u.role === 'manager' ? '🏰' : '🧙'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{u.name || '名前なし'}</span>
                      {isMe && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-bold">自分</span>}
                      {isDisabled && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">無効化中</span>}
                    </div>
                    <div className="text-xs text-gray-400">{u.email}</div>
                  </div>

                  {/* ロール変更 */}
                  <select value={u.role || 'member'}
                    onChange={e => changeRole(u.id, e.target.value)}
                    disabled={saving === u.id}
                    className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-yellow-400 cursor-pointer">
                    {ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>

                  {/* 有効/無効化 */}
                  {!isMe && (
                    <button
                      onClick={() => isDisabled ? enableUser(u.id) : disableUser(u.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors
                        ${isDisabled
                          ? 'bg-green-50 text-green-600 hover:bg-green-100'
                          : 'bg-red-50 text-red-500 hover:bg-red-100'}`}>
                      {isDisabled ? '有効化' : '無効化'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </AppLayout>
  )
}
