import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { sessionAPI, referralAPI, userAPI, jobAPI } from '../services/api'
import NotificationBell from '../shared/NotificationBell'
import UserAvatar from '../shared/avatar'

const formatSlotDateTime = (slot) => {
  if (!slot) return ''
  if (typeof slot === 'string') return slot
  if (slot.formatted) return slot.formatted
  try {
    const d = new Date(`${slot.date}T${slot.time || '00:00'}`)
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    return `${dayName} — ${timePart}${slot.duration ? ` (${slot.duration})` : ''}`
  } catch {
    return `${slot.date || ''} at ${slot.time || ''}${slot.duration ? ` (${slot.duration})` : ''}`
  }
}

const parseSlots = (slotsData) => {
  if (!slotsData) return []
  if (Array.isArray(slotsData)) return slotsData
  if (typeof slotsData === 'string') {
    try {
      const parsed = JSON.parse(slotsData)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

export default function AlumniDashboard({ navigate }) {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [referrals, setReferrals] = useState([])
  const [slots, setSlots] = useState([])
  const [jobs, setJobs] = useState([])
  const [jobsLoading, setJobsLoading] = useState(true)
  const [accepted, setAccepted] = useState({})

  const firstName = user?.name?.split(' ')[0] || 'there'

  const fetchSlots = () => {
    userAPI.getProfile()
      .then(d => {
        const u = d.user || {}
        setSlots(parseSlots(u.availableSlots))
      })
      .catch(() => { })
  }

  const fetchJobs = () => {
    setJobsLoading(true)
    jobAPI.getMyJobs()
      .then(d => setJobs(d.jobs || []))
      .catch(() => { })
      .finally(() => setJobsLoading(false))
  }

  useEffect(() => {
    sessionAPI.getAll().then(d => setSessions(d.sessions || [])).catch(() => { })
    referralAPI.getAll().then(d => setReferrals(d.referrals || [])).catch(() => { })
    fetchSlots()
    fetchJobs()
  }, [])

  useEffect(() => {
    if (user && user.availableSlots) {
      setSlots(parseSlots(user.availableSlots))
    }
  }, [user])

  const pendingReferrals = referrals.filter(r => r.status === 'submitted' || r.status === 'under_review' || r.status === 'Requested')
  const completedReferrals = referrals.filter(r => r.status === 'referred' || r.status === 'Referred')
  const activeJobs = jobs.filter(j => j.status === 'active')
  const totalJobApplicants = jobs.reduce((acc, j) => acc + (j.applications?.length || 0), 0)
  const pendingJobApplicants = jobs.reduce((acc, j) => acc + ((j.applications || []).filter(a => a.status === 'applied' || a.status === 'under_review').length), 0)

  const handleAccept = async (id) => {
    setAccepted(prev => ({ ...prev, [id]: 'accepted' }))
    try { await referralAPI.updateStatus(id, 'referred') } catch { }
    setTimeout(() => setReferrals(prev => prev.map(r => (r.id === id || r._id === id) ? { ...r, status: 'referred' } : r)), 500)
  }

  const handleDecline = async (id) => {
    setAccepted(prev => ({ ...prev, [id]: 'declined' }))
    try { await referralAPI.updateStatus(id, 'declined') } catch { }
    setTimeout(() => setReferrals(prev => prev.map(r => (r.id === id || r._id === id) ? { ...r, status: 'declined' } : r)), 500)
  }

  const handleRemoveSlot = async (slotId) => {
    const updated = slots.filter(s => (s.id || s._id) !== slotId)
    try {
      await userAPI.updateProfile({
        availableSlots: updated,
        isAvailableForMentorship: updated.length > 0
      })
      setSlots(updated)
    } catch (err) {
      console.error('Failed to remove slot:', err)
    }
  }

  const handleToggleJobStatus = async (job) => {
    const nextStatus = job.status === 'active' ? 'closed' : 'active'
    try {
      await jobAPI.update(job.id, { status: nextStatus })
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: nextStatus } : j))
    } catch (err) {
      console.error('Failed to toggle job status:', err)
    }
  }

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Dashboard</span>
        <div className="topbar-spacer" />
        <NotificationBell />
      </div>

      <div className="page-body animate-in">
        {/* Welcome Banner */}
        <div className="welcome-banner">
          <div className="welcome-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}</div>
          <h1 className="welcome-title">Welcome back, {firstName}!</h1>
          <p className="welcome-sub" style={{ color: '#4b5563' }}>
            Alumni Mentorship Portal — Supporting the next generation of professionals.
          </p>
        </div>

        {/* Metrics */}
        <div className="metric-grid" style={{ marginBottom: 24 }}>
          <div className="metric-card" style={{ borderLeft: '4px solid #d4af37' }}>
            <div className="metric-label">Upcoming Sessions</div>
            <div className="metric-value">{sessions.length}</div>
            <div className="metric-sub" style={{ color: '#059669' }}>Scheduled</div>
          </div>
          <div className="metric-card" style={{ borderLeft: '4px solid #16428c' }}>
            <div className="metric-label">Available Slots Set</div>
            <div className="metric-value">{slots.length}</div>
            <div className="metric-sub" style={{ color: slots.length > 0 ? '#16a34a' : '#9ca3af' }}>
              {slots.length > 0 ? 'Active on Portal' : 'None set yet'}
            </div>
          </div>
          <div className="metric-card" style={{ borderLeft: '4px solid #059669' }}>
            <div className="metric-label">Pending Referrals</div>
            <div className="metric-value">{pendingReferrals.length}</div>
            <div className="metric-sub" style={{ color: '#e85d04' }}>Needs review</div>
          </div>
          <div className="metric-card" style={{ borderLeft: '4px solid #2563eb' }}>
            <div className="metric-label">Your Job Postings</div>
            <div className="metric-value">{jobs.length}</div>
            <div className="metric-sub" style={{ color: activeJobs.length > 0 ? '#16a34a' : '#6b7280' }}>
              {activeJobs.length} Active {activeJobs.length === 1 ? 'Role' : 'Roles'}
            </div>
          </div>
        </div>

        {/* Dedicated Section: Your Published Mentorship Slots */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="card-title">Your Published Mentorship Slots</span>
              <span style={{
                background: slots.length > 0 ? '#fef3c7' : '#f3f4f6',
                color: slots.length > 0 ? '#92400e' : '#6b7280',
                fontSize: 12,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 12,
              }}>
                {slots.length} {slots.length === 1 ? 'Slot' : 'Slots'} Active
              </span>
            </div>
            <button
              className="btn btn-gold btn-sm"
              onClick={() => navigate('/provide-slots')}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span>+</span> Provide New Slots
            </button>
          </div>
          <div className="card-body" style={{ padding: '20px 22px' }}>
            {slots.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: '#6b7280' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>📅</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#1f2937', marginBottom: 4 }}>
                  No Mentorship Slots Set Yet
                </div>
                <p style={{ fontSize: 13, color: '#6b7280', maxWidth: 440, margin: '0 auto 16px', lineHeight: 1.5 }}>
                  Provide your open time slots so students can view your schedule and book 1:1 mentorship sessions with you.
                </p>
                <button className="btn btn-gold btn-sm" onClick={() => navigate('/provide-slots')}>
                  + Add Your First Slot
                </button>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 16
              }}>
                {slots.map((s, idx) => {
                  const sid = s.id || s._id || idx
                  const formatted = formatSlotDateTime(s)
                  return (
                    <div
                      key={sid}
                      style={{
                        padding: '16px',
                        background: '#ffffff',
                        border: '1.5px solid #e5e7eb',
                        borderRadius: 12,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 12,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#15803d',
                            background: '#dcfce7',
                            padding: '3px 8px',
                            borderRadius: 6
                          }}>
                            ● Open for Booking
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSlot(sid)}
                            title="Remove slot"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#9ca3af',
                              cursor: 'pointer',
                              fontSize: 14,
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 4,
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                            onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}
                          >
                            ✕
                          </button>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 4 }}>
                          {formatted}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                          {s.platform && (
                            <span style={{ background: '#e0e7ff', color: '#3730a3', fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                              {s.platform}
                            </span>
                          )}
                          {s.duration && (
                            <span style={{ background: '#fef3c7', color: '#92400e', fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                              {s.duration}
                            </span>
                          )}
                        </div>
                        {s.notes && (
                          <div style={{ fontSize: 12, color: '#4b5563', marginTop: 8, fontStyle: 'italic', background: '#f9fafb', padding: '6px 10px', borderRadius: 6, border: '1px solid #f3f4f6' }}>
                            "{s.notes}"
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Dedicated Section: Your Job Postings */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="card-title">Your Job Postings</span>
              <span style={{
                background: jobs.length > 0 ? '#eff6ff' : '#f3f4f6',
                color: jobs.length > 0 ? '#1d4ed8' : '#6b7280',
                fontSize: 12,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 12,
              }}>
                {jobs.length} {jobs.length === 1 ? 'Posting' : 'Postings'}
              </span>
              {totalJobApplicants > 0 && (
                <span style={{
                  background: '#ecfdf5',
                  color: '#065f46',
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 12,
                }}>
                  {totalJobApplicants} {totalJobApplicants === 1 ? 'Candidate Applied' : 'Candidates Applied'}
                </span>
              )}
              {pendingJobApplicants > 0 && (
                <span style={{
                  background: '#fee2e2',
                  color: '#b91c1c',
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 12,
                }}>
                  {pendingJobApplicants} New to Review
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => navigate('/jobs')}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span>💼</span> Manage Job Board
              </button>
              <button
                className="btn btn-gold btn-sm"
                onClick={() => navigate('/jobs', { state: { openCreate: true } })}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span>+</span> Post New Job
              </button>
            </div>
          </div>

          <div className="card-body" style={{ padding: '20px 22px' }}>
            {jobsLoading ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: '#6b7280', fontSize: 13 }}>
                Loading your posted jobs...
              </div>
            ) : jobs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: '#6b7280' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>💼</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#111827', marginBottom: 4 }}>
                  No Job Postings Yet
                </div>
                <p style={{ fontSize: 13, color: '#6b7280', maxWidth: 460, margin: '0 auto 16px', lineHeight: 1.5 }}>
                  Provide job openings, internships, or graduate opportunities at your company. Once posted, they will appear here and students can apply with their resumes.
                </p>
                <button
                  className="btn btn-gold btn-sm"
                  onClick={() => navigate('/jobs', { state: { openCreate: true } })}
                >
                  + Post Your First Job
                </button>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 16
              }}>
                {jobs.map((job) => {
                  const apps = job.applications || []
                  const unreviewed = apps.filter(a => a.status === 'applied' || a.status === 'under_review').length
                  const isActive = job.status === 'active'
                  const companyInitial = (job.company || 'Co').slice(0, 2).toUpperCase()

                  return (
                    <div
                      key={job.id}
                      style={{
                        padding: '16px 18px',
                        background: '#ffffff',
                        border: isActive ? '1.5px solid #e5e7eb' : '1.5px dashed #d1d5db',
                        borderRadius: 12,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 14,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div>
                        {/* Header row: Company badge/avatar + status toggle */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 40,
                              height: 40,
                              borderRadius: 8,
                              background: 'linear-gradient(135deg, #16428c, #1e3a8a)',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: 13,
                              flexShrink: 0
                            }}>
                              {companyInitial}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', lineHeight: 1.2 }}>
                                {job.title}
                              </div>
                              <div style={{ fontSize: 13, color: '#4b5563', fontWeight: 500, marginTop: 2 }}>
                                {job.company}
                              </div>
                            </div>
                          </div>

                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 11,
                            fontWeight: 700,
                            color: isActive ? '#15803d' : '#6b7280',
                            background: isActive ? '#dcfce7' : '#f3f4f6',
                            padding: '3px 8px',
                            borderRadius: 6,
                            flexShrink: 0
                          }}>
                            ● {isActive ? 'Active' : 'Closed'}
                          </span>
                        </div>

                        {/* Meta Pills */}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                          {job.jobType && (
                            <span style={{ background: '#fef3c7', color: '#92400e', fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                              {job.jobType}
                            </span>
                          )}
                          {job.workplaceType && (
                            <span style={{ background: '#e0e7ff', color: '#3730a3', fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                              {job.workplaceType}
                            </span>
                          )}
                          {job.location && (
                            <span style={{ background: '#f3f4f6', color: '#374151', fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                              📍 {job.location}
                            </span>
                          )}
                          {job.salary && (
                            <span style={{ background: '#ecfdf5', color: '#065f46', fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                              💰 {job.salary}
                            </span>
                          )}
                        </div>

                        {/* Additional info: Deadline */}
                        {job.deadline && (
                          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                            ⏰ Deadline: <strong>{new Date(job.deadline).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                          </div>
                        )}
                      </div>

                      {/* Card Footer: Applicants count & Action */}
                      <div style={{
                        paddingTop: 12,
                        borderTop: '1px solid #f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: apps.length > 0 ? '#1f2937' : '#9ca3af' }}>
                            👥 {apps.length} {apps.length === 1 ? 'Applicant' : 'Applicants'}
                          </span>
                          {unreviewed > 0 && (
                            <span style={{
                              background: '#fee2e2',
                              color: '#b91c1c',
                              fontSize: 10,
                              fontWeight: 800,
                              padding: '1px 6px',
                              borderRadius: 10,
                            }}>
                              {unreviewed} NEW
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => handleToggleJobStatus(job)}
                            title={isActive ? 'Close this job posting' : 'Reactivate this job posting'}
                            style={{
                              fontSize: 11,
                              padding: '4px 8px',
                              borderRadius: 6,
                              border: '1px solid #d1d5db',
                              background: '#fff',
                              color: '#4b5563',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            {isActive ? 'Close' : 'Reopen'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-gold btn-sm"
                            onClick={() => navigate('/jobs')}
                            style={{ fontSize: 12, padding: '4px 10px', fontWeight: 600 }}
                          >
                            Manage →
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="two-col">
          {/* Today's sessions */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Scheduled Mentorship Sessions</span>
              <span className="card-link" onClick={() => navigate('/bookings')}>View all</span>
            </div>
            <div className="card-body" style={{ padding: '12px 22px' }}>
              {sessions.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
                  No sessions scheduled yet.
                </div>
              ) : (
                sessions.map((s, i) => (
                  <div key={s.id || s._id || i} className="session-row">
                    <UserAvatar
                      avatar={s.student?.avatar}
                      name={s.student?.name || 'Student Mentee'}
                      size={40}
                      className="request-avatar"
                      bg="#d4af37"
                      color="#1a1a1a"
                      fallback="ST"
                    />
                    <div className="session-info">
                      <div className="session-name">{s.student?.name || 'Student Mentee'}</div>
                      <div className="session-topic">{s.topic || 'General Mentorship'}</div>
                      <div className="session-time">
                        {s.date ? new Date(s.date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Upcoming'}
                      </div>
                    </div>
                    <button className="btn btn-gold btn-sm" onClick={() => navigate('/bookings')}>View</button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pending Referral Requests */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Pending Referral Requests</span>
              <span className="card-link" onClick={() => navigate('/referrals')}>View all</span>
            </div>
            <div className="card-body" style={{ padding: '12px 22px' }}>
              {pendingReferrals.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
                  No pending referral requests.
                </div>
              ) : (
                pendingReferrals.map(r => {
                  const rid = r.id || r._id
                  const sName = r.student?.name || 'Student Candidate'
                  return (
                    <div key={rid} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid #f3f4f6' }}>
                      <UserAvatar
                        avatar={r.student?.avatar}
                        name={sName}
                        size={42}
                        bg="#1e3a8a"
                        color="#fff"
                        fallback="ST"
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{sName}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>
                          Role: <strong>{r.jobTitle || r.role}</strong> at <strong>{r.company}</strong>
                        </div>
                        {(r.attachmentUrl || r.resumeUrl) && (
                          <div style={{ marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#16428c', fontWeight: 600, background: '#eff6ff', padding: '2px 6px', borderRadius: 4 }}>
                            📎 {r.attachmentName || 'Attachment Included'}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-gold btn-sm" onClick={() => handleAccept(rid)}>Refer</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleDecline(rid)}>Decline</button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
