import React, { useState, useEffect } from 'react'
import { notificationAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import UserAvatar from './avatar'
import Linkify, { getMeetingLink, joinMeeting } from './Linkify'

// Bell icon SVG
export const BellIcon = ({ hasUnread }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
)

const NOTIF_TYPES = {
  SESSION_BOOKED: 'session_booked',
  SESSION_REMINDER: 'session_reminder',
  SESSION_CANCELLED: 'session_cancelled',
  SESSION_CONFIRMED: 'session_confirmed',
  SESSION_STARTED: 'session_started',
  SESSION_COMPLETED: 'session_completed',
  REFERRAL: 'referral',
  MESSAGE: 'message',
  RESOURCE: 'resource',
}

export const ALUMNI_NOTIFICATIONS = []

export const STUDENT_NOTIFICATIONS = []

const TYPE_META = {
  [NOTIF_TYPES.SESSION_BOOKED]: { color: '#1d4ed8', bg: '#eff6ff', label: 'Booking' },
  [NOTIF_TYPES.SESSION_REMINDER]: { color: '#d97706', bg: '#fffbeb', label: 'Reminder' },
  [NOTIF_TYPES.SESSION_CANCELLED]: { color: '#dc2626', bg: '#fef2f2', label: 'Cancelled' },
  [NOTIF_TYPES.SESSION_CONFIRMED]: { color: '#059669', bg: '#ecfdf5', label: 'Confirmed' },
  [NOTIF_TYPES.SESSION_STARTED]: { color: '#059669', bg: '#ecfdf5', label: 'Meeting Live' },
  [NOTIF_TYPES.SESSION_COMPLETED]: { color: '#7c3aed', bg: '#f5f3ff', label: 'Completed' },
  [NOTIF_TYPES.REFERRAL]: { color: '#0369a1', bg: '#e0f2fe', label: 'Referral' },
  [NOTIF_TYPES.MESSAGE]: { color: '#4f46e5', bg: '#eef2ff', label: 'Message' },
  [NOTIF_TYPES.RESOURCE]: { color: '#15803d', bg: '#f0fdf4', label: 'Resource' },
}

export default function NotificationsPage({ role = 'alumni', accentColor = '#d4af37', navigate }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterTab, setFilterTab] = useState('all') // 'all' | 'unread' | 'sessions' | 'referrals'

  const fetchNotifs = () => {
    notificationAPI.getAll()
      .then(d => setNotifications(d.notifications || []))
      .catch(() => { })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchNotifs()
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  const markAllRead = () => {
    notificationAPI.markAllRead().catch(() => { })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const markRead = (id) => {
    notificationAPI.markRead(id).catch(() => { })
    setNotifications(prev => prev.map(n => (n.id === id || n._id === id) ? { ...n, read: true } : n))
  }

  const dismiss = (id) => {
    notificationAPI.delete(id).catch(() => { })
    setNotifications(prev => prev.filter(n => n.id !== id && n._id !== id))
  }

  const filtered = notifications.filter(n => {
    if (filterTab === 'unread') return !n.read
    if (filterTab === 'sessions') return [
      NOTIF_TYPES.SESSION_BOOKED,
      NOTIF_TYPES.SESSION_REMINDER,
      NOTIF_TYPES.SESSION_CANCELLED,
      NOTIF_TYPES.SESSION_CONFIRMED,
      NOTIF_TYPES.SESSION_STARTED,
      NOTIF_TYPES.SESSION_COMPLETED,
    ].includes(n.type)
    if (filterTab === 'referrals') return n.type === NOTIF_TYPES.REFERRAL
    return true
  })

  const isAlumni = role === 'alumni'

  return (
    <>
      {/* ── Topbar ── */}
      <div className="topbar">
        <span className="topbar-title">Notifications</span>
        <div className="topbar-spacer" />
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{
              fontSize: 12, fontWeight: 600, color: accentColor,
              background: 'transparent', cursor: 'pointer',
              padding: '4px 12px', borderRadius: 20,
              border: `1px solid ${accentColor}`,
              marginRight: 12, transition: 'all .2s'
            }}
          >
            Mark all read
          </button>
        )}
        <UserAvatar
          avatar={user?.avatar}
          name={user?.name || (isAlumni ? 'Alumni' : 'Student')}
          size={36}
          bg={accentColor}
          color={isAlumni ? '#1a1a1a' : '#fff'}
          className="topbar-avatar"
        />
      </div>

      <div className="page-body animate-in">
        {/* ── Header ── */}
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 4 }}>
              Notifications
              {unreadCount > 0 && (
                <span style={{
                  marginLeft: 10, background: '#ef4444', color: '#fff',
                  fontSize: 12, fontWeight: 700, padding: '2px 9px',
                  borderRadius: 99, verticalAlign: 'middle',
                }}>
                  {unreadCount} new
                </span>
              )}
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280' }}>
              Stay updated on your sessions, referrals, and messages.
            </p>
          </div>
        </div>

        {/* ── Filter Tabs ── */}
        <div style={{
          display: 'flex', gap: 8, marginBottom: 20,
          background: '#fff', padding: '10px 14px',
          borderRadius: 14, border: '1px solid #e5e7eb',
          overflowX: 'auto',
        }}>
          {[
            { key: 'all', label: 'All', count: notifications.length },
            { key: 'unread', label: 'Unread', count: unreadCount },
            { key: 'sessions', label: 'Sessions', count: notifications.filter(n => [NOTIF_TYPES.SESSION_BOOKED, NOTIF_TYPES.SESSION_REMINDER, NOTIF_TYPES.SESSION_CANCELLED, NOTIF_TYPES.SESSION_CONFIRMED, NOTIF_TYPES.SESSION_STARTED, NOTIF_TYPES.SESSION_COMPLETED].includes(n.type)).length },
            { key: 'referrals', label: 'Referrals', count: notifications.filter(n => n.type === NOTIF_TYPES.REFERRAL).length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key)}
              style={{
                padding: '7px 16px', borderRadius: 8,
                fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                whiteSpace: 'nowrap',
                background: filterTab === tab.key ? accentColor : 'transparent',
                color: filterTab === tab.key ? (isAlumni ? '#1a1a1a' : '#fff') : '#6b7280',
                transition: 'all .2s',
              }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span style={{
                  marginLeft: 6, background: filterTab === tab.key ? 'rgba(0,0,0,.15)' : '#f3f4f6',
                  color: filterTab === tab.key ? (isAlumni ? '#1a1a1a' : '#fff') : '#374151',
                  fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 99,
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Notification List ── */}
        {filtered.length === 0 ? (
          <div style={{
            background: '#fff', border: '1px dashed #d1d5db',
            borderRadius: 14, padding: 48, textAlign: 'center',
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 6 }}>All caught up!</h3>
            <p style={{ fontSize: 13, color: '#6b7280' }}>No notifications in this category.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(n => {
              const meta = TYPE_META[n.type] || { color: '#374151', bg: '#f3f4f6', label: '' }
              // Clean any emojis that were saved in old database notification titles (including ⏰ \u23F0)
              const cleanTitle = (n.title || '')
                .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{2B55}\u{200D}\u{FE0F}]/gu, '')
                .trim()

              return (
                <div
                  key={n.id}
                  className="notif-card"
                  style={{
                    background: n.read ? '#fff' : (isAlumni ? '#fffdf5' : '#f0f7ff'),
                    border: n.read ? '1px solid #e5e7eb' : `1px solid ${isAlumni ? '#fde68a' : '#bfdbfe'}`,
                    borderLeft: n.urgent ? '4px solid #ef4444' : n.read ? '4px solid transparent' : `4px solid ${accentColor}`,
                    borderRadius: 14,
                    padding: '18px 20px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 16,
                    transition: 'all .2s',
                    position: 'relative',
                  }}
                  onClick={() => markRead(n.id)}
                >
                  {/* Avatar Initials without badge icon */}
                  <div style={{
                    width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                    background: n.avatarColor || accentColor,
                    color: '#fff', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontWeight: 700, fontSize: 14,
                  }}>
                    {n.avatar || 'AL'}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>
                        {cleanTitle}
                      </span>
                      {!n.read && (
                        <span style={{
                          width: 7, height: 7, borderRadius: '50%',
                          background: n.urgent ? '#ef4444' : accentColor,
                          flexShrink: 0,
                        }} />
                      )}
                      {n.urgent && (
                        <span style={{
                          background: '#fef2f2', color: '#dc2626',
                          fontSize: 10, fontWeight: 700, padding: '2px 7px',
                          borderRadius: 99, textTransform: 'uppercase', letterSpacing: '.5px',
                        }}>
                          Urgent
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.5, marginBottom: 10, wordBreak: 'break-word' }}>
                      <Linkify text={n.body} onLinkClick={() => { markRead(n.id); joinMeeting(n) }} />
                    </p>
                    {getMeetingLink(n) && (
                      <a
                        href={getMeetingLink(n)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => { e.stopPropagation(); markRead(n.id); joinMeeting(n) }}
                        style={{
                          display: 'inline-block', marginBottom: 10, padding: '8px 16px',
                          background: '#059669', color: '#fff', borderRadius: 8,
                          fontSize: 13, fontWeight: 700, textDecoration: 'none',
                        }}
                      >
                        Join Meeting
                      </a>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>
                        {n.time}
                      </span>
                      <span style={{ fontSize: 11, color: '#d1d5db' }}>•</span>
                      <span style={{
                        background: meta.bg, color: meta.color,
                        fontSize: 10, fontWeight: 700, padding: '2px 8px',
                        borderRadius: 99, textTransform: 'uppercase', letterSpacing: '.4px',
                      }}>
                        {meta.label}
                      </span>
                      {n.action && navigate && (
                        <>
                          <span style={{ fontSize: 11, color: '#d1d5db' }}>•</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); markRead(n.id); navigate(n.action) }}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              fontSize: 12, fontWeight: 600, color: accentColor,
                              padding: 0, textDecoration: 'underline',
                            }}
                          >
                            {n.actionLabel} →
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Dismiss ✕ */}
                  <button
                    onClick={(e) => { e.stopPropagation(); dismiss(n.id) }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#9ca3af', fontSize: 16, lineHeight: 1, padding: '2px 4px',
                      flexShrink: 0, borderRadius: 4, transition: 'color .15s',
                    }}
                    title="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
