import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/db';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import { AuthRequest } from '../../types/auth';
import { logAudit } from '../../utils/auditLogger';

const signTokens = (userId: string, email: string, role: string) => {
  const accessToken = jwt.sign(
    { userId, email, role },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN as any }
  );

  const refreshToken = jwt.sign(
    { userId, email, role },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN as any }
  );

  return { accessToken, refreshToken };
};

export const login = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        studentProfile: {
          select: {
            id: true,
            admissionNumber: true,
            firstName: true,
            lastName: true,
            classId: true,
            courseId: true,
          },
        },
        teacherProfile: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            departmentId: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('Invalid email or password.', 401);
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError(`Account is ${user.status.toLowerCase()}. Please contact admin.`, 403);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401);
    }

    const { accessToken, refreshToken } = signTokens(user.id, user.email, user.role);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Set cookie for refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await logAudit({
      userId: user.id,
      action: 'USER_LOGIN',
      entity: 'User',
      entityId: user.id,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        token: accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          student: user.studentProfile,
          teacher: user.teacherProfile,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.body.refreshToken || req.cookies?.refreshToken;

    if (!token) {
      throw new AppError('Refresh token required.', 401);
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
    } catch (err) {
      throw new AppError('Invalid or expired refresh token. Please log in again.', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        studentProfile: true,
        teacherProfile: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new AppError('User not found or inactive.', 401);
    }

    const tokens = signTokens(user.id, user.email, user.role);

    return res.json({
      success: true,
      data: {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        avatar: true,
        createdAt: true,
        lastLoginAt: true,
        studentProfile: {
          include: {
            class: true,
            course: true,
            department: true,
          },
        },
        teacherProfile: {
          include: {
            department: true,
            assignments: {
              include: {
                subject: true,
                class: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found.', 404);
    }

    return res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      throw new AppError('User not found.', 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Incorrect current password.', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await logAudit({
      userId: user.id,
      action: 'CHANGE_PASSWORD',
      entity: 'User',
      entityId: user.id,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  res.clearCookie('refreshToken');
  if (req.user) {
    await logAudit({
      userId: req.user.id,
      action: 'USER_LOGOUT',
      entity: 'User',
      entityId: req.user.id,
      ipAddress: req.ip,
    });
  }
  return res.json({
    success: true,
    message: 'Logged out successfully',
  });
};

export const initAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existingAdminCount = await prisma.user.count({
      where: { role: 'ADMIN' },
    });

    if (existingAdminCount > 0) {
      throw new AppError('Administrator account already exists. Safe setup is locked.', 403);
    }

    const { email, password } = req.body;
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const admin = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    await logAudit({
      userId: admin.id,
      action: 'INIT_ADMIN',
      entity: 'User',
      entityId: admin.id,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: 'Administrator account created successfully. You can now log in.',
      data: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    next(error);
  }
};
