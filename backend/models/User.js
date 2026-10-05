import { DataTypes, Model } from 'sequelize';
import bcrypt from 'bcryptjs';
import { sequelize } from '../config/db.js';

export class User extends Model {
  // Safe comparison
  async comparePassword(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  }

  // Safe object for client
  toPublicJSON() {
    const values = { ...this.get() };
    values._id = values.id;
    delete values.password;
    if (typeof values.availableSlots === 'string') {
      try {
        values.availableSlots = JSON.parse(values.availableSlots);
      } catch {
        values.availableSlots = [];
      }
    }
    if (!Array.isArray(values.availableSlots)) {
      values.availableSlots = [];
    }
    if (typeof values.savedResources === 'string') {
      try {
        values.savedResources = JSON.parse(values.savedResources);
      } catch {
        values.savedResources = [];
      }
    }
    if (!Array.isArray(values.savedResources)) {
      values.savedResources = [];
    }
    return values;
  }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    // Virtual _id for full backward compatibility with frontend expecting MongoDB _id
    _id: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.id;
      },
    },
    name: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('student', 'alumni', 'admin'),
      defaultValue: 'student',
    },
    avatar: {
      type: DataTypes.STRING(255),
      defaultValue: '',
    },
    bio: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    headline: {
      type: DataTypes.STRING(255),
      defaultValue: '',
    },
    location: {
      type: DataTypes.STRING(150),
      defaultValue: '',
    },
    githubUrl: {
      type: DataTypes.STRING(255),
      defaultValue: '',
    },
    major: {
      type: DataTypes.STRING(100),
      defaultValue: '',
    },
    graduationYear: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    gpa: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    company: {
      type: DataTypes.STRING(100),
      defaultValue: '',
    },
    jobTitle: {
      type: DataTypes.STRING(100),
      defaultValue: '',
    },
    industry: {
      type: DataTypes.STRING(100),
      defaultValue: '',
    },
    linkedinUrl: {
      type: DataTypes.STRING(255),
      defaultValue: '',
    },
    skills: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    isAvailableForMentorship: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isAvailableForReferral: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    availableSlots: {
      type: DataTypes.JSON,
      defaultValue: [],
      get() {
        const raw = this.getDataValue('availableSlots');
        if (!raw) return [];
        if (typeof raw === 'string') {
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        }
        return Array.isArray(raw) ? raw : [];
      },
      set(val) {
        if (typeof val === 'string') {
          try {
            const parsed = JSON.parse(val);
            this.setDataValue('availableSlots', Array.isArray(parsed) ? parsed : []);
          } catch {
            this.setDataValue('availableSlots', []);
          }
        } else if (Array.isArray(val)) {
          this.setDataValue('availableSlots', val);
        } else {
          this.setDataValue('availableSlots', []);
        }
      },
    },
    savedResources: {
      type: DataTypes.JSON,
      defaultValue: [],
      get() {
        const raw = this.getDataValue('savedResources');
        if (!raw) return [];
        if (typeof raw === 'string') {
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        }
        return Array.isArray(raw) ? raw : [];
      },
      set(val) {
        if (typeof val === 'string') {
          try {
            const parsed = JSON.parse(val);
            this.setDataValue('savedResources', Array.isArray(parsed) ? parsed : []);
          } catch {
            this.setDataValue('savedResources', []);
          }
        } else if (Array.isArray(val)) {
          this.setDataValue('savedResources', val);
        } else {
          this.setDataValue('savedResources', []);
        }
      },
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
    },
  }
);

export default User;
