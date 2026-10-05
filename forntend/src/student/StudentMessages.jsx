import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { messageAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import NotificationBell from '../shared/NotificationBell'
import UserAvatar from '../shared/avatar'

export default function StudentMessages() {
  const { user } = useAuth()
  const location = useLocation()
  const initialPartnerId = location.state?.partnerId ? String(location.state.partnerId) : null
  const initialPartner = location.state?.partner || null

  const [threads,      setThreads]      = useState([])
  const [activeThread, setActiveThread] = useState(initialPartnerId)
  const [messages,     setMessages]     = useState([])
  const [input,        setInput]        = useState('')
  const [loading,      setLoading]      = useState(true)
  const bottomRef = useRef(null)

  // Load threads on mount
  useEffect(() => {
    messageAPI.getThreads()
      .then(d => {
        let list = d.threads || []
        if (initialPartnerId) {
          const exists = list.some(t => String(t.partnerId) === initialPartnerId)
          if (!exists) {
            const partnerName = initialPartner?.name || 'Alumni Mentor'
            const newThread = {
              partnerId: initialPartnerId,
              partnerName,
              partnerAvatar: initialPartner?.avatar || '',
              partnerRole: initialPartner?.jobTitle ? `${initialPartner.jobTitle} at ${initialPartner.company}` : (initialPartner?.company || 'Alumni Mentor'),
              lastMessage: 'Start a conversation...',
              lastTime: new Date().toISOString(),
              unread: 0,
            }
            list = [newThread, ...list]
          }
          setActiveThread(initialPartnerId)
        } else if (list.length > 0 && !activeThread) {
          setActiveThread(String(list[0].partnerId))
        }
        setThreads(list)
      })
      .catch((err) => console.error("Error loading threads:", err))
      .finally(() => setLoading(false))
  }, [initialPartnerId])

  // Load messages when active thread changes
  useEffect(() => {
    if (!activeThread) {
      setMessages([])
      return
    }
    messageAPI.getConversation(activeThread)
      .then(d => setMessages(d.messages || []))
      .catch((err) => console.error("Error loading messages:", err))
  }, [activeThread])

  // Periodic poll for new messages
  useEffect(() => {
    if (!activeThread) return
    const interval = setInterval(() => {
      messageAPI.getConversation(activeThread)
        .then(d => {
          if (Array.isArray(d.messages)) {
            setMessages(d.messages)
          }
        })
        .catch(() => {})
    }, 4000)
    return () => clearInterval(interval)
  }, [activeThread])

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || !activeThread) return
    const text = input.trim()
    setInput('')
    const myId = user?._id || user?.id
    // Optimistic UI
    const optimisticMsg = {
      _id: 'temp-' + Date.now(),
      senderId: myId,
      sender: { id: myId, name: user?.name },
      text,
      createdAt: new Date().toISOString()
    }
    setMessages(prev => [...prev, optimisticMsg])
    try {
      const res = await messageAPI.send(activeThread, text)
      if (res.message) {
        setMessages(prev => prev.map(m => m._id === optimisticMsg._id ? res.message : m))
        setThreads(prev =>
          prev.map(t =>
            String(t.partnerId) === String(activeThread)
              ? { ...t, lastMessage: text, lastTime: new Date().toISOString() }
              : t
          )
        )
      }
    } catch (err) {
      console.error("Failed to send message:", err)
    }
  }

  const thread = threads.find(t => t.partnerId === activeThread)
  const myId = user?._id || user?.id

  return (
    <div className="messages-layout-container">
      <div className="topbar">
        <span className="topbar-title">Messages</span>
        <div className="topbar-spacer" />
        <NotificationBell />
      </div>
      <div className="messages-page-wrapper">
        <div className={`messages-shell${activeThread ? ' has-active-thread' : ''}`}>
          {/* Thread list */}
          <div className="messages-sidebar">
            <div className="messages-sidebar-header">
              Conversations
              {threads.length > 0 && <span className="nav-badge" style={{ fontSize: 11 }}>{threads.length}</span>}
            </div>

            <div className="messages-sidebar-list">
              {loading ? (
                <div style={{ padding: '24px 16px', color: '#6b7280', fontSize: 13, textAlign: 'center' }}>
                  Loading conversations...
                </div>
              ) : threads.length === 0 ? (
                <div style={{ padding: '32px 16px', color: '#6b7280', fontSize: 13, textAlign: 'center' }}>
                  No active conversations yet.<br />Connect with alumni via the <strong>Find Alumni</strong> tab!
                </div>
              ) : (
                threads.map(t => {
                  const partnerName = t.partnerName || 'Alumni'
                  const initials = partnerName.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s+/i, '').slice(0, 2).toUpperCase()
                  const isActive = activeThread === t.partnerId
                  const timeStr = t.lastTime ? new Date(t.lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''

                  return (
                    <div
                      key={t.partnerId}
                      className={`thread-item${isActive ? ' active' : ''}`}
                      onClick={() => setActiveThread(t.partnerId)}
                    >
                      <UserAvatar
                        avatar={t.partnerAvatar}
                        name={partnerName}
                        size={38}
                        className="thread-avatar"
                        bg="#16428c"
                        color="#fff"
                      />
                      <div className="thread-info">
                        <div className="thread-name">{partnerName}</div>
                        <div className="thread-preview">{t.lastMessage || 'No messages yet'}</div>
                      </div>
                      <div className="thread-meta">
                        <span className="thread-time">{timeStr}</span>
                        {t.unread > 0 && <span className="nav-badge">{t.unread}</span>}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className="chat-area">
            {activeThread && thread ? (
              <>
                <div className="chat-header">
                  <button
                    type="button"
                    className="mobile-back-btn"
                    onClick={() => setActiveThread(null)}
                    aria-label="Back to conversations"
                  >
                    ←
                  </button>
                  <UserAvatar
                    avatar={thread.partnerAvatar}
                    name={thread.partnerName}
                    size={40}
                    className="thread-avatar"
                    bg="#16428c"
                    color="#fff"
                  />
                  <div className="chat-header-info">
                    <div className="chat-header-name">{thread.partnerName}</div>
                    <div className="chat-header-status" style={{ fontSize: 12, color: '#6b7280' }}>{thread.partnerRole || 'Alumni'}</div>
                  </div>
                </div>

                <div className="chat-messages" style={{ overflowY: 'auto', padding: '16px', flex: 1 }}>
                  {messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 13 }}>
                      Say hello to start the conversation!
                    </div>
                  ) : (
                    messages.map(msg => {
                      const senderId = msg.senderId || msg.sender?._id || msg.sender?.id || msg.sender
                      const isMe = String(senderId) === String(myId)
                      const timeStr = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
                      return (
                        <div key={msg._id || Math.random()} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
                          <div className={`msg-bubble ${isMe ? 'sent' : 'received'}`}>{msg.text}</div>
                          <div className="msg-time" style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{timeStr}</div>
                        </div>
                      )
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                <div className="chat-input-area">
                  <input
                    className="chat-input"
                    placeholder="Type a message..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  />
                  <button className="btn btn-primary btn-sm" onClick={sendMessage}>Send</button>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 32 }}>💬</div>
                <div>Select a conversation or reach out to alumni from Find Alumni</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
