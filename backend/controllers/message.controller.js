import { Op } from 'sequelize';
import { Message, User, Notification, MessageRequest } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

export const getThreads = asyncHandler(async (req, res) => {
  const uid = req.user.id;
  const isAlumni = req.user.role === 'alumni';

  // 1. Fetch all messages involving the current user
  const msgs = await Message.findAll({
    where: {
      [Op.or]: [{ senderId: uid }, { recipientId: uid }],
    },
    include: [
      { model: User, as: 'sender', attributes: ['id', 'name', 'avatar', 'role', 'jobTitle', 'company', 'major', 'graduationYear'] },
      { model: User, as: 'recipient', attributes: ['id', 'name', 'avatar', 'role', 'jobTitle', 'company', 'major', 'graduationYear'] },
    ],
    order: [['createdAt', 'DESC']],
  });

  // 2. Fetch message requests involving current user
  const requests = await MessageRequest.findAll({
    where: isAlumni ? { alumniId: uid } : { studentId: uid },
    include: [
      { model: User, as: 'student', attributes: ['id', 'name', 'avatar', 'role', 'major', 'graduationYear', 'bio', 'gpa'] },
      { model: User, as: 'alumni', attributes: ['id', 'name', 'avatar', 'role', 'jobTitle', 'company'] },
    ],
    order: [['createdAt', 'DESC']],
  });

  const requestMap = {};
  for (const r of requests) {
    const partnerId = isAlumni ? String(r.studentId) : String(r.alumniId);
    requestMap[partnerId] = r;
  }

  const threadMap = {};

  // Build threads from existing messages
  for (const m of msgs) {
    const partner = Number(m.senderId) === Number(uid) ? m.recipient : m.sender;
    if (!partner) continue;
    const pid = String(partner.id);
    if (!threadMap[pid]) {
      const unread = await Message.count({
        where: { senderId: partner.id, recipientId: uid, read: false },
      });

      const reqDoc = requestMap[pid];
      let status = 'accepted';
      if (reqDoc) {
        status = reqDoc.status;
      } else if (isAlumni && Number(m.senderId) !== Number(uid)) {
        // If student messaged alumni but no request record exists, check if alumni ever replied
        const alumniHasReplied = msgs.some(
          x => Number(x.senderId) === Number(uid) && Number(x.recipientId) === Number(partner.id)
        );
        status = alumniHasReplied ? 'accepted' : 'pending';
      }

      threadMap[pid] = {
        partnerId: pid,
        partnerName: partner.name,
        partnerAvatar: partner.avatar,
        partnerRole: partner.jobTitle ? `${partner.jobTitle} at ${partner.company}` : (partner.major ? `${partner.major}` : partner.role),
        lastMessage: m.text,
        lastTime: m.createdAt,
        unread,
        status, // 'pending' | 'accepted' | 'declined'
        studentDetails: partner.role === 'student' ? {
          major: partner.major,
          graduationYear: partner.graduationYear,
        } : null,
      };
    }
  }

  // Also include any message requests that haven't generated standard thread messages yet
  for (const r of requests) {
    const partner = isAlumni ? r.student : r.alumni;
    if (!partner) continue;
    const pid = String(partner.id);
    if (!threadMap[pid]) {
      threadMap[pid] = {
        partnerId: pid,
        partnerName: partner.name,
        partnerAvatar: partner.avatar,
        partnerRole: partner.jobTitle ? `${partner.jobTitle} at ${partner.company}` : (partner.major ? `${partner.major}` : partner.role),
        lastMessage: r.note || 'Message request',
        lastTime: r.createdAt,
        unread: isAlumni && r.status === 'pending' ? 1 : 0,
        status: r.status,
        studentDetails: partner.role === 'student' ? {
          major: partner.major,
          graduationYear: partner.graduationYear,
          bio: partner.bio,
          gpa: partner.gpa,
        } : null,
      };
    }
  }

  res.status(200).json({ success: true, threads: Object.values(threadMap) });
});

