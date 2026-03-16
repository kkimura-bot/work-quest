// src/pages/Mission.jsx — チームミッション機能
import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot, addDoc,
  updateDoc, doc, serverTimestamp, where, increment } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import AppLayout from '../components/layout/AppLayout'

const DIFFICULTY = [
  { id: 'easy',   label: 'Easy',   color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200', xpAll: 50,  xpInd: 30 },
  { id: 'normal', label: 'Normal', color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200',  xpAll: 100, xpInd: 60 },
  { id: 'hard',   label: 'Hard',   color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200',xpAll: 200, xpInd: 120 },
  { id: 'legend', label: 'Legend', color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200',   xpAll: 400, xpInd: 250 },
]

const STATUS_CONFIG = {
  active:    { label: '進行中',   color: 'bg-green-100 text-green-700' },
  completed: { label: '達成！',   color: 'bg-yellow-100 text-yellow-700' },
  failed:    { label: '失敗',     color: 'bg-red-100 text-red-600' },
  draft:     { label: '準備中',   color: 'bg-gray-100 text-gray-500' },
}

export default function Mission() {
  const { user }              = useAuth()
  const [missions, setMissions]   = useState([])
  const [users, setUsers]         = useState([])
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', difficulty: 'normal',
    conditionType: 'xp', conditionValue: 500,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const isManager = user?.role === 'manager' || user?.role === 'super_admin'

  // ミッション一覧を購読
  useEffect(() => {
    const q = query(collection(db, 'missions'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap =>
      setMissions(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [])

  // 全ユーザー購読
  useEffect(() => {
    return onSnapshot(collection(db, 'users'), snap =>
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [])

  // ミッション作成（マネージャーのみ）
  const createMission = async (e) => {
    e.preventDefault()
    const activeMissions = missions.filter(m => m.status === 'active')
    if (activeMissions.length >= 3) {
      alert('同時進行できるミッションは最大3つまでです')
      return
    }
    setSubmitting(true)
    try {
      const diff = DIFFICULTY.find(d => d.id === form.difficulty)
      await addDoc(collection(db, 'missions'), {
        ...form,
        status: 'active',
        bonusXpAll: diff.xpAll,
        bonusXpInd: diff.xpInd,
        participants: [],
        achievers: [],
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      })
      setForm({ title: '', description: '', difficulty: 'normal',
        conditionType: 'xp', conditionValue: 500,
        startDate: new Date().toISOString().split('T')[0], endDate: '' })
      setShowForm(false)
    } finally {
      setSubmitting(false)
    }
  }

  // ミッション参加
  const joinMission = async (missionId) => {
    const mission = missions.find(m => m.id === missionId)
    if (!mission || mission.participants?.includes(user.uid)) return
    await updateDoc(doc(db, 'missions', missionId), {
      participants: [...(mission.participants || []), user.uid]
    })
  }

  // ミッション終了（マネージャーのみ）
  const endMission = async (missionId, result) => {
    if (!window.confirm(`ミッションを「${result === 'completed' ? '達成' : '失敗'}」として終了しますか？`)) return
    const mission = missions.find(m => m.id === missionId)
    if (!mission) return

    await updateDoc(doc(db, 'missions', missionId), {
      status: result,
      endedAt: serverTimestamp(),
    })

    // 達成の場合はXP付与
    if (result === 'completed') {
      const totalUsers = users.length
      const achieverCount = mission.achievers?.length || 0
      const participationRate = totalUsers > 0 ? achieverCount / totalUsers : 0

      if (participationRate >= 0.7) {
        // 全員にボーナスXP
        for (const u of users) {
          const isAchiever = mission.achievers?.includes(u.id)
          const bonus = mission.bonusXpAll + (isAchiever ? mission.bonusXpInd : 0)
          await updateDoc(doc(db, 'users', u.id), { xp: increment(bonus) })
        }
      }
    }
  }

  const activeMissions = missions.filter(m => m.status === 'active')
  const pastMissions   = missions.filter(m => m.status !== 'active')

  return (
    <AppLayout>
      <header className="sticky top-0 md:top-0 z-10 bg-white/85 backdrop-blur border-b border-gray-200
        px-7 py-3.5 flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] text-gray-400 tracking-widest">REGAL QUEST / MISSION</div>
          <div className="font-display text-xl tracking-wide">チームミッション ⚔️</div>
        </div>
        {isManager && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-white text-sm font-bold px-4 py-2 rounded-xl"
            style={{ background:'linear-gradient(135deg,#667eea,#764ba2)', boxShadow:'0 4px 16px rgba(102,126,234,0.35)' }}>
            ＋ ミッション作成
          </button>
        )}
      </header>

      <main className="p-7 flex flex-col gap-6">

        {/* 進行中ミッション */}
        <div>
          <h2 className="font-display text-base tracking-wide mb-3 flex items-center gap-2">
            進行中のミッション
            <span className="font-mono text-[10px] text-gray-400">{activeMissions.length}/3</span>
          </h2>
          {activeMissions.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center text-gray-400">
              <div className="text-4xl mb-3">⚔️</div>
              <div className="font-bold">進行中のミッションはありません</div>
              {isManager && <div className="text-sm mt-1">「ミッション作成」から新しいミッションを設定しましょう</div>}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {activeMissions.map(m => (
                <MissionCard key={m.id} mission={m} users={users} user={user}
                  isManager={isManager} onJoin={joinMission} onEnd={endMission} />
              ))}
            </div>
          )}
        </div>

        {/* 過去ミッション */}
        {pastMissions.length > 0 && (
          <div>
            <h2 className="font-display text-base tracking-wide mb-3 text-gray-400">過去のミッション</h2>
            <div className="flex flex-col gap-3">
              {pastMissions.map(m => (
                <MissionCard key={m.id} mission={m} users={users} user={user}
                  isManager={isManager} onJoin={joinMission} onEnd={endMission} past />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ミッション作成モーダル（マネージャーのみ） */}
      {showForm && isManager && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowForm(false)}>
          <form onSubmit={createMission} onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-display text-lg tracking-wide mb-5">⚔️ ミッションを作成</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1.5">ミッション名 *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-400"
                  placeholder="例：今週中に全員50XP達成！" required />
              </div>
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1.5">説明</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-400 resize-none"
                  rows={3} placeholder="ミッションの詳細・背景など" />
              </div>
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1.5">難易度</label>
                <div className="grid grid-cols-4 gap-2">
                  {DIFFICULTY.map(d => (
                    <button key={d.id} type="button"
                      onClick={() => setForm(f => ({ ...f, difficulty: d.id }))}
                      className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all
                        ${form.difficulty === d.id ? `${d.border} ${d.bg} ${d.color}` : 'border-gray-200 text-gray-400'}`}>
                      {d.label}
                      <div className="text-[10px] font-mono mt-0.5">全員+{d.xpAll} XP</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1.5">達成条件</label>
                <div className="flex gap-2">
                  <select value={form.conditionType} onChange={e => setForm(f => ({ ...f, conditionType: e.target.value }))}
                    className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400">
                    <option value="xp">合計XP</option>
                    <option value="quest_count">クエスト数</option>
                  </select>
                  <input type="number" value={form.conditionValue}
                    onChange={e => setForm(f => ({ ...f, conditionValue: Number(e.target.value) }))}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400"
                    min={1} />
                  <span className="flex items-center text-sm text-gray-500">
                    {form.conditionType === 'xp' ? 'XP' : '本'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1.5">開始日</label>
                  <input type="date" value={form.startDate}
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400" />
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1.5">終了日</label>
                  <input type="date" value={form.endDate}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500">
                キャンセル
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-60"
                style={{ background:'linear-gradient(135deg,#667eea,#764ba2)' }}>
                {submitting ? '作成中…' : 'ミッション開始 ⚔️'}
              </button>
            </div>
          </form>
        </div>
      )}
    </AppLayout>
  )
}

function MissionCard({ mission, users, user, isManager, onJoin, onEnd, past }) {
  const diff   = DIFFICULTY.find(d => d.id === mission.difficulty) || DIFFICULTY[1]
  const status = STATUS_CONFIG[mission.status] || STATUS_CONFIG.active
  const totalUsers    = users.length
  const achieverCount = mission.achievers?.length || 0
  const participantCount = mission.participants?.length || 0
  const participationRate = totalUsers > 0 ? achieverCount / totalUsers : 0
  const isJoined = mission.participants?.includes(user?.uid)
  const isAchiever = mission.achievers?.includes(user?.uid)

  // 残り日数
  const daysLeft = mission.endDate
    ? Math.ceil((new Date(mission.endDate) - new Date()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden
      ${past ? 'opacity-70' : ''} ${diff.border}`}>
      {/* ヘッダー */}
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${diff.bg} ${diff.color}`}>
                {diff.label}
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${status.color}`}>
                {status.label}
              </span>
              {daysLeft !== null && daysLeft >= 0 && mission.status === 'active' && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded
                  ${daysLeft <= 3 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                  {daysLeft <= 0 ? '本日終了' : `残り${daysLeft}日`}
                </span>
              )}
            </div>
            <h3 className="font-display text-base tracking-wide">{mission.title}</h3>
            {mission.description && (
              <p className="text-sm text-gray-500 mt-1">{mission.description}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-display text-lg text-orange-500">全員+{mission.bonusXpAll} XP</div>
            <div className="text-xs text-gray-400">達成者 +{mission.bonusXpInd} XP</div>
          </div>
        </div>

        {/* 達成条件 */}
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2 mb-3">
          <span className="text-base">🎯</span>
          <span>
            参加率70%以上で達成 ／ 達成条件：
            {mission.conditionType === 'xp'
              ? `合計 ${mission.conditionValue.toLocaleString()} XP`
              : `${mission.conditionValue} クエスト達成`}
          </span>
        </div>

        {/* 参加者進捗バー */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>参加進捗</span>
            <span>{achieverCount} / {totalUsers} 人達成（{Math.round(participationRate * 100)}%）</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{
                width: `${participationRate * 100}%`,
                background: participationRate >= 0.7
                  ? 'linear-gradient(90deg,#11998e,#38ef7d)'
                  : 'linear-gradient(90deg,#ff6b6b,#ff9500)'
              }} />
          </div>
          {participationRate >= 0.7 && mission.status === 'active' && (
            <div className="text-xs text-green-600 font-bold mt-1">✅ 達成条件クリア！（70%以上）</div>
          )}
        </div>

        {/* 参加者リスト */}
        <div className="flex items-center gap-1 flex-wrap">
          {users.map(u => {
            const joined   = mission.participants?.includes(u.id)
            const achieved = mission.achievers?.includes(u.id)
            if (!joined) return null
            return (
              <div key={u.id}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                  ${achieved ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {achieved ? '✅' : '○'} {u.name || u.email}
              </div>
            )
          })}
        </div>
      </div>

      {/* アクションボタン */}
      {!past && (
        <div className="px-5 pb-4 flex gap-2">
          {!isJoined && mission.status === 'active' && (
            <button onClick={() => onJoin(mission.id)}
              className="flex-1 py-2 rounded-xl text-sm font-bold border-2 border-purple-300 text-purple-600 hover:bg-purple-50 transition-colors">
              参加する
            </button>
          )}
          {isJoined && !isAchiever && (
            <div className="flex-1 py-2 rounded-xl text-sm font-bold text-center bg-blue-50 text-blue-600">
              参加中 🙋
            </div>
          )}
          {isAchiever && (
            <div className="flex-1 py-2 rounded-xl text-sm font-bold text-center bg-green-50 text-green-600">
              達成済み ✅
            </div>
          )}
          {isManager && mission.status === 'active' && (
            <div className="flex gap-2">
              <button onClick={() => onEnd(mission.id, 'completed')}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                達成で終了
              </button>
              <button onClick={() => onEnd(mission.id, 'failed')}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                失敗で終了
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
