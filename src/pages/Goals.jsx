// src/pages/Goals.jsx
import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import AppLayout from '../components/layout/AppLayout'

// 今週の月曜〜日曜を取得
function getWeekRange() {
  const now  = new Date()
  const day  = now.getDay() === 0 ? 7 : now.getDay() // 日=7
  const mon  = new Date(now); mon.setDate(now.getDate() - day + 1); mon.setHours(0,0,0,0)
  const sun  = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23,59,59,999)
  return { mon, sun }
}

function formatDate(d) {
  return `${d.getMonth()+1}/${d.getDate()}`
}

export default function Goals() {
  const { user } = useAuth()
  const [goals, setGoals]       = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ title: '', description: '', targetValue: 100, unit: '%' })
  const { mon, sun }            = getWeekRange()

  // 今週の目標をリアルタイム購読
  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'weeklyGoals'),
      where('userId', '==', user.uid),
      where('createdAt', '>=', mon),
      orderBy('createdAt', 'desc')
    )
    return onSnapshot(q, snap =>
      setGoals(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [user])

  // 目標追加
  const addGoal = async (e) => {
    e.preventDefault()
    await addDoc(collection(db, 'weeklyGoals'), {
      ...form,
      userId: user.uid,
      achievementRate: 0,
      deadline: sun,
      createdAt: serverTimestamp(),
    })
    setForm({ title: '', description: '', targetValue: 100, unit: '%' })
    setShowForm(false)
  }

  // 達成率更新
  const updateRate = async (id, rate) => {
    await updateDoc(doc(db, 'weeklyGoals', id), {
      achievementRate: Math.min(100, Math.max(0, rate))
    })
  }

  const avgRate = goals.length
    ? Math.round(goals.reduce((s, g) => s + (g.achievementRate ?? 0), 0) / goals.length)
    : 0

  return (
    <AppLayout>
      {/* トップバー */}
      <header className="sticky top-0 z-10 bg-white/85 backdrop-blur border-b border-gray-200
        px-7 py-3.5 flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] text-gray-400 tracking-widest">REGAL QUEST / WEEKLY</div>
          <div className="font-display text-xl tracking-wide">週次目標 🎯</div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">
            📅 {formatDate(mon)} – {formatDate(sun)}
          </span>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all"
            style={{ background: 'linear-gradient(135deg,#ff6b6b,#ff9500)',
              boxShadow: '0 4px 16px rgba(255,107,107,0.35)' }}>
            ＋ 目標追加
          </button>
        </div>
      </header>

      <main className="p-7 flex flex-col gap-6">

        {/* 週次サマリーカード */}
        <div className="rounded-2xl p-7 text-white relative overflow-hidden"
          style={{ background: '#1a1a2e', boxShadow: '0 8px 40px rgba(0,0,0,0.15)' }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 80% 50%, rgba(124,58,237,0.15) 0%, transparent 60%)' }} />
          <div className="grid grid-cols-2 gap-8 relative z-10">
            <div>
              <div className="font-mono text-white/30 text-[11px] tracking-widest mb-1">THIS WEEK</div>
              <div className="font-display text-3xl tracking-wide mb-2">
                今週の <span style={{ WebkitTextFillColor: 'transparent',
                  background: 'linear-gradient(135deg,#a78bfa,#7c3aed)',
                  WebkitBackgroundClip: 'text' }}>目標</span>
              </div>
              <div className="flex mt-5 rounded-xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {[
                  { val: goals.length,  label: '目標数' },
                  { val: goals.filter(g => g.achievementRate >= 100).length, label: '達成', green: true },
                  { val: avgRate + '%', label: '平均達成率', purple: true },
                ].map((s, i) => (
                  <div key={i} className={`flex-1 py-3 text-center ${i < 2 ? 'border-r border-white/8' : ''}`}>
                    <div className={`font-display text-2xl ${s.green ? 'text-green-400' : s.purple ? 'text-purple-400' : 'text-white'}`}>
                      {s.val}
                    </div>
                    <div className="font-mono text-white/25 text-[9px] tracking-widest mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 全体達成率リング */}
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="relative w-24 h-24">
                <svg width="96" height="96" viewBox="0 0 96 96"
                  style={{ filter: 'drop-shadow(0 0 10px rgba(124,58,237,0.4))' }}>
                  <circle cx="48" cy="48" r="38" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9"/>
                  <circle cx="48" cy="48" r="38" fill="none"
                    stroke="url(#gp)" strokeWidth="9" strokeLinecap="round"
                    strokeDasharray="238.76"
                    strokeDashoffset={238.76 * (1 - avgRate / 100)}
                    transform="rotate(-90 48 48)"/>
                  <defs>
                    <linearGradient id="gp" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#a78bfa"/>
                      <stop offset="100%" stopColor="#7c3aed"/>
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="font-display text-2xl text-white">{avgRate}%</div>
                  <div className="font-mono text-white/30 text-[9px]">達成率</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 目標一覧 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-base tracking-wide flex items-center gap-2">
              今週の目標
              <span className="font-mono text-[10px] text-gray-400">WEEKLY GOALS</span>
            </h2>
          </div>

          {goals.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl
              p-10 text-center text-gray-400">
              <div className="text-4xl mb-3">🎯</div>
              <div className="font-bold">今週の目標がまだありません</div>
              <div className="text-sm mt-1">「目標追加」から今週のゴールを設定しましょう！</div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {goals.map(goal => (
                <GoalCard key={goal.id} goal={goal} onUpdateRate={updateRate} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 目標追加モーダル */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowForm(false)}>
          <form onSubmit={addGoal} onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-display text-lg tracking-wide mb-5">🎯 新しい週次目標</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-gray-400 tracking-widest mb-1.5">
                  目標タイトル *
                </label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm
                    focus:outline-none focus:border-purple-400 transition-colors"
                  placeholder="今週達成したいこと" required />
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 tracking-widest mb-1.5">
                  詳細・メモ
                </label>
                <textarea value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm
                    focus:outline-none focus:border-purple-400 transition-colors resize-none"
                  placeholder="具体的な内容や指標" rows={3} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-gray-400 tracking-widest mb-1.5">
                    目標値
                  </label>
                  <input type="number" value={form.targetValue}
                    onChange={e => setForm(f => ({ ...f, targetValue: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm
                      focus:outline-none focus:border-purple-400"
                    min={1} />
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-400 tracking-widest mb-1.5">
                    単位
                  </label>
                  <input value={form.unit}
                    onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm
                      focus:outline-none focus:border-purple-400"
                    placeholder="%, 件, 回..." />
                </div>
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
                style={{ background: 'linear-gradient(135deg,#a78bfa,#7c3aed)',
                  boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}>
                目標を追加 🎯
              </button>
            </div>
          </form>
        </div>
      )}
    </AppLayout>
  )
}

function GoalCard({ goal, onUpdateRate }) {
  const rate    = goal.achievementRate ?? 0
  const done    = rate >= 100
  const [editing, setEditing] = useState(false)
  const [input, setInput]     = useState(rate)

  const handleSave = () => {
    onUpdateRate(goal.id, Number(input))
    setEditing(false)
  }

  return (
    <div className={`bg-white rounded-2xl p-5 border-[1.5px] shadow-sm hover:shadow-md transition-all
      ${done ? 'border-green-200 bg-green-50/20' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className={`font-bold text-sm mb-1 ${done ? 'text-green-600' : ''}`}>
            {done && '✅ '}{goal.title}
          </div>
          {goal.description && (
            <div className="text-xs text-gray-400">{goal.description}</div>
          )}
        </div>
        <div className="flex-shrink-0 text-right">
          <div className={`font-display text-2xl ${done ? 'text-green-500' : 'text-purple-500'}`}>
            {rate}%
          </div>
          <div className="font-mono text-[10px] text-gray-400">
            目標: {goal.targetValue}{goal.unit}
          </div>
        </div>
      </div>

      {/* プログレスバー */}
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-4">
        <div className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(100, rate)}%`,
            background: done
              ? 'linear-gradient(90deg,#11998e,#38ef7d)'
              : 'linear-gradient(90deg,#a78bfa,#7c3aed)',
            boxShadow: done
              ? '0 0 8px rgba(56,239,125,0.4)'
              : '0 0 8px rgba(124,58,237,0.4)'
          }} />
      </div>

      {/* 達成率更新 */}
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <input type="number" value={input}
              onChange={e => setInput(e.target.value)}
              className="w-20 border border-purple-300 rounded-lg px-2 py-1 text-sm text-center
                focus:outline-none focus:border-purple-500"
              min={0} max={100} />
            <span className="text-sm text-gray-400">%</span>
            <button onClick={handleSave}
              className="px-3 py-1 rounded-lg text-white text-xs font-bold"
              style={{ background: 'linear-gradient(135deg,#a78bfa,#7c3aed)' }}>
              保存
            </button>
            <button onClick={() => setEditing(false)}
              className="px-3 py-1 rounded-lg border border-gray-200 text-xs text-gray-500">
              キャンセル
            </button>
          </>
        ) : (
          <button onClick={() => { setInput(rate); setEditing(true) }}
            className="text-xs text-purple-500 font-bold hover:text-purple-700 transition-colors
              px-3 py-1 rounded-lg border border-purple-200 hover:border-purple-400">
            ✏️ 達成率を更新
          </button>
        )}
        {done && (
          <span className="ml-auto text-xs font-bold text-green-500 bg-green-50
            px-3 py-1 rounded-full border border-green-200">
            🎉 達成！
          </span>
        )}
      </div>
    </div>
  )
}
