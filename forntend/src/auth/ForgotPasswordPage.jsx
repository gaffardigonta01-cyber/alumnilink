import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authAPI } from '../services/api'

const CAMPUS_IMAGE = '/assets/bce1cf585e533153ba50129051bb67da0b219865'

export default function ForgotPasswordPage({ onSwitchToLogin }) {
  const navigate = useNavigate()
  const location = useLocation()
  const navState = location?.state || {}

  const [email, setEmail] = useState(navState.email || '')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // 'request' | 'verify' | 'success'
  const [step, setStep] = useState('request')
  const [devCode, setDevCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const getPasswordStrength = () => {
    if (!newPassword) return { level: 0, text: '', color: '#e5e7eb' }
    if (newPassword.length < 6) return { level: 1, text: 'Weak', color: '#ef4444' }
    if (newPassword.length < 10) return { level: 2, text: 'Medium', color: '#f59e0b' }
    return { level: 3, text: 'Strong', color: '#10b981' }
  }

  const strength = getPasswordStrength()

  const handleBackToLogin = (extraPayload) => {
    if (onSwitchToLogin) {
      onSwitchToLogin(extraPayload)
    } else {
      navigate('/login', { replace: true, state: extraPayload })
    }
  }

  // Step 1: Request reset code
  const handleRequestCode = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')

    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }

    setLoading(true)
    try {
      const res = await authAPI.forgotPassword({ email: email.trim() })
      setStep('verify')
      setDevCode(res.devCode || '')
      setInfo(res.message || 'Verification code sent to your email.')
    } catch (err) {
      setError(err.message || 'Unable to request password reset. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Submit code & new password
  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')

    if (!code.trim()) {
      setError('Please enter the 6-digit verification code.')
      return
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await authAPI.resetPassword({
        email: email.trim(),
        code: code.trim(),
        newPassword
      })
      setStep('success')
    } catch (err) {
      setError(err.message || 'Password reset failed. Please check your code.')
    } finally {
      setLoading(false)
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
            Account Security.<br />Quick & Seamless<br />Recovery.
          </div>
          <p className="login-subtext">
            Don't worry — it happens! Follow the simple steps to securely reset your credentials and get back into your account.
          </p>
        </div>
        <div className="login-stats">
          <div>
            <div className="login-stat-value">Instant</div>
            <div className="login-stat-label">Code Delivery</div>
          </div>
          <div>
            <div className="login-stat-value">256-bit</div>
            <div className="login-stat-label">Encryption</div>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="login-right">
        <div className="login-form-wrap">
          {step === 'request' && (
            <>
              <button
                type="button"
                onClick={() => handleBackToLogin()}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 20
                }}
              >
                ← Back to Log In
              </button>

              <h1 className="login-title">Reset password</h1>
              <p className="login-subtitle">
                Enter your account email and we will generate a verification code to reset your password.
              </p>

              {error && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  color: '#b91c1c',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 13,
                  marginBottom: 16
                }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleRequestCode}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="name@university.edu"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-full btn-lg"
                  disabled={loading}
                >
                  {loading ? 'Sending code…' : 'Send Verification Code'}
                </button>
              </form>
            </>
          )}

          {step === 'verify' && (
            <>
              <button
                type="button"
                onClick={() => setStep('request')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 20
                }}
              >
                ← Change Email
              </button>

              <h1 className="login-title">Set new password</h1>
              <p className="login-subtitle">
                We sent a 6-digit code to <strong style={{ color: '#1e293b' }}>{email}</strong>.
              </p>

              {devCode && (
                <div style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  color: '#1e40af',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 13,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span>Verification code: <strong style={{ fontSize: 15, letterSpacing: 2 }}>{devCode}</strong></span>
                  <button
                    type="button"
                    onClick={() => setCode(devCode)}
                    style={{
                      background: '#1d4ed8',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 4,
                      padding: '3px 8px',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Auto-fill
                  </button>
                </div>
              )}

              {error && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  color: '#b91c1c',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 13,
                  marginBottom: 16
                }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleResetPassword}>
                <div className="form-group">
                  <label className="form-label">6-Digit Verification Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    className="form-input"
                    placeholder="e.g. 123456"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    style={{ letterSpacing: '4px', fontSize: 16, fontWeight: 700, textAlign: 'center' }}
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 6 }}>
                  <label className="form-label">New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className={`form-input password-masked${showPassword ? ' is-visible' : ''}`}
                      placeholder="Minimum 8 characters"
                      autoComplete="new-password"
                      data-lpignore="true"
                      style={{ paddingRight: 42 }}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
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
                        padding: 4
                      }}
                      title={showPassword ? 'Hide password' : 'Show password'}
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

                {/* Password strength meter */}
                {newPassword && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
                      <span>Password strength:</span>
                      <span style={{ color: strength.color, fontWeight: 700 }}>{strength.text}</span>
                    </div>
                    <div style={{ height: 4, background: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${(strength.level / 3) * 100}%`,
                          background: strength.color,
                          transition: 'all .3s',
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="form-label">Confirm New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className={`form-input password-masked${showConfirmPassword ? ' is-visible' : ''}`}
                      placeholder="Re-enter new password"
                      autoComplete="new-password"
                      data-lpignore="true"
                      style={{ paddingRight: 42 }}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(v => !v)}
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#6b7280',
                        padding: 4
                      }}
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? (
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

                <button
                  type="submit"
                  className="btn btn-primary btn-full btn-lg"
                  disabled={loading}
                >
                  {loading ? 'Updating password…' : 'Reset Password'}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <button
                  type="button"
                  onClick={handleRequestCode}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#16428c',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Resend verification code
                </button>
              </div>
            </>
          )}

          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: '#ecfdf5',
                color: '#10b981',
                fontSize: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                border: '2px solid #a7f3d0'
              }}>
                ✓
              </div>

              <h1 className="login-title" style={{ marginBottom: 8 }}>Password Reset!</h1>
              <p className="login-subtitle" style={{ marginBottom: 28 }}>
                Your password has been changed successfully. You can now log in using your new password.
              </p>

              <button
                type="button"
                className="btn btn-primary btn-full btn-lg"
                onClick={() => handleBackToLogin({
                  email,
                  successMessage: 'Password reset successfully! Please log in with your new password.'
                })}
              >
                Proceed to Log In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
