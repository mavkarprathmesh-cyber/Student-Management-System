import { Response, NextFunction } from 'express';
import { prisma } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import { AuthRequest } from '../../types/auth';
import { logAudit } from '../../utils/auditLogger';

// =================== DEPARTMENTS ===================
export const getDepartments = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        _count: {
          select: { courses: true, teachers: true, students: true, subjects: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, data: departments });
  } catch (error) {
    next(error);
  }
};

export const createDepartment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { code, name, description } = req.body;
    const existing = await prisma.department.findUnique({ where: { code } });
    if (existing) throw new AppError('Department code already exists', 409);

    const dept = await prisma.department.create({
      data: { code, name, description },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'CREATE_DEPARTMENT',
      entity: 'Department',
      entityId: dept.id,
      details: { code, name },
      ipAddress: req.ip,
    });

    return res.status(201).json({ success: true, data: dept });
  } catch (error) {
    next(error);
  }
};

export const updateDepartment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { code, name, description } = req.body;

    const dept = await prisma.department.update({
      where: { id },
      data: { code, name, description },
    });
    return res.json({ success: true, data: dept });
  } catch (error) {
    next(error);
  }
};

export const deleteDepartment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.department.delete({ where: { id } });
    return res.json({ success: true, message: 'Department deleted' });
  } catch (error) {
    next(error);
  }
};

// =================== COURSES ===================
export const getCourses = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const courses = await prisma.course.findMany({
      include: {
        department: { select: { id: true, name: true, code: true } },
        _count: {
          select: { classes: true, students: true, subjects: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, data: courses });
  } catch (error) {
    next(error);
  }
};

export const createCourse = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { code, name, departmentId, durationYears = 4 } = req.body;
    const existing = await prisma.course.findUnique({ where: { code } });
    if (existing) throw new AppError('Course code already exists', 409);

    const course = await prisma.course.create({
      data: { code, name, departmentId, durationYears: Number(durationYears) },
      include: { department: true },
    });

    return res.status(201).json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
};

export const updateCourse = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { code, name, departmentId, durationYears } = req.body;

    const course = await prisma.course.update({
      where: { id },
      data: {
        code,
        name,
        departmentId,
        durationYears: durationYears ? Number(durationYears) : undefined,
      },
      include: { department: true },
    });
    return res.json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
};

export const deleteCourse = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.course.delete({ where: { id } });
    return res.json({ success: true, message: 'Course deleted' });
  } catch (error) {
    next(error);
  }
};

// =================== CLASSES ===================
export const getClasses = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const classes = await prisma.classSection.findMany({
      include: {
        course: { select: { id: true, name: true, code: true } },
        academicYear: { select: { id: true, name: true } },
        _count: {
          select: { students: true, enrollments: true, assignments: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, data: classes });
  } catch (error) {
    next(error);
  }
};

export const createClass = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, gradeLevel, section, courseId, academicYearId } = req.body;

    const classSection = await prisma.classSection.create({
      data: { name, gradeLevel, section, courseId, academicYearId },
      include: { course: true, academicYear: true },
    });

    return res.status(201).json({ success: true, data: classSection });
  } catch (error) {
    next(error);
  }
};

export const updateClass = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, gradeLevel, section, courseId, academicYearId } = req.body;

    const classSection = await prisma.classSection.update({
      where: { id },
      data: { name, gradeLevel, section, courseId, academicYearId },
      include: { course: true, academicYear: true },
    });
    return res.json({ success: true, data: classSection });
  } catch (error) {
    next(error);
  }
};

export const deleteClass = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const studentsCount = await prisma.student.count({ where: { classId: id } });
    if (studentsCount > 0) {
      throw new AppError('Cannot delete class that has enrolled students.', 400);
    }
    await prisma.classSection.delete({ where: { id } });
    return res.json({ success: true, message: 'Class deleted' });
  } catch (error) {
    next(error);
  }
};

