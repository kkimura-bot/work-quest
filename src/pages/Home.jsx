// src/pages/Home.jsx — Phase1更新版
// 変更点: カテゴリ更新・2層カテゴリ・編集機能・上限警告・過去3日登録・新XP値
import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, increment, Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { levelProgress, getTitle, DIFFICULTY_XP } from '../lib/xp'
import AppLayout from '../components/layout/AppLayout'

// ===== カテゴリ定義（新設計）=====
const MAIN_CATEGORIES = [
  { id: 'ACADEMY', label: 'アカデミー', emoji: '🎓' },
  { id: 'ESPORTS',  label: 'eスポーツ',  emoji: '🏆' },
  { id: 'EDU',     label: '教育・カリキュラム', emoji: '📚' },
  { id: 'SALES',   label: '営業',        emoji: '💼' },
  { id: 'MGMT',    label: '経営管理',    emoji: '🏢' },
]
const SUB_CATEGORIES = [
  { id: 'CREATE',   label: '制作・クリエイティブ', emoji: '✏️' },
  { id: 'PLAN',     label: 'プランニング・企画',   emoji: '💡' },
  { id: 'RESEARCH', label: 'リサーチ・情報収集',   emoji: '🔍' },
  { id: 'MTG',      label: 'MTG・打ち合わせ',     emoji: '💬' },
  { id: 'DOC',      label: 'ドキュメント・事務',   emoji: '📄' },
  { id: 'EXTERNAL', label: '外部対応',             emoji: '🤝' },
  { id: 'DATA',     label: 'データ・分析',          emoji: '📊' },
]

const STATUS_LABELS = {
  todo:        { label: '未着手',  color: 'bg-gray-100 text-gray-400' },
  in_progress: { label: '進行中',  color: 'bg-orange-50 text-orange-500' },
  done:        { label: 'クリア！', color: 'bg-green-50 text-green-600' },
}

const QUEST_LIMIT = 5 // 1日の上限（警告のみ・登録は可能）

// 過去3日分の日付オプション
function getDateOptions() {
  const opts = []
  for (let i = 0; i <= 3; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const str = d.toISOString().split('T')[0]
    opts.push({ value: str, label: i === 0 ? `今日 (${str})` : i === 1 ? `昨日 (${str})` : `${i}日前 (${str})` })
  }
  return opts
}

