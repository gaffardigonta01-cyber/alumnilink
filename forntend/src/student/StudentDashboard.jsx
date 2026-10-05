import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { sessionAPI, alumniAPI, resourceAPI, userAPI } from '../services/api'
import NotificationBell from '../shared/NotificationBell'
import UserAvatar, { getInitials } from '../shared/avatar'

export default function StudentDashboard({ navigate }) {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [mentors, setMentors] = useState([])
  const [resourceCount, setResourceCount] = useState(0)
  const [profileData, setProfileData] = useState(user || {})

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()
  const currentUser = { ...(user || {}), ...(profileData || {}) }
  const firstName = currentUser.name?.split(' ')[0] || 'there'

  useEffect(() => {
    const fetchDashboardSessions = () => {
      sessionAPI.getAll().then(d => setSessions(d.sessions || [])).catch(() => { })
    }
    fetchDashboardSessions()
    const timer = setInterval(fetchDashboardSessions, 4000)

    alumniAPI.getAll({ limit: 4 }).then(d => setMentors(d.alumni || [])).catch(() => { })
    resourceAPI.getAll().then(d => {
      const list = d.resources || (Array.isArray(d) ? d : [])
      setResourceCount(list.length)
    }).catch(() => { })
    userAPI.getProfile().then(d => {
      if (d.user) setProfileData(d.user)
    }).catch(() => { })

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (user) setProfileData(prev => ({ ...prev, ...user }))
  }, [user])

  // When the student joins a meeting (from a notification), mark it joined right away
  useEffect(() => {
    const onJoined = (e) => {
      const sid = e.detail?.sessionId
      setSessions(prev => prev.map(s => (s.id === sid || s._id === sid) ? { ...s, status: 'completed' } : s))
    }
    window.addEventListener('session:joined', onJoined)
    return () => window.removeEventListener('session:joined', onJoined)
  }, [])

  // Only sessions that are still ahead (not joined/completed, not cancelled)
  const upcomingSessions = sessions.filter(s => s.status !== 'completed' && s.status !== 'cancelled')

  // 1. Profile completeness calculated directly from user's database record
  const profileFields = [
    currentUser.name,
    currentUser.bio,
    currentUser.major,
    currentUser.graduationYear,
    currentUser.linkedinUrl,
    (Array.isArray(currentUser.skills) && currentUser.skills.length > 0) ? 'skills' : ''
  ]
  const filledFieldsCount = profileFields.filter(f => f && String(f).trim().length > 0).length
  const profileCompleteness = Math.round((filledFieldsCount / profileFields.length) * 100)

  // 2. Mentor connections goal calculated from database session records (milestone: 5 mentors)
  const connectedMentorIds = new Set(sessions.map(s => s.alumniId || s.alumni?.id).filter(Boolean))
  const mentorConnectionsCount = connectedMentorIds.size
  const targetMentors = 5
  const mentorGoalPercent = Math.min(100, Math.round((mentorConnectionsCount / targetMentors) * 100))

  // 3. Interview readiness calculated from completed sessions in database
  const completedSessions = sessions.filter(s => s.status === 'completed').length
  const interviewReadiness = Math.min(100, Math.round((completedSessions / 3) * 100))

  return (
    <>
      {/* Topbar */}
      <div className="topbar">
        <span className="topbar-title">Dashboard</span>
        <div className="topbar-spacer" />
        <NotificationBell />
      </div>

      {/* Page body */}
      <div className="page-body animate-in">
        {/* Welcome Banner */}
        <div className="welcome-banner">
          <div className="welcome-date">{today}</div>
          <h1 className="welcome-title">Welcome back, {firstName}!</h1>
          <p className="welcome-sub">
            You have {upcomingSessions.length} upcoming mentorship {upcomingSessions.length === 1 ? 'session' : 'sessions'} scheduled.
          </p>
        </div>

        {/* Metric Cards */}
        <div className="metric-grid" style={{ marginBottom: 24 }}>
          <div className="metric-card" style={{ borderLeft: '4px solid #16428c' }}>
            <div className="metric-label">Upcoming Sessions</div>
            <div className="metric-value">{upcomingSessions.length}</div>
            <div className="metric-sub" style={{ color: upcomingSessions.length > 0 ? '#16a34a' : '#6b7280' }}>
              {upcomingSessions.length > 0 ? 'Scheduled' : 'None scheduled'}
            </div>
          </div>
          <div className="metric-card" style={{ borderLeft: '4px solid #d4af37' }}>
            <div className="metric-label">Active Mentors</div>
            <div className="metric-value">{mentors.length}</div>
            <div className="metric-sub">Available</div>
          </div>
          <div className="metric-card" style={{ borderLeft: '4px solid #10b981' }}>
            <div className="metric-label">Profile Status</div>
            <div className="metric-value">{profileCompleteness >= 80 ? 'All-Star' : profileCompleteness >= 50 ? 'Active' : 'Incomplete'}</div>
            <div className="metric-sub" style={{ color: profileCompleteness >= 50 ? '#16a34a' : '#f59e0b' }}>
              {profileCompleteness}% Complete
            </div>
          </div>
          <div className="metric-card" style={{ borderLeft: '4px solid #f59e0b' }}>
            <div className="metric-label">Resources Available</div>
            <div className="metric-value">{resourceCount}</div>
            <div className="metric-sub">Guides & Roadmaps</div>
          </div>
        </div>

        <div className="two-col">
          {/* Upcoming Sessions */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Upcoming Sessions</span>
              <span className="card-link" onClick={() => navigate('/book-session')}>Book session</span>
            </div>
            <div className="card-body" style={{ padding: '12px 22px' }}>
              {upcomingSessions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#6b7280', fontSize: 13 }}>
                  No upcoming sessions yet. Explore verified alumni to book a 1:1 session!
                </div>
              ) : (
                upcomingSessions.map((s, i) => {
                  const mentorName = s.alumni?.name || s.name || 'Alumni Mentor'
                  const mentorTitle = s.alumni?.jobTitle || (s.alumni?.company ? `@ ${s.alumni.company}` : 'Mentor')
                  const timeStr = s.date ? new Date(s.date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : (s.time || 'Upcoming')

                  return (
                    <div key={s.id || s._id || i} className="session-row">
                      <UserAvatar
                        avatar={s.alumni?.avatar}
                        name={mentorName}
                        size={38}
                        className="session-row-avatar"
                        bg="#16428c"
                        color="#fff"
                      />
                      <div className="session-info">
                        <div className="session-name">{mentorName}</div>
                        <div className="session-title">{mentorTitle}</div>
                        <div className="session-topic">{s.topic || 'Mentorship'}</div>
                        <div className="session-time">{timeStr}</div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Your Progress</span>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  {
                    label: 'Profile Completeness',
                    val: profileCompleteness,
                    sub: `${filledFieldsCount} of ${profileFields.length} profile fields completed`
                  },
                  {
                    label: 'Mentor Connections Goal',
                    val: mentorGoalPercent,
                    sub: `${mentorConnectionsCount} of ${targetMentors} mentors connected`
                  },
                ].map(item => (
                  <div key={item.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{item.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#16428c' }}>{item.val}%</span>
                    </div>
                    <div className="profile-progress" style={{ maxWidth: '100%' }}>
                      <div className="profile-progress-bar" style={{ width: `${item.val}%` }} />
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                      {item.sub}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recommended Mentors */}
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>Recommended Mentors</h2>
            <span className="card-link" onClick={() => navigate('/find-alumni')}>Explore all</span>
          </div>
          <div className="two-col">
            {mentors.length === 0 ? (
              <div style={{ padding: 20, color: '#6b7280', fontSize: 13 }}>
                Loading recommended mentors...
              </div>
            ) : (
              mentors.map(m => {
                const tags = Array.isArray(m.skills) && m.skills.length > 0
                  ? m.skills.slice(0, 3)
                  : [m.industry || 'Technology', 'Career Guidance']

                return (
                  <div key={m.id || m._id} className="mentor-card">
                    <div className="mentor-header">
                      <UserAvatar
                        avatar={m.avatar}
                        name={m.name}
                        size={44}
                        className="mentor-avatar"
                        bg="#16428c"
                        color="#fff"
                      />
                      <div className="mentor-info">
                        <div className="mentor-name-row">
                          <span className="mentor-name">{m.name}</span>
                          <span className="verified-badge">Verified</span>
                        </div>
                        <div className="mentor-title">{m.jobTitle ? `${m.jobTitle} at ${m.company}` : (m.company || 'Alumni')}</div>
                        <div className="mentor-rating">
                          <span className="slots-badge">Available for Mentorship</span>
                        </div>
                      </div>
                    </div>
                    <p className="mentor-bio">{m.bio || 'Passionate alumni mentor ready to assist students with mock interviews and career advice.'}</p>
                    <div className="mentor-tags">
                      {tags.map((t, idx) => <span key={idx} className="tag">{t}</span>)}
                    </div>
                    <div className="mentor-actions" style={{ marginTop: 16 }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate(`/alumni-profile?id=${m.id || m._id}`, { state: { mentor: m } })}
                      >
                        View Profile
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => navigate('/messages', { state: { partnerId: m.id || m._id, partner: m } })}>Message</button>
                      <button className="btn btn-primary btn-sm" onClick={() => navigate('/book-session', { state: { mentorId: m.id || m._id, mentor: m } })}>Book Session</button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </>
  )
}
