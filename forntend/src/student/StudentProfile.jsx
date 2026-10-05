import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { userAPI, sessionAPI, referralAPI } from '../services/api'
import NotificationBell from '../shared/NotificationBell'
import { getAvatarUrl } from '../shared/avatar'

const SKILLS_ALL = [
  'Python', 'JavaScript', 'React', 'SQL', 'Data Analysis',
  'Machine Learning', 'System Design', 'Product Thinking', 'Excel', 'Figma',
]


export default function StudentProfile() {
  const { user, setUser } = useAuth()

  // Committed profile data from the database (only updates after Save Changes is clicked)
  const [committedProfile, setCommittedProfile] = useState({})

  // Form input state (local to inputs while typing)
  const [name,     setName]     = useState('')
  const [headline, setHeadline] = useState('')
  const [bio,      setBio]      = useState('')
  const [location, setLocation] = useState('')
  const [gradYear, setGradYear] = useState('')
  const [major,    setMajor]    = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [github,   setGithub]   = useState('')
  const [skills,   setSkills]   = useState([])
  const [newSkill, setNewSkill] = useState('')
  const [saved,    setSaved]    = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [activeTab, setActiveTab] = useState('info')
  const [sessionsAttended, setSessionsAttended] = useState([])
  const [referralsCount, setReferralsCount] = useState(0)

  // Edit Profile Modal & Avatar Upload
  const [showEditModal, setShowEditModal] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef(null)
  const modalFileInputRef = useRef(null)

  const populateForm = (u) => {
    setName(u.name || '')
    setHeadline(u.headline || '')
    setBio(u.bio || '')
    setLocation(u.location || '')
    setGradYear(u.graduationYear ? `Class of ${u.graduationYear}` : '')
    setMajor(u.major || '')
    setLinkedin(u.linkedinUrl || '')
    setGithub(u.githubUrl || '')
    setSkills(Array.isArray(u.skills) ? u.skills : [])
  }

  // Load real profile on mount
  useEffect(() => {
    let initial = true
    const fetchProfileAndStats = () => {
      userAPI.getProfile().then(data => {
        const u = data.user || {}
        setCommittedProfile(u)
        if (initial) {
          populateForm(u)
          initial = false
        }
      }).catch(() => {})

      sessionAPI.getAll().then(data => setSessionsAttended(data.sessions || [])).catch(() => {})

      referralAPI.getAll().then(data => {
        const refs = data.referrals || (Array.isArray(data) ? data : [])
        setReferralsCount(refs.length)
      }).catch(() => {})
    }

    fetchProfileAndStats()
    const timer = setInterval(fetchProfileAndStats, 4000)

    const handleResourceSaved = (e) => {
      if (e?.detail?.user) {
        setCommittedProfile(prev => ({ ...prev, savedResources: e.detail.user.savedResources || [] }))
      } else if (e?.detail?.savedResources) {
        setCommittedProfile(prev => ({ ...prev, savedResources: e.detail.savedResources }))
      }
    }
    window.addEventListener('resource:saved', handleResourceSaved)

    return () => {
      clearInterval(timer)
      window.removeEventListener('resource:saved', handleResourceSaved)
    }
  }, [])

  // Sync if auth user is loaded or updated
  useEffect(() => {
    if (user) {
      if (Object.keys(committedProfile).length === 0) {
        setCommittedProfile(user)
        populateForm(user)
      } else {
        setCommittedProfile(prev => ({
          ...prev,
          ...(user.avatar !== undefined ? { avatar: user.avatar } : {}),
          ...(Array.isArray(user.savedResources) ? { savedResources: user.savedResources } : {}),
        }))
      }
    }
  }, [user])

  // Display values drawn strictly from committed/saved profile
  const activeCommitted = Object.keys(committedProfile).length > 0 ? committedProfile : (user || {})
  const displayName = activeCommitted.name || 'Student'
  const displayHeadline = activeCommitted.headline || ''
  const displayLocation = activeCommitted.location || ''
  const displayGradYear = activeCommitted.graduationYear ? `Class of ${activeCommitted.graduationYear}` : ''
  const displayMajor = activeCommitted.major || ''
  const displayLinkedin = activeCommitted.linkedinUrl || ''
  const displayGithub = activeCommitted.githubUrl || ''
  const displayInitials = displayName.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'ST'
  const avatarUrl = getAvatarUrl(activeCommitted.avatar)

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, JPEG, WEBP).')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size exceeds 10MB limit.')
      return
    }
    setUploadingAvatar(true)
    try {
      const res = await userAPI.uploadAvatar(file)
      if (res.user) {
        setCommittedProfile(res.user)
        setUser(res.user)
      }
    } catch (err) {
      alert(err.message || 'Failed to upload photo')
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (modalFileInputRef.current) modalFileInputRef.current.value = ''
    }
  }

  const handleRemoveAvatar = async () => {
    if (!window.confirm('Remove your profile picture?')) return
    setUploadingAvatar(true)
    try {
      const res = await userAPI.updateProfile({ avatar: '' })
      if (res.user) {
        setCommittedProfile(res.user)
        setUser(res.user)
      }
    } catch (err) {
      alert(err.message || 'Failed to remove photo')
    } finally {
      setUploadingAvatar(false)
    }
  }

  /* Profile completeness based strictly on COMMITTED / SAVED fields */
  const committedFields = [
    activeCommitted.name,
    activeCommitted.headline,
    activeCommitted.bio,
    activeCommitted.location,
    activeCommitted.graduationYear,
    activeCommitted.major,
    activeCommitted.linkedinUrl,
    activeCommitted.githubUrl
  ]
  const filledCommitted = committedFields.filter(f => f && String(f).trim().length > 0).length
  const strength = Math.round((filledCommitted / committedFields.length) * 100)
  const strengthLabel =
    strength >= 90 ? 'All-Star' :
      strength >= 75 ? 'Advanced' :
        strength >= 55 ? 'Intermediate' : 'Beginner'

  const hasChanges = (
    name !== (activeCommitted.name || '') ||
    headline !== (activeCommitted.headline || '') ||
    bio !== (activeCommitted.bio || '') ||
    location !== (activeCommitted.location || '') ||
    major !== (activeCommitted.major || '') ||
    linkedin !== (activeCommitted.linkedinUrl || '') ||
    github !== (activeCommitted.githubUrl || '') ||
    gradYear !== (activeCommitted.graduationYear ? `Class of ${activeCommitted.graduationYear}` : '')
  )

  const handleDiscard = () => {
    populateForm(activeCommitted)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const cleanYear = parseInt(String(gradYear).replace(/\D/g, '')) || undefined
      const payload = {
        name: name.trim(),
        headline: headline.trim(),
        bio: bio.trim(),
        location: location.trim(),
        major: major.trim(),
        linkedinUrl: linkedin.trim(),
        githubUrl: github.trim(),
        graduationYear: cleanYear,
        skills,
      }
      const res = await userAPI.updateProfile(payload)
      const updated = (res && res.user) ? res.user : { ...activeCommitted, ...payload }

      // ONLY update committed profile and global user when Save button is clicked!
      setCommittedProfile(updated)
      setUser(updated)
      setSaved(true)
      setShowEditModal(false)
      setTimeout(() => setSaved(false), 2200)
    } catch (err) {
      console.error('Failed to update profile:', err)
      alert(err.message || 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const addSkill = () => {
    const s = newSkill.trim()
    if (s && !skills.includes(s)) setSkills(prev => [...prev, s])
    setNewSkill('')
  }

  const removeSkill = (s) => setSkills(prev => prev.filter(x => x !== s))

  const togglePreset = (s) => {
    if (skills.includes(s)) removeSkill(s)
    else setSkills(prev => [...prev, s])
  }

  return (
    <>
      {/* ── Topbar ── */}
      <div className="topbar">
        <span className="topbar-title">My Profile</span>
        <div className="topbar-spacer" />
        <NotificationBell />
      </div>

      <div className="page-body animate-in">

        {/* ── Profile header card (shows COMMITTED data) ── */}
        <div className="profile-header-card" style={{ marginBottom: 24, position: 'relative', overflow: 'visible' }}>
          {/* Background accent stripe */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 6,
            background: 'linear-gradient(90deg, #16428c, #1e4da3, #eab308)',
            borderRadius: '14px 14px 0 0',
          }} />

          {/* Avatar with Camera badge */}
          <div
            style={{
              position: 'relative',
              width: 88,
              height: 88,
              flexShrink: 0,
              marginTop: 10,
              cursor: 'pointer',
            }}
            onClick={() => fileInputRef.current?.click()}
            title="Click to upload a new profile image"
          >
            <div style={{
              width: '100%', height: '100%', borderRadius: '50%',
              background: 'linear-gradient(135deg, #16428c, #1e4da3)',
              color: '#fff', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 28, fontWeight: 800,
              border: '3px solid #eab308',
              boxShadow: '0 4px 16px rgba(22,66,140,.25)',
              overflow: 'hidden'
            }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                displayInitials
              )}
            </div>
            <div style={{
              position: 'absolute', bottom: -2, right: -2,
              background: '#16428c', color: '#fff', width: 28, height: 28,
              borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', border: '2px solid #fff',
              boxShadow: '0 2px 6px rgba(0,0,0,0.25)', fontSize: 13
            }}>
              📷
            </div>
            {uploadingAvatar && (
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: 'rgba(0,0,0,0.6)', color: '#fff', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600
              }}>
                ...
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/jpg"
              style={{ display: 'none' }}
              onChange={handleAvatarFileChange}
            />
          </div>

          <div className="profile-header-info">
            <div className="profile-name-row">
              <span className="profile-name">{displayName}</span>
              <span className="status-badge status-upcoming" style={{ fontSize: 11 }}>
                Student
              </span>
            </div>
            <div className="profile-headline">{displayHeadline}</div>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 13, color: '#6b7280', marginBottom: 14 }}>
              {displayLocation && <span>{displayLocation}</span>}
              {displayGradYear && <span>{displayGradYear}</span>}
              {displayMajor && <span>{displayMajor}</span>}
            </div>

            {/* Strength bar */}
            <div className="profile-strength-label">
              Profile Strength: <span>{strength}%</span>
              <span style={{ marginLeft: 8, fontWeight: 600, color: '#374151' }}>— {strengthLabel}</span>
            </div>
            <div className="profile-progress" style={{ maxWidth: 320, margin: '6px 0' }}>
              <div
                className="profile-progress-bar"
                style={{
                  width: `${strength}%`,
                  background: strength >= 90
                    ? 'linear-gradient(to right,#eab308,#84cc16,#059669)'
                    : 'linear-gradient(to right,#16428c,#3b82f6)',
                }}
              />
            </div>
            <div className="profile-strength-sub">
              {strength < 100
                ? `Fill in ${committedFields.filter(f => !f || !String(f).trim()).length} more field${committedFields.filter(f => !f || !String(f).trim()).length !== 1 ? 's' : ''} to reach All-Star`
                : 'You\'ve reached All-Star status!'}
            </div>
          </div>

          {/* Quick links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignSelf: 'center', flexShrink: 0 }}>
            {displayLinkedin && (
              <a href={`https://${displayLinkedin}`} target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#16428c', textDecoration: 'none', background: '#eff6ff', padding: '6px 12px', borderRadius: 20, border: '1px solid #bfdbfe' }}>
                LinkedIn
              </a>
            )}
            {displayGithub && (
              <a href={`https://${displayGithub}`} target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#374151', textDecoration: 'none', background: '#f3f4f6', padding: '6px 12px', borderRadius: 20, border: '1px solid #e5e7eb' }}>
                GitHub
              </a>
            )}
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div style={{
          display: 'flex', gap: 0, borderBottom: '2px solid #e5e7eb',
          marginBottom: 24,
        }}>
          {[
            { id: 'info', label: 'Personal Info' },
            { id: 'education', label: 'Education & Skills' },
            { id: 'sessions', label: 'Session History' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '11px 22px',
                fontWeight: 600,
                fontSize: 14,
                fontFamily: 'inherit',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                borderBottom: `2.5px solid ${activeTab === tab.id ? '#16428c' : 'transparent'}`,
                color: activeTab === tab.id ? '#16428c' : '#6b7280',
                marginBottom: -2,
                transition: 'all .2s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB: Personal Info ── */}
        {activeTab === 'info' && (
          <div className="two-col animate-in" style={{ alignItems: 'start' }}>

            {/* Left: Editable form */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Personal Information</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {hasChanges && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleDiscard}
                    >
                      Discard
                    </button>
                  )}
                  <button
                    className="btn btn-sm"
                    style={{ background: '#111827', color: '#fff', fontWeight: 600, fontSize: 13 }}
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
                  </button>
                </div>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Professional Headline</label>
                  <input className="form-input" value={headline} onChange={e => setHeadline(e.target.value)} placeholder="e.g. CS Student at State University" />
                </div>
                <div className="form-group">
                  <label className="form-label">Bio</label>
                  <textarea className="form-textarea" value={bio} onChange={e => setBio(e.target.value)} rows={4} placeholder="Tell alumni mentors a bit about yourself..." />
                </div>
                <div className="two-col" style={{ gap: 14 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Location</label>
                    <input className="form-input" value={location} onChange={e => setLocation(e.target.value)} placeholder="City, Country" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Graduation Year</label>
                    <input className="form-input" value={gradYear} onChange={e => setGradYear(e.target.value)} placeholder="e.g. Class of 2026" />
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: 14 }}>
                  <label className="form-label">Major / Field of Study</label>
                  <input className="form-input" value={major} onChange={e => setMajor(e.target.value)} placeholder="e.g. Computer Science" />
                </div>
                <div className="two-col" style={{ gap: 14 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">LinkedIn URL</label>
                    <input className="form-input" value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="linkedin.com/in/..." />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">GitHub URL</label>
                    <input className="form-input" value={github} onChange={e => setGithub(e.target.value)} placeholder="github.com/..." />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Stats + Goals */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Activity stats */}
              <div className="card">
                <div className="card-header"><span className="card-title">My Activity</span></div>
                <div className="card-body">
                  {[
                    {
                      label: 'Sessions Completed',
                      value: sessionsAttended.filter(s => s.status === 'completed').length,
                      icon: (
                        <svg width="20" height="24" viewBox="0 0 20 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M3 0C1.89543 0 1 0.89543 1 2V22C1 23.1046 1.89543 24 3 24H17C18.1046 24 19 23.1046 19 22V6L13 0H3Z" fill="#C7D7F0" />
                          <path d="M13 0L19 6H15C13.8954 6 13 5.10457 13 4V0Z" fill="#93B4E4" />
                          <line x1="4" y1="10" x2="12" y2="10" stroke="#5278B8" strokeWidth="1.8" strokeLinecap="round" />
                          <line x1="4" y1="13.5" x2="15" y2="13.5" stroke="#5278B8" strokeWidth="1.8" strokeLinecap="round" />
                          <line x1="4" y1="17" x2="11" y2="17" stroke="#5278B8" strokeWidth="1.8" strokeLinecap="round" />
                          <line x1="4" y1="20.5" x2="8" y2="20.5" stroke="#5278B8" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      ),
                      bg: '#eff6ff'
                    },
                    {
                      label: 'Mentors Connected',
                      value: new Set(sessionsAttended.map(s => s.alumniId || s.alumni?.id).filter(Boolean)).size,
                      icon: (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                      ),
                      bg: '#ecfdf5'
                    },
                    {
                      label: 'Referrals Sent',
                      value: referralsCount,
                      icon: (
                        <svg width="20" height="24" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13" />
                          <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                      ),
                      bg: '#fff7ed'
                    },
                    {
                      label: 'Resources Saved',
                      value: Array.isArray(activeCommitted.savedResources)
                        ? activeCommitted.savedResources.length
                        : (Array.isArray(user?.savedResources) ? user.savedResources.length : 0),
                      icon: (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20" fill="#7c3aed">
                          <path d="M304 112L192 112C183.2 112 176 119.2 176 128L176 512C176 520.8 183.2 528 192 528L448 528C456.8 528 464 520.8 464 512L464 272L376 272C336.2 272 304 239.8 304 200L304 112zM444.1 224L352 131.9L352 200C352 213.3 362.7 224 376 224L444.1 224zM128 128C128 92.7 156.7 64 192 64L325.5 64C342.5 64 358.8 70.7 370.8 82.7L493.3 205.3C505.3 217.3 512 233.6 512 250.6L512 512C512 547.3 483.3 576 448 576L192 576C156.7 576 128 547.3 128 512L128 128z" />
                        </svg>
                      ),
                      bg: '#f5f3ff'
                    },
                  ].map(stat => (
                    <div key={stat.label} style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '12px 0', borderBottom: '1px solid #f3f4f6',
                    }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: 14,
                        background: stat.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>{stat.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{stat.label}</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', lineHeight: 1.2 }}>{stat.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Career goals */}
              <div className="card">
                <div className="card-header"><span className="card-title">Academic & Career Profile</span></div>
                <div className="card-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: 'Degree / Major', value: displayMajor || 'Undergraduate Student' },
                      { label: 'Timeline', value: displayGradYear || 'Expected Graduation' },
                    ].map(g => (
                      <div key={g.label} style={{ padding: '10px 14px', background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 3 }}>{g.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{g.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: Education & Skills ── */}
        {activeTab === 'education' && (
          <div className="two-col animate-in" style={{ alignItems: 'start' }}>

            {/* Education */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Education</span>
              </div>
              <div className="card-body">
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{displayMajor || 'Undergraduate Degree'}</div>
                  <div style={{ fontWeight: 700, color: '#16428c', fontSize: 14, marginBottom: 2 }}>{displayLocation || 'University Student'}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>{displayGradYear || 'Enrolled'}</div>
                </div>
              </div>

              {/* Academic status */}
              <div style={{ borderTop: '1px solid #f3f4f6', padding: '16px 22px' }}>
                <div style={{ display: 'flex', gap: 14 }}>
                  <div style={{ flex: 1, padding: '12px 14px', background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>Status</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#16428c' }}>Enrolled</div>
                  </div>
                  <div style={{ flex: 1, padding: '12px 14px', background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>Network</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#059669' }}>Active</div>
                  </div>
                  <button className="btn btn-primary" style={{ flex: 2, fontSize: 13 }}>
                    Upload Resume
                  </button>
                </div>
              </div>
            </div>

            {/* Skills */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Skills & Interests</span>
              </div>
              <div className="card-body">
                {/* Active skills */}
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>
                    Your Skills ({skills.length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minHeight: 36 }}>
                    {skills.map(s => (
                      <span key={s} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '5px 12px', borderRadius: 20,
                        background: '#eff6ff', color: '#1e40af',
                        border: '1px solid #bfdbfe', fontSize: 12, fontWeight: 600,
                      }}>
                        {s}
                        <span
                          onClick={() => removeSkill(s)}
                          style={{ cursor: 'pointer', fontSize: 14, color: '#93c5fd', lineHeight: 1, marginLeft: 2 }}
                          title="Remove"
                        >×</span>
                      </span>
                    ))}
                    {skills.length === 0 && (
                      <span style={{ fontSize: 13, color: '#9ca3af' }}>No skills added yet.</span>
                    )}
                  </div>
                </div>

                {/* Add custom */}
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>
                    Add Custom Skill
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="form-input"
                      style={{ flex: 1, height: 38 }}
                      placeholder="e.g. TypeScript, Leadership..."
                      value={newSkill}
                      onChange={e => setNewSkill(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addSkill()}
                    />
                    <button className="btn btn-primary btn-sm" onClick={addSkill}>Add</button>
                  </div>
                </div>

                {/* Preset chips */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>
                    Quick Add
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {SKILLS_ALL.map(s => {
                      const active = skills.includes(s)
                      return (
                        <span
                          key={s}
                          onClick={() => togglePreset(s)}
                          style={{
                            padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                            cursor: 'pointer', transition: 'all .15s',
                            background: active ? '#16428c' : '#f3f4f6',
                            color: active ? '#fff' : '#6b7280',
                            border: `1px solid ${active ? '#16428c' : '#e5e7eb'}`,
                          }}
                        >
                          {active ? '✓ ' : '+ '}{s}
                        </span>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: Session History ── */}
        {activeTab === 'sessions' && (
          <div className="animate-in">
            <div className="card">
              <div className="card-header">
                <span className="card-title">Mentorship Session History</span>
                <span style={{ fontSize: 13, color: '#6b7280' }}>{sessionsAttended.length} sessions completed</span>
              </div>
              <div className="card-body" style={{ padding: '4px 22px' }}>
                {sessionsAttended.length === 0 ? (
                  <div style={{ padding: '24px 0', textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
                    No completed sessions recorded yet.
                  </div>
                ) : (
                  sessionsAttended.map((s, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '18px 0',
                    borderBottom: i < sessionsAttended.length - 1 ? '1px solid #f3f4f6' : 'none',
                  }}>
                    {/* Medal */}
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #16428c, #1e4da3)',
                      color: '#fff', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0,
                    }}>#{i + 1}</div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 2 }}>
                        {s.topic}
                      </div>
                      <div style={{ fontSize: 13, color: '#6b7280' }}>
                        with <strong>{s.mentor}</strong> — {s.company}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>{s.date}</div>
                      <span className="status-badge status-referred">Completed</span>
                    </div>

                    <button className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }}>
                      Leave Review
                    </button>
                  </div>
                )))
              }
              </div>
            </div>

            {/* Mentors connected */}
            <div className="card" style={{ marginTop: 20 }}>
              <div className="card-header"><span className="card-title">Mentors Connected</span></div>
              <div className="card-body">
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#6b7280', fontSize: 13 }}>
                  Connect with verified alumni via the Find Alumni tab to grow your network!
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── Edit Profile Modal ── */}
      {showEditModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.65)',
            backdropFilter: 'blur(5px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving && !uploadingAvatar) {
              setShowEditModal(false)
            }
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 620,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'sticky',
              top: 0,
              background: '#fff',
              zIndex: 10,
              borderRadius: '16px 16px 0 0'
            }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: 0 }}>Edit Profile</h2>
                <p style={{ fontSize: 12.5, color: '#6b7280', margin: '3px 0 0' }}>Update your photo and student profile details</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                disabled={saving || uploadingAvatar}
                style={{
                  background: '#f3f4f6',
                  border: 'none',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  fontSize: 16,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280'
                }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px' }}>
              {/* Avatar Upload Box */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '18px 20px',
                marginBottom: 22,
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                flexWrap: 'wrap'
              }}>
                {/* Avatar Preview */}
                <div style={{
                  position: 'relative',
                  width: 80,
                  height: 80,
                  flexShrink: 0
                }}>
                  <div style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #16428c, #1e4da3)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 26,
                    fontWeight: 800,
                    border: '3px solid #eab308',
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(22,66,140,0.2)'
                  }}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      displayInitials
                    )}
                  </div>
                  {uploadingAvatar && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.65)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 600
                    }}>
                      Uploading...
                    </div>
                  )}
                </div>

                {/* Avatar Actions */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                    Profile Photo
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                    Upload a new photo to replace your current avatar. Supported: PNG, JPG, WEBP (Max 10MB).
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      disabled={uploadingAvatar}
                      onClick={() => modalFileInputRef.current?.click()}
                      className="btn btn-sm"
                      style={{
                        background: '#16428c',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: 12.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 14px',
                        borderRadius: 6,
                        cursor: 'pointer'
                      }}
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      {uploadingAvatar ? 'Uploading...' : 'Upload New Photo'}
                    </button>
                    {avatarUrl && (
                      <button
                        type="button"
                        disabled={uploadingAvatar}
                        onClick={handleRemoveAvatar}
                        className="btn btn-secondary btn-sm"
                        style={{
                          color: '#dc2626',
                          borderColor: '#fca5a5',
                          fontWeight: 600,
                          fontSize: 12.5,
                          padding: '6px 12px',
                          borderRadius: 6,
                          cursor: 'pointer'
                        }}
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>
                  <input
                    ref={modalFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    style={{ display: 'none' }}
                    onChange={handleAvatarFileChange}
                  />
                </div>
              </div>

              {/* Form fields */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label" style={{ fontSize: 13, fontWeight: 700 }}>Full Name</label>
                <input className="form-input" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label" style={{ fontSize: 13, fontWeight: 700 }}>Headline</label>
                <input className="form-input" value={headline} onChange={e => setHeadline(e.target.value)} placeholder="e.g. Senior CS student aiming for Full-Stack Engineering" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: 13, fontWeight: 700 }}>Major / Field of Study</label>
                  <input className="form-input" value={major} onChange={e => setMajor(e.target.value)} placeholder="e.g. Computer Science" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: 13, fontWeight: 700 }}>Graduation Year</label>
                  <input className="form-input" value={gradYear} onChange={e => setGradYear(e.target.value)} placeholder="e.g. 2026" />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label" style={{ fontSize: 13, fontWeight: 700 }}>Location</label>
                <input className="form-input" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Dhaka, Bangladesh" />
              </div>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label" style={{ fontSize: 13, fontWeight: 700 }}>Bio</label>
                <textarea className="form-textarea" rows={3} value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell alumni mentors about your background and interests..." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: 13, fontWeight: 700 }}>LinkedIn Profile</label>
                  <input className="form-input" value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="linkedin.com/in/username" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: 13, fontWeight: 700 }}>GitHub Profile</label>
                  <input className="form-input" value={github} onChange={e => setGithub(e.target.value)} placeholder="github.com/username" />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e5e7eb',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 12,
              borderRadius: '0 0 16px 16px'
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={saving || uploadingAvatar}
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={saving || uploadingAvatar}
                onClick={handleSave}
                style={{ background: '#16428c', fontWeight: 700 }}
              >
                {saving ? 'Saving Changes...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
