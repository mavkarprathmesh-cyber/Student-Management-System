import { Response, NextFunction } from 'express';
import { prisma } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import { AuthRequest } from '../../types/auth';
import { logAudit } from '../../utils/auditLogger';

export const getAnnouncements = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const where: any = { isPublished: true };

    // Role-based filtering for target audience
    if (user.role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { id: user.studentId },
        select: { classId: true },
      });

      where.OR = [
        { targetAudience: 'ALL' },
        { targetAudience: 'STUDENTS' },
        { targetAudience: 'CLASS', targetClassId: student?.classId },
      ];
    } else if (user.role === 'TEACHER') {
      where.OR = [
        { targetAudience: 'ALL' },
        { targetAudience: 'TEACHERS' },
      ];
    }
    // Admins see all announcements including drafts

    const announcements = await prisma.announcement.findMany({
      where: user.role === 'ADMIN' ? {} : where,
      include: {
        author: { select: { email: true } },
        targetClass: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: announcements });
  } catch (error) {
    next(error);
  }
};

export const createAnnouncement = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, content, targetAudience = 'ALL', targetClassId, priority = 'NORMAL', isPublished = true } = req.body;

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        targetAudience,
        targetClassId: targetClassId || null,
        priority,
        isPublished,
        authorId: req.user!.id,
      },
      include: { author: { select: { email: true } } },
    });

    // Generate in-app notifications for users in the target audience
    const notificationUserIds: string[] = [];
    if (targetAudience === 'ALL') {
      const users = await prisma.user.findMany({ where: { status: 'ACTIVE' }, select: { id: true } });
      notificationUserIds.push(...users.map((u) => u.id));
    } else if (targetAudience === 'TEACHERS') {
      const users = await prisma.user.findMany({ where: { role: 'TEACHER', status: 'ACTIVE' }, select: { id: true } });
      notificationUserIds.push(...users.map((u) => u.id));
    } else if (targetAudience === 'STUDENTS') {
      const users = await prisma.user.findMany({ where: { role: 'STUDENT', status: 'ACTIVE' }, select: { id: true } });
      notificationUserIds.push(...users.map((u) => u.id));
    } else if (targetAudience === 'CLASS' && targetClassId) {
      const students = await prisma.student.findMany({
        where: { classId: targetClassId, userId: { not: null } },
        select: { userId: true },
      });
      notificationUserIds.push(...students.map((s) => s.userId!).filter(Boolean));
    }

    if (notificationUserIds.length > 0) {
      const noteType = priority === 'URGENT' || priority === 'HIGH' ? 'ALERT' : 'INFO';
      await prisma.notification.createMany({
        data: notificationUserIds.map((uid) => ({
          userId: uid,
          title: `Announcement: ${title}`,
          message: content.length > 100 ? `${content.substring(0, 97)}...` : content,
          type: noteType,
        })),
      });
    }

    await logAudit({
      userId: req.user?.id,
      action: 'CREATE_ANNOUNCEMENT',
      entity: 'Announcement',
      entityId: announcement.id,
      details: { title, targetAudience },
      ipAddress: req.ip,
    });

    return res.status(201).json({ success: true, data: announcement });
  } catch (error) {
    next(error);
  }
};

export const deleteAnnouncement = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.announcement.delete({ where: { id } });
    return res.json({ success: true, message: 'Announcement deleted' });
  } catch (error) {
    next(error);
  }
};

// =================== NOTIFICATIONS ===================
export const getUserNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const [unreadCount, notifications] = await Promise.all([
      prisma.notification.count({ where: { userId, isRead: false } }),
      prisma.notification.findMany({
        where: { userId },
        take: 20,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        unreadCount,
        notifications,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const markNotificationRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.notification.updateMany({
      where: { id, userId: req.user!.id },
      data: { isRead: true },
    });
    return res.json({ success: true, message: 'Marked as read' });
  } catch (error) {
    next(error);
  }
};

export const markAllNotificationsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });
    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};
