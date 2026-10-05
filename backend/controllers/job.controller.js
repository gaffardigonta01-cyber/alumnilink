import { Op } from 'sequelize';
import { Job, JobApplication, User, Notification } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

// ── GET /api/jobs  (All active jobs for students; filtered by alumni for my-jobs) ──────────────
export const getJobs = asyncHandler(async (req, res) => {
  const { search, type, workplaceType } = req.query;

  const where = { status: 'active' };
  if (type && type !== 'All') where.jobType = type;
  if (workplaceType && workplaceType !== 'All') where.workplaceType = workplaceType;
  if (search && search.trim()) {
    const q = `%${search.trim()}%`;
    where[Op.or] = [
      { title: { [Op.like]: q } },
      { company: { [Op.like]: q } },
      { location: { [Op.like]: q } },
      { description: { [Op.like]: q } },
    ];
  }

  const jobs = await Job.findAll({
    where,
    include: [
      { model: User, as: 'alumni', attributes: ['id', 'name', 'email', 'avatar', 'company', 'jobTitle'] },
      { model: JobApplication, as: 'applications', attributes: ['id', 'studentId', 'status'] },
    ],
    order: [['createdAt', 'DESC']],
  });

  const result = jobs.map(j => {
    const plain = j.toJSON();
    const myApp = (plain.applications || []).find(a => a.studentId === req.user.id);
    return {
      ...plain,
      applicantsCount: plain.applications.length,
      hasApplied: Boolean(myApp),
      myApplicationStatus: myApp ? myApp.status : null,
    };
  });

  res.status(200).json({ success: true, jobs: result });
});

// ── GET /api/jobs/my-jobs  (Alumni's own postings with applicant details) ───────────────────────
export const getMyJobs = asyncHandler(async (req, res) => {
  const jobs = await Job.findAll({
    where: { alumniId: req.user.id },
    include: [
      {
        model: JobApplication,
        as: 'applications',
        include: [
          { model: User, as: 'student', attributes: ['id', 'name', 'email', 'avatar', 'major', 'graduationYear', 'headline', 'bio'] },
        ],
      },
    ],
    order: [['createdAt', 'DESC']],
  });
  res.status(200).json({ success: true, jobs });
});

// ── GET /api/jobs/my-applications  (Student's submitted applications) ─────────────────────────
export const getMyApplications = asyncHandler(async (req, res) => {
  const applications = await JobApplication.findAll({
    where: { studentId: req.user.id },
    include: [
      {
        model: Job,
        as: 'job',
        include: [{ model: User, as: 'alumni', attributes: ['id', 'name', 'email', 'avatar', 'company', 'jobTitle'] }],
      },
    ],
    order: [['createdAt', 'DESC']],
  });
  res.status(200).json({ success: true, applications });
});

// ── POST /api/jobs  (Alumni creates a job posting) ──────────────────────────────────────────────
export const createJob = asyncHandler(async (req, res, next) => {
  const { title, company, location, workplaceType, jobType, experienceLevel, salary, description, requirements, deadline, externalUrl } = req.body;
  if (!title || !company || !description) {
    return next(new AppError('Title, company, and description are required.', 400));
  }

  const job = await Job.create({
    alumniId: req.user.id,
    title,
    company,
    location: location || 'Remote',
    workplaceType: workplaceType || 'Remote',
    jobType: jobType || 'Full-time',
    experienceLevel: experienceLevel || 'Entry-level',
    salary: salary || '',
    description,
    requirements: requirements || '',
    deadline: deadline || '',
    externalUrl: externalUrl || '',
    status: 'active',
  });

  const full = await Job.findByPk(job.id, {
    include: [{ model: User, as: 'alumni', attributes: ['id', 'name', 'email', 'company', 'jobTitle'] }],
  });
  res.status(201).json({ success: true, job: full });
});

// ── PUT /api/jobs/:id  (Alumni updates their posting) ──────────────────────────────────────────
export const updateJob = asyncHandler(async (req, res, next) => {
  const job = await Job.findByPk(req.params.id);
  if (!job) return next(new AppError('Job not found.', 404));
  if (job.alumniId !== req.user.id) return next(new AppError('Unauthorized.', 403));

  const fields = ['title', 'company', 'location', 'workplaceType', 'jobType', 'experienceLevel', 'salary', 'description', 'requirements', 'deadline', 'externalUrl', 'status'];
  fields.forEach(f => { if (req.body[f] !== undefined) job[f] = req.body[f]; });
  await job.save();

  res.status(200).json({ success: true, job });
});

// ── DELETE /api/jobs/:id  (Alumni deletes their posting) ───────────────────────────────────────
export const deleteJob = asyncHandler(async (req, res, next) => {
  const job = await Job.findByPk(req.params.id);
  if (!job) return next(new AppError('Job not found.', 404));
  if (job.alumniId !== req.user.id) return next(new AppError('Unauthorized.', 403));
  await job.destroy();
  res.status(200).json({ success: true, message: 'Job deleted.' });
});

// ── POST /api/jobs/:id/apply  (Student applies for a job) ──────────────────────────────────────
export const applyForJob = asyncHandler(async (req, res, next) => {
  const job = await Job.findByPk(req.params.id, {
    include: [{ model: User, as: 'alumni', attributes: ['id', 'name'] }],
  });
  if (!job) return next(new AppError('Job not found.', 404));
  if (job.status !== 'active') return next(new AppError('This job is no longer accepting applications.', 400));

  const existing = await JobApplication.findOne({ where: { jobId: job.id, studentId: req.user.id } });
  if (existing) return next(new AppError('You have already applied for this job.', 400));

  const { coverNote, resumeUrl, resumeName } = req.body;
  const application = await JobApplication.create({
    jobId: job.id,
    studentId: req.user.id,
    coverNote: coverNote || '',
    resumeUrl: resumeUrl || '',
    resumeName: resumeName || '',
    status: 'applied',
  });

  // Notify alumni
  try {
    await Notification.create({
      userId: job.alumniId,
      type: 'referral',
      title: '💼 New Job Application',
      body: `${req.user.name} applied for your "${job.title}" position at ${job.company}.`,
      action: '/jobs',
      avatar: req.user.name.slice(0, 2).toUpperCase(),
      avatarColor: '#16428c',
      read: false,
      metadata: JSON.stringify({ jobId: job.id, applicationId: application.id }),
    });
  } catch (e) { /* non-fatal */ }

  res.status(201).json({ success: true, application });
});

// ── PUT /api/jobs/applications/:id/status  (Alumni updates applicant status) ───────────────────
export const updateApplicationStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  const app = await JobApplication.findByPk(req.params.id, {
    include: [{ model: Job, as: 'job' }],
  });
  if (!app) return next(new AppError('Application not found.', 404));
  if (app.job.alumniId !== req.user.id) return next(new AppError('Unauthorized.', 403));

  app.status = status;
  await app.save();

  // Notify student
  try {
    const label = status.replace('_', ' ');
    await Notification.create({
      userId: app.studentId,
      type: 'referral',
      title: '💼 Application Status Updated',
      body: `Your application for "${app.job.title}" at ${app.job.company} is now ${label}.`,
      action: '/jobs',
      avatar: req.user.name.slice(0, 2).toUpperCase(),
      avatarColor: '#d4af37',
      read: false,
      metadata: JSON.stringify({ jobId: app.jobId, applicationId: app.id }),
    });
  } catch (e) { /* non-fatal */ }

  res.status(200).json({ success: true, application: app });
});
