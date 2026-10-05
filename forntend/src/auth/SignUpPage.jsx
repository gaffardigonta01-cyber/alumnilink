import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const CAMPUS_IMAGE = '/assets/bce1cf585e533153ba50129051bb67da0b219865'

export default function SignUpPage({ onLogin, onSwitchToLogin }) {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [role, setRole] = useState('student')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [institution, setInstitution] = useState('')
  const [departmentOrTitle, setDepartmentOrTitle] = useState('')
  const [gradYear, setGradYear] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const getPasswordStrength = () => {
    if (!password) return { level: 0, text: '', color: '#e5e7eb' }
    if (password.length < 6) return { level: 1, text: 'Weak', color: '#ef4444' }
    if (password.length < 10) return { level: 2, text: 'Medium', color: '#f59e0b' }
    return { level: 3, text: 'Strong', color: '#10b981' }
  }

  const strength = getPasswordStrength()

  const handleSignUp = async (e) => {
    e.preventDefault()
    setError('')

    if (!fullName.trim()) { setError('Please enter your full name.'); return }
    if (!email.trim())    { setError('Please enter a valid email address.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters long.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    if (!agreedToTerms) { setError('You must agree to the Terms of Service and Privacy Policy.'); return }

    setLoading(true)
    try {
      await register({
        name:     fullName.trim(),
        email:    email.trim(),
        password,
        role,
        // Extra profile fields stored after registration
        major:          role === 'student' ? departmentOrTitle : undefined,
        graduationYear: Number(gradYear) || undefined,
        company:        role === 'alumni' ? institution        : undefined,
        jobTitle:       role === 'alumni' ? departmentOrTitle  : undefined,
      })
      if (onSwitchToLogin) {
        onSwitchToLogin({
          role,
          email: email.trim(),
          successMessage: 'Account created successfully! Please log in with your credentials.',
        })
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSwitchToLogin = (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (onSwitchToLogin) {
      onSwitchToLogin()
    } else {
      navigate('/login')
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
            Start your journey.<br />Build powerful<br />connections.
          </div>
          <p className="login-subtext">
            Create an account to access 1:1 mentorship sessions, referral requests, and career guidance directly from verified alumni.
          </p>
        </div>
        <div className="login-stats">
          <div>
            <div className="login-stat-value">1:1</div>
            <div className="login-stat-label">Mentorship</div>
          </div>
          <div>
            <div className="login-stat-value">100%</div>
            <div className="login-stat-label">Verified Alumni</div>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="login-right" style={{ overflowY: 'auto', padding: '40px 0' }}>
        <div className="login-form-wrap" style={{ maxWidth: 420 }}>
          <h1 className="login-title">Create your account</h1>
          <p className="login-subtitle">Join the premier alumni & student networking network.</p>

          {/* Role toggle */}
          <div className="role-tabs" style={{ marginBottom: 20 }}>
            <div
              className={`role-tab ${role === 'student' ? 'active' : ''}`}
              onClick={() => { setRole('student'); setError(''); setGradYear('2026') }}
            >
              Student
            </div>
            <div
              className={`role-tab ${role === 'alumni' ? 'active' : ''}`}
              onClick={() => { setRole('alumni'); setError(''); setGradYear('2018') }}
            >
              Alumni
            </div>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSignUp}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter your full name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="name@university.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">{role === 'student' ? 'University' : 'Current Company'}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={role === 'student' ? 'e.g. UIU' : 'e.g. Pathao / bKash'}
                  value={institution}
                  onChange={e => setInstitution(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{role === 'student' ? 'Graduation Year' : 'Class of'}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 2026"
                  value={gradYear}
                  onChange={e => setGradYear(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{role === 'student' ? 'Department / Major' : 'Professional Title'}</label>
              <input
                type="text"
                className="form-input"
                placeholder={role === 'student' ? 'e.g. Computer Science & Engineering' : 'e.g. Senior Software Architect'}
                value={departmentOrTitle}
                onChange={e => setDepartmentOrTitle(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 6 }}>
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className={`form-input password-masked${showPassword ? ' is-visible' : ''}`}
                    placeholder="Enter Password"
                    autoComplete="new-password"
                    data-lpignore="true"
                    style={{ paddingRight: 40 }}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#6b7280',
                      padding: 4,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title={showPassword ? 'Hide' : 'Show'}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 6 }}>
                <label className="form-label">Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className={`form-input password-masked${showConfirmPassword ? ' is-visible' : ''}`}
                    placeholder="Enter Confirm Password"
                    autoComplete="new-password"
                    data-lpignore="true"
                    style={{ paddingRight: 40 }}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(v => !v)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#6b7280',
                      padding: 4,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title={showConfirmPassword ? 'Hide' : 'Show'}
                  >
                    {showConfirmPassword ? (
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Password strength meter */}
            {password && (
              <div style={{ marginBottom: 16 }}>
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

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 20 }}>
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={e => setAgreedToTerms(e.target.checked)}
                style={{ marginTop: 3, cursor: 'pointer' }}
              />
              <label htmlFor="terms" style={{ fontSize: 12, color: '#6b7280', cursor: 'pointer', lineHeight: 1.5 }}>
                I agree to the <span style={{ color: '#16428c', fontWeight: 600 }}>Terms of Service</span> and <span style={{ color: '#16428c', fontWeight: 600 }}>Privacy Policy</span>.
              </label>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
              style={{ background: role === 'alumni' ? '#d4af37' : undefined, color: role === 'alumni' ? '#1a1a1a' : undefined }}
            >
              {loading ? 'Creating Account…' : `Sign Up as ${role === 'student' ? 'Student' : 'Alumni'}`}
            </button>
          </form>

          <div className="login-divider"><span>OR</span></div>

          <p style={{ textAlign: 'center', fontSize: 14, color: '#4b5563', margin: 0 }}>
            Already have an account?{' '}
            <button
              type="button"
              onClick={handleSwitchToLogin}
              style={{ background: 'none', border: 'none', color: '#16428c', fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: 14 }}
            >
              Log In
            </button>
          </p>

          <div className="login-links" style={{ marginTop: 24 }}>
            <a href="#help">Need Help?</a>
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Use</a>
          </div>
        </div>
      </div>
    </div>
  )
}