export const getConversation = asyncHandler(async (req, res, next) => {
  const uid = req.user.id;
  const { partnerId } = req.params;

  const partner = await User.findByPk(partnerId, {
    attributes: ['id', 'name', 'avatar', 'role', 'jobTitle', 'company', 'major', 'graduationYear', 'bio', 'gpa'],
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

  // Determine message request status
  let messageRequest = null;
  let requestStatus = 'accepted';

  if (req.user.role === 'student' && partner.role === 'alumni') {
    messageRequest = await MessageRequest.findOne({
      where: { studentId: uid, alumniId: partnerId },
    });
    if (messageRequest) {
      requestStatus = messageRequest.status;
    } else if (messages.length === 0) {
      requestStatus = null; // No request initiated yet
    } else {
      // If messages already exist and alumni replied, consider accepted
      const alumniReplied = messages.some(m => Number(m.senderId) === Number(partnerId));
      requestStatus = alumniReplied ? 'accepted' : 'pending';
    }
  } else if (req.user.role === 'alumni' && partner.role === 'student') {
    messageRequest = await MessageRequest.findOne({
      where: { studentId: partnerId, alumniId: uid },
    });
    if (messageRequest) {
      requestStatus = messageRequest.status;
    } else if (messages.length === 0) {
      requestStatus = 'accepted';
    } else {
      const alumniReplied = messages.some(m => Number(m.senderId) === Number(uid));
      requestStatus = alumniReplied ? 'accepted' : 'pending';
    }
  }

  await Message.update(
    { read: true },
    { where: { senderId: partnerId, recipientId: uid, read: false } }
  );

  res.status(200).json({
    success: true,
    messages,
    partner,
    requestStatus,
    messageRequest,
  });
});

export const sendMessage = asyncHandler(async (req, res, next) => {
  const text = (req.body.text || req.body.content || '').trim();
  if (!text) return next(new AppError('Message text is required.', 400));

  const partnerId = req.params.partnerId || req.body.receiverId || req.body.partnerId || req.body.recipientId;
  if (!partnerId) return next(new AppError('Recipient ID is required.', 400));

  const partner = await User.findByPk(partnerId);
  if (!partner) return next(new AppError('Recipient not found.', 404));

  // If student is sending to alumni
  if (req.user.role === 'student' && partner.role === 'alumni') {
    let messageRequest = await MessageRequest.findOne({
      where: { studentId: req.user.id, alumniId: partner.id },
    });

    if (!messageRequest) {
      // Check if there was already previous conversation
      const existingMsgCount = await Message.count({
        where: {
          [Op.or]: [
            { senderId: req.user.id, recipientId: partner.id },
            { senderId: partner.id, recipientId: req.user.id },
          ],
        },
      });

      if (existingMsgCount === 0) {
        // Initial message from student: Route to Message Requests queue!
        messageRequest = await MessageRequest.create({
          studentId: req.user.id,
          alumniId: partner.id,
          status: 'pending',
          note: text,
        });

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

        // Notify alumni of new Message Request
        try {
          const senderName = req.user.name || 'A Student';
          await Notification.create({
            userId: partner.id,
            type: 'message',
            title: `📩 New Message Request from ${senderName}`,
            body: `${senderName} sent a message request: "${text.length > 70 ? text.slice(0, 70) + '...' : text}"`,
            action: '/messages',
            avatar: senderName.slice(0, 2).toUpperCase(),
            avatarColor: '#d4af37',
            read: false,
          });
        } catch (e) {
          // ignore
        }

        return res.status(201).json({
          success: true,
          message: fullMessage,
          requestStatus: 'pending',
          channelEstablished: false,
          notice: 'Message request sent! Routed to alumni Message Requests queue.',
        });
      } else {
        // Conversation already existed
        messageRequest = await MessageRequest.create({
          studentId: req.user.id,
          alumniId: partner.id,
          status: 'accepted',
          note: text,
        });
      }
    } else if (messageRequest.status === 'pending') {
      return next(new AppError('Your message request is pending alumni approval. A direct conversation channel is not yet established.', 403));
    } else if (messageRequest.status === 'declined') {
      return next(new AppError('This message request was declined by the alumni.', 403));
    }
  }

  // If alumni is sending to student who has a pending request
  if (req.user.role === 'alumni' && partner.role === 'student') {
    const messageRequest = await MessageRequest.findOne({
      where: { studentId: partner.id, alumniId: req.user.id },
    });

    if (messageRequest && messageRequest.status === 'pending') {
      // Alumni replying auto-accepts the request and establishes the channel
      messageRequest.status = 'accepted';
      await messageRequest.save();

      try {
        await Notification.create({
          userId: partner.id,
          type: 'message',
          title: `🎉 Message Request Accepted!`,
          body: `${req.user.name} accepted your request and sent a message.`,
          action: '/messages',
          avatar: (req.user.name || 'AL').slice(0, 2).toUpperCase(),
          avatarColor: '#16428c',
          read: false,
        });
      } catch (e) {}
    } else if (messageRequest && messageRequest.status === 'declined') {
      return next(new AppError('You declined this message request. Please accept it first to chat.', 403));
    }
  }

  // Save the message
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
      action: req.user.role === 'student' ? '/messages' : '/messages',
      avatar: senderName.slice(0, 2).toUpperCase(),
      avatarColor: '#16428c',
      read: false,
    });
  } catch (e) {
    // Ignore notification errors
  }

  res.status(201).json({ success: true, message: fullMessage, requestStatus: 'accepted', channelEstablished: true });
});

