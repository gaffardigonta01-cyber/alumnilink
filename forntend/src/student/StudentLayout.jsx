import React, { useState, useEffect, useRef } from 'react'
import { Routes, Route, NavLink, useNavigate, useLocation, Navigate } from 'react-router-dom'
import StudentDashboard from './StudentDashboard'
import FindAlumni from './FindAlumni'
import BookSession from './BookSession'
import StudentReferrals from './StudentReferrals'
import StudentMessages from './StudentMessages'
import JobsPage from './JobsPage'
import ResourcesPage from './ResourcesPage'
import AlumniProfileView from './AlumniProfileView'
import StudentProfile from './StudentProfile'
import NotificationsPage from '../shared/NotificationsPage'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import UserAvatar from '../shared/avatar'

const NAV = [
  { path: '/', label: 'Dashboard', exact: true },
  { path: '/find-alumni', label: 'Find Alumni' },
  { path: '/book-session', label: 'Book Session' },
  { path: '/referrals', label: 'Referrals' },
  { path: '/messages', label: 'Messages' },
  { path: '/jobs', label: 'Jobs' },
  { path: '/resources', label: 'Resources' },
  { path: '/notifications', label: 'Notifications' },
  { path: '/alumni-profile', label: 'Alumni Profile' },
  { path: '/my-profile', label: 'My Profile' },
]

export default function StudentLayout({ user: propUser, onLogout }) {
  const { user: authUser } = useAuth()
  const user = authUser || propUser
  const navigate = useNavigate()
  const location = useLocation()
  const { unreadCount, unreadMessages } = useNotifications()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  const userName = user?.name || 'Student'
  const userInitials = userName.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s+/i, '').trim().split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'ST'

  return (
    <div className="portal-shell">
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
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`} style={{ background: '#111827' }}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon" style={{ background: '#16428c' }}>A</div>
          <div className="sidebar-logo-text">
            <div className="sidebar-logo-name">AlumniLink</div>
            <div className="sidebar-logo-sub" style={{ color: '#eab308' }}>Student Portal</div>
          </div>
        </div>

        {/* User */}
        <div className="sidebar-user">
          <UserAvatar
            avatar={user?.avatar}
            name={userName}
            size={38}
            className="sidebar-avatar"
            bg="#16428c"
            color="#fff"
          />
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{userName}</div>
            <div className="sidebar-role-badge" style={{ background: 'rgba(234,179,8,.15)', color: '#eab308' }}>
              Student
            </div>
          </div>
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
          <Route path="/" element={<StudentDashboard user={user} navigate={navigate} />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/find-alumni" element={<FindAlumni navigate={navigate} />} />
          <Route path="/book-session" element={<BookSession navigate={navigate} />} />
          <Route path="/referrals" element={<StudentReferrals />} />
          <Route path="/messages" element={<StudentMessages />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/notifications" element={
            <NotificationsPage
              role="student"
              accentColor="#16428c"
              navigate={navigate}
            />
          } />
          <Route path="/alumni-profile" element={<AlumniProfileView />} />
          <Route path="/alumni-profile/:id" element={<AlumniProfileView />} />
          <Route path="/my-profile" element={<StudentProfile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>


      </div>
    </div>
  )
}
