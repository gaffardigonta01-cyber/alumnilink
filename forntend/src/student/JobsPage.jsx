import React, { useState, useEffect, useCallback } from 'react'
import { jobAPI, referralAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import NotificationBell from '../shared/NotificationBell'

const STATUS_CFG = {
  applied: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe', label: 'Applied' },
  under_review: { bg: '#fef3c7', color: '#d97706', border: '#fde68a', label: 'Under Review' },
  shortlisted: { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0', label: 'Shortlisted' },
  rejected: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'Declined' },
  hired: { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe', label: 'Hired' },
}

const PILLS = ['All', 'Full-time', 'Internship', 'Remote', 'Hybrid', 'On-site']

export default function JobsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('browse') // 'browse' | 'applied'
  const [jobs, setJobs] = useState([])
  const [myApps, setMyApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pill, setPill] = useState('All')

  // Detail modal
  const [detailJob, setDetailJob] = useState(null)

  // Apply modal
  const [applyJob, setApplyJob] = useState(null)
  const [coverNote, setCoverNote] = useState('')
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadedResume, setUploadedResume] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [applyErr, setApplyErr] = useState('')

  const [toast, setToast] = useState('')
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4500) }

  const loadAll = useCallback(() => {
    setLoading(true)
    Promise.all([
      jobAPI.getAll(),
      jobAPI.getMyApplications().catch(() => ({ applications: [] })),
    ])
      .then(([jr, ar]) => {
        setJobs(jr.jobs || [])
        setMyApps(ar.applications || [])
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadAll() }, [])

  const appliedIds = new Set(myApps.map(a => a.jobId || a.job?.id))

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase().trim()
    const matchSearch = !q || [j.title, j.company, j.location, j.description, j.requirements].some(f => f?.toLowerCase().includes(q))
    if (!matchSearch) return false
    if (pill === 'Full-time') return j.jobType === 'Full-time'
    if (pill === 'Internship') return j.jobType === 'Internship'
    if (pill === 'Remote') return j.workplaceType === 'Remote'
    if (pill === 'Hybrid') return j.workplaceType === 'Hybrid'
    if (pill === 'On-site') return j.workplaceType === 'On-site'
    return true
  })

  const openApply = (job) => {
    setApplyJob(job)
    setDetailJob(null)
    setCoverNote('')
    setUploadedResume(null)
    setApplyErr('')
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadingFile(true)
    setApplyErr('')
    try {
      const res = await referralAPI.uploadAttachment(file)
      setUploadedResume({ url: res.fileUrl, name: res.fileName, size: res.fileSize })
    } catch (err) {
      setApplyErr(err.message || 'Upload failed.')
    } finally {
      setUploadingFile(false)
    }
  }

  const handleSubmitApp = async (e) => {
    e.preventDefault()
    setSubmitting(true); setApplyErr('')
    try {
      await jobAPI.apply(applyJob.id, {
        coverNote,
        resumeUrl: uploadedResume?.url || '',
        resumeName: uploadedResume?.name || '',
      })
      showToast(`Application for "${applyJob.title}" submitted!`)
      setApplyJob(null)
      loadAll()
    } catch (err) {
      setApplyErr(err.message || 'Failed to submit.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, fontFamily: 'inherit' }
  const BadgePill = ({ bg, color, border, children }) => (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: bg, color, border: `1px solid ${border}` }}>
      {children}
    </span>
  )

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Jobs & Opportunities</span>
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

        {/* Banner */}
        <div style={{ background: 'linear-gradient(135deg,#16428c,#0d2856)', borderRadius: 16, padding: '26px 30px', color: '#fff', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 18 }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', background: 'rgba(255,255,255,.15)', padding: '3px 10px', borderRadius: 20, display: 'inline-block', marginBottom: 8 }}>
              ALUMNI CAREER NETWORK
            </span>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', color: '#fff' }}>Direct Alumni Job Board</h1>
            <p style={{ fontSize: 13, color: '#e2e8f0', margin: 0, maxWidth: 520 }}>
              Discover verified job openings and internships posted directly by alumni at leading companies. Apply with your university profile.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ background: 'rgba(255,255,255,.1)', padding: '10px 18px', borderRadius: 12, textAlign: 'center', border: '1px solid rgba(255,255,255,.15)' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fcd34d' }}>{jobs.length}</div>
              <div style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 600 }}>Active Openings</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,.1)', padding: '10px 18px', borderRadius: 12, textAlign: 'center', border: '1px solid rgba(255,255,255,.15)' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#6ee7b7' }}>{myApps.length}</div>
              <div style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 600 }}>My Applications</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid #e5e7eb', paddingBottom: 12, marginBottom: 20 }}>
          {[
            { key: 'browse', label: `Explore Openings (${jobs.length})` },
            { key: 'applied', label: `My Applications (${myApps.length})` },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{
              padding: '9px 20px', borderRadius: 24, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              background: activeTab === key ? '#16428c' : '#f3f4f6',
              color: activeTab === key ? '#fff' : '#4b5563',
            }}>{label}</button>
          ))}
        </div>

        {/* ── BROWSE TAB ── */}
        {activeTab === 'browse' && (
          <>
            <div style={{ marginBottom: 18 }}>
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <input
                  type="text"
                  placeholder="Search by title, company, skills, or location…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 14, borderRadius: 12, background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,.04)' }}
                />
                {search && (
                  <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 12, top: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18 }}>✕</button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PILLS.map(p => (
                  <button key={p} onClick={() => setPill(p)} style={{
                    padding: '5px 14px', borderRadius: 16, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid', transition: 'all 0.15s',
                    borderColor: pill === p ? '#16428c' : '#e5e7eb',
                    background: pill === p ? '#eff6ff' : '#fff',
                    color: pill === p ? '#16428c' : '#4b5563',
                  }}>{p}</button>
                ))}
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
                Loading openings…
              </div>
            ) : filtered.length === 0 ? (
              <div className="card" style={{ padding: 48, textAlign: 'center' }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>No Openings Found</h3>
                <p style={{ fontSize: 14, color: '#6b7280' }}>Try different keywords or filters. Alumni regularly post new roles!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {filtered.map(job => {
                  const hasApplied = appliedIds.has(job.id) || job.hasApplied
                  const myApp = myApps.find(a => a.jobId === job.id || a.job?.id === job.id)
                  const sc = myApp ? (STATUS_CFG[myApp.status] || STATUS_CFG.applied) : null
                  return (
                    <div key={job.id} className="card" style={{ padding: '20px 24px', borderRadius: 14, border: '1px solid #e5e7eb', background: '#fff', transition: 'transform 0.15s, box-shadow 0.15s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
                        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                          {/* Logo */}
                          <div style={{ width: 50, height: 50, borderRadius: 12, flexShrink: 0, background: 'linear-gradient(135deg,#16428c,#2563eb)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 17, boxShadow: '0 4px 10px rgba(22,66,140,.2)' }}>
                            {(job.company || 'CO').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                              <span style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>{job.title}</span>
                              {hasApplied && sc && (
                                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                                  ✓ {sc.label}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                              {job.company} &nbsp;•&nbsp; <span style={{ color: '#6b7280', fontWeight: 400 }}>{job.location}</span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              <BadgePill bg="#eff6ff" color="#1d4ed8" border="#bfdbfe">{job.jobType}</BadgePill>
                              <BadgePill bg="#f5f3ff" color="#6d28d9" border="#ddd6fe">{job.workplaceType}</BadgePill>
                              <BadgePill bg="#fef3c7" color="#b45309" border="#fde68a">{job.experienceLevel}</BadgePill>
                              {job.salary && <BadgePill bg="#ecfdf5" color="#047857" border="#a7f3d0">{job.salary}</BadgePill>}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => setDetailJob(job)}>Details ↗</button>
                          {hasApplied ? (
                            <span style={{ padding: '8px 16px', borderRadius: 8, background: '#ecfdf5', color: '#059669', fontWeight: 700, fontSize: 13, border: '1px solid #a7f3d0' }}>✓ Applied</span>
                          ) : (
                            <button className="btn btn-primary btn-sm" onClick={() => openApply(job)} style={{ background: '#16428c', fontWeight: 700, padding: '8px 18px' }}>
                              Apply Now →
                            </button>
                          )}
                        </div>
                      </div>

                      <p style={{ marginTop: 14, fontSize: 13, color: '#4b5563', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
                        {job.description}
                      </p>

                      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', fontSize: 12, color: '#9ca3af' }}>
                        <span>By <strong style={{ color: '#16428c' }}>{job.alumni?.name}</strong> ({job.alumni?.jobTitle || 'Alumni'})</span>
                        <div style={{ display: 'flex', gap: 14 }}>
                          {job.deadline && <span style={{ color: '#b45309', fontWeight: 600 }}>Deadline: {job.deadline}</span>}
                          <span>Posted {new Date(job.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── MY APPLICATIONS TAB ── */}
        {activeTab === 'applied' && (
          <div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading…</div>
            ) : myApps.length === 0 ? (
              <div className="card" style={{ padding: 48, textAlign: 'center' }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>No Applications Yet</h3>
                <p style={{ fontSize: 14, color: '#6b7280', maxWidth: 420, margin: '0 auto 20px' }}>Browse open roles and apply directly to alumni-posted positions.</p>
                <button className="btn btn-primary" onClick={() => setActiveTab('browse')} style={{ background: '#16428c' }}>Browse Openings</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {myApps.map(app => {
                  const job = app.job || {}
                  const sc = STATUS_CFG[app.status] || STATUS_CFG.applied
                  return (
                    <div key={app.id} className="card" style={{ padding: '20px 24px', borderRadius: 14, border: '1px solid #e5e7eb', background: '#fff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, marginBottom: 12 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>{job.title || 'Role'}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 12, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                              {sc.label}
                            </span>
                          </div>
                          <div style={{ fontSize: 13, color: '#4b5563', fontWeight: 600 }}>
                            {job.company} &nbsp;•&nbsp; <span style={{ color: '#6b7280', fontWeight: 400 }}>{job.location}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: 12, color: '#9ca3af' }}>
                          Applied {new Date(app.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          {job.alumni && <div style={{ marginTop: 3, color: '#6b7280' }}>Reviewer: <strong>{job.alumni.name}</strong></div>}
                        </div>
                      </div>

                      {app.coverNote && (
                        <div style={{ background: '#f9fafb', padding: '10px 14px', borderRadius: 8, border: '1px solid #f3f4f6', fontSize: 13, color: '#4b5563', marginBottom: 12 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 2 }}>YOUR NOTE:</span>
                          "{app.coverNote}"
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, paddingTop: 10, borderTop: '1px solid #f3f4f6' }}>
                        <div>
                          {app.resumeUrl ? (
                            <a
                              href={(() => { const u = app.resumeUrl; return u.startsWith('http') ? u : `http://localhost:5000${u.startsWith('/') ? '' : '/'}${u}` })()}
                              target="_blank" rel="noreferrer"
                              style={{ color: '#16428c', fontWeight: 600, textDecoration: 'none' }}
                            >
                              Submitted Resume ({app.resumeName || 'File'}) ↗
                            </a>
                          ) : (
                            <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Applied with profile</span>
                          )}
                        </div>
                        <button className="btn btn-ghost btn-sm" onClick={() => setDetailJob(job)} style={{ fontSize: 12 }}>
                          View Job →
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════════ JOB DETAIL MODAL ══════════════ */}
      {detailJob && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setDetailJob(null) }}>
          <div style={{ width: '100%', maxWidth: 680, maxHeight: '88vh', overflowY: 'auto', background: '#fff', borderRadius: 16, padding: '28px 32px', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#16428c' }}>{detailJob.company}</span>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: '4px 0 0' }}>{detailJob.title}</h2>
              </div>
              <button onClick={() => setDetailJob(null)} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', fontSize: 17, color: '#4b5563', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 8, background: '#eff6ff', color: '#1d4ed8', fontWeight: 600 }}>{detailJob.location}</span>
              <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 8, background: '#f5f3ff', color: '#6d28d9', fontWeight: 600 }}>{detailJob.workplaceType}</span>
              <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 8, background: '#ecfdf5', color: '#047857', fontWeight: 600 }}>{detailJob.jobType}</span>
              {detailJob.salary && <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 8, background: '#fef3c7', color: '#b45309', fontWeight: 600 }}>{detailJob.salary}</span>}
            </div>

            <div style={{ marginBottom: 18 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#111827', marginBottom: 8 }}>About the Role</h4>
              <p style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.65, whiteSpace: 'pre-line' }}>{detailJob.description}</p>
            </div>

            {detailJob.requirements && (
              <div style={{ marginBottom: 18 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#111827', marginBottom: 8 }}>Requirements</h4>
                <p style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.65, whiteSpace: 'pre-line' }}>{detailJob.requirements}</p>
              </div>
            )}

            {detailJob.deadline && (
              <div style={{ marginBottom: 18, padding: '10px 14px', borderRadius: 8, background: '#fef3c7', border: '1px solid #fde68a', fontSize: 13, fontWeight: 600, color: '#b45309' }}>
                Application Deadline: {detailJob.deadline}
              </div>
            )}

            {detailJob.externalUrl && (
              <div style={{ marginBottom: 18 }}>
                <a href={detailJob.externalUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#16428c', fontWeight: 600 }}>
                  View External Job Listing ↗
                </a>
              </div>
            )}

            {/* Alumni info */}
            <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 2 }}>POSTED BY ALUMNI</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{detailJob.alumni?.name || 'Verified Alumni'}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{detailJob.alumni?.jobTitle || 'Professional'} at {detailJob.company}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
              <button className="btn btn-ghost" onClick={() => setDetailJob(null)}>Close</button>
              {appliedIds.has(detailJob.id) || detailJob.hasApplied ? (
                <span style={{ padding: '9px 18px', borderRadius: 8, background: '#ecfdf5', color: '#059669', fontWeight: 700, fontSize: 13, border: '1px solid #a7f3d0' }}>✓ Already Applied</span>
              ) : (
                <button className="btn btn-primary" onClick={() => openApply(detailJob)} style={{ background: '#16428c', fontWeight: 700 }}>
                  Apply for this Role →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ APPLY MODAL ══════════════ */}
      {applyJob && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setApplyJob(null) }}>
          <div style={{ width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 16, padding: '28px 32px', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#16428c', textTransform: 'uppercase' }}>Submit Application</span>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: '2px 0 0' }}>{applyJob.title}</h2>
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>at <strong>{applyJob.company}</strong> • {applyJob.location}</div>
              </div>
              <button onClick={() => setApplyJob(null)} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', fontSize: 17, color: '#4b5563', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            {applyErr && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                {applyErr}
              </div>
            )}

            <form onSubmit={handleSubmitApp}>
              {/* Applicant preview */}
              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 2 }}>APPLICANT</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{user?.name} ({user?.email})</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{user?.major || 'Student'}{user?.graduationYear ? ` • Graduating ${user.graduationYear}` : ''}</div>
              </div>

              {/* Cover Note */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Cover Note / Pitch</label>
                <textarea
                  rows={4}
                  placeholder="Introduce yourself, mention relevant skills, projects, or why you are excited about this role…"
                  value={coverNote}
                  onChange={e => setCoverNote(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, fontFamily: 'inherit' }}
                />
              </div>

              {/* Resume Upload */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Resume / CV</label>
                <div
                  style={{ border: '2px dashed #cbd5e1', borderRadius: 10, padding: 20, textAlign: 'center', background: '#f8fafc', cursor: 'pointer' }}
                  onClick={() => document.getElementById('resume-upload-input').click()}
                >
                  <input id="resume-upload-input" type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={handleFileChange} />
                  {uploadingFile ? (
                    <div style={{ color: '#2563eb', fontSize: 13, fontWeight: 600 }}>Uploading…</div>
                  ) : uploadedResume ? (
                    <div style={{ color: '#059669', fontSize: 13, fontWeight: 600 }}>
                      {uploadedResume.name} ({uploadedResume.size})
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>Click to replace</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#16428c' }}>Click to attach resume</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>PDF, DOC, DOCX — up to 20 MB</div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setApplyJob(null)} disabled={submitting}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting || uploadingFile} style={{ fontWeight: 700, minWidth: 160, background: '#16428c' }}>
                  {submitting ? 'Submitting…' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
