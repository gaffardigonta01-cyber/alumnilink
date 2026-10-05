import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

class Job extends Model {}

Job.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    _id: {
      type: DataTypes.VIRTUAL,
      get() { return this.id; },
    },
    alumniId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    company: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    location: {
      type: DataTypes.STRING(150),
      defaultValue: 'Remote',
    },
    workplaceType: {
      type: DataTypes.ENUM('Remote', 'On-site', 'Hybrid'),
      defaultValue: 'Remote',
    },
    jobType: {
      type: DataTypes.ENUM('Full-time', 'Part-time', 'Internship', 'Contract'),
      defaultValue: 'Full-time',
    },
    experienceLevel: {
      type: DataTypes.STRING(100),
      defaultValue: 'Entry-level',
    },
    salary: {
      type: DataTypes.STRING(100),
      defaultValue: '',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    requirements: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    deadline: {
      type: DataTypes.STRING(100),
      defaultValue: '',
    },
    externalUrl: {
      type: DataTypes.STRING(500),
      defaultValue: '',
    },
    status: {
      type: DataTypes.ENUM('active', 'closed'),
      defaultValue: 'active',
    },
  },
  {
    sequelize,
    modelName: 'Job',
    tableName: 'jobs',
  }
);

export default Job;
