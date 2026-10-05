import { Op } from 'sequelize';
import { Message, User, Notification } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

export const getThreads = asyncHandler(async (req, res) => {
  const uid = req.user.id;

  const msgs = await Message.findAll({
    where: {
      [Op.or]: [{ senderId: uid }, { recipientId: uid }],
    },
    include: [
      { model: User, as: 'sender', attributes: ['id', 'name', 'avatar', 'role', 'jobTitle', 'company'] },
      { model: User, as: 'recipient', attributes: ['id', 'name', 'avatar', 'role', 'jobTitle', 'company'] },
    ],
    order: [['createdAt', 'DESC']],
  });

  const threadMap = {};
  for (const m of msgs) {
    const partner = Number(m.senderId) === Number(uid) ? m.recipient : m.sender;
    if (!partner) continue;
    const pid = String(partner.id);
    if (!threadMap[pid]) {
      const unread = await Message.count({
        where: { senderId: partner.id, recipientId: uid, read: false },
      });
      threadMap[pid] = {
        partnerId: pid,
        partnerName: partner.name,
        partnerAvatar: partner.avatar,
        partnerRole: partner.jobTitle ? `${partner.jobTitle} at ${partner.company}` : partner.role,
        lastMessage: m.text,
        lastTime: m.createdAt,
        unread,
      };
    }
  }

  res.status(200).json({ success: true, threads: Object.values(threadMap) });
});

export const getConversation = asyncHandler(async (req, res, next) => {
  const uid = req.user.id;
  const { partnerId } = req.params;

  const partner = await User.findByPk(partnerId, {
    attributes: ['id', 'name', 'avatar', 'role', 'jobTitle', 'company'],
  });
  if (!partner) return next(new AppError('User not found.', 404));

  const messages = await Message.findAll({
    where: {
      [Op.or]: [
        { senderId: uid, recipientId: partnerId },
        { senderId: partnerId, recipientId: uid },
      ],
    },
    include: [
      { model: User, as: 'sender', attributes: ['id', 'name', 'avatar', 'role'] },
      { model: User, as: 'recipient', attributes: ['id', 'name', 'avatar', 'role'] },
    ],
    order: [['createdAt', 'ASC']],
  });

  await Message.update(
    { read: true },
    { where: { senderId: partnerId, recipientId: uid, read: false } }
  );

  res.status(200).json({ success: true, messages, partner });
});

export const sendMessage = asyncHandler(async (req, res, next) => {
  const text = (req.body.text || req.body.content || '').trim();
  if (!text) return next(new AppError('Message text is required.', 400));

  const partnerId = req.params.partnerId || req.body.receiverId || req.body.partnerId || req.body.recipientId;
  if (!partnerId) return next(new AppError('Recipient ID is required.', 400));

  const partner = await User.findByPk(partnerId);
  if (!partner) return next(new AppError('Recipient not found.', 404));

  const message = await Message.create({
    senderId: req.user.id,
    recipientId: partner.id,
    text,
  });

  const fullMessage = await Message.findByPk(message.id, {
    include: [
      { model: User, as: 'sender', attributes: ['id', 'name', 'avatar', 'role'] },
      { model: User, as: 'recipient', attributes: ['id', 'name', 'avatar', 'role'] },
    ],
  });

  // Notification for recipient
  try {
    const senderName = req.user.name || 'Someone';
    await Notification.create({
      userId: partner.id,
      type: 'message',
      title: `💬 New Message from ${senderName}`,
      body: text.length > 80 ? `${text.slice(0, 80)}...` : text,
      action: req.user.role === 'student' ? '/alumni/messages' : '/messages',
      avatar: senderName.slice(0, 2).toUpperCase(),
      avatarColor: '#16428c',
      read: false,
    });
  } catch (e) {
    // Ignore notification errors
  }

  res.status(201).json({ success: true, message: fullMessage });
});

