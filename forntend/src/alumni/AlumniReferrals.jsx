import React, { useState, useEffect } from 'react'
import { referralAPI } from '../services/api'
import NotificationBell from '../shared/NotificationBell'
import UserAvatar, { getInitials } from '../shared/avatar'

const STATUS_CLASS = {
  'referred': 'status-referred',
  'declined': 'status-review',
  'submitted': 'status-pending',
  'under_review': 'status-review',
  'Referred': 'status-referred',
  'Declined': 'status-review',
}

export default function AlumniReferrals() {
  const [referrals, setReferrals] = useState([])
  const [loading, setLoading] = useState(true)
  const [statuses, setStatuses] = useState({})

  useEffect(() => {
    referralAPI.getAll()
      .then(d => setReferrals(d.referrals || []))
      .catch((err) => console.error("Could not load referrals:", err))
      .finally(() => setLoading(false))
  }, [])

  const handleEndorse = async (id) => {
    setStatuses(prev => ({ ...prev, [id]: 'Referred' }))
    try {
      await referralAPI.updateStatus(id, 'referred')
    } catch { }
  }

  const handleDecline = async (id) => {
    setStatuses(prev => ({ ...prev, [id]: 'Declined' }))
    try {
      await referralAPI.updateStatus(id, 'declined')
    } catch { }
  }

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Referral Requests</span>
        <div className="topbar-spacer" />
        <NotificationBell />
      </div>
      <div className="page-body animate-in">
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Referral Requests</h1>
          <p style={{ fontSize: 14, color: '#6b7280' }}>
            Review student referral requests, inspect attached resumes or portfolios, and endorse candidates.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            Loading referral requests...
          </div>
        ) : referrals.length === 0 ? (
          <div className="card">
            <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
              No referral requests received yet.
            </div>
          </div>
        ) : (
          referrals.map(r => {
            const rid = r.id || r._id
            const currentStatus = statuses[rid] || r.status || 'submitted'
            const studentName = r.student?.name || 'Student Candidate'
            const role = r.jobTitle || r.role || 'Requested Position'
            const company = r.company || 'Company'
            const studentMajor = r.student?.major || 'Computer Science'
            const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'

            // Parse attachments
            let fileList = []
            if (Array.isArray(r.attachments) && r.attachments.length > 0) {
              fileList = r.attachments
            } else if (r.attachmentUrl || r.resumeUrl) {
              fileList = [{
                url: r.attachmentUrl || r.resumeUrl,
                name: r.attachmentName || (r.attachmentUrl ? r.attachmentUrl.split('/').pop() : 'Candidate_Resume.pdf'),
                size: r.attachmentSize || 'Attached File'
              }]
            }

            return (
              <div key={rid} className="card" style={{ marginBottom: 20 }}>
                <div className="card-body" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    <UserAvatar
                      avatar={r.student?.avatar}
                      name={studentName}
                      size={54}
                      bg="#1e3a8a"
                      color="#fff"
                      fallback="ST"
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 16 }}>{studentName}</div>
                          <div style={{ fontSize: 14, color: '#6b7280' }}>
                            Requesting referral for: <strong style={{ color: '#d4af37' }}>{role}</strong> at <strong>{company}</strong>
                          </div>
                          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: '#9ca3af' }}>
                            <span>{studentMajor}</span>
                            <span>Submitted {dateStr}</span>
                          </div>
                        </div>
                        <span className={`status-badge ${STATUS_CLASS[currentStatus] || 'status-pending'}`}>
                          {currentStatus.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>

                      {/* Candidate Note */}
                      <div style={{ margin: '16px 0', padding: '14px 16px', background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                          Candidate Note
                        </div>
                        <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, margin: 0 }}>
                          {r.note || 'No custom note provided by candidate.'}
                        </p>
                      </div>

                      {/* Attached Documents Section */}
                      {fileList.length > 0 && (
                        <div style={{
                          marginBottom: 16,
                          padding: '14px 16px',
                          background: '#f8fafc',
                          borderRadius: 10,
                          border: '1px solid #e2e8f0',
                        }}>
                          <div style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#334155',
                            marginBottom: 10,
                            textTransform: 'uppercase',
                            letterSpacing: '.5px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}>
                            <span>📎 Candidate Attachments ({fileList.length})</span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {fileList.map((file, fIdx) => {
                              if (!file.url) return null
                              const fullFileUrl = referralAPI.getFileUrl(file.url)
                              const fileName = file.name || 'Attachment'
                              const fileExt = fileName.split('.').pop().toUpperCase()

                              return (
                                <div
                                  key={fIdx}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 16,
                                    padding: '10px 14px',
                                    background: '#ffffff',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: 8,
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                    <div style={{
                                      padding: '4px 8px',
                                      borderRadius: 6,
                                      background: fileExt === 'PDF' ? '#ef4444' : '#16428c',
                                      color: '#ffffff',
                                      fontWeight: 800,
                                      fontSize: 11,
                                      letterSpacing: '.5px',
                                      flexShrink: 0
                                    }}>
                                      {fileExt || 'DOC'}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                      <div style={{
                                        fontSize: 13,
                                        fontWeight: 700,
                                        color: '#0f172a',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                      }}>
                                        {fileName}
                                      </div>
                                      <div style={{ fontSize: 11, color: '#64748b' }}>
                                        {file.size || 'Attachment file'}
                                      </div>
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                    <a
                                      href={fullFileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn btn-secondary btn-sm"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        textDecoration: 'none',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        padding: '6px 14px',
                                        borderColor: '#cbd5e1'
                                      }}
                                    >
                                      View
                                    </a>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      {currentStatus === 'submitted' || currentStatus === 'under_review' ? (
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button className="btn btn-gold" onClick={() => handleEndorse(rid)}>
                            Endorse & Refer
                          </button>
                          <button className="btn btn-ghost" style={{ color: '#dc2626', borderColor: '#dc2626' }} onClick={() => handleDecline(rid)}>
                            Decline
                          </button>
                        </div>
                      ) : currentStatus === 'Referred' || currentStatus === 'referred' ? (
                        <div style={{ padding: '12px 16px', background: '#ecfdf5', borderRadius: 10, border: '1px solid #a7f3d0', color: '#059669', fontSize: 13, fontWeight: 600 }}>
                          ✓ You have endorsed and referred {studentName} for this position.
                        </div>
                      ) : (
                        <div style={{ padding: '10px 14px', background: '#fef2f2', borderRadius: 8, color: '#b91c1c', fontSize: 12 }}>
                          This referral request was declined.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </>
  )
}