// =================== SUBJECTS ===================
export const getSubjects = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const subjects = await prisma.subject.findMany({
      include: {
        course: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
        assignments: {
          include: {
            teacher: { select: { id: true, firstName: true, lastName: true } },
            class: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { code: 'asc' },
    });
    return res.json({ success: true, data: subjects });
  } catch (error) {
    next(error);
  }
};

export const createSubject = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { code, name, courseId, departmentId, credits = 3 } = req.body;
    const existing = await prisma.subject.findUnique({ where: { code } });
    if (existing) throw new AppError('Subject code already exists', 409);

    const subject = await prisma.subject.create({
      data: { code, name, courseId, departmentId, credits: Number(credits) },
      include: { course: true, department: true },
    });

    return res.status(201).json({ success: true, data: subject });
  } catch (error) {
    next(error);
  }
};

export const updateSubject = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { code, name, courseId, departmentId, credits } = req.body;

    const subject = await prisma.subject.update({
      where: { id },
      data: {
        code,
        name,
        courseId,
        departmentId,
        credits: credits ? Number(credits) : undefined,
      },
      include: { course: true, department: true },
    });
    return res.json({ success: true, data: subject });
  } catch (error) {
    next(error);
  }
};

export const deleteSubject = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.subject.delete({ where: { id } });
    return res.json({ success: true, message: 'Subject deleted' });
  } catch (error) {
    next(error);
  }
};

// =================== ACADEMIC YEARS & TERMS ===================
export const getAcademicYears = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const years = await prisma.academicYear.findMany({
      include: {
        terms: true,
        _count: {
          select: { classes: true, students: true, enrollments: true },
        },
      },
      orderBy: { startDate: 'desc' },
    });
    return res.json({ success: true, data: years });
  } catch (error) {
    next(error);
  }
};

export const createAcademicYear = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, startDate, endDate, isCurrent = false, terms = [] } = req.body;

    const year = await prisma.$transaction(async (tx) => {
      if (isCurrent) {
        await tx.academicYear.updateMany({
          data: { isCurrent: false },
        });
      }

      return tx.academicYear.create({
        data: {
          name,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          isCurrent,
          terms: {
            create: terms.map((t: any) => ({
              name: t.name,
              startDate: new Date(t.startDate),
              endDate: new Date(t.endDate),
            })),
          },
        },
        include: { terms: true },
      });
    });

    return res.status(201).json({ success: true, data: year });
  } catch (error) {
    next(error);
  }
};

export const setCurrentAcademicYear = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.$transaction([
      prisma.academicYear.updateMany({ data: { isCurrent: false } }),
      prisma.academicYear.update({
        where: { id },
        data: { isCurrent: true },
      }),
    ]);

    return res.json({ success: true, message: 'Current academic year updated' });
  } catch (error) {
    next(error);
  }
};

// =================== PROMOTION & ENROLLMENTS ===================
export const promoteStudents = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { studentIds, targetClassId, targetAcademicYearId } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      throw new AppError('Please select at least one student to promote.', 400);
    }

    const targetClass = await prisma.classSection.findUnique({
      where: { id: targetClassId },
    });
    if (!targetClass) throw new AppError('Target class not found.', 404);

    const results = await prisma.$transaction(async (tx) => {
      // 1. Mark existing enrollment as PROMOTED
      await tx.enrollment.updateMany({
        where: {
          studentId: { in: studentIds },
          status: 'ACTIVE',
        },
        data: { status: 'PROMOTED' },
      });

      // 2. Update students' current class and academic year
      await tx.student.updateMany({
        where: { id: { in: studentIds } },
        data: {
          classId: targetClassId,
          academicYearId: targetAcademicYearId,
        },
      });

      // 3. Create new enrollments for target class and academic year
      for (const studentId of studentIds) {
        await tx.enrollment.create({
          data: {
            studentId,
            classId: targetClassId,
            academicYearId: targetAcademicYearId,
            status: 'ACTIVE',
          },
        });
      }

      return { promotedCount: studentIds.length };
    });

    await logAudit({
      userId: req.user?.id,
      action: 'PROMOTE_STUDENTS',
      entity: 'Enrollment',
      details: { studentCount: studentIds.length, targetClassId, targetAcademicYearId },
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: `Successfully promoted ${results.promotedCount} students.`,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};
