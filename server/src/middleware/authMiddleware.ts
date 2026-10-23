import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { AppError } from './errorHandler';
import { AuthRequest, AuthUser } from '../types/auth';

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      throw new AppError('Authentication required. Please log in.', 401);
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new AppError('Session expired. Please log in again.', 401, { expired: true });
      }
      throw new AppError('Invalid authentication token.', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        studentProfile: { select: { id: true } },
        teacherProfile: { select: { id: true } },
      },
    });

    if (!user) {
      throw new AppError('User account not found.', 401);
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError(`Your account is ${user.status.toLowerCase()}. Please contact the administrator.`, 403);
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      role: user.role as 'ADMIN' | 'TEACHER' | 'STUDENT',
      status: user.status,
      studentId: user.studentProfile?.id,
      teacherId: user.teacherProfile?.id,
    };

    req.user = authUser;
    next();
  } catch (error) {
    next(error);
  }
};
