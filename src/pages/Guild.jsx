// src/pages/Guild.jsx
import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, getDocs, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { levelProgress, getTitle } from '../lib/xp'
import AppLayout from '../components/layout/AppLayout'

function getWeekRange() {
  const now = new Date()
  const day = now.getDay() === 0 ? 7 : now.getDay()
  const mon = new Date(now); mon.setDate(now.getDate() - day + 1); mon.setHours(0,0,0,0)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23,59,59,999)
  return { mon, sun }
}

const RANK_COLORS = [
  'from-yellow-400 to-yellow-500',
  'from-gray-300 to-gray-400',
  'from-orange-400 to-orange-500',
]

export default function Guild() {
  const { user } = useAuth()
  const [members, setMembers]   = useState([])
  const [allQuests, setAllQuests] = useState([])
  const [loading, setLoading]   = useState(true)
  const { mon } = getWeekRange()

  // メンバー一覧をリアルタイム購読
  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('xp', 'desc'))
    return onSnapshot(q, snap => {
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [])

  // 今週の全クエストを取得
  useEffect(() => {
    const fetchQuests = async () => {
      const q = query(
        collection(db, 'quests'),
        where('createdAt', '>=', mon),
        orderBy('createdAt', 'desc')
      )
      const snap = await getDocs(q)
      setAllQuests(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }
    fetchQuests()
  }, [])

  // 全体統計
  const totalMembers = members.length
  const activeMembers = [...new Set(allQuests.map(q => q.userId))].length
  const totalQuestsThisWeek = allQuests.length
  const doneQuestsThisWeek  = allQuests.filter(q => q.status === 'done').length
  const totalXPThisWeek     = allQuests.filter(q => q.status === 'done').reduce((s, q) => s + (q.xp ?? 0), 0)

  // メンバーごとの今週のクエスト数
  const memberStats = members.map(m => {
    const mq    = allQuests.filter(q => q.userId === m.id)
    const done  = mq.filter(q => q.status === 'done')
    const xp    = done.reduce((s, q) => s + (q.xp ?? 0), 0)
    const { level } = levelProgress(m.xp ?? 0)
    return { ...m, weekQuests: mq.length, weekDone: done.length, weekXP: xp, level }
  }).sort((a, b) => b.weekXP - a.weekXP)

  return (
    <AppLayout>
      {/* トップバー */}
      <header className="sticky top-0 z-10 bg-white/85 backdrop-blur border-b border-gray-200
        px-7 py-3.5 flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] text-gray-400 tracking-widest">REGAL QUEST / GUILD</div>
          <div className="font-display text-xl tracking-wide">ギルドダッシュボード 🏰</div>
        </div>
        <div className="font-mono text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">
          👥 メンバー {totalMembers}名
        </div>
      </header>

      <main className="p-7 flex flex-col gap-6">

        {/* ギルドサマリーカード */}
        <div className="rounded-2xl p-7 text-white relative overflow-hidden"
          style={{ background: '#16133a', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 75% 50%, rgba(102,126,234,0.2) 0%, transparent 60%)' }} />
          <div className="relative z-10">
            <div className="font-mono text-white/30 text-[11px] tracking-widest mb-1">THIS WEEK</div>
            <div className="font-display text-3xl tracking-wide mb-5">
              ギルドの <span style={{ WebkitTextFillColor: 'transparent',
                background: 'linear-gradient(135deg,#667eea,#764ba2)',
                WebkitBackgroundClip: 'text' }}>活躍</span>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {[
                { val: totalMembers,          label: '総メンバー',     color: 'text-white' },
                { val: activeMembers,          label: 'アクティブ',    color: 'text-blue-400' },
                { val: totalQuestsThisWeek,    label: '総クエスト',    color: 'text-white' },
                { val: doneQuestsThisWeek,     label: 'クリア数',      color: 'text-green-400' },
                { val: totalXPThisWeek + ' XP',label: '総獲得XP',     color: 'text-yellow-400' },
              ].map((s, i) => (
                <div key={i} className="rounded-xl py-3 px-2 text-center"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className={`font-display text-xl ${s.color}`}>{s.val}</div>
                  <div className="font-mono text-white/25 text-[9px] tracking-widest mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">

          {/* 週間ランキング TOP3 */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="font-display text-sm tracking-wide mb-4">🏆 今週のランキング</h3>
            {memberStats.slice(0, 3).map((m, i) => (
              <div key={m.id} className={`flex items-center gap-3 mb-3 p-3 rounded-xl
                ${i === 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center
                  text-white text-xs font-bold flex-shrink-0 bg-gradient-to-br ${RANK_COLORS[i] || 'from-gray-400 to-gray-500'}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">{m.name}</div>
                  <div className="font-mono text-[10px] text-gray-400">
                    {getTitle(m.level)} · Lv.{m.level}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-display text-sm text-orange-500">+{m.weekXP} XP</div>
                  <div className="font-mono text-[10px] text-gray-400">{m.weekDone}クリア</div>
                </div>
              </div>
            ))}
            {memberStats.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-4">
                まだデータがありません
              </div>
            )}
          </div>

          {/* 今週のクエスト完了率 */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="font-display text-sm tracking-wide mb-4">📊 今週の完了率</h3>
            <div className="flex flex-col items-center justify-center h-32">
              <div className="relative w-24 h-24">
                <svg width="96" height="96" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="38" fill="none" stroke="#f3f4f6" strokeWidth="9"/>
                  <circle cx="48" cy="48" r="38" fill="none"
                    stroke="url(#guildProg)" strokeWidth="9" strokeLinecap="round"
                    strokeDasharray="238.76"
                    strokeDashoffset={238.76 * (1 - (totalQuestsThisWeek ? doneQuestsThisWeek / totalQuestsThisWeek : 0))}
                    transform="rotate(-90 48 48)"/>
                  <defs>
                    <linearGradient id="guildProg" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#667eea"/>
                      <stop offset="100%" stopColor="#764ba2"/>
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="font-display text-2xl text-gray-700">
                    {totalQuestsThisWeek
                      ? Math.round(doneQuestsThisWeek / totalQuestsThisWeek * 100)
                      : 0}%
                  </div>
                  <div className="font-mono text-gray-400 text-[9px]">
                    {doneQuestsThisWeek}/{totalQuestsThisWeek}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* アクティブ率 */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="font-display text-sm tracking-wide mb-4">⚡ アクティブ率</h3>
            <div className="flex flex-col items-center justify-center h-32">
              <div className="font-display text-5xl text-blue-500 mb-1">
                {totalMembers ? Math.round(activeMembers / totalMembers * 100) : 0}%
              </div>
              <div className="font-mono text-xs text-gray-400">
                {activeMembers} / {totalMembers} 名が今週活動
              </div>
            </div>
          </div>
        </div>

        {/* メンバー一覧テーブル */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-display text-sm tracking-wide">👥 メンバー一覧</h3>
          </div>
          {loading ? (
            <div className="text-center text-gray-400 py-8 font-mono text-sm">読み込み中...</div>
          ) : memberStats.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <div className="text-3xl mb-2">👥</div>
              <div className="text-sm">メンバーがいません</div>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['順位', 'メンバー', 'レベル', '今週クエスト', '今週クリア', '今週XP', '累計XP'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-mono text-[10px] text-gray-400 tracking-widest">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {memberStats.map((m, i) => (
                  <tr key={m.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors
                    ${i === 0 ? 'bg-yellow-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center
                        text-white text-xs font-bold bg-gradient-to-br
                        ${RANK_COLORS[i] || 'from-gray-200 to-gray-300'}`}>
                        {i < 3 ? i + 1 : <span className="text-gray-500">{i + 1}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg,#ff6b6b,#ff9500)' }}>
                          🧙
                        </div>
                        <div>
                          <div className="text-sm font-bold">{m.name}</div>
                          <div className="font-mono text-[10px] text-gray-400">{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-bold px-2 py-1 rounded-md text-white"
                        style={{ background: 'linear-gradient(135deg,#ff6b6b,#ff9500)' }}>
                        Lv.{m.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-display text-sm text-gray-600">{m.weekQuests}</td>
                    <td className="px-4 py-3 font-display text-sm text-green-500">{m.weekDone}</td>
                    <td className="px-4 py-3 font-display text-sm text-orange-500">+{m.weekXP}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{m.xp ?? 0} XP</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </main>
    </AppLayout>
  )
}
