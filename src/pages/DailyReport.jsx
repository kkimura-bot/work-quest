// src/pages/DailyReport.jsx — 日報機能
import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import AppLayout from '../components/layout/AppLayout'

const SATISFACTION = [
  { val: 5, label: '🌟 最高', desc: '目標以上の成果！' },
  { val: 4, label: '😊 良い', desc: '予定通り進んだ' },
  { val: 3, label: '😐 普通', desc: 'まあまあ' },
  { val: 2, label: '😟 やや不満', desc: '少し課題あり' },
  { val: 1, label: '😰 辛い', desc: '大きな問題あり' },
]

export default function DailyReport() {
  const { user } = useAuth()
  const [reports, setReports]   = useState([])
  const [allReports, setAllReports] = useState([]) // 全メンバー
  const [showForm, setShowForm] = useState(false)
  const [viewMode, setViewMode] = useState('mine') // 'mine' | 'team'
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '18:00',
    content: '',
    troubles: '',
    satisfaction: 3,
  })
  const [comment, setComment]       = useState({}) // reportId: text
  const [submitting, setSubmitting] = useState(false)
  const today = new Date().toISOString().split('T')[0]

  // 自分の日報を購読
  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'dailyReports'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    )
    return onSnapshot(q, snap =>
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [user])

  // 全メンバーの日報を購読（チーム閲覧用）
  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'dailyReports'),
      orderBy('date', 'desc')
    )
    return onSnapshot(q, snap =>
      setAllReports(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [user])

  // 今日の日報があるか
  const todayReport = reports.find(r => r.date === today)

  const submitReport = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await addDoc(collection(db, 'dailyReports'), {
        ...form,
        userId: user.uid,
        userName: user.name || user.email,
        createdAt: serverTimestamp(),
        managerComment: '',
      })
      setForm(f => ({ ...f, content: '', troubles: '', satisfaction: 3 }))
      setShowForm(false)
    } finally {
      setSubmitting(false)
    }
  }

  // マネージャーコメント保存
  const saveComment = async (reportId) => {
    const text = comment[reportId]
    if (!text?.trim()) return
    await updateDoc(doc(db, 'dailyReports', reportId), {
      managerComment: text.trim(),
      managerCommentAt: serverTimestamp(),
      managerName: user.name || user.email,
    })
    setComment(c => ({ ...c, [reportId]: '' }))
  }

  const isManager = user?.role === 'manager' || user?.role === 'leader' || user?.role === 'super_admin'
  const displayReports = viewMode === 'mine' ? reports : allReports

  return (
    <AppLayout>
      <header className="sticky top-0 z-10 bg-white/85 backdrop-blur border-b border-gray-200
        px-7 py-3.5 flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] text-gray-400 tracking-widest">REGAL QUEST / REPORT</div>
          <div className="font-display text-xl tracking-wide">日報 📋</div>
        </div>
        <div className="flex items-center gap-3">
          {/* 表示切り替え */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200">
            {[['mine','自分'], ['team','チーム全員']].map(([v, l]) => (
              <button key={v} onClick={() => setViewMode(v)}
                className={`px-3 py-1.5 text-xs font-bold transition-colors
                  ${viewMode === v ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                {l}
              </button>
            ))}
          </div>
          {!todayReport && (
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 text-white text-sm font-bold px-4 py-2 rounded-xl"
              style={{ background:'linear-gradient(135deg,#ff6b6b,#ff9500)', boxShadow:'0 4px 16px rgba(255,107,107,0.35)' }}>
              ＋ 今日の日報
            </button>
          )}
        </div>
      </header>

      <main className="p-7 flex flex-col gap-4">
        {/* 今日の提出状況バナー */}
        {viewMode === 'mine' && (
          <div className={`rounded-2xl p-4 flex items-center gap-3
            ${todayReport ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
            <div className="text-2xl">{todayReport ? '✅' : '📝'}</div>
            <div>
              <div className={`font-bold text-sm ${todayReport ? 'text-green-700' : 'text-orange-700'}`}>
                {todayReport ? '今日の日報を提出済みです' : '今日の日報がまだ提出されていません'}
              </div>
              <div className={`text-xs ${todayReport ? 'text-green-600' : 'text-orange-600'}`}>
                {todayReport ? `提出日時: ${todayReport.date}` : '24時までに提出してください'}
              </div>
            </div>
            {!todayReport && (
              <button onClick={() => setShowForm(true)}
                className="ml-auto text-xs font-bold px-3 py-1.5 rounded-xl text-white"
                style={{ background:'linear-gradient(135deg,#ff6b6b,#ff9500)' }}>
                提出する
              </button>
            )}
          </div>
        )}

        {/* 日報一覧 */}
        {displayReports.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center text-gray-400">
            <div className="text-4xl mb-3">📋</div>
            <div className="font-bold">日報がありません</div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {displayReports.map(report => (
              <ReportCard key={report.id} report={report} user={user}
                isManager={isManager}
                comment={comment[report.id] || ''}
                onCommentChange={v => setComment(c => ({ ...c, [report.id]: v }))}
                onSaveComment={() => saveComment(report.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* 日報入力モーダル */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowForm(false)}>
          <form onSubmit={submitReport} onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-display text-lg tracking-wide mb-5">📋 日報を提出する</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">日付</label>
                  <input type="date" value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">開始時刻</label>
                  <input type="time" value={form.startTime}
                    onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">終了時刻</label>
                  <input type="time" value={form.endTime}
                    onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1">今日やったこと *</label>
                <textarea value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 resize-none"
                  rows={4} placeholder="今日取り組んだこと・完了したこと（200字以内）" maxLength={200} required />
                <div className="text-right text-[10px] text-gray-400 mt-0.5">{form.content.length}/200</div>
              </div>
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1">
                  困っていること・相談
                  <span className="ml-2 text-orange-500">⚠ 入力するとマネージャーに通知</span>
                </label>
                <textarea value={form.troubles}
                  onChange={e => setForm(f => ({ ...f, troubles: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 resize-none"
                  rows={2} placeholder="任意：悩みや相談があれば（200字以内）" maxLength={200} />
              </div>
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-2">今日の満足度 *</label>
                <div className="flex gap-2 flex-wrap">
                  {SATISFACTION.map(s => (
                    <button key={s.val} type="button"
                      onClick={() => setForm(f => ({ ...f, satisfaction: s.val }))}
                      className={`px-3 py-2 rounded-xl text-sm font-bold transition-all border-2
                        ${form.satisfaction === s.val
                          ? 'border-orange-400 bg-orange-50 text-orange-600'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                      {s.label}
                    </button>
                  ))}
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
                style={{ background:'linear-gradient(135deg,#ff6b6b,#ff9500)' }}>
                {submitting ? '提出中…' : '日報を提出 📋'}
              </button>
            </div>
          </form>
        </div>
      )}
    </AppLayout>
  )
}

function ReportCard({ report, user, isManager, comment, onCommentChange, onSaveComment }) {
  const sat = SATISFACTION.find(s => s.val === report.satisfaction) ?? SATISFACTION[2]
  const isOwn = report.userId === user?.uid
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* ヘッダー */}
      <div className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(v => !v)}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background:'linear-gradient(135deg,#667eea,#764ba2)' }}>
          👤
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">{report.userName || '名前なし'}</span>
            {isOwn && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold">自分</span>}
          </div>
          <div className="text-xs text-gray-400">{report.date} / {report.startTime}〜{report.endTime}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-sm font-bold px-2 py-1 rounded-lg
            ${report.satisfaction >= 4 ? 'bg-green-50 text-green-600'
              : report.satisfaction <= 2 ? 'bg-red-50 text-red-500'
              : 'bg-gray-100 text-gray-500'}`}>
            {sat.label}
          </span>
          {report.troubles && (
            <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded font-bold">⚠ 相談あり</span>
          )}
          <span className="text-gray-400 text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* 詳細 */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="mt-3 space-y-3">
            <div>
              <div className="text-xs font-mono text-gray-400 mb-1">今日やったこと</div>
              <div className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 whitespace-pre-wrap">
                {report.content}
              </div>
            </div>
            {report.troubles && (
              <div>
                <div className="text-xs font-mono text-orange-500 mb-1">⚠ 困りごと・相談</div>
                <div className="text-sm text-gray-700 bg-orange-50 rounded-xl p-3 whitespace-pre-wrap border border-orange-200">
                  {report.troubles}
                </div>
              </div>
            )}
            {report.managerComment && (
              <div>
                <div className="text-xs font-mono text-purple-500 mb-1">💬 マネージャーコメント（{report.managerName}）</div>
                <div className="text-sm text-gray-700 bg-purple-50 rounded-xl p-3 border border-purple-200">
                  {report.managerComment}
                </div>
              </div>
            )}
            {/* マネージャー・リーダーはコメント入力可 */}
            {isManager && (
              <div className="flex gap-2 mt-2">
                <input value={comment}
                  onChange={e => onCommentChange(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400"
                  placeholder="コメントを入力…" />
                <button onClick={onSaveComment}
                  className="px-4 py-2 rounded-xl text-white text-sm font-bold"
                  style={{ background:'linear-gradient(135deg,#667eea,#764ba2)' }}>
                  送信
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
