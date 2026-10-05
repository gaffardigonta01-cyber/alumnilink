import React, { useState, useEffect } from 'react'
import { resourceAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import NotificationBell from '../shared/NotificationBell'

export default function ResourcesPage() {
  const { setUser } = useAuth()
  const [resources, setResources] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [fieldFilter, setFieldFilter] = useState('All')
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'saved'
  const [toastMsg, setToastMsg] = useState('')

  const showToast = (msg) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3000)
  }

  useEffect(() => {
    resourceAPI.getAll()
      .then(data => {
        if (Array.isArray(data.resources) && data.resources.length > 0) {
          setResources(data.resources)
        }
      })
      .catch(err => console.warn('Using initial resources fallback', err))
  }, [])

  const toggleSave = async (id) => {
    try {
      const res = await resourceAPI.toggleSave(id)
      if (res?.user && setUser) {
        setUser(res.user)
      }
      window.dispatchEvent(new CustomEvent('resource:saved', { detail: res }))
    } catch (e) {
      // ignore
    }
    setResources(prev =>
      prev.map(r => {
        if (r._id === id || r.id === id) {
          const nextSaved = !r.saved
          showToast(nextSaved ? 'Resource saved to your bookmarks' : 'Resource removed from bookmarks')
          return { ...r, saved: nextSaved }
        }
        return r
      })
    )
  }

  const handleView = (r) => {
    const id = r._id || r.id
    const fileUrl = r.fileUrl || r.url
    showToast(`Opening "${r.fileName || r.title}"...`)
    const viewUrl = resourceAPI.getViewUrl(id, fileUrl)
    window.open(viewUrl, '_blank')
  }

  const filtered = resources.filter(r => {
    if (activeTab === 'saved' && !r.saved) return false
    if (fieldFilter !== 'All' && r.field && r.field !== fieldFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const titleMatch = r.title?.toLowerCase().includes(q)
      const descMatch = r.description?.toLowerCase().includes(q)
      const authorMatch = r.author?.toLowerCase().includes(q)
      if (!titleMatch && !descMatch && !authorMatch) return false
    }
    return true
  })

  const savedCount = resources.filter(r => r.saved).length

  return (
    <>
      {/* ── Topbar ── */}
      <div className="topbar">
        <span className="topbar-title">Resource Library</span>
        <div className="topbar-search">
          <input
            type="text"
            placeholder="Search guides, templates, handbooks..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="topbar-spacer" />
        <NotificationBell />
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 9999,
            background: '#111827',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 10,
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            fontSize: 13,
            fontWeight: 600,
            animation: 'fadeInUp 0.3s ease'
          }}
        >
          ✨ {toastMsg}
        </div>
      )}

      <div className="page-body animate-in">
        {/* Header */}
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 4 }}>
              Resource Library
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280' }}>
              Guides, case decks, technical roadmaps, and templates shared directly by alumni mentors.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: '#1d4ed8' }}>
              {resources.length} Total Resources
            </div>
            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: '#92400e' }}>
              {savedCount} Bookmarked
            </div>
          </div>
        </div>

        {/* ── Tabs & Filters ── */}
        <div style={{ background: '#fff', padding: '14px 18px', borderRadius: 14, border: '1px solid #e5e7eb', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            {/* View Tabs */}
            <div style={{ display: 'flex', gap: 6, background: '#f3f4f6', padding: 4, borderRadius: 10 }}>
              <button
                style={{
                  padding: '7px 16px',
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
                All Resources
              </button>
              <button
                style={{
                  padding: '7px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'saved' ? '#fff' : 'transparent',
                  color: activeTab === 'saved' ? '#111827' : '#6b7280',
                  boxShadow: activeTab === 'saved' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s'
                }}
                onClick={() => setActiveTab('saved')}
              >
                Saved / Bookmarks ({savedCount})
              </button>
            </div>

            {/* Filters */}
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

        {/* ── Resource List ── */}
        {filtered.length === 0 ? (
          <div style={{ background: '#fff', border: '1px dashed #d1d5db', borderRadius: 14, padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📖</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 6 }}>No resources found</h3>
            <p style={{ fontSize: 13, color: '#6b7280' }}>
              {activeTab === 'saved' ? "You haven't bookmarked any resources yet." : "Try adjusting your search terms or filters."}
            </p>
          </div>
        ) : (
          filtered.map(r => {
            const key = r._id || r.id
            return (
              <div key={key} className="resource-card" style={{ padding: '18px 22px' }}>
                {/* Format Icon */}
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
                    {r.field && (
                      <span style={{ background: '#f3f4f6', color: '#374151', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 12 }}>
                        {r.field}
                      </span>
                    )}
                  </div>

                  {r.description && (
                    <p style={{ fontSize: 13, color: '#4b5563', marginBottom: 6, lineHeight: 1.4 }}>
                      {r.description}
                    </p>
                  )}

                  <div className="resource-meta" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span>Uploaded by <strong>{r.author || r.uploader?.name || 'Alumni Mentor'}</strong></span>
                    {r.type && (
                      <>
                        <span>•</span>
                        <span style={{ background: '#f3f4f6', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: '#374151' }}>
                          {r.type}
                        </span>
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

                <div className="resource-actions">
                  <button
                    className={`btn btn-sm ${r.saved ? 'btn-green' : 'btn-secondary'}`}
                    onClick={() => toggleSave(key)}
                  >
                    {r.saved ? '✓ Saved' : 'Save'}
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ background: '#16428c', borderColor: '#16428c' }}
                    onClick={() => handleView(r)}
                  >
                    View
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </>
  )
}
