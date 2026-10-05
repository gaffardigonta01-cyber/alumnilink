import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class Session extends Model {}

Session.init(
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
    topic: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    platform: {
      type: DataTypes.ENUM('Zoom', 'Google Meet', 'In-person'),
      defaultValue: 'Google Meet',
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'completed', 'cancelled'),
      defaultValue: 'pending',
    },
    note: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    meetingLink: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Session',
    tableName: 'sessions',
  }
);

export default Session;
