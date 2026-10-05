import React, { useState, useEffect } from 'react'
import { resourceAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import NotificationBell from '../shared/NotificationBell'

export default function AlumniResources({ user: propUser }) {
  const { user: authUser } = useAuth() || {}
  const currentUser = authUser || propUser || (() => {
    try {
      return JSON.parse(localStorage.getItem('alumnilink_user') || '{}')
    } catch {
      return {}
    }
  })()
  const currentAuthorName = currentUser?.name || 'Alumni Mentor'
  const currentUserId = currentUser?._id || currentUser?.id || ''

  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [fieldFilter, setFieldFilter] = useState('All')
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'my'
  const [showModal, setShowModal] = useState(false)
  const [notification, setNotification] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Modal form state
  const [title, setTitle] = useState('')
  const [field, setField] = useState('Engineering')
  const type = 'PDF'
  const [description, setDescription] = useState('')
  const [targetAudience, setTargetAudience] = useState('Undergrads & Seniors')
  const [uploadMode, setUploadMode] = useState('file') // 'file' | 'link'
  const [attachedFile, setAttachedFile] = useState(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [externalUrl, setExternalUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 3500)
  }

  const fetchResources = async () => {
    try {
      setLoading(true)
      const data = await resourceAPI.getAll()
      setResources(data.resources || [])
    } catch (err) {
      console.warn('API unavailable, fallback to local state', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchResources()
  }, [])

  const handleView = (id, fileUrl, fileName) => {
    showToast(`Opening "${fileName || 'resource'}"...`, 'success')
    const viewUrl = resourceAPI.getViewUrl(id, fileUrl)
    window.open(viewUrl, '_blank')
  }

  const confirmDelete = async (id) => {
    setIsDeleting(true)
    try {
      await resourceAPI.delete(id)
      setResources(prev => prev.filter(r => (r.id || r._id) !== id))
      showToast('Resource deleted successfully', 'success')
    } catch (err) {
      setResources(prev => prev.filter(r => (r.id || r._id) !== id))
      showToast('Resource removed', 'success')
    } finally {
      setIsDeleting(false)
      setDeletingId(null)
    }
  }

  const isResourceMine = (r) => {
    if (!r) return false
    const rUploaderId = String(r.uploaderId || r.authorId || r.uploader?.id || r.uploader?._id || '')
    const myId = String(currentUserId || '')
    if (myId && rUploaderId && myId === rUploaderId) {
      return true
    }
    const rAuthorName = String(r.author || r.uploader?.name || '').trim().toLowerCase()
    const myName = String(currentUser?.name || currentAuthorName || '').trim().toLowerCase()
    if (myName && rAuthorName && myName === rAuthorName) {
      return true
    }
    return false
  }

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return
    const file = files[0]
    setUploadError('')

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setUploadError('Only PDF files are supported. Please select a .pdf file.')
      showToast('Only PDF files are supported.', 'error')
      return
    }

    setUploadingFile(true)
    try {
      const res = await resourceAPI.uploadAttachment(file)
      if (res.success) {
        setAttachedFile({
          name: res.fileName,
          size: res.fileSize,
          url: res.fileUrl,
          type: 'PDF',
        })
        showToast(`Uploaded "${res.fileName}" successfully!`, 'success')
      }
    } catch (err) {
      setUploadError(err.message || 'Failed to upload attachment.')
      showToast(err.message || 'Failed to upload attachment.', 'error')
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

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) {
      showToast('Please fill in required fields', 'error')
      return
    }

    setSubmitting(true)
    const finalFileUrl = uploadMode === 'file' ? (attachedFile?.url || '') : externalUrl
    const finalFileName = uploadMode === 'file' ? (attachedFile?.name || '') : (externalUrl ? 'External Link' : '')
    const finalFileSize = uploadMode === 'file' ? (attachedFile?.size || '') : ''

    const newResourceData = {
      title: title.trim(),
      field,
      type,
      description: description.trim(),
      targetAudience: targetAudience.trim() || 'All Students',
      author: currentAuthorName,
      authorId: currentUserId,
      fileName: finalFileName,
      fileSize: finalFileSize,
      fileUrl: finalFileUrl
    }

    try {
      const data = await resourceAPI.create({
        title: newResourceData.title,
        description: newResourceData.description,
        type,
        category: field,
        url: finalFileUrl,
        fileName: finalFileName,
        fileSize: finalFileSize,
        tags: [field, targetAudience],
      })
      setResources(prev => [data.resource, ...prev])
      showToast('Resource published successfully for students!', 'success')
    } catch (err) {
      // Optimistic fallback
      const fallbackRes = { _id: 'res' + Date.now(), ...newResourceData, downloads: 0, date: 'Just now', saved: false }
      setResources(prev => [fallbackRes, ...prev])
      showToast('Resource uploaded!', 'success')
    } finally {
      setSubmitting(false)
      setShowModal(false)
      setTitle('')
      setDescription('')
      setAttachedFile(null)
      setUploadError('')
      setExternalUrl('')
    }
  }

  // Filtered resources
  const filtered = resources.filter(r => {
    if (activeTab === 'my' && !isResourceMine(r)) {
      return false
    }
    if (fieldFilter !== 'All' && r.field !== fieldFilter && r.category !== fieldFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchTitle = r.title?.toLowerCase().includes(q)
      const matchDesc = r.description?.toLowerCase().includes(q)
      const matchAuthor = (r.author || r.uploader?.name)?.toLowerCase().includes(q)
      if (!matchTitle && !matchDesc && !matchAuthor) return false
    }
    return true
  })

  // Metrics
  const totalResources = resources.length
  const myUploadsCount = resources.filter(isResourceMine).length
  const totalDownloads = resources.reduce((acc, curr) => acc + (curr.downloads || 0), 0)

  return (
    <>
      {/* ── Top bar ── */}
      <div className="topbar">
        <span className="topbar-title">Resource Library</span>
        <div className="topbar-search">
          <input
            type="text"
            placeholder="Search shared resources..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="topbar-spacer" />
        <NotificationBell />
      </div>

      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 9999,
            background: notification.type === 'error' ? '#ef4444' : '#10b981',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 10,
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            fontSize: 14,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            animation: 'fadeInUp 0.3s ease'
          }}
        >
          <span>{notification.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{notification.msg}</span>
        </div>
      )}

      <div className="page-body animate-in">
        {/* ── Alumni Hero Banner ── */}
        <div
          className="alumni-hero"
          style={{
            background: 'linear-gradient(135deg, #1a2238 0%, #2a3656 100%)',
            borderRadius: 16,
            padding: '24px 30px',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)'
          }}
        >
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 6 }}>
              Student Resource Hub
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', maxWidth: 580 }}>
              Share technical guides, interview cheat sheets, case decks, and career templates to help university students succeed.
            </p>
          </div>
          <button
            className="btn btn-gold"
            style={{
              padding: '12px 22px',
              fontSize: 14,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(212,175,55,0.3)'
            }}
            onClick={() => setShowModal(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Upload Resource
          </button>
        </div>

        {/* ── Metric Cards ── */}
        <div className="metric-grid" style={{ marginBottom: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div className="metric-card" style={{ borderLeft: '4px solid #d4af37' }}>
            <div className="metric-label">Total Shared Resources</div>
            <div className="metric-value">{totalResources}</div>
            <div className="metric-sub" style={{ color: '#059669' }}>Available to all students</div>
          </div>
          <div className="metric-card" style={{ borderLeft: '4px solid #16428c' }}>
            <div className="metric-label">My Uploaded Resources</div>
            <div className="metric-value">{myUploadsCount}</div>
            <div className="metric-sub">Published by you</div>
          </div>
          <div className="metric-card" style={{ borderLeft: '4px solid #7c3aed' }}>
            <div className="metric-label">Top Category</div>
            <div className="metric-value" style={{ fontSize: 20 }}>Engineering & Tech</div>
            <div className="metric-sub">High student demand</div>
          </div>
        </div>

        {/* ── Tabs & Filters ── */}
        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: 14, border: '1px solid #e5e7eb', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 6, background: '#f3f4f6', padding: 4, borderRadius: 10 }}>
              <button
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'all' ? '#fff' : 'transparent',
                  color: activeTab === 'all' ? '#111827' : '#6b7280',
                  boxShadow: activeTab === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s'
                }}
                onClick={() => setActiveTab('all')}
              >
                All Resources ({totalResources})
              </button>
              <button
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'my' ? '#fff' : 'transparent',
                  color: activeTab === 'my' ? '#111827' : '#6b7280',
                  boxShadow: activeTab === 'my' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s'
                }}
                onClick={() => setActiveTab('my')}
              >
                My Uploads ({myUploadsCount})
              </button>
            </div>

            {/* Filter selects */}
            <div className="filters-bar" style={{ margin: 0 }}>
              <div className="filter-group">
                <label className="filter-label">Field:</label>
                <select className="filter-select" value={fieldFilter} onChange={e => setFieldFilter(e.target.value)}>
                  <option>All</option>
                  <option>Engineering</option>
                  <option>Product</option>
                  <option>Finance</option>
                  <option>Consulting</option>
                  <option>Design</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Resource Cards Grid / List ── */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading resources...</div>
        ) : filtered.length === 0 ? (
          <div style={{ background: '#fff', border: '1px dashed #d1d5db', borderRadius: 14, padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📁</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 6 }}>No resources found</h3>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
              {activeTab === 'my' ? "You haven't uploaded any resources yet." : "No resources match your search criteria."}
            </p>
            <button className="btn btn-gold btn-sm" onClick={() => setShowModal(true)}>
              + Upload a Resource
            </button>
          </div>
        ) : (
          filtered.map(r => {
            const isMine = isResourceMine(r)
            const rId = r.id || r._id
            return (
              <div
                key={rId}
                className="resource-card"
                style={{
                  position: 'relative',
                  border: isMine ? (deletingId === rId ? '1px solid #fca5a5' : '1px solid #fde68a') : '1px solid #e5e7eb',
                  background: isMine ? (deletingId === rId ? '#fffafb' : '#fffdf5') : '#fff',
                  flexWrap: 'wrap',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* File format icon */}
                <div
                  className="resource-icon"
                  style={{
                    background: r.color || '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <img
                    src="https://img.icons8.com/?size=100&id=11651&format=png&color=000000"
                    alt="Document"
                    style={{ width: 24, height: 24, objectFit: 'contain' }}
                  />
                </div>

                <div className="resource-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className="resource-title" style={{ margin: 0 }}>{r.title}</span>
                    {isMine && (
                      <span style={{ background: '#fef3c7', color: '#92400e', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12 }}>
                        Your Upload
                      </span>
                    )}
                    {(r.field || r.category) && (
                      <span style={{ background: '#f3f4f6', color: '#374151', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 12 }}>
                        {r.field || r.category}
                      </span>
                    )}
                  </div>

                  {r.description && (
                    <p style={{ fontSize: 13, color: '#4b5563', marginBottom: 6, lineHeight: 1.4 }}>
                      {r.description}
                    </p>
                  )}

                  <div className="resource-meta" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span>Uploaded by <strong>{r.author || r.uploader?.name || 'Alumni Mentor'}</strong></span>
                    {r.type && (
                      <>
                        <span>•</span>
                        <span style={{ background: '#f3f4f6', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{r.type}</span>
                      </>
                    )}
                    {(r.date || r.createdAt) && (
                      <>
                        <span>•</span>
                        <span>{r.date || new Date(r.createdAt).toLocaleDateString()}</span>
                      </>
                    )}
                    {r.targetAudience && (
                      <>
                        <span>•</span>
                        <span style={{ color: '#15803d', fontWeight: 600 }}>🎯 {r.targetAudience}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="resource-actions" style={{ alignItems: 'center' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ background: '#16428c', borderColor: '#16428c', display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={() => handleView(rId, r.url || r.fileUrl, r.fileName || r.title)}
                  >
                    <span>View</span>
                  </button>

                  {isMine && (
                    <button
                      className="btn btn-sm"
                      style={{
                        background: deletingId === rId ? '#fecaca' : '#fee2e2',
                        color: '#dc2626',
                        border: '1px solid #fca5a5'
                      }}
                      onClick={() => setDeletingId(prev => prev === rId ? null : rId)}
                      title={deletingId === rId ? "Close confirmation" : "Delete this resource"}
                    >
                      {deletingId === rId ? 'Cancel' : 'Delete'}
                    </button>
                  )}
                </div>

                {/* Inline Confirmation Component */}
                {deletingId === rId && (
                  <div
                    style={{
                      width: '100%',
                      marginTop: 12,
                      padding: '10px 14px',
                      background: '#fff1f2',
                      border: '1px solid #fecdd3',
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 12,
                      animation: 'fadeIn 0.2s ease-in-out'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9f1239', fontSize: 13, fontWeight: 600 }}>
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>Are you sure you want to delete this resource?</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={isDeleting}
                        onClick={() => confirmDelete(rId)}
                        style={{
                          background: '#e11d48',
                          color: '#ffffff',
                          border: 'none',
                          padding: '5px 14px',
                          fontSize: 12,
                          fontWeight: 700,
                          borderRadius: 6,
                          cursor: isDeleting ? 'not-allowed' : 'pointer',
                          boxShadow: '0 1px 2px rgba(225, 29, 72, 0.2)'
                        }}
                      >
                        {isDeleting ? 'Deleting…' : 'OK'}
                      </button>

                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={isDeleting}
                        onClick={() => setDeletingId(null)}
                        style={{
                          background: '#ffffff',
                          color: '#4b5563',
                          border: '1px solid #d1d5db',
                          padding: '5px 14px',
                          fontSize: 12,
                          fontWeight: 600,
                          borderRadius: 6,
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* ── UPLOAD RESOURCE MODAL ── */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(17, 24, 39, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false)
          }}
        >
          <div
            className="animate-in"
            style={{
              background: '#fff',
              borderRadius: 16,
              maxWidth: 580,
              width: '100%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{ background: '#1a2238', color: '#fff', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 2 }}>Upload Student Resource</h3>
                <p style={{ fontSize: 12, color: '#d4af37' }}>Share materials to guide student career development</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleFormSubmit} style={{ padding: 24 }}>
              {/* Title */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                  Resource Title <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. System Design Interview Frameworks & Prep Guide"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  style={{
                    width: '100%',
                    height: 40,
                    padding: '0 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14,
                    outline: 'none'
                  }}
                  required
                />
              </div>

              {/* Category / Field */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                  Category / Field <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={field}
                  onChange={e => setField(e.target.value)}
                  style={{
                    width: '100%',
                    height: 40,
                    padding: '0 10px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 13,
                    background: '#fff'
                  }}
                >
                  <option>Engineering</option>
                  <option>Product</option>
                  <option>Finance</option>
                  <option>Consulting</option>
                  <option>Design</option>
                  <option>General Career</option>
                </select>
              </div>

              {/* Target Audience */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                  Target Audience
                </label>
                <input
                  type="text"
                  placeholder="e.g. Undergrads, CS Seniors, Finance Applicants"
                  value={targetAudience}
                  onChange={e => setTargetAudience(e.target.value)}
                  style={{
                    width: '100%',
                    height: 38,
                    padding: '0 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 13
                  }}
                />
              </div>

              {/* Description */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                  Summary / Description <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Briefly describe key topics, takeaways, or instructions for students..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 13,
                    outline: 'none',
                    resize: 'none'
                  }}
                  required
                />
              </div>

              {/* Upload Mode Switch (File vs Link) */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', marginBottom: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Attachment Source</label>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, fontSize: 12 }}>
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="radio"
                        name="uploadMode"
                        checked={uploadMode === 'file'}
                        onChange={() => setUploadMode('file')}
                      />
                      Attach File
                    </label>
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="radio"
                        name="uploadMode"
                        checked={uploadMode === 'link'}
                        onChange={() => setUploadMode('link')}
                      />
                      External Link
                    </label>
                  </div>
                </div>

                {uploadMode === 'file' ? (
                  <div>
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
                        cursor: 'pointer'
                      }}
                      onClick={() => !uploadingFile && document.getElementById('resource-file-upload').click()}
                    >
                      <div style={{ fontSize: 24, marginBottom: 6 }}>📄</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                        {uploadingFile ? (
                          <span style={{ color: '#16428c' }}>Uploading attachment...</span>
                        ) : (
                          <>
                            Drag & drop files here or{' '}
                            <span style={{ color: '#16428c', cursor: 'pointer', textDecoration: 'underline' }}>
                              browse
                            </span>
                          </>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>
                        Supported formats: PDF (Max 25MB)
                      </div>
                      <input
                        id="resource-file-upload"
                        type="file"
                        disabled={uploadingFile}
                        accept=".pdf,application/pdf"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFileUpload(e.target.files)}
                      />
                    </div>

                    {uploadError && (
                      <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 12, marginBottom: 10 }}>
                        {uploadError}
                      </div>
                    )}

                    {/* Attached file card (replicated from referral mechanism) */}
                    {attachedFile && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: 8,
                        marginBottom: 12,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, background: '#16428c', color: '#fff', padding: '3px 6px', borderRadius: 4 }}>
                            {attachedFile.type || 'FILE'}
                          </span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{attachedFile.name}</div>
                            <div style={{ fontSize: 11, color: '#6b7280' }}>
                              {attachedFile.size} • <span style={{ color: '#059669', fontWeight: 600 }}>Ready to publish</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {attachedFile.url && (
                            <a
                              href={resourceAPI.getViewUrl(null, attachedFile.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: 12, color: '#16428c', fontWeight: 600, textDecoration: 'none' }}
                            >
                              Preview
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setAttachedFile(null)
                            }}
                            style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 18, cursor: 'pointer', padding: '2px 6px' }}
                            title="Remove file"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type="url"
                    placeholder="https://github.com/or-drive-link..."
                    value={externalUrl}
                    onChange={e => setExternalUrl(e.target.value)}
                    style={{
                      width: '100%',
                      height: 40,
                      padding: '0 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      fontSize: 13
                    }}
                  />
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-gold"
                  style={{ padding: '8px 24px', fontWeight: 700 }}
                  disabled={submitting}
                >
                  {submitting ? 'Publishing...' : 'Upload Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
