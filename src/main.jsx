// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import './styles/index.css'

import Login   from './pages/Login'
import Home    from './pages/Home'
import Goals   from './pages/Goals'
import History from './pages/History'

// 認証済みのみアクセス可能なルート
function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-brand-dark text-white font-mono">Loading...</div>
  return user ? children : <Navigate to="/login" replace />
}

// 未認証のみアクセス可能なルート
function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return !user ? children : <Navigate to="/home" replace />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* 公開ルート */}
          <Route path="/login" element={
            <PublicRoute><Login /></PublicRoute>
          } />

          {/* 認証済みルート */}
          <Route path="/home" element={
            <PrivateRoute><Home /></PrivateRoute>
          } />
          <Route path="/goals" element={
            <PrivateRoute><Goals /></PrivateRoute>
          } />
          <Route path="/history" element={
            <PrivateRoute><History /></PrivateRoute>
          } />

          {/* Phase 2 以降に追加予定 */}
          {/* <Route path="/goals"   element={<PrivateRoute><Goals /></PrivateRoute>} /> */}
          {/* <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} /> */}
          {/* <Route path="/status"  element={<PrivateRoute><Status /></PrivateRoute>} /> */}
          {/* <Route path="/guild"   element={<PrivateRoute><Guild /></PrivateRoute>} /> */}

          {/* デフォルト */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
