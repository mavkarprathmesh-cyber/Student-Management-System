import { Response, NextFunction } from 'express';
import { prisma } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import { AuthRequest } from '../../types/auth';
import { calculateAttendance } from '../../utils/attendanceCalculator';
import { logAudit } from '../../utils/auditLogger';

export const getSessionAttendance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { classId, subjectId, date } = req.query as Record<string, string>;

    if (!classId || !date) {
      throw new AppError('Class ID and Date are required.', 400);
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // Find if session already exists
    const session = await prisma.attendanceSession.findFirst({
      where: {
        classId,
        subjectId: subjectId || null,
        date: targetDate,
      },
      include: {
        records: {
          include: {
            student: {
              select: {
                id: true,
                admissionNumber: true,
                firstName: true,
                lastName: true,
                rollNumber: true,
                status: true,
              },
            },
          },
        },
      },
    });

    // Also get all active students in this class to handle unmarked students
    const enrolledStudents = await prisma.student.findMany({
      where: {
        classId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        admissionNumber: true,
        firstName: true,
        lastName: true,
        rollNumber: true,
      },
      orderBy: { rollNumber: 'asc' },
    });

    // Map records or defaults
    const recordsMap = new Map();
    if (session) {
      for (const rec of session.records) {
        recordsMap.set(rec.studentId, rec);
      }
    }

    const studentsWithAttendance = enrolledStudents.map((st) => {
      const rec = recordsMap.get(st.id);
      return {
        studentId: st.id,
        admissionNumber: st.admissionNumber,
        name: `${st.firstName} ${st.lastName}`,
        rollNumber: st.rollNumber,
        status: rec ? rec.status : 'PRESENT', // default suggested status
        remarks: rec ? rec.remarks : '',
        recordId: rec ? rec.id : null,
      };
    });

    return res.json({
      success: true,
      data: {
        sessionExists: !!session,
        sessionId: session?.id || null,
        date: targetDate,
        students: studentsWithAttendance,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const markAttendance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { classId, subjectId, academicYearId, date, notes, records } = req.body;

    if (!classId || !date || !Array.isArray(records) || records.length === 0) {
      throw new AppError('Class ID, Date, and valid records array are required.', 400);
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // Verify academic year
    let yearId = academicYearId;
    if (!yearId) {
      const classObj = await prisma.classSection.findUnique({
        where: { id: classId },
        select: { academicYearId: true },
      });
      yearId = classObj?.academicYearId;
    }

    if (!yearId) {
      throw new AppError('Academic Year ID could not be determined.', 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      // Find or create session
      let session = await tx.attendanceSession.findFirst({
        where: {
          classId,
          subjectId: subjectId || null,
          date: targetDate,
        },
      });

      if (!session) {
        session = await tx.attendanceSession.create({
          data: {
            classId,
            subjectId: subjectId || null,
            academicYearId: yearId,
            date: targetDate,
            takenById: req.user!.id,
            notes,
          },
        });
      } else {
        session = await tx.attendanceSession.update({
          where: { id: session.id },
          data: {
            notes,
            takenById: req.user!.id,
          },
        });
      }

      // Upsert records to prevent duplicates
      for (const rec of records) {
        await tx.attendanceRecord.upsert({
          where: {
            sessionId_studentId: {
              sessionId: session.id,
              studentId: rec.studentId,
            },
          },
          update: {
            status: rec.status,
            remarks: rec.remarks || null,
          },
          create: {
            sessionId: session.id,
            studentId: rec.studentId,
            status: rec.status,
            remarks: rec.remarks || null,
          },
        });
      }

      return session;
    });

    await logAudit({
      userId: req.user?.id,
      action: 'MARK_ATTENDANCE',
      entity: 'AttendanceSession',
      entityId: result.id,
      details: { classId, date: targetDate, count: records.length },
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: `Attendance marked successfully for ${records.length} students.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getClassAttendanceSummary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { classId, startDate, endDate } = req.query as Record<string, string>;

    if (!classId) {
      throw new AppError('Class ID is required.', 400);
    }

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const students = await prisma.student.findMany({
      where: { classId, status: 'ACTIVE' },
      include: {
        attendanceRecords: {
          where: {
            session: Object.keys(dateFilter).length > 0 ? { date: dateFilter } : undefined,
          },
        },
      },
      orderBy: { rollNumber: 'asc' },
    });

    const summary = students.map((s) => {
      const metrics = calculateAttendance(s.attendanceRecords);
      return {
        studentId: s.id,
        admissionNumber: s.admissionNumber,
        name: `${s.firstName} ${s.lastName}`,
        rollNumber: s.rollNumber,
        ...metrics,
      };
    });

    return res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};

export const getLowAttendanceReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const threshold = parseFloat((req.query.threshold as string) || '75.0');
    const { departmentId, courseId, classId } = req.query as Record<string, string>;

    const where: any = { status: 'ACTIVE' };
    if (departmentId) where.departmentId = departmentId;
    if (courseId) where.courseId = courseId;
    if (classId) where.classId = classId;

    const students = await prisma.student.findMany({
      where,
      include: {
        class: { select: { name: true } },
        course: { select: { name: true } },
        department: { select: { name: true } },
        attendanceRecords: true,
      },
    });

    const lowAttendanceList: any[] = [];

    for (const st of students) {
      if (st.attendanceRecords.length > 0) {
        const metrics = calculateAttendance(st.attendanceRecords, threshold);
        if (metrics.isLowAttendance) {
          lowAttendanceList.push({
            studentId: st.id,
            admissionNumber: st.admissionNumber,
            name: `${st.firstName} ${st.lastName}`,
            email: st.email,
            phone: st.phone,
            parentName: st.parentName,
            parentPhone: st.parentPhone,
            className: st.class.name,
            courseName: st.course.name,
            ...metrics,
          });
        }
      }
    }

    return res.json({
      success: true,
      data: {
        threshold,
        totalFlagged: lowAttendanceList.length,
        students: lowAttendanceList,
      },
    });
  } catch (error) {
    next(error);
  }
};
