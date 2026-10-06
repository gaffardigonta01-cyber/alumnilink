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

  const [threads,            setThreads]            = useState([])
  const [activeThread,       setActiveThread]       = useState(initialPartnerId)
  const [messages,           setMessages]           = useState([])
  const [conversationStatus, setConversationStatus] = useState(null)
  const [activePartnerData,  setActivePartnerData]  = useState(initialPartner)
  const [input,              setInput]              = useState('')
  const [loading,            setLoading]            = useState(true)
  const [toast,              setToast]              = useState(null)
  const bottomRef = useRef(null)

  const showToastMsg = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  // Load threads on mount
  useEffect(() => {
    messageAPI.getThreads()
      .then(d => {
        let list = (d.threads || []).map(t => ({
          partnerId: String(t.partnerId),
          partnerName: t.partnerName || 'Alumni Mentor',
          partnerAvatar: t.partnerAvatar || '',
          partnerRole: t.partnerRole || 'Alumni',
          lastMessage: t.lastMessage || 'No messages yet',
          lastTime: t.lastTime,
          unread: t.unread || 0,
          status: t.status || 'accepted', // 'pending' | 'accepted' | 'declined'
        }))

        if (initialPartnerId) {
          const exists = list.some(t => String(t.partnerId) === initialPartnerId)
          if (!exists) {
            const partnerName = initialPartner?.name || 'Alumni Mentor'
            const newThread = {
              partnerId: initialPartnerId,
              partnerName,
              partnerAvatar: initialPartner?.avatar || '',
              partnerRole: initialPartner?.jobTitle ? `${initialPartner.jobTitle} at ${initialPartner.company}` : (initialPartner?.company || 'Alumni Mentor'),
              lastMessage: 'Initiate a message request...',
              lastTime: new Date().toISOString(),
              unread: 0,
              status: 'new', // new thread ready for message request
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

  // Load messages & status when active thread changes
  useEffect(() => {
    if (!activeThread) {
      setMessages([])
      setConversationStatus(null)
      return
    }

    messageAPI.getConversation(activeThread)
      .then(d => {
        setMessages(d.messages || [])
        setConversationStatus(d.requestStatus)
        if (d.partner) setActivePartnerData(d.partner)
        setThreads(prev => prev.map(t =>
          String(t.partnerId) === String(activeThread)
            ? { ...t, status: d.requestStatus || t.status }
            : t
        ))
      })
      .catch((err) => console.error("Error loading messages:", err))
  }, [activeThread])

  // Periodic poll for new messages & request status updates
  useEffect(() => {
    if (!activeThread) return
    const interval = setInterval(() => {
      messageAPI.getConversation(activeThread)
        .then(d => {
          if (Array.isArray(d.messages)) {
            setMessages(d.messages)
          }
          if (d.requestStatus) {
            setConversationStatus(d.requestStatus)
            setThreads(prev => prev.map(t =>
              String(t.partnerId) === String(activeThread)
                ? { ...t, status: d.requestStatus }
                : t
            ))
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
        const newStatus = res.requestStatus || 'accepted'
        setConversationStatus(newStatus)
        setThreads(prev =>
          prev.map(t =>
            String(t.partnerId) === String(activeThread)
              ? { ...t, status: newStatus, lastMessage: text, lastTime: new Date().toISOString() }
              : t
          )
        )
        if (res.requestStatus === 'pending') {
          showToastMsg("Message request sent! Routed to alumni's Message Requests queue.")
        }
      }
    } catch (err) {
      console.error("Failed to send message:", err)
      const errorMsg = err?.message || 'Failed to send message.'
      showToastMsg(errorMsg)
      // Remove optimistic message if rejected
      setMessages(prev => prev.filter(m => m._id !== optimisticMsg._id))
    }
  }

  const thread = threads.find(t => String(t.partnerId) === String(activeThread))
  const myId = user?._id || user?.id
  const currentStatus = conversationStatus || thread?.status || 'accepted'

  return (
    <div className="messages-layout-container">
      <div className="topbar">
        <span className="topbar-title">Messages</span>
        <div className="topbar-spacer" />
        <NotificationBell />
      </div>

      {/* Toast Notification */}
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
                  const isActive = String(activeThread) === String(t.partnerId)
                  const timeStr = t.lastTime ? new Date(t.lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''

                  return (
                    <div
                      key={t.partnerId}
                      className={`thread-item${isActive ? ' active' : ''}`}
                      onClick={() => setActiveThread(t.partnerId)}
                      style={{
                        borderLeft: t.status === 'pending' ? '3px solid #d97706' : '3px solid transparent',
                      }}
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="thread-name">{partnerName}</span>
                          {t.status === 'pending' && (
                            <span style={{
                              fontSize: 9,
                              fontWeight: 800,
                              background: '#fef3c7',
                              color: '#92400e',
                              padding: '1px 6px',
                              borderRadius: 4,
                              border: '1px solid #fde68a'
                            }}>
                              PENDING
                            </span>
                          )}
                          {t.status === 'declined' && (
                            <span style={{
                              fontSize: 9,
                              fontWeight: 800,
                              background: '#fee2e2',
                              color: '#991b1b',
                              padding: '1px 5px',
                              borderRadius: 4
                            }}>
                              DECLINED
                            </span>
                          )}
                        </div>
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
                    avatar={activePartnerData?.avatar || thread.partnerAvatar}
                    name={activePartnerData?.name || thread.partnerName}
                    size={40}
                    className="thread-avatar"
                    bg="#16428c"
                    color="#fff"
                  />
                  <div className="chat-header-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="chat-header-name">{activePartnerData?.name || thread.partnerName}</span>
                      {currentStatus === 'pending' ? (
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                          background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a'
                        }}>
                          Pending Acceptance
                        </span>
                      ) : currentStatus === 'declined' ? (
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                          background: '#fee2e2', color: '#991b1b'
                        }}>
                          Request Declined
                        </span>
                      ) : currentStatus === 'new' ? (
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                          background: '#eff6ff', color: '#1e40af'
                        }}>
                          New Request
                        </span>
                      ) : (
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                          background: '#ecfdf5', color: '#047857'
                        }}>
                          Direct Channel Active
                        </span>
                      )}
                    </div>
                    <div className="chat-header-status" style={{ fontSize: 12, color: '#6b7280' }}>
                      {activePartnerData?.jobTitle ? `${activePartnerData.jobTitle} at ${activePartnerData.company}` : (thread.partnerRole || 'Alumni Mentor')}
                    </div>
                  </div>
                </div>

                {/* Status Notice Banners */}
                {currentStatus === 'pending' && (
                  <div style={{
                    background: '#fffbeb',
                    borderBottom: '1px solid #fde68a',
                    padding: '12px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    color: '#92400e',
                    fontSize: 13,
                  }}>
                    <div>
                      <strong>Message Request Sent:</strong> Your initial message has been routed to {activePartnerData?.name || thread.partnerName}'s Message Requests queue. Once they accept, a direct conversation channel will be established and you will be notified.
                    </div>
                  </div>
                )}

                {currentStatus === 'declined' && (
                  <div style={{
                    background: '#fef2f2',
                    borderBottom: '1px solid #fecaca',
                    padding: '12px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    color: '#991b1b',
                    fontSize: 13,
                  }}>
                    <div>
                      <strong>Message Request Declined:</strong> The alumni declined this message request. A direct conversation channel could not be established.
                    </div>
                  </div>
                )}

                {/* Messages Feed */}
                <div className="chat-messages" style={{ overflowY: 'auto', padding: '16px', flex: 1 }}>
                  {messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 13 }}>
                      Send an introductory message to start this request!
                    </div>
                  ) : (
                    messages.map(msg => {
                      const senderId = msg.senderId || msg.sender?._id || msg.sender?.id || msg.sender
                      const isMe = String(senderId) === String(myId)
                      const timeStr = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
                      return (
                        <div key={msg._id || msg.id || Math.random()} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
                          <div className={`msg-bubble ${isMe ? 'sent' : 'received'}`}>{msg.text}</div>
                          <div className="msg-time" style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{timeStr}</div>
                        </div>
                      )
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Input Area */}
                {currentStatus === 'pending' ? (
                  <div style={{
                    padding: '14px 20px',
                    background: '#f9fafb',
                    borderTop: '1px solid #e5e7eb',
                    textAlign: 'center',
                    color: '#6b7280',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}>
                    <span>Waiting for <strong>{activePartnerData?.name || thread.partnerName}</strong> to accept your message request before direct chat unlocks.</span>
                  </div>
                ) : currentStatus === 'declined' ? (
                  <div style={{
                    padding: '14px 20px',
                    background: '#f9fafb',
                    borderTop: '1px solid #e5e7eb',
                    textAlign: 'center',
                    color: '#9ca3af',
                    fontSize: 13,
                  }}>
                    This message request was declined. You cannot send further messages.
                  </div>
                ) : (
                  <div className="chat-input-area">
                    <input
                      className="chat-input"
                      placeholder={currentStatus === 'new' ? "Type your introductory message request..." : "Type a message..."}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    />
                    <button className="btn btn-primary btn-sm" onClick={sendMessage}>
                      {currentStatus === 'new' ? 'Send Request' : 'Send'}
                    </button>
                  </div>
                )}
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
