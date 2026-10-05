import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class Resource extends Model { }

Resource.init(
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
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    category: {
      type: DataTypes.STRING(100),
      defaultValue: 'Career Guidance',
    },
    type: {
      type: DataTypes.STRING(50),
      defaultValue: 'Guide',
    },
    url: {
      type: DataTypes.STRING(500),
      defaultValue: '',
    },
    tags: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    uploaderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    likes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    downloads: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: 'Resource',
    tableName: 'resources',
  }
);

export default Resource;
