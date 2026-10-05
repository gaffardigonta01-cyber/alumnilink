import React, { useState, useEffect } from 'react'
import { alumniAPI, referralAPI } from '../services/api'
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

export default function StudentReferrals() {
  const [mentors, setMentors] = useState([])
  const [referrals, setReferrals] = useState([])
  const [selectedAlumni, setSelectedAlumni] = useState('')
  const [showAllMentors, setShowAllMentors] = useState(false)
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    alumniAPI.getAll().then(d => {
      const list = d.alumni || []
      setMentors(list)
      if (list.length > 0) {
        const first = list[0]
        const firstId = first.id || first._id
        setSelectedAlumni(firstId)
        if (first.company) setCompany(first.company)
      }
    }).catch(() => { })

    referralAPI.getAll().then(d => setReferrals(d.referrals || [])).catch(() => { })
  }, [])

  const displayedMentors = showAllMentors ? mentors : mentors.slice(0, 4)

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return
    const file = files[0]
    setUploadError('')
    setUploadingFile(true)
    try {
      const res = await referralAPI.uploadAttachment(file)
      if (res.success) {
        setAttachedFiles(prev => [
          ...prev,
          {
            name: res.fileName,
            size: res.fileSize,
            url: res.fileUrl,
            type: res.fileName.split('.').pop().toUpperCase(),
          }
        ])
      }
    } catch (err) {
      setUploadError(err.message || 'Failed to upload attachment.')
    } finally {
      setUploadingFile(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files)
    }
  }

  const handleSubmit = async () => {
    if (!selectedAlumni || !company || !role) return
    setSubmitting(true)
    try {
      const primaryAttachment = attachedFiles[0] || null
      const data = await referralAPI.create({
        alumniId: Number(selectedAlumni),
        company: company.trim(),
        role: role.trim(),
        note: note.trim(),
        attachmentUrl: primaryAttachment?.url || '',
        attachmentName: primaryAttachment?.name || '',
        attachmentSize: primaryAttachment?.size || '',
        attachments: attachedFiles,
      })
      if (data.referral) {
        setReferrals(prev => [data.referral, ...prev])
      }
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 3500)
      setRole('')
      setNote('')
      setAttachedFiles([])
    } catch (err) {
      console.error("Failed to request referral:", err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Request Referral</span>
        <div className="topbar-spacer" />
        <NotificationBell />
      </div>

      <div className="page-body animate-in">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
          {/* Left: Form */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Request a Referral</span>
            </div>
            <div className="card-body">
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
                Ask a verified alumni to refer you for a role at their company. Attach your resume or portfolio for best results.
              </p>

              {/* Select Alumni */}
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12, letterSpacing: '.5px', textTransform: 'uppercase' }}>
                Select Alumni
              </h3>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' }}>
                Available Mentors
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 12 }}>
                {displayedMentors.map(m => {
                  const mid = m.id || m._id
                  const isSelected = selectedAlumni === mid
                  return (
                    <div
                      key={mid}
                      onClick={() => {
                        setSelectedAlumni(mid)
                        if (m.company) setCompany(m.company)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '12px 14px',
                        border: `1.5px solid ${isSelected ? '#16428c' : '#e5e7eb'}`,
                        borderRadius: 10,
                        cursor: 'pointer',
                        background: isSelected ? '#eff6ff' : '#fff',
                        transition: 'all .2s',
                      }}
                    >
                      <UserAvatar
                        avatar={m.avatar}
                        name={m.name}
                        size={38}
                        bg="#16428c"
                        color="#fff"
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>
                          {m.jobTitle ? `${m.jobTitle} @ ${m.company}` : (m.company || 'Alumni')}
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '1px 6px', borderRadius: 20 }}>VERIFIED</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {mentors.length > 4 && (
                <div style={{ marginBottom: 20 }}>
                  <button
                    type="button"
                    onClick={() => setShowAllMentors(!showAllMentors)}
                    style={{ background: 'none', border: 'none', color: '#16428c', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}
                  >
                    {showAllMentors ? 'Show Fewer' : `+ Show All ${mentors.length} Mentors`}
                  </button>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Target Company</label>
                <input className="form-input" value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Google, Pathao, Uber..." />
              </div>
              <div className="form-group">
                <label className="form-label">Role / Position</label>
                <input className="form-input" value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Associate Software Engineer" />
              </div>
              <div className="form-group">
                <label className="form-label">Personal Note <span style={{ fontWeight: 400, color: '#9ca3af' }}>{note.length} / 500 characters</span></label>
                <textarea
                  className="form-textarea"
                  value={note}
                  onChange={e => setNote(e.target.value.slice(0, 500))}
                  placeholder="Introduce yourself and explain why you're a great fit for this position..."
                  rows={4}
                />
              </div>

              {/* Attachments Section */}
              <div className="form-group">
                <label className="form-label">
                  Attachments <span style={{ fontWeight: 400, color: '#9ca3af' }}>(Resume, Transcripts, Portfolio)</span>
                </label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  style={{
                    border: `2px dashed ${isDragging ? '#16428c' : '#d1d5db'}`,
                    borderRadius: 10,
                    padding: '20px',
                    background: isDragging ? '#eff6ff' : '#f9fafb',
                    textAlign: 'center',
                    marginBottom: 10,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 6 }}>📄</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    {uploadingFile ? (
                      <span style={{ color: '#16428c' }}>Uploading attachment...</span>
                    ) : (
                      <>
                        Drag & drop files here or{' '}
                        <label htmlFor="file-upload" style={{ color: '#16428c', cursor: 'pointer', textDecoration: 'underline' }}>
                          browse
                        </label>
                      </>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>
                    Supported formats: PDF(Max 20MB)
                  </div>
                  <input
                    id="file-upload"
                    type="file"
                    disabled={uploadingFile}
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileUpload(e.target.files)}
                  />
                </div>

                {uploadError && (
                  <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 12, marginBottom: 10 }}>
                    {uploadError}
                  </div>
                )}

                {/* Attached file list */}
                {attachedFiles.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    {attachedFiles.map((file, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: 8,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, background: '#16428c', color: '#fff', padding: '3px 6px', borderRadius: 4 }}>
                            {file.type || 'FILE'}
                          </span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{file.name}</div>
                            <div style={{ fontSize: 11, color: '#6b7280' }}>
                              {file.size} • <span style={{ color: '#059669', fontWeight: 600 }}>Ready to send</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {file.url && (
                            <a
                              href={referralAPI.getFileUrl(file.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: 12, color: '#16428c', fontWeight: 600, textDecoration: 'none' }}
                            >
                              Preview
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                            style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 18, cursor: 'pointer', padding: '2px 6px' }}
                            title="Remove file"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {submitted && (
                <div style={{ padding: '12px 16px', background: '#ecfdf5', borderRadius: 10, border: '1px solid #a7f3d0', marginBottom: 16, color: '#059669', fontWeight: 600, fontSize: 13 }}>
                  ✓ Referral request and attachment sent successfully to alumni!
                </div>
              )}

              <button
                className="btn btn-primary btn-full"
                disabled={submitting || uploadingFile || !company || !role}
                onClick={handleSubmit}
              >
                {submitting ? 'Submitting Request...' : 'Send Referral Request'}
              </button>
            </div>
          </div>

          {/* Right: Stats + Tracking */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Avg. Response Time</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#111827' }}>2-3 Days</div>
                  </div>
                  <div style={{ textAlign: 'center', borderLeft: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Total Mentors</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#16428c' }}>{mentors.length}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><span className="card-title">My Referral Requests</span></div>
              <div className="card-body" style={{ padding: '8px 16px' }}>
                {referrals.length === 0 && (
                  <p style={{ fontSize: 13, color: '#9ca3af', padding: '16px 0', textAlign: 'center' }}>
                    No referrals requested yet.
                  </p>
                )}
                {referrals.map(r => {
                  const alumniName = r.alumni?.name || 'Alumni Mentor'
                  const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Recent'
                  const statusLabel = r.status ? r.status.replace('_', ' ').toUpperCase() : 'SUBMITTED'
                  const fileUrl = r.attachmentUrl || r.resumeUrl
                  const fileName = r.attachmentName || (fileUrl ? fileUrl.split('/').pop() : 'Attachment')

                  return (
                    <div key={r.id || r._id} style={{ padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{r.company}</div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>{r.jobTitle || r.role}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>via {alumniName} • {dateStr}</div>

                          {fileUrl && (
                            <div style={{ marginTop: 8 }}>
                              <a
                                href={referralAPI.getFileUrl(fileUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  fontSize: 11,
                                  color: '#16428c',
                                  fontWeight: 600,
                                  textDecoration: 'none',
                                  background: '#eff6ff',
                                  padding: '3px 8px',
                                  borderRadius: 6,
                                  border: '1px solid #bfdbfe'
                                }}
                              >
                                📎 {fileName}
                              </a>
                            </div>
                          )}
                        </div>
                        <span className={`status-badge ${STATUS_CLASS[r.status] || 'status-pending'}`}>
                          {statusLabel}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
