import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class Notification extends Model {}

Notification.init(
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
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING(50),
      defaultValue: 'general',
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    action: {
      type: DataTypes.STRING(255),
      defaultValue: '/notifications',
    },
    avatar: {
      type: DataTypes.STRING(20),
      defaultValue: 'AL',
    },
    avatarColor: {
      type: DataTypes.STRING(50),
      defaultValue: '#d4af37',
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
  },
  {
    sequelize,
    modelName: 'Notification',
    tableName: 'notifications',
  }
);

export default Notification;
