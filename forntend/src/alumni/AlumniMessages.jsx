import React, { useState, useEffect, useRef } from 'react'
import { messageAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import NotificationBell from '../shared/NotificationBell'
import UserAvatar from '../shared/avatar'

export default function AlumniMessages() {
  const { user } = useAuth()
  const [threads, setThreads] = useState([])
  const [activeThread, setActiveThread] = useState(null)
  const [filterTab, setFilterTab] = useState('all') // 'all' | 'requests' | 'accepted'
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const bottomRef = useRef(null)

  const showToastMsg = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  // Load threads on mount
  useEffect(() => {
    fetchThreads()
  }, [])

  const fetchThreads = async () => {
    try {
      setLoading(true)
      const data = await messageAPI.getThreads()
      const list = (data.threads || []).map(t => ({
        id: t.partnerId,
        partnerId: t.partnerId,
        name: (t.partnerName || 'Student').split(' ')[0],
        fullName: t.partnerName || 'Student',
        preview: t.lastMessage || 'No messages yet',
        time: t.lastTime ? new Date(t.lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        avatar: (t.partnerName || 'ST').slice(0, 2).toUpperCase(),
        partnerAvatar: t.partnerAvatar || '',
        unread: t.unread || 0,
        online: true,
        color: '#16428c',
        status: 'accepted',
        university: t.partnerRole || 'Student',
      }))
      setThreads(list)
      if (list.length > 0 && !activeThread) {
        setActiveThread(list[0].id)
      }
    } catch (err) {
      console.error("Failed to load threads:", err)
    } finally {
      setLoading(false)
    }
  }

  // Load conversation when active thread changes
  useEffect(() => {
    if (!activeThread) {
      setMessages([])
      return
    }
    messageAPI.getConversation(activeThread)
      .then(d => setMessages(d.messages || []))
      .catch(err => console.error("Failed to load conversation:", err))
  }, [activeThread])

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const thread = threads.find(t => t.id === activeThread) || threads[0]
  const myId = user?._id || user?.id

  const pendingCount = threads.filter(t => t.status === 'pending').length
  const acceptedCount = threads.filter(t => t.status === 'accepted').length

  const filteredThreads = threads.filter(t => {
    if (filterTab === 'requests') return t.status === 'pending'
    if (filterTab === 'accepted') return t.status === 'accepted'
    return t.status !== 'rejected'
  })

  const handleAccept = (id) => {
    setThreads(prev => prev.map(t => t.id === id ? { ...t, status: 'accepted', unread: 0 } : t))
    showToastMsg(`Accepted message request from ${threads.find(t => t.id === id)?.fullName}. You can now chat!`)
  }

  const handleReject = (id) => {
    const targetName = threads.find(t => t.id === id)?.fullName
    setThreads(prev => prev.map(t => t.id === id ? { ...t, status: 'rejected' } : t))
    showToastMsg(`Declined message request from ${targetName}.`)
  }

  const handleUndo = (id) => {
    setThreads(prev => prev.map(t => t.id === id ? { ...t, status: 'pending' } : t))
  }

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

  const sendMessage = async () => {
    if (!input.trim() || !activeThread) return
    const text = input.trim()
    setInput('')
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
            String(t.id) === String(activeThread)
              ? { ...t, preview: text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
              : t
          )
        )
      }
    } catch (err) {
      console.error("Failed to send message:", err)
      showToastMsg("Failed to send message.")
    }
  }

  return (
    <div className="messages-layout-container">
      <div className="topbar">
        <span className="topbar-title">Messages & Requests</span>
        <div className="topbar-spacer" />
        <NotificationBell />
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 9999,
          background: '#111827',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: 10,
          boxShadow: '0 10px 25px rgba(0,0,0,.2)',
          fontSize: 13,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span>{toast}</span>
        </div>
      )}

      <div className="messages-page-wrapper">
        <div className={`messages-shell${activeThread ? ' has-active-thread' : ''}`}>
          {/* Sidebar */}
          <div className="messages-sidebar">
            <div className="messages-sidebar-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: 15 }}>Inquiries</span>
                {threads.length > 0 && (
                  <span style={{ background: '#d4af37', color: '#1a1a1a', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>
                    {threads.length} Total
                  </span>
                )}
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 6, background: '#f3f4f6', padding: 3, borderRadius: 8, width: '100%' }}>
                <button
                  onClick={() => setFilterTab('all')}
                  style={{
                    flex: 1, padding: '5px 8px', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    background: filterTab === 'all' ? '#fff' : 'transparent',
                    color: filterTab === 'all' ? '#111827' : '#6b7280',
                    boxShadow: filterTab === 'all' ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
                  }}
                >
                  All ({threads.length})
                </button>
                <button
                  onClick={() => setFilterTab('accepted')}
                  style={{
                    flex: 1, padding: '5px 8px', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    background: filterTab === 'accepted' ? '#fff' : 'transparent',
                    color: filterTab === 'accepted' ? '#111827' : '#6b7280',
                    boxShadow: filterTab === 'accepted' ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
                  }}
                >
                  Active ({acceptedCount})
                </button>
                {pendingCount > 0 && (
                  <button
                    onClick={() => setFilterTab('requests')}
                    style={{
                      flex: 1, padding: '5px 8px', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      background: filterTab === 'requests' ? '#fff' : 'transparent',
                      color: filterTab === 'requests' ? '#111827' : '#6b7280',
                      boxShadow: filterTab === 'requests' ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
                    }}
                  >
                    Requests ({pendingCount})
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="messages-sidebar-list">
              {loading ? (
                <div style={{ padding: 30, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                  Loading conversations...
                </div>
              ) : filteredThreads.length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                  No message threads found.
                </div>
              ) : (
                filteredThreads.map(t => (
                  <div
                    key={t.id}
                    className={`thread-item${activeThread === t.id ? ' active' : ''}`}
                    onClick={() => setActiveThread(t.id)}
                  >
                    <UserAvatar
                      avatar={t.partnerAvatar}
                      name={t.fullName || t.name}
                      size={38}
                      className="thread-avatar"
                      bg={t.color || '#16428c'}
                      color="#fff"
                    />
                    <div className="thread-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="thread-name">{t.name}</span>
                        {t.status === 'pending' && (
                          <span style={{ fontSize: 9, fontWeight: 800, background: '#fef3c7', color: '#92400e', padding: '1px 5px', borderRadius: 4 }}>
                            REQ
                          </span>
                        )}
                      </div>
                      <div className="thread-preview">{t.preview}</div>
                    </div>
                    <div className="thread-meta">
                      <span className="thread-time">{t.time}</span>
                      {t.unread > 0 && <span className="nav-badge" style={{ background: '#d4af37', color: '#1a1a1a' }}>{t.unread}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className="chat-area">
            {activeThread && thread ? (
              <>
                {/* Header */}
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
                    name={thread.fullName || thread.name}
                    size={40}
                    className="thread-avatar"
                    bg={thread.color || '#16428c'}
                    color="#fff"
                  />
                  <div className="chat-header-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="chat-header-name">{thread.fullName}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                        background: '#ecfdf5', color: '#047857'
                      }}>
                        Active
                      </span>
                    </div>
                    <div className="chat-header-status">{thread.university}</div>
                  </div>
                </div>

                {/* Messages Body */}
                <div className="chat-messages" style={{ overflowY: 'auto', padding: '16px', flex: 1 }}>
                  {messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 13 }}>
                      No messages yet in this conversation.
                    </div>
                  ) : (
                    messages.map(msg => {
                      const senderId = msg.senderId || msg.sender?._id || msg.sender?.id || msg.sender
                      const isMe = String(senderId) === String(myId)
                      const timeStr = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
                      return (
                        <div key={msg._id || Math.random()} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
                          <div
                            className="msg-bubble"
                            style={{
                              background: isMe ? '#d4af37' : '#f3f4f6',
                              color: isMe ? '#1a1a1a' : '#1f2937',
                              alignSelf: isMe ? 'flex-end' : 'flex-start',
                              borderBottomRightRadius: isMe ? 4 : 16,
                              borderBottomLeftRadius: isMe ? 16 : 4,
                              boxShadow: '0 1px 4px rgba(0,0,0,.06)',
                            }}
                          >
                            {msg.text}
                          </div>
                          <div className="msg-time" style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{timeStr}</div>
                        </div>
                      )
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Input Area */}
                <div className="chat-input-area">
                  <input
                    className="chat-input"
                    placeholder="Type a message..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  />
                  <button className="btn btn-gold btn-sm" onClick={sendMessage}>Send</button>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 32 }}>💬</div>
                <div>Select a conversation from the left to view messages</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
