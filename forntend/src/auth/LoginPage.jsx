import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const CAMPUS_IMAGE = '/assets/bce1cf585e533153ba50129051bb67da0b219865'

export default function LoginPage({ onLogin, onSwitchToSignUp, onSwitchToForgotPassword }) {
  const { login } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const navState = location?.state || {}

  const [role, setRole] = useState(navState.role || 'student')
  const [email, setEmail] = useState(() => {
    return navState.email || localStorage.getItem('al_remember_email') || ''
  })
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(() => {
    return localStorage.getItem('al_remember_device') === 'true'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(navState.successMessage || '')

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }

    setLoading(true)
    try {
      const user = await login(email.trim(), password, remember)

      if (remember) {
        localStorage.setItem('al_remember_device', 'true')
        localStorage.setItem('al_remember_email', email.trim())
      } else {
        localStorage.removeItem('al_remember_device')
        localStorage.removeItem('al_remember_email')
      }

      // Warn if role tab doesn't match DB role, but still log them in
      if (user.role !== role) {
        // silently switch — the app routes by user.role anyway
      }

      window.history.replaceState(null, '', '/')
      if (onLogin) onLogin(user)
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = () => {
    if (onSwitchToSignUp) {
      onSwitchToSignUp()
    } else {
      handleLogin({ preventDefault: () => { } })
    }
  }

  const handleForgotPassword = (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (onSwitchToForgotPassword) {
      onSwitchToForgotPassword({ email: email.trim(), role })
    } else {
      navigate('/forgot-password', { state: { email: email.trim(), role } })
    }
  }

  return (
    <div className="login-page">
      {/* ── Left hero panel ── */}
      <div className="login-left">
        <div
          className="login-left-bg"
          style={{ backgroundImage: `url(${CAMPUS_IMAGE})` }}
        />
        <div className="login-left-content">
          <div className="login-brand">
            <div className="login-brand-icon">A</div>
            <span className="login-brand-name">AlumniLink</span>
          </div>
          <div className="login-headline">
            Bridging the gap<br />between potential<br />and legacy.
          </div>
          <p className="login-subtext">
            Join the professional alumni and student network. Connect directly with verified mentors to advance your career.
          </p>
        </div>
        <div className="login-stats">
          <div>
            <div className="login-stat-value">1:1</div>
            <div className="login-stat-label">Mentorship</div>
          </div>
          <div>
            <div className="login-stat-value">100%</div>
            <div className="login-stat-label">Verified Network</div>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="login-right">
        <div className="login-form-wrap">
          <h1 className="login-title">Welcome back</h1>
          <p className="login-subtitle">Sign in to your professional portal.</p>

          {/* Role toggle */}
          <div className="role-tabs">
            <div
              className={`role-tab ${role === 'student' ? 'active' : ''}`}
              onClick={() => setRole('student')}
            >
              Student
            </div>
            <div
              className={`role-tab ${role === 'alumni' ? 'active' : ''}`}
              onClick={() => setRole('alumni')}
            >
              Alumni
            </div>
          </div>

          <form onSubmit={handleLogin} autoComplete="off">
            {success && (
              <div style={{
                background: '#ecfdf5', border: '1px solid #6ee7b7',
                color: '#065f46', borderRadius: 8, padding: '10px 14px',
                fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8
              }}>
                <span style={{ fontSize: 16 }}>✓</span>
                <span>{success}</span>
              </div>
            )}
            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fca5a5',
                color: '#b91c1c', borderRadius: 8, padding: '10px 14px',
                fontSize: 13, marginBottom: 16
              }}>
                {error}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="name@university.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="form-label" style={{ margin: 0 }}>Password</label>
                <span
                  onClick={handleForgotPassword}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleForgotPassword(e) }}
                  style={{ fontSize: 12, color: '#16428c', cursor: 'pointer', fontWeight: 600 }}
                >
                  Forgot password?
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className={`form-input password-masked${showPassword ? ' is-visible' : ''}`}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  data-lpignore="true"
                  style={{ paddingRight: 42 }}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#6b7280',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22 }}>
              <input
                type="checkbox"
                id="remember"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="remember" style={{ fontSize: 13, color: '#6b7280', cursor: 'pointer' }}>
                Remember this device for 30 days
              </label>
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
              style={{ background: role === 'alumni' ? '#d4af37' : undefined, color: role === 'alumni' ? '#1a1a1a' : undefined }}
            >
              {loading ? 'Signing in…' : 'Log In'}
            </button>
          </form>

          <div className="login-divider"><span>OR</span></div>

          <button
            className="btn btn-secondary btn-full"
            style={{ fontSize: 14, fontWeight: 600 }}
            onClick={handleSignUp}
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  )
}
