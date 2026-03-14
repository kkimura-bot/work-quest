// src/pages/Ranking.jsx — ランキング画面
import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { calcLevel, getTitle } from '../lib/xp'
import AppLayout from '../components/layout/AppLayout'

const TABS = ['週間XP', '累計XP', 'クエスト数']
const MEDAL = ['🥇','🥈','🥉']

export default function Ranking() {
  const { user }    = useAuth()
  const [tab, setTab]       = useState(0)
  const [users, setUsers]   = useState([])
  const [weeklyXp, setWeeklyXp] = useState({}) // userId: xp
  const [questCount, setQuestCount] = useState({}) // userId: count

  // 全ユーザー購読
  useEffect(() => {
    return onSnapshot(collection(db, 'users'), snap =>
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [])

  // 今週のXPを集計
  useEffect(() => {
    const now  = new Date()
    const day  = now.getDay()
    const diff = day === 0 ? 6 : day - 1
    const monday = new Date(now)
    monday.setDate(now.getDate() - diff)
    monday.setHours(0,0,0,0)
    const nextMonday = new Date(monday)
    nextMonday.setDate(monday.getDate() + 7)

    const q = query(
      collection(db, 'quests'),
      where('status', '==', 'done'),
      where('completedAt', '>=', Timestamp.fromDate(monday)),
      where('completedAt', '<', Timestamp.fromDate(nextMonday)),
    )
    return onSnapshot(q, snap => {
      const map = {}
      snap.docs.forEach(d => {
        const { userId, xp } = d.data()
        map[userId] = (map[userId] || 0) + (xp || 0)
      })
      setWeeklyXp(map)
    })
  }, [])

  // 累計クエスト数を集計
  useEffect(() => {
    const q = query(collection(db, 'quests'), where('status', '==', 'done'))
    return onSnapshot(q, snap => {
      const map = {}
      snap.docs.forEach(d => {
        const { userId } = d.data()
        map[userId] = (map[userId] || 0) + 1
      })
      setQuestCount(map)
    })
  }, [])

  // タブに応じてソート
  const ranked = [...users].sort((a, b) => {
    if (tab === 0) return (weeklyXp[b.id] || 0) - (weeklyXp[a.id] || 0)
    if (tab === 1) return (b.xp || 0) - (a.xp || 0)
    if (tab === 2) return (questCount[b.id] || 0) - (questCount[a.id] || 0)
    return 0
  })

  const getScore = (u) => {
    if (tab === 0) return `${weeklyXp[u.id] || 0} XP`
    if (tab === 1) return `${u.xp || 0} XP`
    if (tab === 2) return `${questCount[u.id] || 0} 本`
  }

  // 週間MVPバッジ
  const weeklyMvp = ranked[0]

  return (
    <AppLayout>
      <header className="sticky top-0 z-10 bg-white/85 backdrop-blur border-b border-gray-200
        px-7 py-3.5 flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] text-gray-400 tracking-widest">REGAL QUEST / RANKING</div>
          <div className="font-display text-xl tracking-wide">ランキング 🏆</div>
        </div>
      </header>

      <main className="p-7 flex flex-col gap-6">
        {/* タブ */}
        <div className="flex rounded-2xl overflow-hidden border border-gray-200 bg-white">
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)}
              className={`flex-1 py-3 text-sm font-bold transition-all
                ${tab === i ? 'text-white' : 'text-gray-400 hover:text-gray-600'}`}
              style={tab === i ? { background:'linear-gradient(135deg,#ff6b6b,#ff9500)' } : {}}>
              {t}
            </button>
          ))}
        </div>

        {/* TOP3 ヒーローカード */}
        {ranked.length >= 3 && (
          <div className="grid grid-cols-3 gap-3">
            {[1, 0, 2].map(pos => { // 2位・1位・3位の順に表示
              const u = ranked[pos]
              if (!u) return null
              const isFirst = pos === 0
              const level = calcLevel(u.xp || 0)
              return (
                <div key={u.id}
                  className={`rounded-2xl p-4 text-center flex flex-col items-center gap-2
                    ${isFirst ? 'col-start-2 row-start-1' : ''}`}
                  style={isFirst
                    ? { background:'linear-gradient(135deg,#1a1a2e,#2d2d5e)', color:'white', boxShadow:'0 8px 32px rgba(0,0,0,0.2)' }
                    : { background:'#f8f8f8', border:'1px solid #eee' }}>
                  <div className="text-3xl">{MEDAL[pos]}</div>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                    style={{ background: isFirst ? 'rgba(255,149,0,0.2)' : '#e8e8e8' }}>
                    👤
                  </div>
                  <div>
                    <div className={`font-bold text-sm ${isFirst ? 'text-white' : 'text-gray-800'}`}>
                      {u.name || u.email}
                    </div>
                    <div className={`text-[10px] font-mono ${isFirst ? 'text-white/60' : 'text-gray-400'}`}>
                      Lv.{level} {getTitle(level)}
                    </div>
                  </div>
                  <div className={`font-display text-xl font-bold ${isFirst ? 'text-orange-400' : 'text-gray-600'}`}>
                    {getScore(u)}
                  </div>
                  {isFirst && tab === 0 && (
                    <div className="text-[10px] bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-bold">
                      ⭐ 週間MVP
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* 全員リスト */}
        <div className="flex flex-col gap-2">
          {ranked.map((u, i) => {
            const isMe = u.id === user?.uid
            const level = calcLevel(u.xp || 0)
            return (
              <div key={u.id}
                className={`rounded-2xl p-4 flex items-center gap-4 border transition-all
                  ${isMe ? 'border-orange-300 bg-orange-50/50' : 'border-gray-200 bg-white'}`}>
                <div className={`w-8 text-center font-display text-lg flex-shrink-0
                  ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-gray-300'}`}>
                  {i < 3 ? MEDAL[i] : `${i+1}`}
                </div>
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xl flex-shrink-0">
                  👤
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm truncate">{u.name || u.email}</span>
                    {isMe && <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-bold">自分</span>}
                  </div>
                  <div className="text-xs text-gray-400">Lv.{level} {getTitle(level)}</div>
                </div>
                <div className={`font-display text-lg font-bold flex-shrink-0
                  ${isMe ? 'text-orange-500' : 'text-gray-700'}`}>
                  {getScore(u)}
                </div>
              </div>
            )
          })}
        </div>

        {ranked.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            <div className="text-4xl mb-3">🏆</div>
            <div>まだランキングデータがありません</div>
          </div>
        )}
      </main>
    </AppLayout>
  )
}
