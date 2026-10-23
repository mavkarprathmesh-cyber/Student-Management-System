import { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  status: string;
  studentId?: string;
  teacherId?: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}
