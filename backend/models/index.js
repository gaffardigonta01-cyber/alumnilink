import User from './User.js';
import Session from './Session.js';
import Referral from './Referral.js';
import Message from './Message.js';
import Resource from './Resource.js';
import Notification from './Notification.js';
import Job from './Job.js';
import JobApplication from './JobApplication.js';
import MessageRequest from './MessageRequest.js';

// User <-> MessageRequest
User.hasMany(MessageRequest, { as: 'sentMessageRequests', foreignKey: 'studentId', onDelete: 'CASCADE' });
User.hasMany(MessageRequest, { as: 'receivedMessageRequests', foreignKey: 'alumniId', onDelete: 'CASCADE' });
MessageRequest.belongsTo(User, { as: 'student', foreignKey: 'studentId' });
MessageRequest.belongsTo(User, { as: 'alumni', foreignKey: 'alumniId' });

// User <-> Notification
User.hasMany(Notification, { as: 'notifications', foreignKey: 'userId', onDelete: 'CASCADE' });
Notification.belongsTo(User, { as: 'user', foreignKey: 'userId' });

// User <-> Session
User.hasMany(Session, { as: 'studentSessions', foreignKey: 'studentId', onDelete: 'CASCADE' });
User.hasMany(Session, { as: 'alumniSessions', foreignKey: 'alumniId', onDelete: 'CASCADE' });
Session.belongsTo(User, { as: 'student', foreignKey: 'studentId' });
Session.belongsTo(User, { as: 'alumni', foreignKey: 'alumniId' });

// User <-> Referral
User.hasMany(Referral, { as: 'studentReferrals', foreignKey: 'studentId', onDelete: 'CASCADE' });
User.hasMany(Referral, { as: 'alumniReferrals', foreignKey: 'alumniId', onDelete: 'CASCADE' });
Referral.belongsTo(User, { as: 'student', foreignKey: 'studentId' });
Referral.belongsTo(User, { as: 'alumni', foreignKey: 'alumniId' });

// User <-> Message
User.hasMany(Message, { as: 'sentMessages', foreignKey: 'senderId', onDelete: 'CASCADE' });
User.hasMany(Message, { as: 'receivedMessages', foreignKey: 'recipientId', onDelete: 'CASCADE' });
Message.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });
Message.belongsTo(User, { as: 'recipient', foreignKey: 'recipientId' });

// User <-> Resource
User.hasMany(Resource, { as: 'resources', foreignKey: 'uploaderId', onDelete: 'CASCADE' });
Resource.belongsTo(User, { as: 'uploader', foreignKey: 'uploaderId' });

// Alumni (User) <-> Job
User.hasMany(Job, { as: 'postedJobs', foreignKey: 'alumniId', onDelete: 'CASCADE' });
Job.belongsTo(User, { as: 'alumni', foreignKey: 'alumniId' });

// Job <-> JobApplication
Job.hasMany(JobApplication, { as: 'applications', foreignKey: 'jobId', onDelete: 'CASCADE' });
JobApplication.belongsTo(Job, { as: 'job', foreignKey: 'jobId' });

// Student (User) <-> JobApplication
User.hasMany(JobApplication, { as: 'jobApplications', foreignKey: 'studentId', onDelete: 'CASCADE' });
JobApplication.belongsTo(User, { as: 'student', foreignKey: 'studentId' });

export { User, Session, Referral, Message, Resource, Notification, Job, JobApplication, MessageRequest };
