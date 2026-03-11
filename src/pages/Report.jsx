// src/pages/Report.jsx
import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import AppLayout from '../components/layout/AppLayout'

function getWeekStart(offset = 0) {
  const now = new Date()
  const day = now.getDay() === 0 ? 7 : now.getDay()
  const mon = new Date(now)
  mon.setDate(now.getDate() - day + 1 - offset * 7)
  mon.setHours(0, 0, 0, 0)
  return mon
}

function formatWeekLabel(mon) {
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  return `${mon.getMonth()+1}/${mon.getDate()} – ${sun.getMonth()+1}/${sun.getDate()}`
}

const CATEGORY_ICONS = {
  '採用': '🎯', '教育': '📚', '営業': '💼', '企画': '💡',
  'ドキュメント': '📄', 'ミーティング': '🤝', 'その他': '📌'
}

export default function Report() {
  const { user } = useAuth()
  const [weekOffset, setWeekOffset] = useState(0)
  const [members, setMembers]   = useState([])
  const [quests, setQuests]     = useState([])
  const [goals, setGoals]       = useState([])
  const [loading, setLoading]   = useState(true)

  const weekStart = getWeekStart(weekOffset)
  const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      // メンバー
      const mSnap = await getDocs(query(collection(db, 'users')))
      setMembers(mSnap.docs.map(d => ({ id: d.id, ...d.data() })))

      // クエスト
      const qSnap = await getDocs(query(
        collection(db, 'quests'),
        where('createdAt', '>=', weekStart),
        where('createdAt', '<', weekEnd),
        orderBy('createdAt', 'desc')
      ))
      setQuests(qSnap.docs.map(d => ({ id: d.id, ...d.data() })))

      // 週次目標
      const gSnap = await getDocs(query(
        collection(db, 'weeklyGoals'),
        where('createdAt', '>=', weekStart),
        where('createdAt', '<', weekEnd),
        orderBy('createdAt', 'desc')
      ))
      setGoals(gSnap.docs.map(d => ({ id: d.id, ...d.data() })))

      setLoading(false)
    }
    fetchData()
  }, [weekOffset])

  const done      = quests.filter(q => q.status === 'done')
  const totalXP   = done.reduce((s, q) => s + (q.xp ?? 0), 0)
  const avgGoalRate = goals.length
    ? Math.round(goals.reduce((s, g) => s + (g.achievementRate ?? 0), 0) / goals.length)
    : 0

  // カテゴリ別集計
  const catStats = {}
  done.forEach(q => {
    const c = q.category || 'その他'
    if (!catStats[c]) catStats[c] = { count: 0, xp: 0 }
    catStats[c].count++
    catStats[c].xp += q.xp ?? 0
  })
  const catList = Object.entries(catStats).sort((a, b) => b[1].count - a[1].count)
  const maxCat  = Math.max(...catList.map(([,s]) => s.count), 1)

  // メンバー別集計
  const memberStats = members.map(m => {
    const mq   = quests.filter(q => q.userId === m.id)
    const mdone = mq.filter(q => q.status === 'done')
    const mg   = goals.filter(g => g.userId === m.id)
    return {
      ...m,
      questCount: mq.length,
      doneCount:  mdone.length,
      xp:         mdone.reduce((s, q) => s + (q.xp ?? 0), 0),
      goalRate:   mg.length
        ? Math.round(mg.reduce((s, g) => s + (g.achievementRate ?? 0), 0) / mg.length)
        : null,
    }
  }).filter(m => m.questCount > 0).sort((a, b) => b.xp - a.xp)

  return (
    <AppLayout>
      {/* トップバー */}
      <header className="sticky top-0 z-10 bg-white/85 backdrop-blur border-b border-gray-200
        px-7 py-3.5 flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] text-gray-400 tracking-widest">REGAL QUEST / REPORT</div>
          <div className="font-display text-xl tracking-wide">週次レポート 📊</div>
        </div>
        {/* 週切り替え */}
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(w => w + 1)}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center
              text-gray-500 hover:bg-gray-50 transition-colors text-sm">
            ‹
          </button>
          <div className="font-mono text-xs text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg min-w-32 text-center">
            📅 {formatWeekLabel(weekStart)}
            {weekOffset === 0 && <span className="ml-1 text-orange-500">今週</span>}
          </div>
          <button onClick={() => setWeekOffset(w => Math.max(0, w - 1))}
            disabled={weekOffset === 0}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center
              text-gray-500 hover:bg-gray-50 transition-colors text-sm disabled:opacity-30">
            ›
          </button>
        </div>
      </header>

      <main className="p-7 flex flex-col gap-6">

        {loading ? (
          <div className="text-center text-gray-400 py-20 font-mono text-sm">読み込み中...</div>
        ) : (
          <>
            {/* KPIカード */}
            <div className="rounded-2xl p-7 text-white relative overflow-hidden"
              style={{ background: '#1a1a2e', boxShadow: '0 8px 40px rgba(0,0,0,0.15)' }}>
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(circle at 80% 50%, rgba(56,239,125,0.08) 0%, transparent 60%)' }} />
              <div className="relative z-10">
                <div className="font-mono text-white/30 text-[11px] tracking-widest mb-1">
                  WEEKLY REPORT · {formatWeekLabel(weekStart)}
                </div>
                <div className="font-display text-3xl tracking-wide mb-5">
                  週間 <span style={{ WebkitTextFillColor: 'transparent',
                    background: 'linear-gradient(135deg,#38ef7d,#11998e)',
                    WebkitBackgroundClip: 'text' }}>サマリー</span>
                </div>
                <div className="grid grid-cols-5 gap-3">
                  {[
                    { val: quests.length,        label: '総クエスト',   color: 'text-white' },
                    { val: done.length,           label: 'クリア数',     color: 'text-green-400' },
                    { val: quests.length
                        ? Math.round(done.length / quests.length * 100) + '%'
                        : '–',                   label: '完了率',       color: 'text-blue-400' },
                    { val: totalXP + ' XP',       label: '総獲得XP',     color: 'text-yellow-400' },
                    { val: avgGoalRate + '%',      label: '目標達成率',   color: 'text-purple-400' },
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

            <div className="grid grid-cols-2 gap-6">
              {/* カテゴリ別内訳 */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h3 className="font-display text-sm tracking-wide mb-4">🗂 カテゴリ別内訳</h3>
                {catList.length === 0 ? (
                  <div className="text-center text-gray-300 py-8 text-sm">データなし</div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {catList.map(([cat, stats]) => (
                      <div key={cat} className="flex items-center gap-2">
                        <div className="text-base w-6">{CATEGORY_ICONS[cat] || '📌'}</div>
                        <div className="text-xs font-bold text-gray-600 w-20 flex-shrink-0">{cat}</div>
                        <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full"
                            style={{ width: `${(stats.count / maxCat) * 100}%`,
                              background: 'linear-gradient(90deg,#667eea,#764ba2)' }} />
                        </div>
                        <div className="font-mono text-xs text-gray-400 w-12 text-right">
                          {stats.count}件
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 目標達成率 */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h3 className="font-display text-sm tracking-wide mb-4">🎯 週次目標達成率</h3>
                <div className="flex flex-col items-center justify-center h-32">
                  <div className="relative w-24 h-24">
                    <svg width="96" height="96" viewBox="0 0 96 96">
                      <circle cx="48" cy="48" r="38" fill="none" stroke="#f3f4f6" strokeWidth="9"/>
                      <circle cx="48" cy="48" r="38" fill="none"
                        stroke="url(#reportProg)" strokeWidth="9" strokeLinecap="round"
                        strokeDasharray="238.76"
                        strokeDashoffset={238.76 * (1 - avgGoalRate / 100)}
                        transform="rotate(-90 48 48)"/>
                      <defs>
                        <linearGradient id="reportProg" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#a78bfa"/>
                          <stop offset="100%" stopColor="#7c3aed"/>
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="font-display text-2xl text-gray-700">{avgGoalRate}%</div>
                      <div className="font-mono text-gray-400 text-[9px]">{goals.length}目標</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* メンバー別成績 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-display text-sm tracking-wide">👥 メンバー別成績</h3>
              </div>
              {memberStats.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <div className="text-3xl mb-2">📭</div>
                  <div className="text-sm">この週のデータがありません</div>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['順位', 'メンバー', 'クエスト数', 'クリア数', '完了率', '獲得XP', '目標達成率'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-mono text-[10px] text-gray-400 tracking-widest">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {memberStats.map((m, i) => (
                      <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center
                            text-white text-xs font-bold
                            ${i === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500'
                              : i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400'
                              : i === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-500'
                              : 'bg-gray-200 text-gray-500'}`}>
                            {i + 1}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-sm">{m.name}</div>
                          <div className="font-mono text-[10px] text-gray-400">{m.email}</div>
                        </td>
                        <td className="px-4 py-3 font-display text-sm text-gray-600">{m.questCount}</td>
                        <td className="px-4 py-3 font-display text-sm text-green-500">{m.doneCount}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-12">
                              <div className="h-full rounded-full"
                                style={{ width: `${m.questCount ? (m.doneCount / m.questCount * 100) : 0}%`,
                                  background: 'linear-gradient(90deg,#11998e,#38ef7d)' }} />
                            </div>
                            <span className="font-mono text-xs text-gray-500">
                              {m.questCount ? Math.round(m.doneCount / m.questCount * 100) : 0}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-display text-sm text-orange-500">+{m.xp}</td>
                        <td className="px-4 py-3">
                          {m.goalRate !== null ? (
                            <span className={`font-mono text-xs font-bold px-2 py-1 rounded-lg
                              ${m.goalRate >= 100 ? 'bg-green-50 text-green-600'
                                : m.goalRate >= 50 ? 'bg-yellow-50 text-yellow-600'
                                : 'bg-red-50 text-red-500'}`}>
                              {m.goalRate}%
                            </span>
                          ) : (
                            <span className="font-mono text-xs text-gray-300">–</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </main>
    </AppLayout>
  )
}
