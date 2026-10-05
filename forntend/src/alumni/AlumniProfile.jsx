import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { userAPI } from '../services/api'
import NotificationBell from '../shared/NotificationBell'
import { getAvatarUrl } from '../shared/avatar'

export default function AlumniProfile() {
  const { user, setUser } = useAuth()

  // Committed profile from database
  const [committedProfile, setCommittedProfile] = useState({})

  // Form input state
  const [name,        setName]        = useState('')
  const [bio,         setBio]         = useState('')
  const [jobTitle,    setJobTitle]    = useState('')
  const [company,     setCompany]     = useState('')
  const [industry,    setIndustry]    = useState('')
  const [alumniClass, setAlumniClass] = useState('')
  const [saved,       setSaved]       = useState(false)
  const [saving,      setSaving]      = useState(false)

  // Edit Profile Modal & Avatar Upload
  const [showEditModal, setShowEditModal] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef(null)
  const modalFileInputRef = useRef(null)

  const populateForm = (u) => {
    setName(u.name || '')
    setJobTitle(u.jobTitle || '')
    setCompany(u.company || '')
    setIndustry(u.industry || '')
    setBio(u.bio || '')
    setAlumniClass(u.graduationYear ? `Class of ${u.graduationYear}` : '')
  }

  useEffect(() => {
    userAPI.getProfile().then(data => {
      const u = data.user || {}
      setCommittedProfile(u)
      populateForm(u)
    }).catch(() => {})
  }, [])

  // Sync if auth user is loaded or updated
  useEffect(() => {
    if (user) {
      if (Object.keys(committedProfile).length === 0) {
        setCommittedProfile(user)
        populateForm(user)
      } else if (user.avatar !== committedProfile.avatar) {
        setCommittedProfile(prev => ({ ...prev, avatar: user.avatar }))
      }
    }
  }, [user])

  const activeCommitted = Object.keys(committedProfile).length > 0 ? committedProfile : (user || {})
  const displayName = activeCommitted.name || 'Alumni Mentor'
  const displayHeadline = activeCommitted.jobTitle ? `${activeCommitted.jobTitle}${activeCommitted.company ? ' at ' + activeCommitted.company : ''}` : (activeCommitted.headline || 'Alumni Mentor')
  const displayClass = activeCommitted.graduationYear ? `Class of ${activeCommitted.graduationYear}` : ''
  const displayInitials = displayName ? displayName.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s+/i, '').trim().split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'AL'
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

  const hasChanges = (
    name !== (activeCommitted.name || '') ||
    jobTitle !== (activeCommitted.jobTitle || '') ||
    company !== (activeCommitted.company || '') ||
    industry !== (activeCommitted.industry || '') ||
    bio !== (activeCommitted.bio || '')
  )

  const handleDiscard = () => {
    populateForm(activeCommitted)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        bio: bio.trim(),
        jobTitle: jobTitle.trim(),
        company: company.trim(),
        industry: industry.trim()
      }
      const res = await userAPI.updateProfile(payload)
      const updated = (res && res.user) ? res.user : { ...activeCommitted, ...payload }
      setCommittedProfile(updated)
      setUser(updated)
      setSaved(true)
      setShowEditModal(false)
      setTimeout(() => setSaved(false), 2500)
    } catch { } finally { setSaving(false) }
  }

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">My Profile</span>
        <div className="topbar-spacer" />
        <NotificationBell />
      </div>
      <div className="page-body animate-in">
        {/* Profile Header (displays committed data) */}
        <div className="profile-header-card" style={{ marginBottom: 24, position: 'relative' }}>
          {/* Avatar with Camera badge */}
          <div
            style={{
              position: 'relative',
              width: 88,
              height: 88,
              flexShrink: 0,
              cursor: 'pointer'
            }}
            onClick={() => fileInputRef.current?.click()}
            title="Click to upload a new profile image"
          >
            <div className="profile-avatar-ring" style={{
              width: 88,
              height: 88,
              background: '#d4af37',
              color: '#1a1a1a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 800,
              border: '3px solid #d4af37',
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
              background: '#1a2238', color: '#d4af37', width: 28, height: 28,
              borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', border: '2px solid #fff',
              boxShadow: '0 2px 6px rgba(0,0,0,0.25)', fontSize: 13
            }}>
              📷
            </div>
            {uploadingAvatar && (
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: 'rgba(0,0,0,0.65)', color: '#fff', display: 'flex',
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
              <span className="verified-badge" style={{ background: 'rgba(212,175,55,.15)', color: '#d4af37', border: '1px solid rgba(212,175,55,.3)' }}>
                Verified Alumni
              </span>
            </div>
            <div className="profile-headline">{displayHeadline}</div>
            {displayClass && (
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{displayClass}</div>
            )}
          </div>
        </div>

        <div className="two-col" style={{ alignItems: 'start' }}>
          {/* Professional Experience */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Professional Experience</span>
            </div>
            <div className="card-body">
              {activeCommitted.jobTitle || activeCommitted.company ? (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{activeCommitted.jobTitle || 'Role'}</div>
                  <div style={{ fontWeight: 700, color: '#d4af37', fontSize: 14, marginBottom: 2 }}>{company || 'Company'}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>{industry ? `Industry: ${industry}` : ''}</div>
                  <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{bio || 'Verified alumni mentor ready to advise students.'}</p>
                </div>
              ) : (
                <div style={{ padding: '20px 0', textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
                  Add your current role and company under Personal Information to display your experience.
                </div>
              )}
            </div>
          </div>

          {/* Personal Information */}
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
                  style={{ background: '#1a2238', color: '#fff', fontSize: 13, fontWeight: 600 }}
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
                <label className="form-label">Job Title</label>
                <input className="form-input" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Senior Software Engineer" />
              </div>
              <div className="form-group">
                <label className="form-label">Company</label>
                <input className="form-input" value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Google, Pathao..." />
              </div>
              <div className="form-group">
                <label className="form-label">Industry</label>
                <input className="form-input" value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. Software, Finance, Design..." />
              </div>
              <div className="form-group">
                <label className="form-label">Bio</label>
                <textarea className="form-textarea" rows={4} value={bio} onChange={e => setBio(e.target.value)} placeholder="Share your experience and how you can help students..." />
              </div>
            </div>
          </div>
        </div>
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
                <p style={{ fontSize: 12.5, color: '#6b7280', margin: '3px 0 0' }}>Update your photo and professional details</p>
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
                    background: '#d4af37',
                    color: '#1a1a1a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 26,
                    fontWeight: 800,
                    border: '3px solid #d4af37',
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(212,175,55,0.25)'
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
                        background: '#d4af37',
                        color: '#1a1a1a',
                        fontWeight: 700,
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: 13, fontWeight: 700 }}>Job Title / Role</label>
                  <input className="form-input" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Senior Software Engineer" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: 13, fontWeight: 700 }}>Company / Organization</label>
                  <input className="form-input" value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Google" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: 13, fontWeight: 700 }}>Industry</label>
                  <input className="form-input" value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. Technology & Cloud" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: 13, fontWeight: 700 }}>Graduation Year</label>
                  <input className="form-input" value={alumniClass} onChange={e => setAlumniClass(e.target.value)} placeholder="e.g. Class of 2018" />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label" style={{ fontSize: 13, fontWeight: 700 }}>Bio / Mentorship Intro</label>
                <textarea className="form-textarea" rows={4} value={bio} onChange={e => setBio(e.target.value)} placeholder="Share your experience and how you can help students..." />
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
                style={{ background: '#d4af37', color: '#1a1a1a', fontWeight: 700 }}
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
