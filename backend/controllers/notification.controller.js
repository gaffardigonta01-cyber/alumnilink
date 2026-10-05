import { Op } from 'sequelize';
import { Notification, Session, User } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

// Helper to auto-generate meeting reminders
const ensureMeetingReminders = async (user) => {
  try {
    const isAlumni = user.role === 'alumni';
    const where = isAlumni
      ? { alumniId: user.id }
      : { studentId: user.id };

    const upcomingSessions = await Session.findAll({
      where: {
        ...where,
        status: { [Op.ne]: 'cancelled' },
      },
      include: [
        { model: User, as: 'student', attributes: ['id', 'name', 'avatar'] },
        { model: User, as: 'alumni', attributes: ['id', 'name', 'avatar'] },
      ],
      order: [['date', 'ASC']],
    });

    for (const s of upcomingSessions) {
      // Check if reminder already exists
      const existing = await Notification.findOne({
        where: {
          userId: user.id,
          type: 'session_reminder',
          [Op.and]: [
            { 'metadata.sessionId': s.id }
          ]
        }
      });

      if (!existing) {
        const partner = isAlumni ? s.student : s.alumni;
        const partnerName = partner?.name || (isAlumni ? 'Student' : 'Mentor');
        const formattedDate = s.date
          ? new Date(s.date).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            })
          : 'Upcoming';

        await Notification.create({
          userId: user.id,
          type: 'session_reminder',
          title: 'Mentorship Meeting Reminder',
          body: `You have an upcoming session with ${partnerName} on ${formattedDate} (${s.platform || 'Google Meet'}). Topic: "${s.topic}".`,
          action: isAlumni ? '/bookings' : '/book-session',
          avatar: partnerName.slice(0, 2).toUpperCase(),
          avatarColor: isAlumni ? '#16428c' : '#d4af37',
          read: false,
          metadata: { sessionId: s.id }
        });
      }
    }
  } catch (err) {
    console.error('Error generating meeting reminders:', err.message);
  }
};

const formatTimeAgo = (date) => {
  if (!date) return 'Recently';
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const getNotifications = asyncHandler(async (req, res) => {
  // Check and create meeting reminders for any sessions
  await ensureMeetingReminders(req.user);

  const rawNotifications = await Notification.findAll({
    where: { userId: req.user.id },
    order: [['createdAt', 'DESC']],
  });

  const notifications = rawNotifications.map(n => {
    const json = n.toJSON();
    return {
      ...json,
      time: formatTimeAgo(n.createdAt),
    };
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  res.status(200).json({
    success: true,
    notifications,
    unreadCount,
  });
});

export const markNotificationRead = asyncHandler(async (req, res, next) => {
  const notif = await Notification.findOne({
    where: { id: req.params.id, userId: req.user.id }
  });
  if (!notif) return next(new AppError('Notification not found.', 404));

  notif.read = true;
  await notif.save();

  res.status(200).json({ success: true, notification: notif });
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.update(
    { read: true },
    { where: { userId: req.user.id } }
  );

  res.status(200).json({ success: true, message: 'All notifications marked as read.' });
});

export const deleteNotification = asyncHandler(async (req, res, next) => {
  const notif = await Notification.findOne({
    where: { id: req.params.id, userId: req.user.id }
  });
  if (!notif) return next(new AppError('Notification not found.', 404));

  await notif.destroy();
  res.status(200).json({ success: true, message: 'Notification removed.' });
});
