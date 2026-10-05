import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { alumniAPI } from '../services/api'
import NotificationBell from '../shared/NotificationBell'
import UserAvatar, { getInitials } from '../shared/avatar'

export default function FindAlumni({ navigate: propNavigate }) {
  const routerNavigate = useNavigate()
  const navigate = propNavigate || routerNavigate
  const [alumni, setAlumni] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [field, setField] = useState('All')
  const [industry, setIndustry] = useState('All')
  const [classYear, setClassYear] = useState('All')
  const [availableOnly, setAvailableOnly] = useState(false)

  useEffect(() => {
    alumniAPI.getAll()
      .then(data => setAlumni(data.alumni || []))
      .catch((err) => console.error("Could not load alumni:", err))
      .finally(() => setLoading(false))
  }, [])

  const filtered = alumni.filter(a => {
    if (availableOnly && !a.isAvailableForMentorship) return false
    if (industry !== 'All' && a.industry && !a.industry.toLowerCase().includes(industry.toLowerCase())) return false
    if (classYear !== 'All' && String(a.graduationYear) !== classYear) return false
    if (search) {
      const q = search.toLowerCase()
      const hasSkill = Array.isArray(a.skills) && a.skills.some(t => String(t).toLowerCase().includes(q))
      return (
        (a.name && a.name.toLowerCase().includes(q)) ||
        (a.jobTitle && a.jobTitle.toLowerCase().includes(q)) ||
        (a.company && a.company.toLowerCase().includes(q)) ||
        hasSkill
      )
    }
    return true
  })

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Find Alumni</span>
        <div className="topbar-spacer" />
        <NotificationBell />
      </div>

      <div className="page-body animate-in">
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 4 }}>Smart Alumni Search</h1>
          <p style={{ fontSize: 14, color: '#6b7280' }}>Find mentors by field, industry, graduation year, or skill.</p>
        </div>

        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <input
            className="form-input"
            placeholder="Search by name, company, role, or skill..."
            style={{ height: 46 }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <div className="filter-group">
            <label className="filter-label">Field:</label>
            <select className="filter-select" value={field} onChange={e => setField(e.target.value)}>
              <option>All</option>
              <option>Engineering</option>
              <option>Product</option>
              <option>Finance</option>
              <option>Design</option>
              <option>Consulting</option>
              <option>Research</option>
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Industry:</label>
            <select className="filter-select" value={industry} onChange={e => setIndustry(e.target.value)}>
              <option>All</option>
              <option>Cloud</option>
              <option>Software</option>
              <option>Design</option>
              <option>Finance</option>
              <option>Consulting</option>
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Class of:</label>
            <select className="filter-select" value={classYear} onChange={e => setClassYear(e.target.value)}>
              <option>All</option>
              <option value="2016">2016</option>
              <option value="2018">2018</option>
              <option value="2020">2020</option>
              <option value="2022">2022</option>
              <option value="2024">2024</option>
            </select>
          </div>
          <label className="filter-checkbox">
            <input type="checkbox" checked={availableOnly} onChange={e => setAvailableOnly(e.target.checked)} />
            Available for Mentorship
          </label>
        </div>

        <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 16 }}>
          {filtered.length} {filtered.length === 1 ? 'alumni' : 'alumni'} found
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            Loading alumni directory...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
            No alumni match your filters. Try clearing your search query.
          </div>
        ) : (
          /* Alumni grid */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18 }}>
            {filtered.map(m => {
              const tags = Array.isArray(m.skills) && m.skills.length > 0
                ? m.skills.slice(0, 4)
                : (Array.isArray(m.tags) ? m.tags : [m.industry || 'Technology'])
              const mentorId = m.id || m._id

              return (
                <div key={mentorId} className="mentor-card">
                  <div
                    className="mentor-header"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/alumni-profile?id=${mentorId}`, { state: { mentor: m } })}
                    title={`View ${m.name}'s profile`}
                  >
                    <UserAvatar
                      avatar={m.avatar}
                      name={m.name}
                      size={44}
                      className="mentor-avatar"
                      bg="#16428c"
                      color="#fff"
                    />
                    <div className="mentor-info">
                      <div className="mentor-name-row">
                        <span className="mentor-name">{m.name}</span>
                        <span className="verified-badge">Verified</span>
                      </div>
                      <div className="mentor-title">
                        {m.jobTitle ? `${m.jobTitle} at ${m.company}` : (m.company || 'Alumni')}
                      </div>
                      <div className="mentor-rating">
                        {m.isAvailableForMentorship ? (
                          <span className="slots-badge">Available for Mentorship</span>
                        ) : (
                          <span className="slots-badge" style={{ background: '#f3f4f6', color: '#9ca3af' }}>Unavailable</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="mentor-bio">{m.bio || 'Experienced alumni professional ready to mentor students and review portfolios.'}</p>
                  <div className="mentor-tags">
                    {tags.map((t, idx) => <span key={idx} className="tag">{t}</span>)}
                  </div>
                  <div className="mentor-meta">
                    {m.industry ? `Industry: ${m.industry}` : ''}
                  </div>
                  <div className="mentor-actions">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigate(`/alumni-profile?id=${mentorId}`, { state: { mentor: m } })}
                    >
                      View Profile
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate('/messages', { state: { partnerId: mentorId, partner: m } })}>Message</button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => navigate('/book-session', { state: { mentorId, mentor: m } })}
                    >
                      Book Session
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
