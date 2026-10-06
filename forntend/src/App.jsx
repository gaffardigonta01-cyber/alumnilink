import React, { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './auth/LoginPage'
import SignUpPage from './auth/SignUpPage'
import ForgotPasswordPage from './auth/ForgotPasswordPage'
import StudentLayout from './student/StudentLayout'
import AlumniLayout from './alumni/AlumniLayout'
import { NotificationProvider } from './context/NotificationContext'

// -- Inner app - reads from AuthContext ----------------------------------------
function AppShell() {
  const { user, loading, logout } = useAuth()
  const [authView, setAuthView] = useState('login') // 'login' | 'signup' | 'forgot-password'
  const navigate = useNavigate()
  const location = useLocation()


  // Sync authView with location pathname when not logged in
  useEffect(() => {
    if (!user) {
      if (location.pathname === '/signup') {
        setAuthView('signup')
      } else if (location.pathname === '/forgot-password') {
        setAuthView('forgot-password')
      } else if (
        location.pathname.startsWith('/login') ||
        location.pathname === '/student/login' ||
        location.pathname === '/alumni/login'
      ) {
        setAuthView('login')
      }
    }
  }, [user, location.pathname])

  // Handle logout with clean redirect to /login
  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  // Show loading while verifying existing JWT on page load
  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#0f172a', color: '#fff', fontSize: 18
      }}>
        Loading...
      </div>
    )
  }

  // Not logged in - show auth pages
  if (!user) {
    if (authView === 'signup' || location.pathname === '/signup') {
      return (
        <SignUpPage
          onLogin={() => {
            navigate('/', { replace: true })
          }}
          onSwitchToLogin={(extraState) => {
            setAuthView('login')
            const safeState = (extraState && typeof extraState === 'object' && !extraState.nativeEvent && !extraState.target && !extraState._reactName)
              ? extraState
              : undefined
            navigate('/login', { replace: true, state: safeState })
          }}
        />
      )
    }

    if (authView === 'forgot-password' || location.pathname === '/forgot-password') {
      return (
        <ForgotPasswordPage
          onSwitchToLogin={(extraState) => {
            setAuthView('login')
            const safeState = (extraState && typeof extraState === 'object' && !extraState.nativeEvent && !extraState.target && !extraState._reactName)
              ? extraState
              : undefined
            navigate('/login', { replace: true, state: safeState })
          }}
        />
      )
    }

    return (
      <LoginPage
        onLogin={() => {
          navigate('/', { replace: true })
        }}
        onSwitchToSignUp={() => {
          setAuthView('signup')
          navigate('/signup', { replace: true })
        }}
        onSwitchToForgotPassword={(extraState) => {
          setAuthView('forgot-password')
          navigate('/forgot-password', { replace: true, state: extraState })
        }}
      />
    )
  }

  // Logged in - route by role with redirects for /dashboard, /login, /signup
  return (
    <Routes>
      <Route path="/dashboard" element={<Navigate to="/" replace />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/login/*" element={<Navigate to="/" replace />} />
      <Route path="/student/login" element={<Navigate to="/" replace />} />
      <Route path="/alumni/login" element={<Navigate to="/" replace />} />
      <Route path="/signup" element={<Navigate to="/" replace />} />
      <Route path="/forgot-password" element={<Navigate to="/" replace />} />
      {user.role === 'student' ? (
        <Route path="/*" element={
          <NotificationProvider role="student">
            <StudentLayout user={user} onLogout={handleLogout} />
          </NotificationProvider>
        } />
      ) : (
        <Route path="/*" element={
          <NotificationProvider role="alumni">
            <AlumniLayout user={user} onLogout={handleLogout} />
          </NotificationProvider>
        } />
      )}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

// -- Root - wraps everything in AuthProvider and BrowserRouter -----------------
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  )
}
