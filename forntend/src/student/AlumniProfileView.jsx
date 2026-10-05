import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { alumniAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import NotificationBell from '../shared/NotificationBell'
import UserAvatar, { getInitials } from '../shared/avatar'

export default function AlumniProfileView() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const params = useParams()

  const targetId = params.id || new URLSearchParams(location.search).get('id')
  const [alumni, setAlumni] = useState(location.state?.mentor || null)
  const [loading, setLoading] = useState(!location.state?.mentor)

  useEffect(() => {
    if (location.state?.mentor) {
      setAlumni(location.state.mentor)
      setLoading(false)
      return
    }

    if (targetId) {
      setLoading(true)
      alumniAPI.getById(targetId)
        .then(d => {
          if (d?.alumni) setAlumni(d.alumni)
        })
        .catch(err => {
          console.error("Could not fetch alumni profile:", err)
        })
        .finally(() => setLoading(false))
      return
    }

    if (!alumni) {
      setLoading(true)
      alumniAPI.getAll({ limit: 1 })
        .then(d => {
          if (d?.alumni?.length > 0) setAlumni(d.alumni[0])
        })
        .catch(() => { })
        .finally(() => setLoading(false))
    }
  }, [location.state?.mentor, targetId])

  const mentorId = alumni?.id || alumni?._id
  const mentorName = alumni?.name || 'Alumni Mentor'
  const mentorTitle = alumni?.jobTitle ? `${alumni.jobTitle} at ${alumni.company}` : (alumni?.company || 'Verified Alumni')
  const skills = Array.isArray(alumni?.skills) && alumni.skills.length > 0
    ? alumni.skills
    : ['Mentorship', 'Career Guidance', alumni?.industry || 'Technology']

  const userInitials = user?.name ? getInitials(user.name) : 'ME'

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Alumni Profile</span>
        <div className="topbar-spacer" />
        <NotificationBell />
      </div>

      <div className="page-body animate-in">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280' }}>
            Loading alumni profile...
          </div>
        ) : !alumni ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280' }}>
            No alumni selected. Visit <button className="btn btn-secondary btn-sm" onClick={() => navigate('/find-alumni')}>Find Alumni</button> to view profiles.
          </div>
        ) : (
          <>
            {/* Profile header */}
            <div className="profile-header-card">
              <UserAvatar
                avatar={alumni.avatar}
                name={mentorName}
                size={80}
                fontSize={26}
                className="profile-avatar-ring"
                bg="#16428c"
                color="#fff"
              />
              <div className="profile-header-info">
                <div className="profile-name-row">
                  <span className="profile-name">{mentorName}</span>
                  <span className="verified-badge" style={{ fontSize: 12 }}>Verified Alumni</span>
                </div>
                <div className="profile-headline">{mentorTitle}</div>
                <div style={{ display: 'flex', gap: 20, marginBottom: 14, fontSize: 13, color: '#6b7280' }}>
                  {alumni.graduationYear && <span>Class of {alumni.graduationYear}</span>}
                  {alumni.industry && <span>{alumni.industry}</span>}
                  {alumni.isAvailableForMentorship ? (
                    <span style={{ color: '#059669', fontWeight: 600 }}>Available for Mentorship</span>
                  ) : (
                    <span style={{ color: '#9ca3af' }}>Unavailable</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => navigate('/book-session', { state: { mentorId, mentor: alumni } })}
                  >
                    Book Session
                  </button>
                  <button className="btn btn-secondary" onClick={() => navigate('/messages', { state: { partnerId: mentorId, partner: alumni } })}>
                    Message
                  </button>
                </div>
              </div>
            </div>

            <div className="two-col">
              {/* Experience */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Professional Experience</span>
                </div>
                <div className="card-body">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{alumni.jobTitle || 'Alumni Mentor'}</div>
                    <div style={{ fontWeight: 700, color: '#d4af37', fontSize: 14, marginBottom: 2 }}>{alumni.company || 'Verified Industry Professional'}</div>
                    {alumni.industry && (
                      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>Field: {alumni.industry}</div>
                    )}
                    <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
                      {alumni.bio || 'Experienced alumni member actively assisting students in career guidance, interview preparation, and mentorship.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Skills / Expertise */}
              <div className="card">
                <div className="card-header"><span className="card-title">Skills & Expertise</span></div>
                <div className="card-body">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {skills.map((t, idx) => (
                      <span key={idx} className="tag" style={{ background: '#eff6ff', color: '#1e40af' }}>{t}</span>
                    ))}
                  </div>
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 8 }}>Mentorship Focus</div>
                    <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
                      Available for 1:1 sessions, resume critiques, mock technical and behavioral interviews, and career navigation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
