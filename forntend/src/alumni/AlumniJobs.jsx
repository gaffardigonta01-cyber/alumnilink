import React, { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { jobAPI, referralAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import NotificationBell from '../shared/NotificationBell'
import UserAvatar from '../shared/avatar'

const STATUS_CFG = {
  applied: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe', label: 'Applied' },
  under_review: { bg: '#fef3c7', color: '#d97706', border: '#fde68a', label: 'Under Review' },
  shortlisted: { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0', label: 'Shortlisted' },
  rejected: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'Declined' },
  hired: { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe', label: 'Hired' },
}

const BADGE = ({ children, bg, color, border }) => (
  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: bg, color, border: `1px solid ${border}`, whiteSpace: 'nowrap' }}>
    {children}
  </span>
)

const EMPTY_FORM = {
  title: '', company: '', location: 'Remote', workplaceType: 'Remote',
  jobType: 'Full-time', experienceLevel: 'Entry-level', salary: '',
  description: '', requirements: '', deadline: '', externalUrl: '',
}

export default function AlumniJobs() {
  const { user } = useAuth()
  const location = useLocation()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all') // 'all' | 'active' | 'closed'

  // Modals
  const [showForm, setShowForm] = useState(false)
  const [editJob, setEditJob] = useState(null)
  const [applicantsJob, setApplicantsJob] = useState(null)
  const [selectedApp, setSelectedApp] = useState(null) // selected applicant in detail panel

  // Form
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState('')
  const [toast, setToast] = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000) }

  const load = useCallback(() => {
    setLoading(true)
    jobAPI.getMyJobs()
      .then(d => {
        const list = d.jobs || []
        setJobs(list)
        // Keep applicants modal in sync
        if (applicantsJob) {
          const updated = list.find(j => j.id === applicantsJob.id)
          if (updated) setApplicantsJob(updated)
        }
      })
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [applicantsJob?.id])

  useEffect(() => { load() }, [])

  const openCreate = useCallback(() => {
    setEditJob(null)
    setForm({ ...EMPTY_FORM, company: user?.company || '' })
    setFormErr('')
    setShowForm(true)
  }, [user?.company])

  useEffect(() => {
    if (location.state?.openCreate) {
      openCreate()
      try {
        window.history.replaceState({}, document.title)
      } catch { }
    }
  }, [location.state, openCreate])

  const openEdit = (job) => {
    setEditJob(job)
    setForm({
      title: job.title, company: job.company, location: job.location,
      workplaceType: job.workplaceType, jobType: job.jobType,
      experienceLevel: job.experienceLevel, salary: job.salary || '',
      description: job.description, requirements: job.requirements || '',
      deadline: job.deadline || '', externalUrl: job.externalUrl || '',
    })
    setFormErr('')
    setShowForm(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.company.trim() || !form.description.trim()) {
      setFormErr('Job Title, Company, and Description are required.'); return
    }
    setSaving(true); setFormErr('')
    try {
      if (editJob) { await jobAPI.update(editJob.id, form); showToast('Job updated successfully!') }
      else { await jobAPI.create(form); showToast('Job posted successfully!') }
      setShowForm(false); load()
    } catch (err) { setFormErr(err.message || 'Failed to save.') }
    finally { setSaving(false) }
  }

  const toggleStatus = async (job) => {
    const next = job.status === 'active' ? 'closed' : 'active'
    try {
      await jobAPI.update(job.id, { status: next })
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: next } : j))
      showToast(`Job marked as ${next}.`)
    } catch { alert('Failed to update status.') }
  }

  const deleteJob = async (id) => {
    if (!window.confirm('Delete this job posting? All applications will be removed.')) return
    try {
      await jobAPI.remove(id)
      setJobs(prev => prev.filter(j => j.id !== id))
      if (applicantsJob?.id === id) setApplicantsJob(null)
      showToast('Job deleted.')
    } catch { alert('Failed to delete.') }
  }

  const updateAppStatus = async (appId, status) => {
    try {
      await jobAPI.updateAppStatus(appId, status)
      const refresh = (list) =>
        list.map(j => ({
          ...j,
          applications: (j.applications || []).map(a => a.id === appId ? { ...a, status } : a),
        }))
      setJobs(prev => refresh(prev))
      if (applicantsJob) setApplicantsJob(prev => ({ ...prev, applications: (prev.applications || []).map(a => a.id === appId ? { ...a, status } : a) }))
      showToast(`Status updated to ${status.replace('_', ' ')}.`)
    } catch { alert('Failed to update.') }
  }

  const displayed = jobs.filter(j => tab === 'active' ? j.status === 'active' : tab === 'closed' ? j.status === 'closed' : true)
  const activeCount = jobs.filter(j => j.status === 'active').length
  const totalApps = jobs.reduce((s, j) => s + (j.applications?.length || 0), 0)
  const newApps = jobs.reduce((s, j) => s + (j.applications?.filter(a => a.status === 'applied').length || 0), 0)
  const shortlisted = jobs.reduce((s, j) => s + (j.applications?.filter(a => ['shortlisted', 'hired'].includes(a.status)).length || 0), 0)

  const fld = (k) => ({ value: form[k], onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) })
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, fontFamily: 'inherit', outline: 'none' }
  const selectStyle = { ...inputStyle, background: '#fff', cursor: 'pointer' }

  return (
    <>
      {/* Topbar */}
      <div className="topbar">
        <span className="topbar-title">Jobs</span>
        <div className="topbar-spacer" />
        <NotificationBell />
      </div>

      <div className="page-body animate-in" style={{ paddingBottom: 64 }}>

        {/* Toast */}
        {toast && (
          <div style={{ background: 'linear-gradient(90deg,#10b981,#059669)', color: '#fff', padding: '12px 18px', borderRadius: 10, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 600, fontSize: 14 }}>
            <span>{toast}</span>
            <button onClick={() => setToast('')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18 }}>✕</button>
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 4 }}>Alumni Job Board</h1>
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Post job openings and internship opportunities for university students to apply directly from their portal.</p>
          </div>
          <button
            className="btn btn-gold"
            onClick={openCreate}
            style={{ fontWeight: 700, padding: '10px 20px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, flexShrink: 0 }}
          >
            + Post a Job
          </button>
        </div>

        {/* Stats Row */}
        <div className="metric-grid" style={{ marginBottom: 28 }}>
          <div className="metric-card" style={{ borderLeft: '4px solid #d4af37' }}>
            <div className="metric-label">Total Postings</div>
            <div className="metric-value" style={{ color: '#d4af37' }}>{jobs.length}</div>
            <div className="metric-sub">Created by you</div>
          </div>

          <div className="metric-card" style={{ borderLeft: '4px solid #10b981' }}>
            <div className="metric-label">Active Openings</div>
            <div className="metric-value" style={{ color: '#10b981' }}>{activeCount}</div>
            <div className="metric-sub" style={{ color: '#059669' }}>Accepting applications</div>
          </div>

          <div className="metric-card" style={{ borderLeft: '4px solid #3b82f6' }}>
            <div className="metric-label">Total Applicants</div>
            <div className="metric-value" style={{ color: '#3b82f6' }}>{totalApps}</div>
            <div className="metric-sub">Students applied</div>
          </div>

          <div className="metric-card" style={{ borderLeft: '4px solid #f59e0b' }}>
            <div className="metric-label">New / Unreviewed</div>
            <div className="metric-value" style={{ color: '#f59e0b' }}>{newApps}</div>
            <div className="metric-sub" style={{ color: newApps > 0 ? '#d97706' : '#9ca3af' }}>
              {newApps > 0 ? 'Requires attention' : 'All caught up'}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e5e7eb', paddingBottom: 14, marginBottom: 20 }}>
          {[
            { key: 'all', label: `All (${jobs.length})` },
            { key: 'active', label: `Active (${activeCount})` },
            { key: 'closed', label: `Closed (${jobs.length - activeCount})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                padding: '8px 18px', borderRadius: 20, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                background: tab === key ? '#1a2238' : '#f3f4f6',
                color: tab === key ? '#fff' : '#4b5563',
              }}
            >{label}</button>
          ))}
        </div>

        {/* Jobs list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
            Loading job postings...
          </div>
        ) : displayed.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: 'center' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 6 }}>
              {tab === 'all' ? 'No Jobs Posted Yet' : `No ${tab} jobs`}
            </h3>
            <p style={{ fontSize: 14, color: '#6b7280', maxWidth: 420, margin: '0 auto 20px' }}>
              Share job openings from your company and connect with talented students.
            </p>
            <button className="btn btn-gold" onClick={openCreate}>+ Post Your First Job</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {displayed.map(job => {
              const appsCount = job.applications?.length || 0
              const unread = job.applications?.filter(a => a.status === 'applied').length || 0
              return (
                <div key={job.id} className="card" style={{ padding: '20px 24px', borderRadius: 14, border: '1px solid #e5e7eb', background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
                    {/* Left: job info */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{job.title}</span>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                          background: job.status === 'active' ? '#ecfdf5' : '#f3f4f6',
                          color: job.status === 'active' ? '#059669' : '#6b7280',
                          border: `1px solid ${job.status === 'active' ? '#a7f3d0' : '#d1d5db'}`,
                          textTransform: 'uppercase',
                        }}>
                          {job.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: '#4b5563', fontWeight: 600, marginBottom: 8 }}>
                        {job.company} &nbsp;•&nbsp; <span style={{ color: '#9ca3af', fontWeight: 400 }}>{job.location}</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        <BADGE bg="#eff6ff" color="#1d4ed8" border="#bfdbfe">{job.jobType}</BADGE>
                        <BADGE bg="#f5f3ff" color="#6d28d9" border="#ddd6fe">{job.workplaceType}</BADGE>
                        <BADGE bg="#fef3c7" color="#b45309" border="#fde68a">{job.experienceLevel}</BADGE>
                        {job.salary && <BADGE bg="#ecfdf5" color="#047857" border="#a7f3d0">{job.salary}</BADGE>}
                      </div>
                    </div>

                    {/* Right: actions */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <button
                        onClick={() => { setApplicantsJob(job); setSelectedApp(null) }}
                        style={{
                          padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                          background: appsCount > 0 ? '#1a2238' : '#f3f4f6',
                          color: appsCount > 0 ? '#fff' : '#374151',
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        Applicants ({appsCount})
                        {unread > 0 && (
                          <span style={{ background: '#ef4444', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 10, fontWeight: 800 }}>
                            {unread} NEW
                          </span>
                        )}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(job)}>Edit</button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => toggleStatus(job)}
                        style={{ color: job.status === 'active' ? '#d97706' : '#059669' }}
                      >
                        {job.status === 'active' ? 'Close' : 'Reopen'}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => deleteJob(job.id)} style={{ color: '#ef4444' }}>Delete</button>
                    </div>
                  </div>

                  {/* Description */}
                  <p style={{ marginTop: 14, fontSize: 13, color: '#4b5563', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', paddingTop: 14, borderTop: '1px solid #f3f4f6' }}>
                    {job.description}
                  </p>

                  <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9ca3af' }}>
                    <span>Posted {new Date(job.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    {job.deadline && <span style={{ color: '#b45309', fontWeight: 600 }}>Deadline: {job.deadline}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ══════════════ FORM MODAL ══════════════ */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div style={{ width: '100%', maxWidth: 740, maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 16, padding: '28px 32px', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0 }}>
                  {editJob ? 'Edit Job Posting' : 'Post a New Job Opening'}
                </h2>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
                  Students across the university will be able to discover and apply for this role.
                </p>
              </div>
              <button onClick={() => setShowForm(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', fontSize: 17, color: '#4b5563', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            {formErr && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                ⚠️ {formErr}
              </div>
            )}

            <form onSubmit={handleSave}>
              {/* Row 1 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Job Title *</label>
                  <input type="text" placeholder="e.g. Junior Software Engineer" style={inputStyle} {...fld('title')} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Company Name *</label>
                  <input type="text" placeholder="e.g. Google, Pathao" style={inputStyle} {...fld('company')} required />
                </div>
              </div>

              {/* Row 2 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Workplace</label>
                  <select style={selectStyle} {...fld('workplaceType')}>
                    {['Remote', 'Hybrid', 'On-site'].map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Job Type</label>
                  <select style={selectStyle} {...fld('jobType')}>
                    {['Full-time', 'Part-time', 'Internship', 'Contract'].map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Experience Level</label>
                  <select style={selectStyle} {...fld('experienceLevel')}>
                    {['Entry-level', 'Mid-level', 'Senior', 'Lead / Principal', 'Internship'].map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
              </div>

              {/* Row 3 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Location</label>
                  <input type="text" placeholder="e.g. Dhaka / Remote" style={inputStyle} {...fld('location')} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Salary / Compensation</label>
                  <input type="text" placeholder="e.g. $80k–100k or Negotiable" style={inputStyle} {...fld('salary')} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Application Deadline</label>
                  <input type="text" placeholder="e.g. Nov 15, 2026 or Rolling" style={inputStyle} {...fld('deadline')} />
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Job Description *</label>
                <textarea rows={4} placeholder="Describe the role, responsibilities, and team..." style={inputStyle} {...fld('description')} required />
              </div>

              {/* Requirements */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Requirements & Skills</label>
                <textarea rows={3} placeholder="e.g. React, Node.js, Python, strong communication..." style={inputStyle} {...fld('requirements')} />
              </div>

              {/* External URL */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>External Job Link (optional)</label>
                <input type="url" placeholder="https://company.com/careers/..." style={inputStyle} {...fld('externalUrl')} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-gold" disabled={saving} style={{ fontWeight: 700, minWidth: 140 }}>
                  {saving ? 'Saving…' : editJob ? 'Update Job' : 'Publish Job Opening'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════ APPLICANTS MODAL ══════════════ */}
      {applicantsJob && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) { setApplicantsJob(null); setSelectedApp(null) } }}>
          <div style={{ width: '100%', maxWidth: 1020, maxHeight: '92vh', background: '#fff', borderRadius: 18, boxShadow: '0 24px 70px rgba(0,0,0,.28)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ padding: '20px 28px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
                  {applicantsJob.company} &nbsp;·&nbsp; {applicantsJob.jobType} &nbsp;·&nbsp; {applicantsJob.workplaceType}
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0 }}>
                  {applicantsJob.title}
                  <span style={{ marginLeft: 12, fontSize: 13, fontWeight: 600, color: '#6b7280' }}>
                    — {applicantsJob.applications?.length || 0} Applicant{applicantsJob.applications?.length !== 1 ? 's' : ''}
                  </span>
                </h2>
              </div>
              <button onClick={() => { setApplicantsJob(null); setSelectedApp(null) }} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontSize: 18, color: '#4b5563', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
            </div>

            {/* Body: two-panel */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

              {/* ── LEFT: applicant list ── */}
              <div style={{ width: 280, flexShrink: 0, borderRight: '1px solid #e5e7eb', overflowY: 'auto', background: '#f9fafb' }}>
                {(!applicantsJob.applications || applicantsJob.applications.length === 0) ? (
                  <div style={{ padding: '48px 20px', textAlign: 'center', color: '#6b7280' }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 4 }}>No applicants yet</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>Applications will appear here once students start applying.</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
                      All Applicants
                    </div>
                    {applicantsJob.applications.map(app => {
                      const st = app.student || {}
                      const sc = STATUS_CFG[app.status] || STATUS_CFG.applied
                      const isSelected = selectedApp?.id === app.id
                      return (
                        <div
                          key={app.id}
                          onClick={() => setSelectedApp(app)}
                          style={{
                            padding: '14px 16px', borderBottom: '1px solid #e5e7eb', cursor: 'pointer', transition: 'background 0.15s',
                            background: isSelected ? '#eff6ff' : '#f9fafb',
                            borderLeft: isSelected ? '3px solid #16428c' : '3px solid transparent',
                          }}
                        >
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <UserAvatar
                              avatar={st.avatar}
                              name={st.name || 'Student'}
                              size={38}
                              bg={isSelected ? '#16428c' : '#1a2238'}
                              color="#fff"
                              fallback="ST"
                            />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{st.name || 'Student'}</div>
                              <div style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{st.major || 'University Student'}</div>
                              <span style={{ display: 'inline-block', marginTop: 4, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                                {sc.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* ── RIGHT: application detail ── */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '28px 30px' }}>
                {!selectedApp ? (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Select an applicant</div>
                    <div style={{ fontSize: 13 }}>Click on a name on the left to view their full application details.</div>
                  </div>
                ) : (() => {
                  const app = selectedApp
                  const st = app.student || {}
                  const sc = STATUS_CFG[app.status] || STATUS_CFG.applied
                  const resumeHref = app.resumeUrl
                    ? (app.resumeUrl.startsWith('http') ? app.resumeUrl : `http://localhost:5000${app.resumeUrl.startsWith('/') ? '' : '/'}${app.resumeUrl}`)
                    : null

                  return (
                    <div>
                      {/* Applicant hero */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                          <UserAvatar
                            avatar={st.avatar}
                            name={st.name || 'Student'}
                            size={64}
                            fontSize={22}
                            bg="linear-gradient(135deg,#16428c,#2563eb)"
                            color="#fff"
                            fallback="ST"
                            style={{ boxShadow: '0 6px 16px rgba(22,66,140,.25)' }}
                          />
                          <div>
                            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>{st.name || 'University Student'}</h3>
                            <div style={{ fontSize: 13, color: '#4b5563', fontWeight: 600 }}>
                              {st.major || 'N/A'}{st.graduationYear ? ` · Class of ${st.graduationYear}` : ''}
                            </div>
                            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{st.email}</div>
                          </div>
                        </div>

                        {/* Status control */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Application Status</div>
                          <select
                            value={app.status}
                            onChange={e => {
                              updateAppStatus(app.id, e.target.value)
                              setSelectedApp(prev => ({ ...prev, status: e.target.value }))
                            }}
                            style={{ padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, background: sc.bg, color: sc.color, border: `2px solid ${sc.border}`, cursor: 'pointer', minWidth: 160, textAlign: 'center' }}
                          >
                            <option value="applied">Applied</option>
                            <option value="under_review">Under Review</option>
                            <option value="shortlisted">Shortlisted</option>
                            <option value="rejected">Declined</option>
                            <option value="hired">Hired</option>
                          </select>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>
                            Applied {new Date(app.createdAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                      </div>

                      {/* Applicant info grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 12, marginBottom: 22 }}>
                        {[
                          { label: 'Major / Field', val: st.major || '—' },
                          { label: 'University', val: st.university || '—' },
                          { label: 'Graduating', val: st.graduationYear ? `Class of ${st.graduationYear}` : '—' },
                          { label: 'Email', val: st.email || '—' },
                        ].map(({ label, val }) => (
                          <div key={label} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>{label}</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', wordBreak: 'break-all' }}>{val}</div>
                          </div>
                        ))}
                      </div>

                      {/* Bio */}
                      {st.bio && (
                        <div style={{ marginBottom: 20 }}>
                          <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: '#374151', marginBottom: 8 }}>About the Applicant</div>
                          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', border: '1px solid #e2e8f0', fontSize: 14, color: '#374151', lineHeight: 1.65 }}>
                            {st.bio}
                          </div>
                        </div>
                      )}

                      {/* Cover Note */}
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: '#374151', marginBottom: 8 }}>Cover Note / Pitch</div>
                        {app.coverNote ? (
                          <div style={{ background: '#fffbeb', borderRadius: 10, padding: '16px 18px', border: '1px solid #fde68a', fontSize: 14, color: '#374151', lineHeight: 1.7, fontStyle: 'italic', position: 'relative' }}>
                            <span style={{ position: 'absolute', top: -10, left: 16, background: '#fbbf24', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 8, textTransform: 'uppercase', fontStyle: 'normal' }}>Candidate's Words</span>
                            "{app.coverNote}"
                          </div>
                        ) : (
                          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', border: '1px dashed #cbd5e1', fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>
                            No cover note was provided.
                          </div>
                        )}
                      </div>

                      {/* Resume */}
                      <div style={{ marginBottom: 24 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: '#374151', marginBottom: 8 }}>Submitted Resume</div>
                        {resumeHref ? (
                          <a
                            href={resumeHref}
                            target="_blank"
                            rel="noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, textDecoration: 'none', transition: 'box-shadow 0.15s' }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#1e40af' }}>{app.resumeName || 'Resume / CV'}</div>
                              <div style={{ fontSize: 12, color: '#3b82f6', marginTop: 1 }}>Click to open in new tab ↗</div>
                            </div>
                            <span style={{ fontSize: 20, color: '#3b82f6' }}>↗</span>
                          </a>
                        ) : (
                          <div style={{ padding: '14px 18px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 12, fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>
                            No resume was attached to this application.
                          </div>
                        )}
                      </div>

                      {/* Quick action buttons */}
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                        {[
                          { label: 'Shortlist', status: 'shortlisted', bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
                          { label: 'Under Review', status: 'under_review', bg: '#fef3c7', color: '#d97706', border: '#fde68a' },
                          { label: 'Hire', status: 'hired', bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
                          { label: 'Decline', status: 'rejected', bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
                        ].filter(b => b.status !== app.status).map(({ label, status, bg, color, border }) => (
                          <button
                            key={status}
                            onClick={() => {
                              updateAppStatus(app.id, status)
                              setSelectedApp(prev => ({ ...prev, status }))
                            }}
                            style={{ padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: bg, color, border: `1px solid ${border}`, transition: 'opacity 0.15s' }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
