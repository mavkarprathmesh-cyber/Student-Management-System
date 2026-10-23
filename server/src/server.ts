import app from './app';
import { env } from './config/env';
import { prisma } from './config/db';
import fs from 'fs';
import path from 'path';

// Ensure upload directory exists
const uploadDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const PORT = parseInt(env.PORT, 10) || 5000;

const server = app.listen(PORT, async () => {
  console.log(`=================================================`);
  console.log(`  Student Management System (SMS) API Server`);
  console.log(`  Running on http://localhost:${PORT}`);
  console.log(`  Health Check: http://localhost:${PORT}/api/health`);
  console.log(`  Environment: ${env.NODE_ENV}`);
  console.log(`=================================================`);

  try {
    await prisma.$connect();
    console.log(`  Connected to database successfully.`);
  } catch (err) {
    console.error(`  Database connection failed:`, err);
  }
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});
