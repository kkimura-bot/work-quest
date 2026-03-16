// src/components/layout/AppLayout.jsx — super_admin対応
import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth, isSuperAdmin, isManager } from '../../hooks/useAuth'
import { levelProgress, getTitle } from '../../lib/xp'
import NotificationBell from './NotificationBell'

const NAV_COMMON = [
  { to: '/daily-report', icon: '📋', label: '日報' },
  { to: '/ranking',      icon: '🏆', label: 'ランキング' },
  { to: '/feedback',     icon: '💬', label: 'フィードバック' },
  { to: '/mission',      icon: '⚔️', label: 'ミッション' },
]

const NAV_EMPLOYEE = [
  { to: '/home',    icon: '⚔️', label: 'マイクエスト' },
  { to: '/goals',   icon: '🎯', label: '週次目標' },
  { to: '/history', icon: '📜', label: '実績ログ' },
  { to: '/status',  icon: '💎', label: 'マイステータス' },
  ...NAV_COMMON,
]

const NAV_MANAGER = [
  { to: '/guild',   icon: '🏰', label: 'ダッシュボード' },
  { to: '/members', icon: '👥', label: 'メンバー一覧' },
  { to: '/report',  icon: '📊', label: '週次レポート' },
  ...NAV_COMMON,
]

const NAV_SUPER_ADMIN = [
  { to: '/guild',   icon: '🏰', label: 'ダッシュボード' },
  { to: '/members', icon: '👥', label: 'メンバー一覧' },
  { to: '/report',  icon: '📊', label: '週次レポート' },
  { to: '/admin',   icon: '👑', label: '管理者設定' },
  ...NAV_COMMON,
]

const ROLE_LABEL = {
  super_admin: 'SUPER ADMIN',
  manager:     'GUILD MASTER',
  leader:      'TEAM LEADER',
  member:      'by REGALCAST',
}

const ROLE_GRADIENT = {
  super_admin: 'linear-gradient(135deg,#f7971e,#ffd200)',
  manager:     'linear-gradient(135deg,#667eea,#764ba2)',
  leader:      'linear-gradient(135deg,#11998e,#38ef7d)',
  member:      'linear-gradient(135deg,#ff6b6b,#ff9500)',
}

const ROLE_ICON = {
  super_admin: '👑',
  manager:     '🏰',
  leader:      '⚔️',
  member:      '🧙',
}

export default function AppLayout({ children }) {
  const { user, logout }  = useAuth()
  const navigate          = useNavigate()
  const location          = useLocation()
  const role              = user?.role || 'member'
  const gradientStyle     = ROLE_GRADIENT[role] || ROLE_GRADIENT.member
  const { level, progress, remaining } = levelProgress(user?.xp ?? 0)
  const title             = getTitle(level)
  const [menuOpen, setMenuOpen] = useState(false)

  const navItems = isSuperAdmin(user) ? NAV_SUPER_ADMIN
    : isManager(user) ? NAV_MANAGER
    : NAV_EMPLOYEE

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const SidebarContent = () => (
    <>
      {/* ロゴ */}
      <div className="px-5 py-5 border-b border-white/8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: gradientStyle, boxShadow: '0 4px 14px rgba(0,0,0,0.3)' }}>
              {ROLE_ICON[role]}
            </div>
            <div>
              <div className="font-display text-white text-sm tracking-wide">REGAL QUEST</div>
              <div className="font-mono text-white/25 text-[9px] tracking-widest mt-0.5">
                {ROLE_LABEL[role]}
              </div>
            </div>
          </div>
          <NotificationBell />
        </div>
      </div>

      {/* キャラクター情報 */}
      <div className="mx-3 mt-4 mb-2 p-3 rounded-xl border border-white/10"
        style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
            style={{ background: gradientStyle, boxShadow: '0 0 0 2px rgba(255,255,255,0.12)' }}>
            {ROLE_ICON[role]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-bold truncate">{user?.name}</div>
            <div className="font-mono text-white/35 text-[10px] mt-0.5">{title}</div>
          </div>
          <div className="flex-shrink-0 font-mono text-xs font-bold px-2 py-1 rounded-md text-white"
            style={{ background: gradientStyle }}>
            Lv.{level}
          </div>
        </div>
        {/* super_adminはXPバーを省略（バッジで表示） */}
        {isSuperAdmin(user) ? (
          <div className="text-center text-[10px] font-bold px-2 py-1 rounded-lg"
            style={{ background: 'rgba(247,151,30,0.2)', color: '#ffd200' }}>
            👑 SUPER ADMIN
          </div>
        ) : (
          <>
            <div className="flex justify-between text-[9px] font-mono text-white/25 mb-1">
              <span>EXP</span><span>あと {remaining} XP</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden bg-white/8">
              <div className="h-full rounded-full transition-all"
                style={{ width:`${progress*100}%`, background: gradientStyle,
                  boxShadow:'0 0 8px rgba(255,149,0,0.5)' }} />
            </div>
          </>
        )}
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 px-2.5 py-1 overflow-y-auto">
        <div className="text-[9px] font-mono text-white/20 tracking-widest px-2.5 pt-3 pb-1">
          {isSuperAdmin(user) ? 'ADMIN' : isManager(user) ? 'GUILD' : 'MENU'}
        </div>
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to}
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-sm font-medium
               transition-all mb-0.5 relative
               ${isActive ? 'text-white' : 'text-white/40 hover:text-white/75 hover:bg-white/5'}`
            }
            style={({ isActive }) => isActive ? {
              background: isSuperAdmin(user) ? 'rgba(247,151,30,0.15)'
                : isManager(user) ? 'rgba(102,126,234,0.15)'
                : 'rgba(255,107,107,0.15)'
            } : {}}>
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full"
                    style={{ background: gradientStyle }} />
                )}
                <span className="text-base w-5 text-center">{item.icon}</span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-white/7">
        <button onClick={handleLogout}
          className="w-full text-xs text-white/25 hover:text-white/60 transition-colors
            font-mono tracking-widest py-2 rounded-xl hover:bg-white/5">
          LOGOUT ↩
        </button>
      </div>
    </>
  )

  return (
    <div className="flex min-h-screen">
      <aside className="hidden md:flex w-56 flex-shrink-0 flex-col sticky top-0 h-screen"
        style={{ background: '#16133a' }}>
        <SidebarContent />
      </aside>

      {/* スマホヘッダー */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3"
        style={{ background: '#16133a', boxShadow: '0 2px 16px rgba(0,0,0,0.3)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
            style={{ background: gradientStyle }}>
            {ROLE_ICON[role]}
          </div>
          <span className="font-display text-white text-sm tracking-wide">REGAL QUEST</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button onClick={() => setMenuOpen(v => !v)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/70 hover:text-white text-xl">
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-30" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <aside className="absolute left-0 top-0 bottom-0 w-64 flex flex-col"
            style={{ background: '#16133a' }} onClick={e => e.stopPropagation()}>
            <div className="h-14" />
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-screen overflow-auto mt-14 md:mt-0 pb-16 md:pb-0">
        {children}
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex border-t border-gray-200"
        style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)' }}>
        {navItems.slice(0, 4).map(item => {
          const isActive = location.pathname === item.to
          return (
            <NavLink key={item.to} to={item.to} className="flex-1 flex flex-col items-center py-2 gap-0.5">
              <span className="text-xl">{item.icon}</span>
              <span className={`text-[9px] font-bold font-mono ${isActive ? 'text-orange-500' : 'text-gray-400'}`}>
                {item.label.slice(0, 5)}
              </span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
