import React, { createContext, useContext, useState, useEffect } from 'react'
import { notificationAPI, messageAPI } from '../services/api'
import { useLocation } from 'react-router-dom'

const NotificationContext = createContext(null)

export function NotificationProvider({ children, role = 'student' }) {
  const [notifs, setNotifs] = useState([])
  const [unreadMessages, setUnreadMessages] = useState(0)
  const location = useLocation()

  const fetchUnreadMessages = () => {
    messageAPI.getThreads()
      .then(d => {
        const threads = d.threads || []
        const total = threads.reduce((acc, t) => acc + (t.unread || 0), 0)
        setUnreadMessages(total)
      })
      .catch(() => setUnreadMessages(0))
  }

  const fetchNotifications = () => {
    notificationAPI.getAll()
      .then(d => {
        setNotifs(d.notifications || [])
      })
      .catch(() => {})
  }

  useEffect(() => {
    fetchUnreadMessages()
    fetchNotifications()
    const interval = setInterval(() => {
      fetchUnreadMessages()
      fetchNotifications()
    }, 4000)
    return () => clearInterval(interval)
  }, [location.pathname])

  const unreadCount = notifs.filter(n => !n.read).length

  const markAllRead = () => {
    notificationAPI.markAllRead().catch(() => {})
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  }

  const markRead = (id) => {
    notificationAPI.markRead(id).catch(() => {})
    setNotifs(prev => prev.map(n => (n.id === id || n._id === id) ? { ...n, read: true } : n))
  }

  return (
    <NotificationContext.Provider value={{
      notifs,
      unreadCount,
      unreadMessages,
      totalUnread: unreadCount + unreadMessages,
      markAllRead,
      markRead,
      refresh: () => { fetchUnreadMessages(); fetchNotifications() },
      role
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationContext) || {
    notifs: [],
    unreadCount: 0,
    unreadMessages: 0,
    totalUnread: 0,
    markAllRead: () => {},
    markRead: () => {},
    refresh: () => {},
    role: 'student'
  }
}
