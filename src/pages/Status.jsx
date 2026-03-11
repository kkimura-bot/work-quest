// src/pages/Status.jsx
import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { levelProgress, getTitle, LEVEL_THRESHOLDS } from '../lib/xp'
import AppLayout from '../components/layout/AppLayout'

const CATEGORY_COLORS = {
  '採用':       'bg-pink-50 text-pink-500 border-pink-200',
  '教育':       'bg-blue-50 text-blue-500 border-blue-200',
  '営業':       'bg-green-50 text-green-500 border-green-200',
  '企画':       'bg-purple-50 text-purple-500 border-purple-200',
  'ドキュメント':'bg-yellow-50 text-yellow-600 border-yellow-200',
  'ミーティング':'bg-orange-50 text-orange-500 border-orange-200',
  'その他':     'bg-gray-50 text-gray-500 border-gray-200',
}

export default function Status() {
  const { user } = useAuth()
  const [quests, setQuests]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetchAll = async () => {
      const q = query(
        collection(db, 'quests'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      )
      const snap = await getDocs(q)
      setQuests(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }
    fetchAll()
  }, [user])

  const done    = quests.filter(q => q.status === 'done')
  const totalXP = done.reduce((s, q) => s + (q.xp ?? 0), 0)
  const { level, progress, remaining } = levelProgress(user?.xp ?? 0)
  const title   = getTitle(level)

  // カテゴリ別集計
  const categoryStats = {}
  done.forEach(q => {
    const c = q.category || 'その他'
    if (!categoryStats[c]) categoryStats[c] = { count: 0, xp: 0 }
    categoryStats[c].count++
    categoryStats[c].xp += q.xp ?? 0
  })
  const categoryList = Object.entries(categoryStats)
    .sort((a, b) => b[1].count - a[1].count)

  // 難易度別集計
  const diffStats = [1,2,3,4,5].map(d => ({
    d,
    count: done.filter(q => q.difficulty === d).length
  }))
  const maxDiff = Math.max(...diffStats.map(s => s.count), 1)

  // 連続記録（連続日数）
  const dates = [...new Set(quests.map(q => {
    const d = q.createdAt?.toDate ? q.createdAt.toDate() : new Date()
    return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`
  }))].sort().reverse()

  let streak = 0
  const today = new Date()
  for (let i = 0; i < dates.length; i++) {
    const check = new Date(today)
    check.setDate(today.getDate() - i)
    const key = `${check.getFullYear()}-${check.getMonth()+1}-${check.getDate()}`
    if (dates.includes(key)) streak++
    else break
  }

  // 称号リスト
  const titles = [
    { label: '見習い冒険者', minLevel: 1,  icon: '🌱' },
    { label: '駆け出し冒険者', minLevel: 3,  icon: '⚔️' },
    { label: '一人前冒険者', minLevel: 5,  icon: '🛡' },
    { label: '熟練冒険者',   minLevel: 10, icon: '🗡' },
    { label: 'エース',       minLevel: 15, icon: '🏆' },
    { label: '伝説の冒険者', minLevel: 20, icon: '👑' },
  ]

  return (
    <AppLayout>
      {/* トップバー */}
      <header className="sticky top-0 z-10 bg-white/85 backdrop-blur border-b border-gray-200
        px-7 py-3.5 flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] text-gray-400 tracking-widest">REGAL QUEST / PROFILE</div>
          <div className="font-display text-xl tracking-wide">マイステータス 💎</div>
        </div>
      </header>

      <main className="p-7 flex flex-col gap-6">

        {/* プロフィールカード */}
        <div className="rounded-2xl p-7 text-white relative overflow-hidden"
          style={{ background: '#1a1a2e', boxShadow: '0 8px 40px rgba(0,0,0,0.15)' }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 80% 50%, rgba(167,139,250,0.15) 0%, transparent 60%)' }} />
          <div className="relative z-10 flex items-center gap-6">
            {/* アバター */}
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#ff6b6b,#ff9500)',
                boxShadow: '0 0 0 3px rgba(255,149,0,0.3)' }}>
              🧙
            </div>
            {/* 情報 */}
            <div className="flex-1">
              <div className="font-display text-3xl tracking-wide mb-1">{user?.name}</div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-md mb-4"
                style={{ background: 'rgba(255,149,0,0.15)', border: '1px solid rgba(255,149,0,0.3)', color: '#ff9500' }}>
                🏅 {title} · Level {level}
              </div>
              {/* XPバー */}
              <div>
                <div className="flex justify-between font-mono text-[10px] text-white/30 mb-1.5">
                  <span>EXP: {user?.xp ?? 0} XP</span>
                  <span>次のレベルまで あと {remaining} XP</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden bg-white/8 w-full">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${progress * 100}%`,
                      background: 'linear-gradient(90deg,#ff6b6b,#ff9500)',
                      boxShadow: '0 0 12px rgba(255,149,0,0.5)' }} />
                </div>
              </div>
            </div>
            {/* 連続記録 */}
            <div className="flex-shrink-0 text-center px-6 py-4 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="font-display text-4xl text-orange-400">{streak}</div>
              <div className="font-mono text-white/30 text-[10px] tracking-widest mt-1">DAY STREAK 🔥</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* 統計カード */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="font-display text-sm tracking-wide mb-4 flex items-center gap-2">
              📊 クエスト統計
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { val: quests.length,  label: '総クエスト数', color: 'text-gray-700' },
                { val: done.length,    label: 'クリア数',     color: 'text-green-500' },
                { val: (user?.xp ?? 0) + ' XP', label: '総獲得XP', color: 'text-orange-500' },
                { val: streak + '日',  label: '連続記録',     color: 'text-red-500' },
              ].map((s, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className={`font-display text-2xl ${s.color}`}>{s.val}</div>
                  <div className="font-mono text-gray-400 text-[10px] tracking-widest mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 難易度分布 */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="font-display text-sm tracking-wide mb-4">⭐ 難易度分布</h3>
            <div className="flex flex-col gap-2">
              {diffStats.map(({ d, count }) => (
                <div key={d} className="flex items-center gap-2">
                  <div className="text-yellow-400 text-xs w-20 flex-shrink-0">
                    {'★'.repeat(d)}{'☆'.repeat(5-d)}
                  </div>
                  <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(count / maxDiff) * 100}%`,
                        background: 'linear-gradient(90deg,#ff6b6b,#ff9500)' }} />
                  </div>
                  <div className="font-mono text-xs text-gray-400 w-6 text-right">{count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* カテゴリ別実績 */}
        {categoryList.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="font-display text-sm tracking-wide mb-4">🗂 カテゴリ別実績</h3>
            <div className="flex flex-wrap gap-2">
              {categoryList.map(([cat, stats]) => (
                <div key={cat}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold
                    ${CATEGORY_COLORS[cat] || CATEGORY_COLORS['その他']}`}>
                  <span>{cat}</span>
                  <span className="opacity-60">{stats.count}件</span>
                  <span className="opacity-60">+{stats.xp}XP</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 称号ロードマップ */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-display text-sm tracking-wide mb-4">👑 称号ロードマップ</h3>
          <div className="flex flex-col gap-2">
            {titles.map((t, i) => {
              const unlocked = level >= t.minLevel
              const current  = title === t.label
              return (
                <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                  ${current ? 'border-2 border-orange-300 bg-orange-50'
                    : unlocked ? 'bg-green-50 border border-green-200'
                    : 'bg-gray-50 border border-gray-100 opacity-50'}`}>
                  <div className="text-xl">{t.icon}</div>
                  <div className="flex-1">
                    <div className={`text-sm font-bold ${current ? 'text-orange-600' : unlocked ? 'text-green-600' : 'text-gray-400'}`}>
                      {t.label}
                    </div>
                    <div className="font-mono text-[10px] text-gray-400">Lv.{t.minLevel} から</div>
                  </div>
                  {current && (
                    <span className="text-xs font-bold text-orange-500 bg-orange-100 px-2 py-1 rounded-full">現在</span>
                  )}
                  {unlocked && !current && (
                    <span className="text-xs font-bold text-green-500 bg-green-100 px-2 py-1 rounded-full">✓ 解放済み</span>
                  )}
                  {!unlocked && (
                    <span className="font-mono text-[10px] text-gray-400">Lv.{t.minLevel} 必要</span>
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
