import dotenv from 'dotenv';
dotenv.config();

import { connectDB, sequelize } from './config/db.js';
import { User, Session, Referral, Message, Resource } from './models/index.js';

const seedData = async () => {
  try {
    console.log('Connecting to MySQL database...');
    await connectDB();

    console.log('Clearing old records...');
    await Message.destroy({ where: {}, force: true });
    await Referral.destroy({ where: {}, force: true });
    await Session.destroy({ where: {}, force: true });
    await Resource.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    console.log('Creating demo users...');
    const student = await User.create({
      name: 'Tanvir Ahmed',
      email: 'student@test.com',
      password: 'password123',
      role: 'student',
      bio: 'Senior CS student aspiring to be a Full-Stack Software Engineer.',
      major: 'Computer Science & Engineering',
      graduationYear: 2026,
      gpa: 3.85,
    });

    const alumni1 = await User.create({
      name: 'Dr. Tariq Rahman',
      email: 'alumni@test.com',
      password: 'password123',
      role: 'alumni',
      bio: 'Staff Software Architect at Google Cloud with 12+ years experience in distributed systems.',
      company: 'Google',
      jobTitle: 'Staff Software Engineer',
      industry: 'Cloud & Distributed Systems',
      skills: ['System Design', 'Go', 'Kubernetes', 'Microservices', 'Mentorship'],
      isAvailableForMentorship: true,
      isAvailableForReferral: true,
    });

    const alumni2 = await User.create({
      name: 'Nusrat Jahan',
      email: 'nusrat@test.com',
      password: 'password123',
      role: 'alumni',
      bio: 'Senior Product Designer at Pathao. Passionate about UX research and product growth.',
      company: 'Pathao',
      jobTitle: 'Senior Product Designer',
      industry: 'Design & UX',
      skills: ['Figma', 'Design Systems', 'User Research', 'Prototyping'],
      isAvailableForMentorship: true,
      isAvailableForReferral: true,
    });

    const alumni3 = await User.create({
      name: 'Zubair Hossain',
      email: 'zubair@test.com',
      password: 'password123',
      role: 'alumni',
      bio: 'Engineering Lead at Uber. Ex-Grab. Love helping students ace technical interviews.',
      company: 'Uber',
      jobTitle: 'Engineering Lead',
      industry: 'Software Engineering',
      skills: ['Distributed Systems', 'Algorithms', 'Java', 'High Scale Architecture'],
      isAvailableForMentorship: true,
      isAvailableForReferral: false,
    });

    console.log('Creating sample resources...');
    await Resource.create({
      title: 'System Design Interview Handbook',
      description: 'A comprehensive guide on high-scale architecture, caching strategies, and database sharding.',
      category: 'Interview Prep',
      type: 'Guide',
      url: 'https://github.com/donnemartin/system-design-primer',
      uploaderId: alumni1.id,
      likes: 42,
      downloads: 128,
    });

    await Resource.create({
      title: 'Modern Full-Stack React & Node Roadmap 2026',
      description: 'Curated learning path covering modern frontend, backend, security, and cloud deployment.',
      category: 'Career Guidance',
      type: 'Roadmap',
      url: 'https://roadmap.sh/full-stack',
      uploaderId: alumni1.id,
      likes: 29,
      downloads: 95,
    });

    await Resource.create({
      title: 'UI/UX Portfolio & Case Study Template',
      description: 'Figma kit and presentation guidelines for product design interviews.',
      category: 'Design',
      type: 'Template',
      url: 'https://figma.com',
      uploaderId: alumni2.id,
      likes: 18,
      downloads: 64,
    });

    console.log('Creating sample session...');
    await Session.create({
      studentId: student.id,
      alumniId: alumni1.id,
      topic: 'System Design Mock Interview & Career Path',
      date: new Date(Date.now() + 86400000 * 2),
      platform: 'Google Meet',
      status: 'confirmed',
      note: 'Looking forward to going over distributed caching patterns.',
    });

    console.log('Creating sample referral...');
    await Referral.create({
      studentId: student.id,
      alumniId: alumni1.id,
      company: 'Google',
      jobTitle: 'Associate Software Engineer',
      jobUrl: 'https://careers.google.com/jobs',
      resumeUrl: 'https://example.com/resume.pdf',
      note: 'Hi Dr. Rahman, I would appreciate your referral for this role!',
      status: 'under_review',
    });

    console.log('Creating sample messages...');
    await Message.create({
      senderId: student.id,
      recipientId: alumni1.id,
      text: 'Hi Dr. Rahman! Thank you for accepting my mentorship request.',
    });
    await Message.create({
      senderId: alumni1.id,
      recipientId: student.id,
      text: 'Hi Tanvir! Glad to connect. Feel free to schedule a session whenever you are ready.',
    });

    console.log('\n==========================================');
    console.log('MYSQL SEEDING COMPLETED SUCCESSFULLY!');
    console.log('Demo Student:  student@test.com  /  password123');
    console.log('Demo Alumni:   alumni@test.com   /  password123');
    console.log('==========================================\n');

    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seedData();
