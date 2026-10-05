import { randomBytes } from 'crypto';
import { Session, User, Notification } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

export const getSessions = asyncHandler(async (req, res) => {
  const where = req.user.role === 'student'
    ? { studentId: req.user.id }
    : { alumniId: req.user.id };

  const sessions = await Session.findAll({
    where,
    include: [
      { model: User, as: 'student', attributes: ['id', 'name', 'email', 'avatar', 'role', 'major', 'graduationYear'] },
      { model: User, as: 'alumni', attributes: ['id', 'name', 'email', 'avatar', 'role', 'jobTitle', 'company'] },
    ],
    order: [['date', 'ASC']],
  });

  res.status(200).json({ success: true, sessions });
});

export const createSession = asyncHandler(async (req, res, next) => {
  const { alumniId, topic, date, platform, note, slotId } = req.body;
  if (!alumniId || !topic || !date) {
    return next(new AppError('alumniId, topic and date are required.', 400));
  }

  const session = await Session.create({
    studentId: req.user.id,
    alumniId,
    topic,
    date,
    platform: platform || 'Google Meet',
    note: note || '',
  });

  // Consume slot from alumni availability if provided
  try {
    const alumni = await User.findByPk(alumniId);
    if (alumni && Array.isArray(alumni.availableSlots)) {
      if (slotId) {
        alumni.availableSlots = alumni.availableSlots.filter(s => (s.id || s._id) !== slotId && s.formatted !== slotId && s !== slotId);
        alumni.changed('availableSlots', true);
        await alumni.save();
      }
    }

    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const studentName = req.user.name || 'A student';
    const alumniName = alumni?.name || 'Mentor';

    // 1. Notify Alumni
    await Notification.create({
      userId: alumniId,
      type: 'session_booked',
      title: 'New Mentorship Session Booked',
      body: `${studentName} booked a session: "${topic}" on ${formattedDate} (${platform || 'Google Meet'}).`,
      action: '/bookings',
      avatar: studentName.slice(0, 2).toUpperCase(),
      avatarColor: '#16428c',
      read: false,
      metadata: { sessionId: session.id, studentId: req.user.id },
    });

    // 2. Notify Student
    await Notification.create({
      userId: req.user.id,
      type: 'session_confirmed',
      title: 'Mentorship Session Confirmed',
      body: `Your mentorship session with ${alumniName} is scheduled for ${formattedDate} (${platform || 'Google Meet'}).`,
      action: '/book-session',
      avatar: alumniName.slice(0, 2).toUpperCase(),
      avatarColor: '#d4af37',
      read: false,
      metadata: { sessionId: session.id, alumniId },
    });
  } catch (err) {
    console.error('Failed to create session notifications:', err.message);
  }

  const fullSession = await Session.findByPk(session.id, {
    include: [
      { model: User, as: 'alumni', attributes: ['id', 'name', 'email', 'avatar', 'role', 'jobTitle', 'company'] },
    ],
  });

  res.status(201).json({ success: true, session: fullSession });
});

export const updateSessionStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  const session = await Session.findByPk(req.params.id);
  if (!session) return next(new AppError('Session not found.', 404));

  const isOwner = session.studentId === req.user.id || session.alumniId === req.user.id;
  if (!isOwner) return next(new AppError('Not authorized.', 403));

  session.status = status;
  await session.save();

  res.status(200).json({ success: true, session });
});

export const startSession = asyncHandler(async (req, res, next) => {
  const session = await Session.findByPk(req.params.id);
  if (!session) return next(new AppError('Session not found.', 404));
  if (session.alumniId !== req.user.id) {
    return next(new AppError('Only the alumni who owns this session can start it.', 403));
  }

  // Require custom meeting URL provided by the alumni
  const meetingLink = String(req.body.meetingLink || '').trim();
  if (!meetingLink) {
    return next(new AppError('Please provide a meeting link (e.g. Google Meet, Zoom, or Teams URL).', 400));
  }
  if (!/^https?:\/\/\S+$/i.test(meetingLink)) {
    return next(new AppError('Meeting link must start with http:// or https://', 400));
  }

  session.meetingLink = meetingLink;
  session.status = 'confirmed';
  await session.save();

  const alumniName = req.user.name || 'Your mentor';
  await Notification.create({
    userId: session.studentId,
    type: 'session_started',
    title: 'Your mentor started the meeting',
    body: `${alumniName} started the session "${session.topic}". Join here: ${meetingLink}`,
    action: '/book-session',
    avatar: alumniName.slice(0, 2).toUpperCase(),
    avatarColor: '#059669',
    read: false,
    metadata: { sessionId: session.id, alumniId: req.user.id, meetingLink },
  });

  res.status(200).json({ success: true, session, meetingLink });
});

export const joinSession = asyncHandler(async (req, res, next) => {
  const session = await Session.findByPk(req.params.id);
  if (!session) return next(new AppError('Session not found.', 404));
  if (session.studentId !== req.user.id) {
    return next(new AppError('Only the student of this session can join it.', 403));
  }

  // Joining the meeting means the session is no longer "upcoming"
  if (session.status !== 'cancelled') {
    session.status = 'completed';
    await session.save();
  }

  res.status(200).json({ success: true, session });
});

export const deleteSession = asyncHandler(async (req, res, next) => {
  const session = await Session.findByPk(req.params.id);
  if (!session) return next(new AppError('Session not found.', 404));

  const isOwner = session.studentId === req.user.id || session.alumniId === req.user.id;
  if (!isOwner) return next(new AppError('Not authorized.', 403));

  await session.destroy();
  res.status(200).json({ success: true, message: 'Session deleted.' });
});
