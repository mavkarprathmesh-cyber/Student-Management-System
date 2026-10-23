import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import { AuthRequest } from '../../types/auth';
import { logAudit } from '../../utils/auditLogger';

export const getTeachers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const { search, departmentId, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query as Record<string, string>;

    const where: any = {};
    if (departmentId) where.departmentId = departmentId;
    if (status) where.status = status;

    if (search && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { employeeId: { contains: q } },
        { email: { contains: q } },
        { designation: { contains: q } },
      ];
    }

    const [total, teachers] = await Promise.all([
      prisma.teacher.count({ where }),
      prisma.teacher.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' },
        include: {
          department: { select: { id: true, name: true, code: true } },
          assignments: {
            include: {
              subject: { select: { id: true, name: true, code: true } },
              class: { select: { id: true, name: true } },
              academicYear: { select: { id: true, name: true } },
            },
          },
          user: { select: { id: true, email: true, status: true, avatar: true } },
        },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        teachers,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTeacherById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: {
        department: true,
        user: { select: { id: true, email: true, status: true, avatar: true, lastLoginAt: true } },
        assignments: {
          include: {
            subject: true,
            class: true,
            academicYear: true,
          },
        },
      },
    });

    if (!teacher) {
      throw new AppError('Teacher not found.', 404);
    }

    return res.json({
      success: true,
      data: teacher,
    });
  } catch (error) {
    next(error);
  }
};

export const createTeacher = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      employeeId,
      firstName,
      lastName,
      email,
      phone,
      departmentId,
      designation = 'Lecturer',
      joiningDate,
      createLoginAccount = true,
      password,
    } = req.body;

    const existingEmp = await prisma.teacher.findUnique({ where: { employeeId } });
    if (existingEmp) {
      throw new AppError('A teacher with this Employee ID already exists.', 409);
    }

    const existingEmail = await prisma.teacher.findUnique({ where: { email: email.toLowerCase() } });
    if (existingEmail) {
      throw new AppError('A teacher with this email already exists.', 409);
    }

    const teacher = await prisma.$transaction(async (tx) => {
      let createdUserId: string | undefined = undefined;

      if (createLoginAccount) {
        const existingUser = await tx.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (!existingUser) {
          const rawPassword = password || 'Teacher@123';
          const salt = await bcrypt.genSalt(10);
          const passwordHash = await bcrypt.hash(rawPassword, salt);

          const user = await tx.user.create({
            data: {
              email: email.toLowerCase(),
              passwordHash,
              role: 'TEACHER',
              status: 'ACTIVE',
            },
          });
          createdUserId = user.id;
        } else {
          createdUserId = existingUser.id;
        }
      }

      return tx.teacher.create({
        data: {
          employeeId,
          firstName,
          lastName,
          email: email.toLowerCase(),
          phone,
          departmentId,
          designation,
          joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
          status: 'ACTIVE',
          userId: createdUserId,
        },
        include: {
          department: true,
        },
      });
    });

    await logAudit({
      userId: req.user?.id,
      action: 'CREATE_TEACHER',
      entity: 'Teacher',
      entityId: teacher.id,
      details: { employeeId: teacher.employeeId, name: `${teacher.firstName} ${teacher.lastName}` },
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: 'Teacher created successfully',
      data: teacher,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTeacher = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const existing = await prisma.teacher.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Teacher not found.', 404);
    }

    if (data.email && data.email.toLowerCase() !== existing.email) {
      const duplicate = await prisma.teacher.findUnique({
        where: { email: data.email.toLowerCase() },
      });
      if (duplicate) {
        throw new AppError('Email is already in use by another teacher.', 409);
      }
    }

    const updated = await prisma.teacher.update({
      where: { id },
      data: {
        ...data,
        email: data.email ? data.email.toLowerCase() : undefined,
        joiningDate: data.joiningDate ? new Date(data.joiningDate) : undefined,
      },
      include: {
        department: true,
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'UPDATE_TEACHER',
      entity: 'Teacher',
      entityId: id,
      details: data,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: 'Teacher profile updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const assignSubjectClass = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { teacherId, subjectId, classId, academicYearId } = req.body;

    // Check if already assigned
    const existing = await prisma.teacherAssignment.findUnique({
      where: {
        teacherId_subjectId_classId_academicYearId: {
          teacherId,
          subjectId,
          classId,
          academicYearId,
        },
      },
    });

    if (existing) {
      throw new AppError('Teacher is already assigned to this subject and class in this academic year.', 409);
    }

    const assignment = await prisma.teacherAssignment.create({
      data: {
        teacherId,
        subjectId,
        classId,
        academicYearId,
      },
      include: {
        teacher: true,
        subject: true,
        class: true,
        academicYear: true,
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'ASSIGN_TEACHER',
      entity: 'TeacherAssignment',
      entityId: assignment.id,
      details: req.body,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: 'Subject and class assigned successfully',
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

export const removeAssignment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.teacherAssignment.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: 'REMOVE_TEACHER_ASSIGNMENT',
      entity: 'TeacherAssignment',
      entityId: id,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: 'Assignment removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTeacher = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: { assignments: true },
    });

    if (!teacher) {
      throw new AppError('Teacher not found.', 404);
    }

    if (teacher.assignments.length > 0) {
      throw new AppError('Please remove assigned classes and subjects before deleting this teacher.', 400);
    }

    await prisma.teacher.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: 'DELETE_TEACHER',
      entity: 'Teacher',
      entityId: id,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: 'Teacher record deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
