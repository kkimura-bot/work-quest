// src/components/layout/NotificationBell.jsx — アプリ内通知
import { useEffect, useState, useRef } from 'react'
import { collection, query, where, orderBy, onSnapshot,
  updateDoc, doc, writeBatch } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'

export default function NotificationBell() {
  const { user }                  = useAuth()
  const [notifs, setNotifs]       = useState([])
  const [open, setOpen]           = useState(false)
  const ref                       = useRef(null)

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'notifications'),
      where('toUserId', '==', user.uid),
      orderBy('createdAt', 'desc')
    )
    return onSnapshot(q, snap =>
      setNotifs(snap.docs.slice(0, 30).map(d => ({ id: d.id, ...d.data() })))
    )
  }, [user])

  // 外クリックで閉じる
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unread = notifs.filter(n => !n.read).length

  const markAllRead = async () => {
    const unreadNotifs = notifs.filter(n => !n.read)
    if (unreadNotifs.length === 0) return
    const batch = writeBatch(db)
    unreadNotifs.forEach(n => batch.update(doc(db, 'notifications', n.id), { read: true }))
    await batch.commit()
  }

  const markRead = async (id) => {
    await updateDoc(doc(db, 'notifications', id), { read: true })
  }

  const ICONS = {
    feedback:    '💬',
    levelup:     '🎉',
    badge:       '🏆',
    mission:     '⚔️',
    report:      '📋',
    reminder:    '⏰',
    manager:     '👑',
    default:     '🔔',
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => { setOpen(v => !v); if (!open) markAllRead() }}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center
          text-white/50 hover:text-white hover:bg-white/10 transition-all">
        🔔
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold
            flex items-center justify-center text-white"
            style={{ background: 'linear-gradient(135deg,#ff6b6b,#ff9500)' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl
          border border-gray-200 z-50 overflow-hidden"
          style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="font-bold text-sm">通知</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-orange-500 hover:text-orange-600">
                すべて既読
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                <div className="text-2xl mb-2">🔔</div>
                通知はありません
              </div>
            ) : (
              notifs.map(n => (
                <div key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`px-4 py-3 flex items-start gap-3 cursor-pointer transition-colors
                    hover:bg-gray-50 border-b border-gray-50 last:border-none
                    ${!n.read ? 'bg-orange-50/50' : ''}`}>
                  <div className="text-xl flex-shrink-0 mt-0.5">
                    {ICONS[n.type] || ICONS.default}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm ${!n.read ? 'font-bold' : 'text-gray-700'}`}>
                      {n.message}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {n.createdAt?.toDate?.()?.toLocaleString('ja-JP', {
                        month: 'numeric', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      }) || ''}
                    </div>
                  </div>
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                      style={{ background: 'linear-gradient(135deg,#ff6b6b,#ff9500)' }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
