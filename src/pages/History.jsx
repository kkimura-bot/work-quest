// src/pages/History.jsx
import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import AppLayout from '../components/layout/AppLayout'

const DIFFICULTY_LABEL = { 1:'★☆☆☆☆', 2:'★★☆☆☆', 3:'★★★☆☆', 4:'★★★★☆', 5:'★★★★★' }

const STATUS_COLORS = {
  done:        'bg-green-50 text-green-600 border-green-200',
  in_progress: 'bg-orange-50 text-orange-500 border-orange-200',
  todo:        'bg-gray-50 text-gray-400 border-gray-200',
}
const STATUS_LABELS = { done:'クリア！', in_progress:'進行中', todo:'未着手' }

function formatDate(ts) {
  if (!ts) return '–'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function groupByDate(quests) {
  const groups = {}
  quests.forEach(q => {
    const d = q.createdAt?.toDate ? q.createdAt.toDate() : new Date()
    const key = `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`
    if (!groups[key]) groups[key] = []
    groups[key].push(q)
  })
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
}

export default function History() {
  const { user } = useAuth()
  const [quests, setQuests]   = useState([])
  const [filter, setFilter]   = useState('all') // all / done / in_progress
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'quests'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(100)
    )
    return onSnapshot(q, snap => {
      setQuests(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
  }, [user])

  const filtered = filter === 'all' ? quests : quests.filter(q => q.status === filter)
  const grouped  = groupByDate(filtered)

  const totalXP   = quests.filter(q => q.status === 'done').reduce((s, q) => s + (q.xp ?? 0), 0)
  const doneCount = quests.filter(q => q.status === 'done').length
  const allCount  = quests.length

  return (
    <AppLayout>
      {/* トップバー */}
      <header className="sticky top-0 z-10 bg-white/85 backdrop-blur border-b border-gray-200
        px-7 py-3.5 flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] text-gray-400 tracking-widest">REGAL QUEST / LOG</div>
          <div className="font-display text-xl tracking-wide">実績ログ 📜</div>
        </div>
        {/* フィルター */}
        <div className="flex items-center gap-1.5 bg-gray-100 rounded-xl p-1">
          {[
            { key: 'all',         label: 'すべて' },
            { key: 'done',        label: 'クリア' },
            { key: 'in_progress', label: '進行中' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === f.key
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <main className="p-7 flex flex-col gap-6">

        {/* サマリーカード */}
        <div className="rounded-2xl p-7 text-white relative overflow-hidden"
          style={{ background: '#1a1a2e', boxShadow: '0 8px 40px rgba(0,0,0,0.15)' }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 80% 50%, rgba(56,239,125,0.1) 0%, transparent 60%)' }} />
          <div className="relative z-10">
            <div className="font-mono text-white/30 text-[11px] tracking-widest mb-1">ALL TIME</div>
            <div className="font-display text-3xl tracking-wide mb-5">
              冒険の <span style={{ WebkitTextFillColor: 'transparent',
                background: 'linear-gradient(135deg,#38ef7d,#11998e)',
                WebkitBackgroundClip: 'text' }}>記録</span>
            </div>
            <div className="flex rounded-xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {[
                { val: allCount,              label: '総クエスト数' },
                { val: doneCount,             label: 'クリア数',    green: true },
                { val: allCount - doneCount,  label: '未完了' },
                { val: totalXP + ' XP',       label: '獲得XP',      orange: true },
              ].map((s, i) => (
                <div key={i} className={`flex-1 py-3 text-center ${i < 3 ? 'border-r border-white/8' : ''}`}>
                  <div className={`font-display text-2xl ${s.green ? 'text-green-400' : s.orange ? 'text-orange-400' : 'text-white'}`}>
                    {s.val}
                  </div>
                  <div className="font-mono text-white/25 text-[9px] tracking-widest mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* クエスト履歴 */}
        {loading ? (
          <div className="text-center text-gray-400 py-10 font-mono text-sm">読み込み中...</div>
        ) : grouped.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl
            p-10 text-center text-gray-400">
            <div className="text-4xl mb-3">📜</div>
            <div className="font-bold">まだ記録がありません</div>
            <div className="text-sm mt-1">クエストをこなすと実績が記録されます</div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {grouped.map(([date, dayQuests]) => (
              <div key={date}>
                {/* 日付ヘッダー */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="font-mono text-xs font-bold text-gray-500 tracking-widest">{date}</div>
                  <div className="flex-1 h-px bg-gray-100" />
                  <div className="font-mono text-[10px] text-gray-400">
                    {dayQuests.filter(q => q.status === 'done').length}/{dayQuests.length} クリア
                  </div>
                </div>
                {/* その日のクエスト */}
                <div className="flex flex-col gap-2">
                  {dayQuests.map(quest => (
                    <HistoryCard key={quest.id} quest={quest} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </AppLayout>
  )
}

function HistoryCard({ quest }) {
  const statusClass = STATUS_COLORS[quest.status] ?? STATUS_COLORS.todo
  const statusLabel = STATUS_LABELS[quest.status] ?? '–'

  return (
    <div className={`bg-white rounded-2xl px-5 py-4 flex items-center gap-4
      border-[1.5px] shadow-sm transition-all hover:shadow-md
      ${quest.status === 'done'
        ? 'border-green-100 bg-green-50/10'
        : quest.status === 'in_progress'
        ? 'border-orange-100'
        : 'border-gray-100'}`}>

      {/* ステータスアイコン */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 font-bold
        ${quest.status === 'done'
          ? 'text-white'
          : quest.status === 'in_progress'
          ? 'text-white'
          : 'bg-gray-100 text-gray-300'}`}
        style={quest.status === 'done'
          ? { background: 'linear-gradient(135deg,#11998e,#38ef7d)' }
          : quest.status === 'in_progress'
          ? { background: 'linear-gradient(135deg,#ff6b6b,#ff9500)' }
          : {}}>
        {quest.status === 'done' ? '✓' : quest.status === 'in_progress' ? '⚡' : '○'}
      </div>

      {/* 情報 */}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-bold mb-1 ${quest.status === 'done' ? 'text-gray-500 line-through' : ''}`}>
          {quest.title}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[10px] text-gray-400">🕐 {formatDate(quest.createdAt)}</span>
          {quest.category && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-500">
              {quest.category}
            </span>
          )}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusClass}`}>
            {statusLabel}
          </span>
          {quest.difficulty && (
            <span className="text-yellow-400 text-[11px]">
              {DIFFICULTY_LABEL[quest.difficulty]}
            </span>
          )}
        </div>
      </div>

      {/* XP */}
      <div className={`font-display text-sm px-2.5 py-1 rounded-lg flex-shrink-0
        ${quest.status === 'done' ? 'text-green-600 bg-green-50' : 'text-orange-500 bg-orange-50'}`}>
        {quest.status === 'done' ? '+' : ''}{quest.xp ?? 0} XP
      </div>
    </div>
  )
}
