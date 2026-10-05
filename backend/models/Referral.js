import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class Referral extends Model {}

Referral.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    _id: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.id;
      },
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    alumniId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    company: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    jobTitle: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    jobUrl: {
      type: DataTypes.STRING(500),
      defaultValue: '',
    },
    resumeUrl: {
      type: DataTypes.STRING(500),
      defaultValue: '',
    },
    attachmentUrl: {
      type: DataTypes.STRING(500),
      defaultValue: '',
    },
    attachmentName: {
      type: DataTypes.STRING(255),
      defaultValue: '',
    },
    attachmentSize: {
      type: DataTypes.STRING(50),
      defaultValue: '',
    },
    attachments: {
      type: DataTypes.TEXT,
      defaultValue: '[]',
      get() {
        const raw = this.getDataValue('attachments');
        try {
          return raw ? JSON.parse(raw) : [];
        } catch {
          return [];
        }
      },
      set(val) {
        this.setDataValue('attachments', typeof val === 'string' ? val : JSON.stringify(val || []));
      },
    },
    note: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    status: {
      type: DataTypes.ENUM('submitted', 'under_review', 'referred', 'declined'),
      defaultValue: 'submitted',
    },
  },
  {
    sequelize,
    modelName: 'Referral',
    tableName: 'referrals',
  }
);

export default Referral;
