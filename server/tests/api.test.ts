import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('API Integration Tests', () => {
  let adminToken = '';
  let studentToken = '';

  it('GET /api/health should return ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('uptime');
  });

  it('POST /api/auth/login should reject invalid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@sms.edu',
      password: 'WrongPassword123',
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/login should authenticate Admin successfully', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@sms.edu',
      password: 'Admin@123456',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.role).toBe('ADMIN');
    adminToken = res.body.data.token;
  });

  it('POST /api/auth/login should authenticate Student successfully', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'alex.morgan@sms.edu',
      password: 'Student@123456',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('STUDENT');
    studentToken = res.body.data.token;
  });

  it('GET /api/dashboard/stats should require authentication', async () => {
    const res = await request(app).get('/api/dashboard/stats');
    expect(res.status).toBe(401);
  });

  it('GET /api/dashboard/stats should return real DB metrics for Admin', async () => {
    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.stats.totalStudents).toBeGreaterThan(0);
    expect(res.body.data.stats.totalTeachers).toBeGreaterThan(0);
  });

  it('GET /api/students should list paginated students', async () => {
    const res = await request(app)
      .get('/api/students')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.students)).toBe(true);
    expect(res.body.data.pagination).toHaveProperty('total');
  });

  it('GET /api/fees/student-fees should return fee accounts', async () => {
    const res = await request(app)
      .get('/api/fees/student-fees')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.studentFees)).toBe(true);
  });

  it('Student role should only access authorized data', async () => {
    // Attempting to access admin-only endpoint
    const res = await request(app)
      .get('/api/settings/users')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(403);
  });
});
