import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

class JobApplication extends Model {}

JobApplication.init(
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
    jobId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    coverNote: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    resumeUrl: {
      type: DataTypes.STRING(500),
      defaultValue: '',
    },
    resumeName: {
      type: DataTypes.STRING(255),
      defaultValue: '',
    },
    status: {
      type: DataTypes.ENUM('applied', 'under_review', 'shortlisted', 'rejected', 'hired'),
      defaultValue: 'applied',
    },
  },
  {
    sequelize,
    modelName: 'JobApplication',
    tableName: 'job_applications',
    indexes: [
      { unique: true, fields: ['jobId', 'studentId'] },
    ],
  }
);

export default JobApplication;
