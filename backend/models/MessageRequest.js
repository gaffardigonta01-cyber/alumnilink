import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class MessageRequest extends Model {}

MessageRequest.init(
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
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'declined'),
      defaultValue: 'pending',
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'MessageRequest',
    tableName: 'message_requests',
    indexes: [
      {
        unique: true,
        fields: ['studentId', 'alumniId'],
      },
    ],
  }
);

export default MessageRequest;
