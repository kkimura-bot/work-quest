// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth, isSuperAdmin } from './hooks/useAuth'
import './styles/index.css'

import Login       from './pages/Login'
import Home        from './pages/Home'
import Goals       from './pages/Goals'
import History     from './pages/History'
import Status      from './pages/Status'
import Guild       from './pages/Guild'
import Members     from './pages/Members'
import Report      from './pages/Report'
import DailyReport from './pages/DailyReport'
import Ranking     from './pages/Ranking'
import Feedback    from './pages/Feedback'
import Mission     from './pages/Mission'
import Admin       from './pages/Admin'
import Register    from './pages/Register'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-brand-dark text-white font-mono">Loading...</div>
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return !user ? children : <Navigate to="/home" replace />
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (!isSuperAdmin(user)) return <Navigate to="/home" replace />
  return children
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login"        element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register"     element={<Register />} />
          <Route path="/home"         element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path="/goals"        element={<PrivateRoute><Goals /></PrivateRoute>} />
          <Route path="/history"      element={<PrivateRoute><History /></PrivateRoute>} />
          <Route path="/status"       element={<PrivateRoute><Status /></PrivateRoute>} />
          <Route path="/guild"        element={<PrivateRoute><Guild /></PrivateRoute>} />
          <Route path="/members"      element={<PrivateRoute><Members /></PrivateRoute>} />
          <Route path="/report"       element={<PrivateRoute><Report /></PrivateRoute>} />
          <Route path="/daily-report" element={<PrivateRoute><DailyReport /></PrivateRoute>} />
          <Route path="/ranking"      element={<PrivateRoute><Ranking /></PrivateRoute>} />
          <Route path="/feedback"     element={<PrivateRoute><Feedback /></PrivateRoute>} />
          <Route path="/mission"      element={<PrivateRoute><Mission /></PrivateRoute>} />
          <Route path="/admin"        element={<AdminRoute><Admin /></AdminRoute>} />
          <Route path="*"             element={<Navigate to="/home" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
