// src/components/layout/AppLayout.jsx
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { levelProgress, getTitle } from '../../lib/xp'

const NAV_COMMON = [
  { to: '/daily-report', icon: '📋', label: '日報' },
  { to: '/ranking',      icon: '🏆', label: 'ランキング' },
  { to: '/feedback',     icon: '💬', label: 'フィードバック' },
  { to: '/mission',      icon: '⚔️', label: 'チームミッション' },
]

const NAV_EMPLOYEE = [
  { to: '/home',    icon: '⚔️', label: 'マイクエスト' },
  { to: '/goals',   icon: '🎯', label: '週次目標' },
  { to: '/history', icon: '📜', label: '実績ログ' },
  { to: '/status',  icon: '💎', label: 'マイステータス' },
  ...NAV_COMMON,
]

const NAV_MANAGER = [
  { to: '/guild',   icon: '🏰', label: 'ギルドダッシュボード' },
  { to: '/members', icon: '👥', label: 'メンバー一覧' },
  { to: '/report',  icon: '📊', label: '週次レポート' },
  ...NAV_COMMON,
]

export default function AppLayout({ children }) {
  const { user, logout } = useAuth()
  const navigate          = useNavigate()
  const isManager         = user?.role === 'manager' || user?.role === 'leader'
  const navItems          = isManager ? NAV_MANAGER : NAV_EMPLOYEE
  const { level, progress, remaining } = levelProgress(user?.xp ?? 0)
  const title             = getTitle(level)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen">
      {/* ===== SIDEBAR ===== */}
      <aside className="w-60 flex-shrink-0 flex flex-col sticky top-0 h-screen"
        style={{ background: '#16133a' }}>

        {/* ロゴ */}
        <div className="px-5 py-6 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
              style={{ background: isManager
                ? 'linear-gradient(135deg,#667eea,#764ba2)'
                : 'linear-gradient(135deg,#ff6b6b,#ff9500)',
                boxShadow: isManager
                  ? '0 4px 14px rgba(102,126,234,0.5)'
                  : '0 4px 14px rgba(255,107,107,0.5)' }}>
              {isManager ? '🏰' : '⚔'}
            </div>
            <div>
              <div className="font-display text-white text-sm tracking-wide">REGAL QUEST</div>
              <div className="font-mono text-white/25 text-[9px] tracking-widest mt-0.5">
                {isManager ? 'GUILD MASTER VIEW' : 'by REGALCAST'}
              </div>
            </div>
          </div>
        </div>

        {/* キャラクター情報 */}
        <div className="mx-3 mt-4 mb-2 p-3 rounded-xl border border-white/10"
          style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: isManager
                ? 'linear-gradient(135deg,#667eea,#764ba2)'
                : 'linear-gradient(135deg,#ff6b6b,#ff9500)',
                boxShadow: '0 0 0 2px rgba(255,255,255,0.12)' }}>
              {isManager ? '👑' : '🧙'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-bold truncate">{user?.name}</div>
              <div className="font-mono text-white/35 text-[10px] mt-0.5">{title}</div>
            </div>
            <div className="flex-shrink-0 font-mono text-xs font-bold px-2 py-1 rounded-md"
              style={{ background: isManager
                ? 'linear-gradient(135deg,#667eea,#764ba2)'
                : 'linear-gradient(135deg,#ff6b6b,#ff9500)',
                color: '#fff' }}>
              Lv.{level}
            </div>
          </div>
          {!isManager && (
            <>
              <div className="flex justify-between text-[9px] font-mono text-white/25 mb-1">
                <span>EXP</span>
                <span>あと {remaining} XP</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden bg-white/8">
                <div className="h-full rounded-full transition-all"
                  style={{
                    width: `${progress * 100}%`,
                    background: 'linear-gradient(90deg,#ff6b6b,#ff9500)',
                    boxShadow: '0 0 8px rgba(255,149,0,0.5)'
                  }} />
              </div>
            </>
          )}
        </div>

        {/* ナビゲーション */}
        <nav className="flex-1 px-2.5 py-1 overflow-y-auto">
          <div className="text-[9px] font-mono text-white/20 tracking-widest px-2.5 pt-3 pb-1">
            {isManager ? 'GUILD' : 'MENU'}
          </div>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-sm font-medium
                 transition-all mb-0.5 relative
                 ${isActive
                   ? 'text-white'
                   : 'text-white/40 hover:text-white/75 hover:bg-white/5'}`
              }
              style={({ isActive }) => isActive ? {
                background: isManager
                  ? 'rgba(102,126,234,0.15)'
                  : 'rgba(255,107,107,0.15)'
              } : {}}>
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full"
                      style={{ background: isManager
                        ? 'linear-gradient(135deg,#667eea,#764ba2)'
                        : 'linear-gradient(135deg,#ff6b6b,#ff9500)' }} />
                  )}
                  <span className="text-base w-5 text-center">{item.icon}</span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ログアウト */}
        <div className="p-3 border-t border-white/7">
          <button onClick={handleLogout}
            className="w-full text-xs text-white/25 hover:text-white/60 transition-colors
              font-mono tracking-widest py-2 rounded-xl hover:bg-white/5">
            LOGOUT ↩
          </button>
        </div>
      </aside>

      {/* ===== MAIN ===== */}
      <div className="flex-1 flex flex-col min-h-screen overflow-auto">
        {children}
      </div>
    </div>
  )
}