export const acceptRequest = asyncHandler(async (req, res, next) => {
  const alumniId = req.user.id;
  const { partnerId } = req.params;

  let messageRequest = await MessageRequest.findOne({
    where: { studentId: partnerId, alumniId },
  });

  if (!messageRequest) {
    // If request record didn't exist yet, create accepted record
    messageRequest = await MessageRequest.create({
      studentId: partnerId,
      alumniId,
      status: 'accepted',
    });
  } else {
    messageRequest.status = 'accepted';
    await messageRequest.save();
  }

  // Notify student
  try {
    const alumniName = req.user.name || 'Alumni Mentor';
    await Notification.create({
      userId: partnerId,
      type: 'message',
      title: `🎉 Message Request Accepted!`,
      body: `${alumniName} accepted your message request. Your direct conversation channel is now open!`,
      action: '/messages',
      avatar: alumniName.slice(0, 2).toUpperCase(),
      avatarColor: '#16428c',
      read: false,
    });
  } catch (e) {
    // ignore
  }

  res.status(200).json({
    success: true,
    message: 'Message request accepted. Direct conversation channel established.',
    requestStatus: 'accepted',
  });
});

export const declineRequest = asyncHandler(async (req, res, next) => {
  const alumniId = req.user.id;
  const { partnerId } = req.params;

  let messageRequest = await MessageRequest.findOne({
    where: { studentId: partnerId, alumniId },
  });

  if (!messageRequest) {
    messageRequest = await MessageRequest.create({
      studentId: partnerId,
      alumniId,
      status: 'declined',
    });
  } else {
    messageRequest.status = 'declined';
    await messageRequest.save();
  }

  // Notify student
  try {
    const alumniName = req.user.name || 'Alumni Mentor';
    await Notification.create({
      userId: partnerId,
      type: 'message',
      title: `Message Request Declined`,
      body: `${alumniName} declined your message request.`,
      action: '/messages',
      avatar: alumniName.slice(0, 2).toUpperCase(),
      avatarColor: '#6b7280',
      read: false,
    });
  } catch (e) {
    // ignore
  }

  res.status(200).json({
    success: true,
    message: 'Message request declined.',
    requestStatus: 'declined',
  });
});

export const getRequestsQueue = asyncHandler(async (req, res) => {
  const uid = req.user.id;

  const requests = await MessageRequest.findAll({
    where: {
      alumniId: uid,
      status: 'pending',
    },
    include: [
      {
        model: User,
        as: 'student',
        attributes: ['id', 'name', 'avatar', 'role', 'major', 'graduationYear', 'bio', 'gpa'],
      },
    ],
    order: [['createdAt', 'DESC']],
  });

  res.status(200).json({ success: true, requests });
});
