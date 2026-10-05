import React, { useState } from 'react'
import { userAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import NotificationBell from '../shared/NotificationBell'

const PLATFORMS = ['Zoom', 'Google Meet', 'In-person']
const DURATIONS = ['30 min', '45 min', '60 min']

const formatSlotDateTime = (dateStr, timeStr, duration) => {
  try {
    const d = new Date(`${dateStr}T${timeStr || '00:00'}`)
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    return `${dayName} — ${timePart}${duration ? ` (${duration})` : ''}`
  } catch {
    return `${dateStr} at ${timeStr}${duration ? ` (${duration})` : ''}`
  }
}

export default function ProvideSlotsFlow({ navigate }) {
  const { setUser } = useAuth()
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [duration, setDuration] = useState('30 min')
  const [platform, setPlatform] = useState('Google Meet')
  const [notes, setNotes] = useState('')
  const [published, setPublished] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handlePublish = async () => {
    if (!date || !time) {
      setError('Please select both a date and time for the mentorship slot.')
      return
    }
    setError('')
    setSaving(true)

    try {
      // Fetch latest profile to ensure we append to any existing slots
      const profileRes = await userAPI.getProfile()
      const rawSlots = profileRes.user?.availableSlots
      const existingSlots = Array.isArray(rawSlots)
        ? rawSlots
        : (typeof rawSlots === 'string' ? (() => { try { const p = JSON.parse(rawSlots); return Array.isArray(p) ? p : [] } catch { return [] } })() : [])

      const newSlot = {
        id: `slot_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        date,
        time,
        duration,
        platform,
        notes: notes.trim(),
        formatted: formatSlotDateTime(date, time, duration),
        createdAt: new Date().toISOString()
      }

      const updatedSlots = [...existingSlots, newSlot]

      const updateRes = await userAPI.updateProfile({
        isAvailableForMentorship: true,
        availableSlots: updatedSlots
      })

      if (updateRes?.user && setUser) {
        setUser(updateRes.user)
      }

      setPublished(true)
    } catch (err) {
      console.error("Could not update mentorship status:", err)
      setError(err.message || 'Failed to save time slot. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (published) {
    return (
      <>
        <div className="topbar">
          <span className="topbar-title">Provide Slots</span>
          <div className="topbar-spacer" />
          <NotificationBell />
        </div>
        <div className="page-body animate-in">
          <div className="card" style={{ maxWidth: 560, margin: '40px auto' }}>
            <div className="success-card">
              <div className="success-icon" style={{ background: '#fef9e7', color: '#d4af37', fontSize: 24, fontWeight: 800 }}>✓</div>
              <h2 className="success-title" style={{ color: '#111827' }}>Slot Successfully Published!</h2>
              <p className="success-sub">
                Your mentorship availability has been saved and will now be displayed on your dashboard and available for students to book.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <div style={{ padding: '10px 18px', background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 13, color: '#374151', fontWeight: 600 }}>
                  {date} at {time}
                </div>
                <div style={{ padding: '10px 18px', background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 13, color: '#374151', fontWeight: 600 }}>
                  {duration}
                </div>
                <div style={{ padding: '10px 18px', background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 13, color: '#374151', fontWeight: 600 }}>
                  {platform}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
                <button className="btn btn-secondary" onClick={() => { setPublished(false); setDate(''); setTime(''); setNotes('') }}>
                  Add Another Slot
                </button>
                <button className="btn btn-gold" onClick={() => navigate('/')}>
                  View on Dashboard →
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
        <span className="topbar-title">Provide Slots</span>
        <div className="topbar-spacer" />
        <NotificationBell />
      </div>
      <div className="page-body animate-in">
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 6 }}>Create Mentorship Slot</h1>
            <p style={{ fontSize: 14, color: '#6b7280' }}>Set your availability for students to book 1:1 mentorship sessions.</p>
          </div>

          {error && (
            <div style={{ padding: '12px 16px', background: '#fef2f2', color: '#991b1b', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
              {error}
            </div>
          )}

          <div className="card">
            <div className="card-body" style={{ padding: 32 }}>
              {/* Date & Time */}
              <div className="two-col" style={{ marginBottom: 20 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Date *</label>
                  <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Time *</label>
                  <input type="time" className="form-input" value={time} onChange={e => setTime(e.target.value)} required />
                </div>
              </div>

              {/* Duration */}
              <div className="form-group">
                <label className="form-label">Duration</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {DURATIONS.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        border: `1.5px solid ${duration === d ? '#d4af37' : '#e5e7eb'}`,
                        borderRadius: 10,
                        background: duration === d ? 'rgba(212,175,55,.08)' : '#fff',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 14,
                        color: duration === d ? '#a07820' : '#374151',
                        transition: 'all .2s',
                        fontFamily: 'inherit',
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Platform */}
              <div className="form-group">
                <label className="form-label">Meeting Platform</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {PLATFORMS.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPlatform(p)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        border: `1.5px solid ${platform === p ? '#d4af37' : '#e5e7eb'}`,
                        borderRadius: 10,
                        background: platform === p ? 'rgba(212,175,55,.08)' : '#fff',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 13,
                        color: platform === p ? '#a07820' : '#374151',
                        transition: 'all .2s',
                        fontFamily: 'inherit',
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <textarea
                  className="form-textarea"
                  placeholder="e.g. Topic focus, preparation tips for students..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" onClick={() => navigate('/')}>Cancel</button>
                <button
                  type="button"
                  className="btn btn-gold"
                  disabled={!date || !time || saving}
                  onClick={handlePublish}
                  style={{ opacity: (!date || !time || saving) ? 0.5 : 1 }}
                >
                  {saving ? 'Publishing...' : 'Publish Slot'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
