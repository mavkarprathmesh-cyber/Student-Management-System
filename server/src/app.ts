import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';

import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './modules/auth/auth.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import studentRoutes from './modules/students/student.routes';
import teacherRoutes from './modules/teachers/teacher.routes';
import academicRoutes from './modules/academics/academic.routes';
import attendanceRoutes from './modules/attendance/attendance.routes';
import examinationRoutes from './modules/examinations/examination.routes';
import feeRoutes from './modules/fees/fee.routes';
import announcementRoutes from './modules/announcements/announcement.routes';
import settingsRoutes from './modules/settings/settings.routes';
import reportRoutes from './modules/reports/report.routes';

const app = express();

// Security and utility middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

const allowedOrigins = (env.CLIENT_URL || '')
  .split(',')
  .map((url) => url.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes('*') ||
      allowedOrigins.includes(origin) ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.endsWith('.onrender.com') ||
      origin.endsWith('.vercel.app')
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Serve uploaded files securely
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// Mount application API modules
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/academics', academicRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/examinations', examinationRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportRoutes);

// 404 handler for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.method} ${req.originalUrl} not found.`,
  });
});

// Centralized error handling middleware
app.use(errorHandler);

export default app;
