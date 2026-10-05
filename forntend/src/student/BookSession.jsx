import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { alumniAPI, sessionAPI } from '../services/api'
import NotificationBell from '../shared/NotificationBell'
import UserAvatar, { getInitials } from '../shared/avatar'

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

const getSlotLabel = (s) => {
  if (!s) return ''
  if (typeof s === 'string') return s
  if (s.formatted) return s.formatted
  try {
    const d = new Date(`${s.date}T${s.time || '00:00'}`)
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    return `${dayName} — ${timePart}${s.duration ? ` (${s.duration})` : ''}`
  } catch {
    return `${s.date || ''} ${s.time ? 'at ' + s.time : ''}${s.duration ? ' (' + s.duration + ')' : ''}`
  }
}

export default function BookSession({ navigate }) {
  const location = useLocation()
  const initialMentorId = location.state?.mentorId || null

  const [mentors,        setMentors]        = useState([])
  const [loading,        setLoading]        = useState(true)
  const [step,           setStep]           = useState(initialMentorId ? 2 : 1)
  const [selectedMentor, setSelectedMentor] = useState(initialMentorId)
  const [mentorDetails,  setMentorDetails]  = useState(null)
  const [selectedSlot,   setSelectedSlot]   = useState(null)
  const [details,        setDetails]        = useState('')
  const [booked,         setBooked]         = useState(false)
  const [submitting,     setSubmitting]     = useState(false)
  const [error,          setError]          = useState('')

  useEffect(() => {
    alumniAPI.getAll()
      .then(d => {
        const list = d.alumni || []
        setMentors(list)
        if (initialMentorId) {
          setSelectedMentor(initialMentorId)
          setStep(2)
        } else if (list.length > 0 && !selectedMentor) {
          setSelectedMentor(list[0].id || list[0]._id)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (location.state?.mentorId) {
      setSelectedMentor(location.state.mentorId)
      setStep(2)
    }
  }, [location.state])

  // Fetch freshest mentor details including availableSlots whenever selectedMentor changes
  useEffect(() => {
    if (selectedMentor) {
      setSelectedSlot(null)
      alumniAPI.getById(selectedMentor)
        .then(d => {
          if (d.alumni) setMentorDetails(d.alumni)
        })
        .catch(() => {})
    }
  }, [selectedMentor])

  const mentorFromList = mentors.find(m => (m.id || m._id) === selectedMentor)
  const activeMentor = mentorDetails || mentorFromList || location.state?.mentor || mentors[0] || null

  // ONLY the slots set by the selected alumni
  const mentorSlots = parseSlots(activeMentor?.availableSlots)

  const handleBook = async () => {
    if (!selectedMentor || !selectedSlot) return
    setSubmitting(true)
    setError('')
    try {
      const slotObj = typeof selectedSlot === 'object'
        ? selectedSlot
        : mentorSlots.find(s => (s.id || s._id || s.formatted) === selectedSlot)

      let sessionDate = new Date(Date.now() + 86400000).toISOString()
      if (slotObj && slotObj.date) {
        sessionDate = new Date(`${slotObj.date}T${slotObj.time || '12:00'}`).toISOString()
      }

      await sessionAPI.create({
        alumniId: Number(selectedMentor),
        topic:    details.trim() || 'Career Mentorship & Guidance',
        date:     sessionDate,
        platform: slotObj?.platform || 'Google Meet',
        note:     details,
        slotId:   slotObj?.id || slotObj?._id,
      })
      setBooked(true)
    } catch (err) {
      setError(err.message || 'Booking failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (booked) {
    return (
      <>
        <div className="topbar">
          <span className="topbar-title">Book Session</span>
          <div className="topbar-spacer" />
          <NotificationBell />
        </div>
        <div className="page-body animate-in">
          <div className="card" style={{ maxWidth: 600, margin: '40px auto' }}>
            <div className="success-card">
              <div className="success-icon" style={{ background: '#ecfdf5', color: '#059669', fontSize: 28, fontWeight: 800 }}>✓</div>
              <h2 className="success-title">Mentorship Session Booked!</h2>
              <p className="success-sub">
                Your session with <strong>{activeMentor?.name || 'your mentor'}</strong> has been scheduled for <strong>{getSlotLabel(selectedSlot)}</strong>.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => { setBooked(false); setStep(1); setDetails(''); setSelectedSlot(null) }}
                >
                  Book Another Session
                </button>
                <button className="btn btn-primary" onClick={() => navigate && navigate('/')}>
                  Go to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Book Session</span>
        <div className="topbar-spacer" />
        <NotificationBell />
      </div>

      <div className="page-body animate-in">
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 6 }}>Book a Session</h1>
            <p style={{ fontSize: 14, color: '#6b7280' }}>Schedule a 1:1 mentorship session with an alumni mentor.</p>
          </div>

          {/* Stepper (Horizontal Row) */}
          <div className="booking-stepper">
            {[
              { num: 1, label: 'Select Mentor' },
              { num: 2, label: 'Choose Slot' },
              { num: 3, label: 'Add Details' },
            ].map(s => (
              <React.Fragment key={s.num}>
                <div
                  className={`step-item${step === s.num ? ' active' : ''}${step > s.num ? ' done' : ''}`}
                  onClick={() => { if (s.num < step) setStep(s.num) }}
                  style={{ cursor: s.num < step ? 'pointer' : 'default' }}
                >
                  <div className="step-circle">{step > s.num ? '✓' : s.num}</div>
                  <span className="step-label">{s.label}</span>
                </div>
                {s.num < 3 && <div className={`step-line${step > s.num ? ' done' : ''}`} />}
              </React.Fragment>
            ))}
          </div>


          <div className="card" style={{ padding: 28 }}>
            {error && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', color: '#991b1b', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                {error}
              </div>
            )}

            {/* Step 1: Select Mentor */}
            {step === 1 && (
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#111827' }}>Choose a Mentor</h3>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>Loading verified alumni...</div>
                ) : mentors.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: '#6b7280' }}>No mentors available yet.</div>
                ) : (
                  <div className="mentor-select-grid">
                    {mentors.map(m => {
                      const mid = m.id || m._id
                      const isSelected = selectedMentor === mid
                      const slotsArr = parseSlots(m.availableSlots)
                      const slotCount = slotsArr.length
                      return (
                        <div
                          key={mid}
                          className={`mentor-select-card${isSelected ? ' selected' : ''}`}
                          onClick={() => setSelectedMentor(mid)}
                        >
                          <UserAvatar
                            avatar={m.avatar}
                            name={m.name}
                            size={44}
                            bg="#16428c"
                            color="#fff"
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{m.name}</div>
                            <div style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>
                              {m.jobTitle ? `${m.jobTitle}${m.company ? ` @ ${m.company}` : ''}` : (m.company || 'Alumni Mentor')}
                            </div>
                            <div style={{ marginTop: 4 }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 11,
                                fontWeight: 600,
                                color: slotCount > 0 ? '#15803d' : '#6b7280',
                                background: slotCount > 0 ? '#dcfce7' : '#f3f4f6',
                                padding: '2px 8px',
                                borderRadius: 6
                              }}>
                                {slotCount > 0 ? `📅 ${slotCount} open slot${slotCount > 1 ? 's' : ''}` : 'No slots set yet'}
                              </span>
                            </div>
                          </div>
                          <input
                            type="radio"
                            name="mentor"
                            checked={isSelected}
                            onChange={() => setSelectedMentor(mid)}
                            style={{ cursor: 'pointer', width: 18, height: 18, accentColor: '#16428c', margin: 0, flexShrink: 0 }}
                          />
                        </div>
                      )
                    })}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
                  <button
                    className="btn btn-primary"
                    disabled={!selectedMentor}
                    onClick={() => setStep(2)}
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Choose Slot (Exclusively displays slots set by the alumni) */}
            {step === 2 && (
              <div className="animate-in">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <UserAvatar
                    avatar={activeMentor?.avatar}
                    name={activeMentor?.name}
                    size={44}
                    className="mentor-avatar"
                    bg="#16428c"
                    color="#fff"
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{activeMentor?.name || 'Selected Mentor'}</div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>
                      {activeMentor?.jobTitle ? `${activeMentor.jobTitle} at ${activeMentor.company}` : (activeMentor?.company || 'Alumni')}
                    </div>
                  </div>
                </div>

                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: '#374151' }}>
                  Available slots set by mentor:
                </h3>

                {mentorSlots.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 20px', background: '#f9fafb', borderRadius: 12, border: '1px dashed #d1d5db', color: '#6b7280', marginBottom: 20 }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>📅</div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#1f2937', marginBottom: 6 }}>
                      No Available Slots
                    </div>
                    <p style={{ fontSize: 13, color: '#6b7280', margin: 0, lineHeight: 1.5, maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>
                      <strong>{activeMentor?.name || 'This mentor'}</strong> has not published any open time slots yet. Only slots set by the mentor will appear here.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {mentorSlots.map((s, idx) => {
                      const sid = s.id || s._id || idx
                      const isSelected = selectedSlot && (
                        selectedSlot === s ||
                        selectedSlot === sid ||
                        (typeof selectedSlot === 'object' && (selectedSlot.id || selectedSlot._id) === (s.id || s._id))
                      )
                      const label = getSlotLabel(s)

                      return (
                        <div
                          key={sid}
                          className={`slot-option${isSelected ? ' selected' : ''}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '14px 16px',
                            border: `1.5px solid ${isSelected ? '#16428c' : '#e5e7eb'}`,
                            borderRadius: 10,
                            background: isSelected ? '#eff6ff' : '#fff',
                            cursor: 'pointer',
                            transition: 'all .2s'
                          }}
                          onClick={() => setSelectedSlot(s)}
                        >
                          <div className="slot-radio" style={{
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            border: `2px solid ${isSelected ? '#16428c' : '#d1d5db'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {isSelected && <div style={{ width: 8, height: 8, background: '#16428c', borderRadius: '50%' }} />}
                          </div>

                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>
                              {label}
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
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
                              {s.notes && (
                                <span style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic', marginLeft: 4 }}>
                                  "{s.notes}"
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                  <button className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
                  <button
                    className="btn btn-primary"
                    disabled={!selectedSlot || mentorSlots.length === 0}
                    onClick={() => setStep(3)}
                    style={{ opacity: (!selectedSlot || mentorSlots.length === 0) ? 0.5 : 1 }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Add Details */}
            {step === 3 && (
              <div className="animate-in">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, padding: '12px 16px', background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb' }}>
                  <span style={{ fontWeight: 700, color: '#111827' }}>{activeMentor?.name}</span>
                  <span style={{ color: '#9ca3af' }}>·</span>
                  <span style={{ fontSize: 13, color: '#2563eb', fontWeight: 600 }}>{getSlotLabel(selectedSlot)}</span>
                </div>
                <div className="form-group">
                  <label className="form-label">What would you like to discuss?</label>
                  <textarea
                    className="form-textarea"
                    placeholder="e.g. System design interview prep, portfolio review, career transition advice..."
                    value={details}
                    onChange={e => setDetails(e.target.value)}
                    rows={4}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                  <button className="btn btn-secondary" onClick={() => setStep(2)}>Back</button>
                  <button
                    className="btn btn-primary"
                    disabled={submitting}
                    onClick={handleBook}
                  >
                    {submitting ? 'Confirming...' : 'Confirm Booking'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
