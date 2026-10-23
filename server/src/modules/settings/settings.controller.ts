import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import { AuthRequest } from '../../types/auth';
import { logAudit } from '../../utils/auditLogger';

// =================== INSTITUTION SETTINGS ===================
export const getInstitutionSettings = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let setting = await prisma.institutionSetting.findFirst();
    if (!setting) {
      setting = await prisma.institutionSetting.create({
        data: {
          id: 'default-setting',
          institutionName: 'Apex Academy & Institute of Technology',
          code: 'AAIT',
        },
      });
    }
    return res.json({ success: true, data: setting });
  } catch (error) {
    next(error);
  }
};

export const updateInstitutionSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = req.body;
    let setting = await prisma.institutionSetting.findFirst();

    if (!setting) {
      setting = await prisma.institutionSetting.create({
        data: { ...data, id: 'default-setting' },
      });
    } else {
      setting = await prisma.institutionSetting.update({
        where: { id: setting.id },
        data,
      });
    }

    await logAudit({
      userId: req.user?.id,
      action: 'UPDATE_INSTITUTION_SETTINGS',
      entity: 'InstitutionSetting',
      entityId: setting.id,
      details: data,
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: 'Institution settings updated', data: setting });
  } catch (error) {
    next(error);
  }
};

// =================== USER MANAGEMENT ===================
export const getUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const { role, status, search } = req.query as Record<string, string>;
    const where: any = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (search && search.trim() !== '') {
      where.email = { contains: search.trim() };
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          avatar: true,
          lastLoginAt: true,
          createdAt: true,
          studentProfile: { select: { firstName: true, lastName: true, admissionNumber: true } },
          teacherProfile: { select: { firstName: true, lastName: true, employeeId: true } },
        },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        users,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
      throw new AppError('Invalid user status.', 400);
    }

    // Don't allow an admin to deactivate themselves
    if (id === req.user?.id) {
      throw new AppError('You cannot change your own active status.', 400);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, email: true, status: true, role: true },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'UPDATE_USER_STATUS',
      entity: 'User',
      entityId: id,
      details: { status },
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: `User status changed to ${status}`, data: updated });
  } catch (error) {
    next(error);
  }
};

export const resetUserPassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      throw new AppError('New password must be at least 6 characters.', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'RESET_USER_PASSWORD',
      entity: 'User',
      entityId: id,
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: 'Password reset successfully for user.' });
  } catch (error) {
    next(error);
  }
};

// =================== AUDIT LOGS ===================
export const getAuditLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 15));
    const skip = (page - 1) * limit;

    const { action, entity, search } = req.query as Record<string, string>;
    const where: any = {};
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (search && search.trim() !== '') {
      where.OR = [
        { action: { contains: search.trim() } },
        { entity: { contains: search.trim() } },
        { details: { contains: search.trim() } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { email: true, role: true } },
        },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        logs,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};
