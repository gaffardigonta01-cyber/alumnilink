import React, { useState, useEffect, useRef } from 'react'
import { Routes, Route, NavLink, useNavigate, useLocation, Navigate } from 'react-router-dom'
import AlumniDashboard from './AlumniDashboard'
import ProvideSlotsFlow from './ProvideSlotsFlow'
import AlumniBookings from './AlumniBookings'
import AlumniReferrals from './AlumniReferrals'
import AlumniJobs from './AlumniJobs'
import AlumniResources from './AlumniResources'
import AlumniMessages from './AlumniMessages'
import AlumniProfile from './AlumniProfile'
import NotificationsPage from '../shared/NotificationsPage'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import UserAvatar from '../shared/avatar'

const NAV = [
  { path: '/', label: 'Dashboard', exact: true },
  { path: '/provide-slots', label: 'Provide Slots' },
  { path: '/bookings', label: 'Bookings' },
  { path: '/referrals', label: 'Referrals' },
  { path: '/jobs', label: 'Jobs' },
  { path: '/resources', label: 'Resources' },
  { path: '/messages', label: 'Messages' },
  { path: '/notifications', label: 'Notifications' },
  { path: '/profile', label: 'My Profile' },
]

export default function AlumniLayout({ user: propUser, onLogout }) {
  const { user: authUser } = useAuth()
  const user = authUser || propUser
  const navigate = useNavigate()
  const location = useLocation()
  const { unreadCount, unreadMessages } = useNotifications()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  const userName = user?.name || 'Alumni Mentor'
  const userInitials = userName.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s+/i, '').trim().split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'AL'

  return (
    <div className="portal-shell alumni-portal">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Mobile Menu Toggle Button */}
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileMenuOpen(v => !v)}
        aria-label="Toggle navigation menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {mobileMenuOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`} style={{ background: '#1a2238' }}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon" style={{ background: '#d4af37', color: '#1a1a1a' }}>A</div>
          <div className="sidebar-logo-text">
            <div className="sidebar-logo-name">AlumniLink</div>
            <div className="sidebar-logo-sub" style={{ color: '#d4af37' }}>Career Mentor</div>
          </div>
        </div>

        {/* User */}
        <div className="sidebar-user">
          <UserAvatar
            avatar={user?.avatar}
            name={userName}
            size={38}
            className="sidebar-avatar"
            bg="#d4af37"
            color="#1a1a1a"
          />
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{userName}</div>
            <div className="sidebar-role-badge" style={{ background: 'rgba(212,175,55,.15)', color: '#d4af37' }}>
              Verified Alumni
            </div>
          </div>
        </div>

        {/* Provide slots CTA */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
          <button
            className="btn btn-gold btn-full"
            style={{ fontSize: 13 }}
            onClick={() => { setMobileMenuOpen(false); navigate('/provide-slots') }}
          >
            + Add Mentorship Slot
          </button>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {NAV.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.label}
              {item.path === '/messages' && unreadMessages > 0 && (
                <span className="nav-badge">{unreadMessages}</span>
              )}
              {item.path === '/notifications' && unreadCount > 0 && (
                <span className="nav-badge">{unreadCount}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <button className="sidebar-signout" onClick={onLogout}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main-content">
        <Routes>
          <Route path="/" element={<AlumniDashboard navigate={navigate} />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/provide-slots" element={<ProvideSlotsFlow navigate={navigate} />} />
          <Route path="/bookings" element={<AlumniBookings />} />
          <Route path="/referrals" element={<AlumniReferrals />} />
          <Route path="/jobs" element={<AlumniJobs />} />
          <Route path="/resources" element={<AlumniResources user={user} />} />
          <Route path="/messages" element={<AlumniMessages />} />
          <Route path="/notifications" element={
            <NotificationsPage
              role="alumni"
              accentColor="#d4af37"
              navigate={navigate}
            />
          } />
          <Route path="/profile" element={<AlumniProfile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>


      </div>
    </div>
  )
}
