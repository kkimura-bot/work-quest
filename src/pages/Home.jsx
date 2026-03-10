// src/pages/Home.jsx
import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { levelProgress, getTitle, DIFFICULTY_XP } from '../lib/xp'
import AppLayout from '../components/layout/AppLayout'

const CATEGORIES = ['採用', '教育', '営業', '企画', 'ドキュメント', 'ミーティング', 'その他']
const STATUS_LABELS = {
  todo:        { label: '未着手',  color: 'bg-gray-100 text-gray-400' },
  in_progress: { label: '進行中',  color: 'bg-orange-50 text-orange-500' },
  done:        { label: 'クリア！', color: 'bg-green-50 text-green-600' },
}

export default function Home() {
  const { user }             = useAuth()
  const [quests, setQuests]  = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]      = useState({ title: '', difficulty: 3, category: '企画', estimatedMinutes: 60 })
  const today                = new Date().toISOString().split('T')[0]

  // 今日のクエストをリアルタイム購読
  useEffect(() => {
    if (!user) return
    const start = new Date(today)
    const end   = new Date(today); end.setDate(end.getDate() + 1)

    const q = query(
      collection(db, 'quests'),
      where('userId', '==', user.uid),
      where('createdAt', '>=', start),
      where('createdAt', '<', end),
      orderBy('createdAt', 'desc')
    )
    return onSnapshot(q, snap =>
      setQuests(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [user, today])

  // クエスト追加
  const addQuest = async (e) => {
    e.preventDefault()
    await addDoc(collection(db, 'quests'), {
      ...form,
      userId: user.uid,
      status: 'todo',
      xp: DIFFICULTY_XP[form.difficulty],
      createdAt: serverTimestamp(),
    })
    setForm({ title: '', difficulty: 3, category: '企画', estimatedMinutes: 60 })
    setShowForm(false)
  }

  // ステータス更新
  const updateStatus = async (id, status) => {
    const upd = { status }
    if (status === 'done') upd.completedAt = serverTimestamp()
    await updateDoc(doc(db, 'quests', id), upd)
  }

  const doneCount  = quests.filter(q => q.status === 'done').length
  const totalCount = quests.length
  const progress   = totalCount ? doneCount / totalCount : 0
  const { level, progress: xpProg, remaining } = levelProgress(user?.xp ?? 0)

  return (
    <AppLayout>
      {/* トップバー */}
      <header className="sticky top-0 z-10 bg-white/85 backdrop-blur border-b border-gray-200
        px-7 py-3.5 flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] text-gray-400 tracking-widest">REGAL QUEST / TODAY</div>
          <div className="font-display text-xl tracking-wide">マイクエスト ⚔</div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">
            📅 {today}
          </span>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all"
            style={{ background: 'linear-gradient(135deg,#ff6b6b,#ff9500)',
              boxShadow: '0 4px 16px rgba(255,107,107,0.35)' }}>
            ＋ クエスト追加
          </button>
        </div>
      </header>

      <main className="p-7 flex flex-col gap-6">

        {/* ヒーローカード */}
        <div className="rounded-2xl p-7 text-white relative overflow-hidden"
          style={{ background: '#1a1a2e', boxShadow: '0 8px 40px rgba(0,0,0,0.15)' }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 80% 50%, rgba(255,107,107,0.1) 0%, transparent 60%)' }} />
          <div className="grid grid-cols-2 gap-8 relative z-10">
            <div>
              <div className="font-mono text-white/30 text-[11px] tracking-widest mb-1">
                GOOD MORNING, ADVENTURER
              </div>
              <div className="font-display text-3xl tracking-wide mb-2">
                {user?.name?.split(' ')[0]} <span style={{ WebkitTextFillColor: 'transparent',
                  background: 'linear-gradient(135deg,#ff6b6b,#ff9500)',
                  WebkitBackgroundClip: 'text' }}>
                  {user?.name?.split(' ')[1] || user?.name}
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-md"
                style={{ background: 'rgba(255,149,0,0.15)', border: '1px solid rgba(255,149,0,0.3)', color: '#ff9500' }}>
                🏅 {getTitle(level)} · Level {level}
              </div>

              {/* スタッツ */}
              <div className="flex mt-5 rounded-xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {[
                  { val: totalCount, label: 'TODAY' },
                  { val: doneCount,  label: 'DONE',  green: true },
                  { val: user?.xp ?? 0, label: 'WEEK XP', orange: true },
                ].map((s, i) => (
                  <div key={i} className={`flex-1 py-3 text-center ${i < 2 ? 'border-r border-white/8' : ''}`}>
                    <div className={`font-display text-2xl ${s.green ? 'text-green-400' : s.orange ? 'text-orange-400' : 'text-white'}`}>
                      {s.val}
                    </div>
                    <div className="font-mono text-white/25 text-[9px] tracking-widest mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-4">
              {/* 進捗リング */}
              <div className="relative w-24 h-24">
                <svg width="96" height="96" viewBox="0 0 96 96"
                  style={{ filter: 'drop-shadow(0 0 10px rgba(255,149,0,0.3))' }}>
                  <circle cx="48" cy="48" r="38" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9"/>
                  <circle cx="48" cy="48" r="38" fill="none"
                    stroke="url(#pg)" strokeWidth="9" strokeLinecap="round"
                    strokeDasharray="238.76"
                    strokeDashoffset={238.76 * (1 - progress)}
                    transform="rotate(-90 48 48)"/>
                  <defs>
                    <linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#ff6b6b"/>
                      <stop offset="100%" stopColor="#ff9500"/>
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="font-display text-2xl text-white">{Math.round(progress * 100)}%</div>
                  <div className="font-mono text-white/30 text-[9px]">{doneCount}/{totalCount}</div>
                </div>
              </div>
              {/* XPバー */}
              <div className="w-36">
                <div className="flex justify-between font-mono text-[9px] text-white/25 mb-1">
                  <span>Lv.{level} → {level+1}</span>
                  <span>あと {remaining} XP</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden bg-white/8">
                  <div className="h-full rounded-full"
                    style={{ width: `${xpProg * 100}%`,
                      background: 'linear-gradient(90deg,#ff6b6b,#ff9500)',
                      boxShadow: '0 0 10px rgba(255,149,0,0.5)' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* クエスト一覧 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-base tracking-wide flex items-center gap-2">
              今日のクエスト
              <span className="font-mono text-[10px] text-gray-400">TODAY'S QUESTS</span>
            </h2>
          </div>

          {quests.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl
              p-10 text-center text-gray-400">
              <div className="text-4xl mb-3">⚔️</div>
              <div className="font-bold">まだクエストがありません</div>
              <div className="text-sm mt-1">「クエスト追加」から今日のタスクを登録しましょう！</div>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {quests.map(quest => (
                <QuestCard key={quest.id} quest={quest} onUpdateStatus={updateStatus} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* クエスト追加モーダル */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowForm(false)}>
          <form onSubmit={addQuest} onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-display text-lg tracking-wide mb-5">⚔ 新しいクエスト</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-gray-400 tracking-widest mb-1.5">
                  クエスト名 *
                </label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm
                    focus:outline-none focus:border-orange-400 transition-colors"
                  placeholder="今日やること" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-gray-400 tracking-widest mb-1.5">難易度</label>
                  <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                      focus:outline-none focus:border-orange-400">
                    {[1,2,3,4,5].map(d => (
                      <option key={d} value={d}>{'★'.repeat(d)}{'☆'.repeat(5-d)} (+{DIFFICULTY_XP[d]} XP)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-400 tracking-widest mb-1.5">カテゴリ</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                      focus:outline-none focus:border-orange-400">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 tracking-widest mb-1.5">
                  所要時間（分）
                </label>
                <input type="number" value={form.estimatedMinutes}
                  onChange={e => setForm(f => ({ ...f, estimatedMinutes: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm
                    focus:outline-none focus:border-orange-400"
                  min={5} max={480} step={5} />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500
                  hover:bg-gray-50 transition-colors">
                キャンセル
              </button>
              <button type="submit"
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-all"
                style={{ background: 'linear-gradient(135deg,#ff6b6b,#ff9500)',
                  boxShadow: '0 4px 16px rgba(255,107,107,0.3)' }}>
                クエスト追加 ⚔
              </button>
            </div>
          </form>
        </div>
      )}
    </AppLayout>
  )
}

function QuestCard({ quest, onUpdateStatus }) {
  const st = STATUS_LABELS[quest.status] ?? STATUS_LABELS.todo

  return (
    <div className={`bg-white rounded-2xl p-4 flex items-center gap-3 transition-all
      border-[1.5px] shadow-sm hover:shadow-md hover:-translate-y-px
      ${quest.status === 'done'
        ? 'border-green-200 bg-green-50/30'
        : quest.status === 'in_progress'
        ? 'border-orange-200 bg-orange-50/20'
        : 'border-gray-200'}`}>

      {/* チェックボタン */}
      <button
        onClick={() => onUpdateStatus(quest.id,
          quest.status === 'todo' ? 'in_progress'
          : quest.status === 'in_progress' ? 'done'
          : 'todo')}
        className={`w-9 h-9 rounded-xl flex items-center justify-center text-base
          flex-shrink-0 transition-all font-bold
          ${quest.status === 'done'
            ? 'text-white'
            : quest.status === 'in_progress'
            ? 'text-white'
            : 'bg-gray-100 text-gray-300 border-[1.5px] border-gray-200'}`}
        style={quest.status === 'done'
          ? { background: 'linear-gradient(135deg,#11998e,#38ef7d)' }
          : quest.status === 'in_progress'
          ? { background: 'linear-gradient(135deg,#ff6b6b,#ff9500)' }
          : {}}>
        {quest.status === 'done' ? '✓' : quest.status === 'in_progress' ? '⚡' : '○'}
      </button>

      {/* 情報 */}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-bold mb-1 ${quest.status === 'done' ? 'line-through text-gray-400' : ''}`}>
          {quest.title}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[10px] text-gray-400">⏱ {quest.estimatedMinutes}分</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-600">
            {quest.category}
          </span>
          <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${st.color}`}>
            {st.label}
          </span>
        </div>
      </div>

      {/* XP */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <div className={`font-display text-sm px-2 py-0.5 rounded
          ${quest.status === 'done' ? 'text-gray-400 bg-gray-100' : 'text-orange-500 bg-orange-50'}`}>
          +{quest.xp} XP
        </div>
        <div className="text-yellow-400 text-[11px] tracking-tight">
          {'★'.repeat(quest.difficulty)}{'☆'.repeat(5 - quest.difficulty)}
        </div>
      </div>
    </div>
  )
}
