import React, { useState, useEffect } from 'react'
import { sessionAPI } from '../services/api'
import NotificationBell from '../shared/NotificationBell'
import UserAvatar, { getInitials } from '../shared/avatar'

export default function AlumniBookings() {
  const [sessions,     setSessions]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [videoLobby,   setVideoLobby]   = useState(null)
  const [meetLink,     setMeetLink]     = useState('')
  const [starting,     setStarting]     = useState(false)
  const [startError,   setStartError]   = useState('')

  const openLobby = (s) => {
    setVideoLobby(s)
    setMeetLink('')
    setStartError('')
  }

  const handleStart = async () => {
    const custom = meetLink.trim()
    if (!custom) {
      setStartError('Please enter a meeting link before starting the session.')
      return
    }
    if (!/^https?:\/\/\S+$/i.test(custom)) {
      setStartError('The link must start with http:// or https://')
      return
    }
    const sid = videoLobby.id || videoLobby._id
    setStarting(true)
    setStartError('')
    try {
      const res = await sessionAPI.start(sid, custom)
      const link = res.meetingLink || res.session?.meetingLink
      setSessions(prev => prev.map(s => (s.id === sid || s._id === sid)
        ? { ...s, meetingLink: link, status: 'confirmed' }
        : s))
      // Close the modal and show that the notification was sent, without opening the tab
      setVideoLobby(null)
    } catch (err) {
      setStartError(err.message || 'Could not start the session.')
    } finally {
      setStarting(false)
    }
  }

  const fetchSessions = () => {
    sessionAPI.getAll()
      .then(d => setSessions(d.sessions || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchSessions()
    const timer = setInterval(fetchSessions, 4000)
    return () => clearInterval(timer)
  }, [])

  const handleComplete = async (id) => {
    try {
      await sessionAPI.updateStatus(id, 'completed')
      setSessions(prev => prev.map(s => (s.id === id || s._id === id) ? { ...s, status: 'completed' } : s))
    } catch (err) {
      console.error('Failed to complete session:', err)
    }
  }


  const handleCancel = async (id) => {
    try {
      await sessionAPI.delete(id)
      setSessions(prev => prev.filter(s => (s.id !== id && s._id !== id)))
    } catch { }
  }

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Bookings</span>
        <div className="topbar-spacer" />
        <NotificationBell />
      </div>

      <div className="page-body animate-in">
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>My Bookings</h1>
          <p style={{ fontSize: 14, color: '#6b7280' }}>Upcoming mentorship sessions.</p>
        </div>

        {loading ? (
          <div className="card">
            <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
              Loading sessions...
            </div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="card">
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#6b7280' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#1f2937', marginBottom: 4 }}>
                No Upcoming Sessions
              </div>
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                When students book a session with you, it will appear here.
              </p>
            </div>
          </div>
        ) : (
          sessions.map(s => {
            const sid = s.id || s._id
            const studentName = s.student?.name || s.student || 'Student'
            const studentMajor = s.student?.major || 'Undergraduate'
            const studentInitials = getInitials(studentName)
            const dateStr = s.date ? new Date(s.date).toLocaleDateString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : 'Upcoming'

            return (
              <div key={sid} className="card" style={{ marginBottom: 20 }}>
                <div className="card-body" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    <UserAvatar
                      avatar={s.student?.avatar}
                      name={studentName}
                      size={52}
                      bg="#16428c"
                      color="#fff"
                      fallback="ST"
                    />

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 16, color: '#111827' }}>{studentName}</div>
                          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 1 }}>{studentMajor}</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#2563eb', marginTop: 4 }}>{s.topic || 'Mentorship Session'}</div>
                          <div style={{ display: 'flex', gap: 10, fontSize: 13, color: '#4b5563', marginTop: 6, alignItems: 'center' }}>
                            <span style={{ fontWeight: 600 }}>{dateStr}</span>
                            <span>•</span>
                            <span style={{ background: '#e0e7ff', color: '#3730a3', fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                              {s.platform || 'Google Meet'}
                            </span>
                            {s.status && (
                              <span style={{
                                background: s.status === 'completed' ? '#f3f4f6' : s.status === 'confirmed' ? '#dcfce7' : '#fef3c7',
                                color: s.status === 'completed' ? '#4b5563' : s.status === 'confirmed' ? '#15803d' : '#b45309',
                                fontSize: 11,
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontWeight: 600,
                                textTransform: 'capitalize'
                              }}>
                                {s.status}
                              </span>
                            )}
                          </div>
                          {s.note && (
                            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8, fontStyle: 'italic', background: '#f9fafb', padding: '6px 10px', borderRadius: 6 }}>
                              Note from student: "{s.note}"
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {s.status === 'completed' ? (
                            <span style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#059669',
                              background: '#ecfdf5',
                              padding: '6px 12px',
                              borderRadius: 6,
                              border: '1px solid #a7f3d0'
                            }}>
                              Completed
                            </span>
                          ) : (
                            <>
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ color: '#dc2626', borderColor: '#dc2626' }}
                                onClick={() => handleCancel(sid)}
                              >
                                Cancel
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleComplete(sid)}
                                title="Mark session as completed"
                              >
                                Mark Completed
                              </button>
                              <button
                                className="btn btn-gold btn-sm"
                                onClick={() => openLobby(s)}
                              >
                                Join Session
                              </button>
                            </>
                          )}
                        </div>
                      </div>


                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Video lobby modal */}
      {videoLobby && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 36, maxWidth: 500, width: '90%', textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,.3)' }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: '#111827' }}>Video Call Lobby</h2>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
              Session with <strong>{videoLobby.student?.name || videoLobby.student || 'Student'}</strong>
            </p>
            <div style={{ padding: '10px 18px', background: '#fef9e7', borderRadius: 10, border: '1px solid #fde68a', fontSize: 13, color: '#92400e', marginBottom: 16, display: 'inline-block' }}>
              Platform: <strong>{videoLobby.platform || 'Google Meet'}</strong> • Waiting for student...
            </div>
            <p style={{ fontSize: 13, color: '#4b5563', margin: '0 0 16px', lineHeight: 1.5 }}>
              Paste your meeting link below (Google Meet, Zoom, Microsoft Teams, etc.). Once submitted, the link will be automatically sent to the student's notifications.
            </p>
            <div style={{ textAlign: 'left', marginBottom: 20 }}>
              <div style={{ marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
                  Custom Meeting URL <span style={{ color: '#dc2626' }}>*</span>
                </label>
              </div>
              <input
                type="url"
                value={meetLink}
                onChange={e => {
                  setMeetLink(e.target.value)
                  if (startError) setStartError('')
                }}
                placeholder="https://meet.google.com/xyz-abcd-efg or https://zoom.us/j/..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' }}
              />
              {startError && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 8 }}>{startError}</div>}
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                className="btn btn-gold btn-lg"
                disabled={starting}
                onClick={handleStart}
              >
                {starting ? 'Starting...' : 'Start Session & Notify Student'}
              </button>
              <button className="btn btn-secondary" onClick={() => setVideoLobby(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