export default function Home() {
  const { user }             = useAuth()
  const [quests, setQuests]  = useState([])\
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState(null) // 編集対象クエスト
  const [form, setForm]      = useState({
    title: '', difficulty: 3,
    mainCategory: 'ACADEMY', subCategory: 'CREATE',
    estimatedMinutes: 60, questDate: new Date().toISOString().split('T')[0]
  })
  const [toast, setToast]    = useState(null)
  const [weekXp, setWeekXp]  = useState(0)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  // 選択日のクエストをリアルタイム購読
  useEffect(() => {
    if (!user) return
    const start = Timestamp.fromDate(new Date(selectedDate))
    const end   = new Date(selectedDate); end.setDate(end.getDate() + 1)
    const q = query(
      collection(db, 'quests'),
      where('userId', '==', user.uid),
      where('questDate', '==', selectedDate),
      orderBy('createdAt', 'desc')
    )
    return onSnapshot(q, snap =>
      setQuests(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [user, selectedDate])

  // 今週のXPをリアルタイム購読
  useEffect(() => {
    if (!user) return
    const now = new Date()
    const day = now.getDay()
    const diff = day === 0 ? 6 : day - 1
    const monday = new Date(now)
    monday.setDate(now.getDate() - diff)
    monday.setHours(0, 0, 0, 0)
    const nextMonday = new Date(monday)
    nextMonday.setDate(monday.getDate() + 7)
    const q = query(
      collection(db, 'quests'),
      where('userId', '==', user.uid),
      where('status', '==', 'done'),
      where('completedAt', '>=', Timestamp.fromDate(monday)),
      where('completedAt', '<',  Timestamp.fromDate(nextMonday)),
    )
    return onSnapshot(q, snap => {
      setWeekXp(snap.docs.reduce((sum, d) => sum + (d.data().xp ?? 0), 0))
    })
  }, [user])

  // クエスト追加
  const addQuest = async (e) => {
    e.preventDefault()
    const todayQuests = quests.filter(q => q.questDate === form.questDate)
    if (todayQuests.length >= QUEST_LIMIT && !window.confirm(
      `${form.questDate} のクエストが${QUEST_LIMIT}個を超えています。それでも追加しますか？`
    )) return

    await addDoc(collection(db, 'quests'), {
      title: form.title,
      difficulty: form.difficulty,
      mainCategory: form.mainCategory,
      subCategory: form.subCategory,
      estimatedMinutes: form.estimatedMinutes,
      questDate: form.questDate,
      userId: user.uid,
      status: 'todo',
      xp: DIFFICULTY_XP[form.difficulty],
      createdAt: serverTimestamp(),
    })
    setForm(f => ({ ...f, title: '', difficulty: 3, estimatedMinutes: 60 }))
    setShowForm(false)
    setSelectedDate(form.questDate)
  }

  // クエスト編集（タイトルのみ・未着手のみ）
  const startEdit = (quest) => {
    if (quest.status !== 'todo') return
    setEditTarget(quest)
  }
  const saveEdit = async (id, newTitle) => {
    if (!newTitle.trim()) return
    await updateDoc(doc(db, 'quests', id), { title: newTitle.trim() })
    setEditTarget(null)
  }

  // ステータス更新 + XP自動加算
  const updateStatus = async (id, status) => {
    const quest = quests.find(q => q.id === id)
    if (!quest) return
    const upd = { status }
    if (status === 'done') upd.completedAt = serverTimestamp()
    await updateDoc(doc(db, 'quests', id), upd)
    const wasDown = quest.status === 'done'
    const goingDone = status === 'done'
    if (!wasDown && goingDone) {
      await updateDoc(doc(db, 'users', user.uid), { xp: increment(quest.xp ?? 0) })
      setToast(`+${quest.xp} XP 獲得！ 🎉`)
      setTimeout(() => setToast(null), 2500)
    } else if (wasDown && !goingDone) {
      await updateDoc(doc(db, 'users', user.uid), { xp: increment(-(quest.xp ?? 0)) })
    }
  }

  // クエスト削除（過去3日以内）
  const deleteQuest = async (id) => {
    const quest = quests.find(q => q.id === id)
    if (!quest) return
    // 過去3日以内チェック
    const questDate = new Date(quest.questDate)
    const threeDaysAgo = new Date(); threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    if (questDate < threeDaysAgo) {
      alert('過去3日より前のクエストは削除できません。')
      return
    }
    if (!window.confirm(`「${quest.title}」を削除しますか？`)) return
    if (quest.status === 'done') {
      await updateDoc(doc(db, 'users', user.uid), { xp: increment(-(quest.xp ?? 0)) })
    }
    await deleteDoc(doc(db, 'quests', id))
  }

  const doneCount  = quests.filter(q => q.status === 'done').length
  const totalCount = quests.length
  const progress   = totalCount ? doneCount / totalCount : 0
  const { level, progress: xpProg, remaining } = levelProgress(user?.xp ?? 0)
  const isToday = selectedDate === new Date().toISOString().split('T')[0]
  const mainCatLabel = (id) => MAIN_CATEGORIES.find(c => c.id === id)?.emoji + ' ' + MAIN_CATEGORIES.find(c => c.id === id)?.label
  const subCatLabel  = (id) => SUB_CATEGORIES.find(c => c.id === id)?.emoji + ' ' + SUB_CATEGORIES.find(c => c.id === id)?.label

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
          {/* 日付セレクター */}
          <select value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            className="font-mono text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full border-none outline-none cursor-pointer">
            {getDateOptions().map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button onClick={() => { setShowForm(true); setForm(f => ({ ...f, questDate: selectedDate })) }}
            className="flex items-center gap-1.5 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all"
            style={{ background: 'linear-gradient(135deg,#ff6b6b,#ff9500)', boxShadow: '0 4px 16px rgba(255,107,107,0.35)' }}>
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
              <div className="font-mono text-white/30 text-[11px] tracking-widest mb-1">GOOD MORNING, ADVENTURER</div>
              <div className="font-display text-3xl tracking-wide mb-2">
                {user?.name?.split(' ')[0]}{' '}
                <span style={{ WebkitTextFillColor:'transparent', background:'linear-gradient(135deg,#ff6b6b,#ff9500)', WebkitBackgroundClip:'text' }}>
                  {user?.name?.split(' ')[1] || user?.name}
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-md"
                style={{ background:'rgba(255,149,0,0.15)', border:'1px solid rgba(255,149,0,0.3)', color:'#ff9500' }}>
                🏅 {getTitle(level)} · Level {level}
              </div>
              <div className="flex mt-5 rounded-xl overflow-hidden"
                style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' }}>
                {[
                  { val: totalCount, label: 'TODAY' },
                  { val: doneCount,  label: 'DONE', green: true },
                  { val: weekXp,     label: 'WEEK XP', orange: true },
                ].map((s, i) => (
                  <div key={i} className={`flex-1 py-3 text-center ${i < 2 ? 'border-r border-white/8' : ''}`}>
                    <div className={`font-display text-2xl ${s.green ? 'text-green-400' : s.orange ? 'text-orange-400' : 'text-white'}`}>{s.val}</div>
                    <div className="font-mono text-white/25 text-[9px] tracking-widest mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="relative w-24 h-24">
                <svg width="96" height="96" viewBox="0 0 96 96" style={{ filter:'drop-shadow(0 0 10px rgba(255,149,0,0.3))' }}>
                  <circle cx="48" cy="48" r="38" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9"/>
                  <circle cx="48" cy="48" r="38" fill="none" stroke="url(#pg)" strokeWidth="9" strokeLinecap="round"
                    strokeDasharray="238.76" strokeDashoffset={238.76 * (1 - progress)} transform="rotate(-90 48 48)"/>
                  <defs><linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ff6b6b"/><stop offset="100%" stopColor="#ff9500"/>
                  </linearGradient></defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="font-display text-2xl text-white">{Math.round(progress * 100)}%</div>
                  <div className="font-mono text-white/30 text-[9px]">{doneCount}/{totalCount}</div>
                </div>
              </div>
              <div className="w-36">
                <div className="flex justify-between font-mono text-[9px] text-white/25 mb-1">
                  <span>Lv.{level} → {level + 1}</span><span>あと {remaining} XP</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden bg-white/8">
                  <div className="h-full rounded-full" style={{ width:`${xpProg*100}%`,
                    background:'linear-gradient(90deg,#ff6b6b,#ff9500)', boxShadow:'0 0 10px rgba(255,149,0,0.5)' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* クエスト一覧 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-base tracking-wide flex items-center gap-2">
              {isToday ? '今日のクエスト' : `${selectedDate} のクエスト`}
              <span className="font-mono text-[10px] text-gray-400">{doneCount}/{totalCount} DONE</span>
            </h2>
            {totalCount >= QUEST_LIMIT && (
              <span className="text-[10px] text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full font-mono">
                ⚠ {totalCount}個（上限{QUEST_LIMIT}個）
              </span>
            )}
          </div>
          {quests.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center text-gray-400">
              <div className="text-4xl mb-3">⚔️</div>
              <div className="font-bold">クエストがありません</div>
              <div className="text-sm mt-1">「クエスト追加」から登録しましょう！</div>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {quests.map(quest => (
                <QuestCard key={quest.id} quest={quest}
                  onUpdateStatus={updateStatus}
                  onDelete={deleteQuest}
                  onEdit={startEdit}
                  editTarget={editTarget}
                  onSaveEdit={saveEdit}
                  onCancelEdit={() => setEditTarget(null)}
                  mainCatLabel={mainCatLabel}
                  subCatLabel={subCatLabel}
                />
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
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-display text-lg tracking-wide mb-5">⚔ 新しいクエスト</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-gray-400 tracking-widest mb-1.5">クエスト名 *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400"
                  placeholder="今日やること" required />
              </div>
              <div>
                <label className="block text-xs font-mono text-gray-400 tracking-widest mb-1.5">日付</label>
                <select value={form.questDate} onChange={e => setForm(f => ({ ...f, questDate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400">
                  {getDateOptions().map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-gray-400 tracking-widest mb-1.5">難易度</label>
                <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400">
                  {[1,2,3,4,5].map(d => (
                    <option key={d} value={d}>{'★'.repeat(d)}{'☆'.repeat(5-d)} (+{DIFFICULTY_XP[d]} XP)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-gray-400 tracking-widest mb-1.5">チーム（大カテゴリ）</label>
                <select value={form.mainCategory} onChange={e => setForm(f => ({ ...f, mainCategory: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400">
                  {MAIN_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-gray-400 tracking-widest mb-1.5">業務種別（サブカテゴリ）</label>
                <select value={form.subCategory} onChange={e => setForm(f => ({ ...f, subCategory: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400">
                  {SUB_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-gray-400 tracking-widest mb-1.5">所要時間（分）</label>
                <input type="number" value={form.estimatedMinutes}
                  onChange={e => setForm(f => ({ ...f, estimatedMinutes: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400"
                  min={5} max={480} step={5} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">
                キャンセル
              </button>
              <button type="submit" className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold"
                style={{ background:'linear-gradient(135deg,#ff6b6b,#ff9500)', boxShadow:'0 4px 16px rgba(255,107,107,0.3)' }}>
                クエスト追加 ⚔
              </button>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50
          px-6 py-3 rounded-2xl text-white font-display text-lg tracking-wide shadow-2xl"
          style={{ background:'linear-gradient(135deg,#ff6b6b,#ff9500)', boxShadow:'0 8px 32px rgba(255,107,107,0.5)' }}>
          {toast}
        </div>
      )}
    </AppLayout>
  )
}

function QuestCard({ quest, onUpdateStatus, onDelete, onEdit, editTarget, onSaveEdit, onCancelEdit, mainCatLabel, subCatLabel }) {
  const st = STATUS_LABELS[quest.status] ?? STATUS_LABELS.todo
  const isEditing = editTarget?.id === quest.id
  const [editTitle, setEditTitle] = useState(quest.title)
  const canEdit = quest.status === 'todo'

  return (
    <div className={`bg-white rounded-2xl p-4 flex items-center gap-3 transition-all
      border-[1.5px] shadow-sm hover:shadow-md hover:-translate-y-px
      ${quest.status === 'done' ? 'border-green-200 bg-green-50/30'
        : quest.status === 'in_progress' ? 'border-orange-200 bg-orange-50/20'
        : 'border-gray-200'}`}>

      <button
        onClick={() => onUpdateStatus(quest.id,
          quest.status === 'todo' ? 'in_progress' : quest.status === 'in_progress' ? 'done' : 'done')}
        className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 transition-all font-bold
          ${quest.status === 'done' ? 'text-white' : quest.status === 'in_progress' ? 'text-white'
            : 'bg-gray-100 text-gray-300 border-[1.5px] border-gray-200'}`}
        style={quest.status === 'done' ? { background:'linear-gradient(135deg,#11998e,#38ef7d)' }
          : quest.status === 'in_progress' ? { background:'linear-gradient(135deg,#ff6b6b,#ff9500)' } : {}}>
        {quest.status === 'done' ? '✓' : quest.status === 'in_progress' ? '⚡' : '○'}
      </button>

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex gap-2">
            <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
              className="flex-1 border border-orange-400 rounded-lg px-2 py-1 text-sm focus:outline-none"
              autoFocus onKeyDown={e => { if (e.key === 'Enter') onSaveEdit(quest.id, editTitle); if (e.key === 'Escape') onCancelEdit() }} />
            <button onClick={() => onSaveEdit(quest.id, editTitle)}
              className="text-xs px-2 py-1 bg-orange-500 text-white rounded-lg">保存</button>
            <button onClick={onCancelEdit}
              className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded-lg">✕</button>
          </div>
        ) : (
          <div className={`text-sm font-bold mb-1 flex items-center gap-1 ${quest.status === 'done' ? 'line-through text-gray-400' : ''}`}>
            {quest.title}
            {canEdit && (
              <button onClick={() => onEdit(quest)} className="text-gray-300 hover:text-orange-400 transition-colors ml-1" title="編集">✎</button>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[10px] text-gray-400">⏱ {quest.estimatedMinutes}分</span>
          {quest.mainCategory && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-600">
              {mainCatLabel(quest.mainCategory)}
            </span>
          )}
          {quest.subCategory && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-600">
              {subCatLabel(quest.subCategory)}
            </span>
          )}
          <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${st.color}`}>{st.label}</span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <button onClick={() => onDelete(quest.id)}
          className="text-gray-300 hover:text-red-400 transition-colors text-xs px-1" title="削除">🗑</button>
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
