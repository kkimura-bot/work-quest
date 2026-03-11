// src/pages/Members.jsx
import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot,
  doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { levelProgress, getTitle } from '../lib/xp'
import AppLayout from '../components/layout/AppLayout'

const ROLE_LABELS = { manager: 'マネージャー', member: 'メンバー' }
const ROLE_COLORS = {
  manager: 'bg-purple-50 text-purple-600 border-purple-200',
  member:  'bg-blue-50 text-blue-500 border-blue-200',
}

export default function Members() {
  const { user }            = useAuth()
  const [members, setMembers] = useState([])
  const [search, setSearch]   = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('xp', 'desc'))
    return onSnapshot(q, snap =>
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [])

  const filtered = members.filter(m =>
    m.name?.includes(search) || m.email?.includes(search)
  )

  const handleRoleChange = async (memberId, newRole) => {
    await updateDoc(doc(db, 'users', memberId), { role: newRole })
  }

  return (
    <AppLayout>
      {/* トップバー */}
      <header className="sticky top-0 z-10 bg-white/85 backdrop-blur border-b border-gray-200
        px-7 py-3.5 flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] text-gray-400 tracking-widest">REGAL QUEST / GUILD</div>
          <div className="font-display text-xl tracking-wide">メンバー一覧 👥</div>
        </div>
        {/* 検索 */}
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 w-56">
          <span className="text-gray-400 text-sm">🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="名前・メールで検索"
            className="bg-transparent text-sm flex-1 focus:outline-none text-gray-700"
          />
        </div>
      </header>

      <main className="p-7 flex flex-col gap-6">

        {/* サマリー */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { val: members.length, label: '総メンバー数', icon: '👥', color: 'text-gray-700' },
            { val: members.filter(m => m.role === 'manager').length, label: 'マネージャー', icon: '👑', color: 'text-purple-500' },
            { val: members.filter(m => m.role !== 'manager').length, label: 'メンバー', icon: '⚔️', color: 'text-blue-500' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="text-3xl">{s.icon}</div>
              <div>
                <div className={`font-display text-3xl ${s.color}`}>{s.val}</div>
                <div className="font-mono text-[10px] text-gray-400 tracking-widest">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* メンバーカード一覧 */}
        <div className="grid grid-cols-2 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-2 bg-white border-2 border-dashed border-gray-200 rounded-2xl
              p-10 text-center text-gray-400">
              <div className="text-4xl mb-3">👥</div>
              <div className="font-bold">メンバーが見つかりません</div>
            </div>
          ) : (
            filtered.map(m => (
              <MemberCard
                key={m.id}
                member={m}
                isCurrentUser={m.id === user?.uid}
                onRoleChange={handleRoleChange}
                onSelect={() => setSelected(selected?.id === m.id ? null : m)}
              />
            ))
          )}
        </div>
      </main>

      {/* メンバー詳細モーダル */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: 'linear-gradient(135deg,#ff6b6b,#ff9500)' }}>
                🧙
              </div>
              <div>
                <div className="font-display text-xl">{selected.name}</div>
                <div className="text-sm text-gray-400">{selected.email}</div>
              </div>
            </div>
            <div className="space-y-3 mb-5">
              {[
                { label: 'レベル',   val: `Lv.${levelProgress(selected.xp ?? 0).level}` },
                { label: '称号',     val: getTitle(levelProgress(selected.xp ?? 0).level) },
                { label: '累計XP',   val: `${selected.xp ?? 0} XP` },
                { label: 'ロール',   val: ROLE_LABELS[selected.role] || 'メンバー' },
              ].map((r, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-400">{r.label}</span>
                  <span className="text-sm font-bold">{r.val}</span>
                </div>
              ))}
            </div>
            {/* ロール変更 */}
            <div className="mb-4">
              <div className="text-xs font-mono text-gray-400 tracking-widest mb-2">ロール変更</div>
              <div className="flex gap-2">
                {['member', 'manager'].map(role => (
                  <button key={role}
                    onClick={() => handleRoleChange(selected.id, role)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all
                      ${selected.role === role
                        ? role === 'manager'
                          ? 'bg-purple-500 text-white border-purple-500'
                          : 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}>
                    {ROLE_LABELS[role]}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => setSelected(null)}
              className="w-full py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">
              閉じる
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  )
}

function MemberCard({ member, isCurrentUser, onRoleChange, onSelect }) {
  const { level, progress } = levelProgress(member.xp ?? 0)
  const title = getTitle(level)

  return (
    <div
      onClick={onSelect}
      className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm
        hover:shadow-md hover:-translate-y-px transition-all cursor-pointer">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#ff6b6b,#ff9500)' }}>
          🧙
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-bold text-sm truncate">{member.name}</div>
            {isCurrentUser && (
              <span className="text-[10px] font-mono text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">YOU</span>
            )}
          </div>
          <div className="text-xs text-gray-400 truncate">{member.email}</div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border flex-shrink-0
          ${ROLE_COLORS[member.role] || ROLE_COLORS.member}`}>
          {ROLE_LABELS[member.role] || 'メンバー'}
        </span>
      </div>

      {/* レベル・称号 */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-xs font-bold px-2 py-1 rounded-md text-white"
          style={{ background: 'linear-gradient(135deg,#ff6b6b,#ff9500)' }}>
          Lv.{level}
        </span>
        <span className="text-xs text-gray-500">{title}</span>
        <span className="font-mono text-xs text-gray-400">{member.xp ?? 0} XP</span>
      </div>

      {/* XPバー */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all"
          style={{ width: `${progress * 100}%`,
            background: 'linear-gradient(90deg,#ff6b6b,#ff9500)' }} />
      </div>
    </div>
  )
}
