// src/pages/Feedback.jsx — フィードバック機能
import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot,
  addDoc, serverTimestamp, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import AppLayout from '../components/layout/AppLayout'

const EMOJIS = [
  { icon: '👍', label: 'いいね' },
  { icon: '👏', label: 'すごい' },
  { icon: '🔥', label: '熱い' },
  { icon: '💪', label: '頑張れ' },
  { icon: '✨', label: '輝いてる' },
]

const FEEDBACK_XP = 10 // 送った人が獲得するXP

export default function Feedback() {
  const { user }             = useAuth()
  const [feedbacks, setFeedbacks]   = useState([])
  const [users, setUsers]           = useState([])
  const [quests, setQuests]         = useState([]) // 最近のクエスト（全員）
  const [showForm, setShowForm]     = useState(false)
  const [tab, setTab]               = useState('team') // 'team' | 'mine'
  const [form, setForm] = useState({
    toUserId: '',
    emoji: '👍',
    comment: '',
    targetType: 'member', // 'member' | 'quest'
    questId: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast]           = useState(null)

  // 全フィードバック購読
  useEffect(() => {
    const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap =>
      setFeedbacks(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [])

  // 全ユーザー購読
  useEffect(() => {
    return onSnapshot(collection(db, 'users'), snap =>
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [])

  // 最近完了したクエスト（全員・直近30件）
  useEffect(() => {
    const q = query(
      collection(db, 'quests'),
      where('status', '==', 'done'),
      orderBy('completedAt', 'desc')
    )
    return onSnapshot(q, snap =>
      setQuests(snap.docs.slice(0, 30).map(d => ({ id: d.id, ...d.data() })))
    )
  }, [])

  // 今日すでに同じ相手に送ったか確認
  const alreadySentToday = (toUserId) => {
    const today = new Date().toISOString().split('T')[0]
    return feedbacks.some(f =>
      f.fromUserId === user?.uid &&
      f.toUserId === toUserId &&
      f.createdAt?.toDate?.()?.toISOString?.()?.split('T')[0] === today
    )
  }

  const sendFeedback = async (e) => {
    e.preventDefault()
    if (!form.toUserId) return

    // 自分自身へのフィードバック禁止
    if (form.toUserId === user?.uid) {
      alert('自分自身にはフィードバックを送れません')
      return
    }

    // 1日1回制限
    if (alreadySentToday(form.toUserId)) {
      alert('この相手には今日すでにフィードバックを送っています（1日1回まで）')
      return
    }

    setSubmitting(true)
    try {
      const toUser = users.find(u => u.id === form.toUserId)
      const quest  = quests.find(q => q.id === form.questId)

      await addDoc(collection(db, 'feedback'), {
        fromUserId:   user.uid,
        fromUserName: user.name || user.email,
        toUserId:     form.toUserId,
        toUserName:   toUser?.name || toUser?.email || '',
        emoji:        form.emoji,
        comment:      form.comment.trim(),
        targetType:   form.targetType,
        questId:      form.targetType === 'quest' ? form.questId : '',
        questTitle:   form.targetType === 'quest' ? quest?.title || '' : '',
        createdAt:    serverTimestamp(),
        xpAwarded:    FEEDBACK_XP,
      })

      // 送り主にXP付与
      const { doc, updateDoc, increment } = await import('firebase/firestore')
      await updateDoc(doc(db, 'users', user.uid), { xp: increment(FEEDBACK_XP) })

      setForm(f => ({ ...f, comment: '', emoji: '👍', questId: '' }))
      setShowForm(false)
      setToast(`フィードバックを送りました！ +${FEEDBACK_XP} XP 🎉`)
      setTimeout(() => setToast(null), 2500)
    } finally {
      setSubmitting(false)
    }
  }

  const displayFeedbacks = tab === 'mine'
    ? feedbacks.filter(f => f.toUserId === user?.uid || f.fromUserId === user?.uid)
    : feedbacks

  const userName = (id) => users.find(u => u.id === id)?.name || id

  return (
    <AppLayout>
      <header className="sticky top-0 z-10 bg-white/85 backdrop-blur border-b border-gray-200
        px-7 py-3.5 flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] text-gray-400 tracking-widest">REGAL QUEST / FEEDBACK</div>
          <div className="font-display text-xl tracking-wide">フィードバック 💬</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl overflow-hidden border border-gray-200">
            {[['team','チーム全員'], ['mine','自分関係']].map(([v, l]) => (
              <button key={v} onClick={() => setTab(v)}
                className={`px-3 py-1.5 text-xs font-bold transition-colors
                  ${tab === v ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                {l}
              </button>
            ))}
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-white text-sm font-bold px-4 py-2 rounded-xl"
            style={{ background:'linear-gradient(135deg,#ff6b6b,#ff9500)', boxShadow:'0 4px 16px rgba(255,107,107,0.35)' }}>
            ＋ 送る
          </button>
        </div>
      </header>

      <main className="p-7 flex flex-col gap-4">
        {/* XP説明バナー */}
        <div className="rounded-2xl p-4 flex items-center gap-3 bg-orange-50 border border-orange-200">
          <div className="text-2xl">✨</div>
          <div>
            <div className="font-bold text-sm text-orange-700">フィードバックを送ると +{FEEDBACK_XP} XP 獲得！</div>
            <div className="text-xs text-orange-600">相手1人に1日1回まで送れます</div>
          </div>
        </div>

        {/* フィードバック一覧 */}
        {displayFeedbacks.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center text-gray-400">
            <div className="text-4xl mb-3">💬</div>
            <div className="font-bold">フィードバックがありません</div>
            <div className="text-sm mt-1">チームメンバーに感謝を伝えましょう！</div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {displayFeedbacks.map(fb => {
              const isToMe   = fb.toUserId === user?.uid
              const isFromMe = fb.fromUserId === user?.uid
              return (
                <div key={fb.id}
                  className={`bg-white rounded-2xl p-4 border shadow-sm
                    ${isToMe ? 'border-orange-200 bg-orange-50/30' : 'border-gray-200'}`}>
                  <div className="flex items-center gap-3">
                    <div className="text-3xl flex-shrink-0">{fb.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm">{fb.fromUserName}</span>
                        <span className="text-gray-400 text-xs">→</span>
                        <span className={`font-bold text-sm ${isToMe ? 'text-orange-600' : ''}`}>
                          {fb.toUserName}
                          {isToMe && <span className="ml-1 text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">自分</span>}
                        </span>
                        {fb.questTitle && (
                          <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded font-bold">
                            📋 {fb.questTitle}
                          </span>
                        )}
                        {isFromMe && (
                          <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold">送信済み</span>
                        )}
                      </div>
                      {fb.comment && (
                        <div className="text-sm text-gray-600 mt-1 bg-gray-50 rounded-xl px-3 py-2">
                          {fb.comment}
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-300 font-mono flex-shrink-0">
                      {fb.createdAt?.toDate?.()?.toLocaleDateString('ja-JP') || ''}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* フィードバック送信モーダル */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowForm(false)}>
          <form onSubmit={sendFeedback} onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-display text-lg tracking-wide mb-5">💬 フィードバックを送る</h3>
            <div className="space-y-4">

              {/* 宛先 */}
              <div>
                <label className="block text-xs font-mono text-gray-400 tracking-widest mb-1.5">宛先 *</label>
                <select value={form.toUserId} onChange={e => setForm(f => ({ ...f, toUserId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400"
                  required>
                  <option value="">選択してください</option>
                  {users.filter(u => u.id !== user?.uid).map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email}
                      {alreadySentToday(u.id) ? ' （今日送済み）' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* 対象タイプ */}
              <div>
                <label className="block text-xs font-mono text-gray-400 tracking-widest mb-1.5">対象</label>
                <div className="flex gap-2">
                  {[['member','メンバーへ'], ['quest','クエストへ']].map(([v, l]) => (
                    <button key={v} type="button"
                      onClick={() => setForm(f => ({ ...f, targetType: v, questId: '' }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all
                        ${form.targetType === v ? 'border-orange-400 bg-orange-50 text-orange-600' : 'border-gray-200 text-gray-400'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* クエスト選択（クエストへの場合のみ） */}
              {form.targetType === 'quest' && (
                <div>
                  <label className="block text-xs font-mono text-gray-400 tracking-widest mb-1.5">クエストを選択</label>
                  <select value={form.questId} onChange={e => setForm(f => ({ ...f, questId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400">
                    <option value="">選択してください</option>
                    {quests.filter(q => !form.toUserId || q.userId === form.toUserId).map(q => (
                      <option key={q.id} value={q.id}>{q.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* 絵文字 */}
              <div>
                <label className="block text-xs font-mono text-gray-400 tracking-widest mb-1.5">リアクション *</label>
                <div className="flex gap-2">
                  {EMOJIS.map(e => (
                    <button key={e.icon} type="button"
                      onClick={() => setForm(f => ({ ...f, emoji: e.icon }))}
                      className={`flex-1 py-3 rounded-xl text-2xl transition-all border-2
                        ${form.emoji === e.icon ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
                      title={e.label}>
                      {e.icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* コメント */}
              <div>
                <label className="block text-xs font-mono text-gray-400 tracking-widest mb-1.5">
                  一言コメント（任意・100文字以内）
                </label>
                <textarea value={form.comment}
                  onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 resize-none"
                  rows={3} maxLength={100}
                  placeholder="ひとこと添えるとより伝わります！" />
                <div className="text-right text-[10px] text-gray-400 mt-0.5">{form.comment.length}/100</div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500">
                キャンセル
              </button>
              <button type="submit" disabled={submitting || !form.toUserId}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50"
                style={{ background:'linear-gradient(135deg,#ff6b6b,#ff9500)' }}>
                {submitting ? '送信中…' : `送る (+${FEEDBACK_XP} XP) 💬`}
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
