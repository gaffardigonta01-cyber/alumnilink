import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useNotifications } from '../context/NotificationContext'
import { getMeetingLink, joinMeeting } from './Linkify'

export default function NotificationBell({ accentColor }) {
  const { notifs, unreadCount, totalUnread, markAllRead, markRead, role } = useNotifications()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()

  const defaultAccent = role === 'alumni' ? '#d4af37' : '#16428c'
  const accent = accentColor || defaultAccent

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Don't show bell on notifications page
  if (location.pathname.includes('/notifications')) {
    return null
  }

  return (
    <div className="notif-bell-wrapper" ref={dropdownRef} onClick={e => e.stopPropagation()}>
      <button
        type="button"
        className={`notif-bell-btn${totalUnread > 0 ? ' has-unread' : ''}`}
        onClick={() => setOpen(v => !v)}
        title="Notifications"
        aria-label="View notifications"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {totalUnread > 0 && <span className="notif-badge">{totalUnread}</span>}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">
            <span className="notif-dropdown-title">
              Notifications
              {unreadCount > 0 && (
                <span style={{ marginLeft: 8, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99 }}>
                  {unreadCount} new
                </span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: accent, cursor: 'pointer' }}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="notif-dropdown-items">
            {(Array.isArray(notifs) ? notifs : []).length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                No notifications right now
              </div>
            ) : (
              (Array.isArray(notifs) ? notifs : []).slice(0, 5).map(n => (
                <div
                  key={n.id || n._id}
                  className={`notif-dropdown-item${!n.read ? ' unread' : ''}`}
                  onClick={() => { markRead(n.id || n._id); setOpen(false); navigate(n.action || '/notifications') }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: n.avatarColor || accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                    {n.avatar || '📢'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{n.title}</span>
                      {!n.read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent, flexShrink: 0 }} />}
                    </div>
                    <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.4, marginTop: 2 }}>
                      {(() => {
                        const text = getMeetingLink(n) ? String(n.body || '').replace(/\s*Join here:\s*https?:\/\/\S+/, '') : (n.body || '')
                        return text.length > 80 ? text.slice(0, 80) + '…' : text
                      })()}
                    </p>
                    {getMeetingLink(n) && (
                      <a
                        href={getMeetingLink(n)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => { e.stopPropagation(); markRead(n.id || n._id); joinMeeting(n) }}
                        style={{ display: 'inline-block', marginTop: 6, padding: '4px 10px', background: '#059669', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}
                      >
                        Join Meeting
                      </a>
                    )}
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{n.time}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="notif-dropdown-footer">
            <button
              type="button"
              onClick={() => { setOpen(false); navigate('/notifications') }}
              style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 600, color: accent, cursor: 'pointer' }}
            >
              View all notifications →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
