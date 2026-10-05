import { Sequelize } from 'sequelize';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const {
  DB_HOST = 'localhost',
  DB_PORT = 3306,
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_NAME = 'alumnilink',
} = process.env;

const ensureDatabase = async () => {
  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
  });
  await connection.query('CREATE DATABASE IF NOT EXISTS `' + DB_NAME + '`;');
  await connection.end();
};

export const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: Number(DB_PORT),
  dialect: 'mysql',
  logging: false,
  define: {
    timestamps: true,
  },
});

export const connectDB = async () => {
  try {
    await ensureDatabase();
    await sequelize.authenticate();
    console.log('✅ MySQL Connected: ' + DB_HOST + ':' + DB_PORT + ' (Database: ' + DB_NAME + ')');

    // Import all models and associations
    await import('../models/index.js');
    await sequelize.sync({ alter: true });
    console.log('✅ MySQL Tables Synchronized');
  } catch (error) {
    console.error('❌ MySQL connection error:', error.message);
    process.exit(1);
  }
};

export default sequelize;
