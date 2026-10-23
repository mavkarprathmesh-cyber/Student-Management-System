import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import { AuthRequest } from '../../types/auth';
import { generateAdmissionNumber } from '../../utils/admissionNumber';
import { calculateAttendance } from '../../utils/attendanceCalculator';
import { logAudit } from '../../utils/auditLogger';

export const getNextAdmissionNum = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const admissionNumber = await generateAdmissionNumber();
    return res.json({ success: true, data: { admissionNumber } });
  } catch (error) {
    next(error);
  }
};

export const getStudents = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const {
      search,
      departmentId,
      courseId,
      classId,
      academicYearId,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query as Record<string, string>;

    const where: any = {};

    if (departmentId) where.departmentId = departmentId;
    if (courseId) where.courseId = courseId;
    if (classId) where.classId = classId;
    if (academicYearId) where.academicYearId = academicYearId;
    if (status) where.status = status;

    if (search && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { admissionNumber: { contains: q } },
        { email: { contains: q } },
        { rollNumber: { contains: q } },
      ];
    }

    // Role-based restrictions: Teachers see only assigned classes if not Admin
    if (req.user?.role === 'TEACHER' && req.user.teacherId) {
      const assignments = await prisma.teacherAssignment.findMany({
        where: { teacherId: req.user.teacherId },
        select: { classId: true },
      });
      const assignedClassIds = assignments.map((a) => a.classId);
      where.classId = { in: assignedClassIds };
    }

    const [total, students] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc',
        },
        include: {
          department: { select: { id: true, name: true, code: true } },
          course: { select: { id: true, name: true, code: true } },
          class: { select: { id: true, name: true, section: true } },
          academicYear: { select: { id: true, name: true } },
          _count: {
            select: {
              attendanceRecords: true,
              marks: true,
              fees: true,
            },
          },
        },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        students,
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

export const getStudentById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // RBAC check: Student can only view their own profile
    if (req.user?.role === 'STUDENT' && req.user.studentId !== id) {
      throw new AppError('Forbidden: You can only view your own profile.', 403);
    }

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        department: true,
        course: true,
        class: true,
        academicYear: true,
        user: { select: { id: true, email: true, status: true, avatar: true } },
        enrollments: {
          include: {
            class: true,
            academicYear: true,
          },
          orderBy: { enrolledAt: 'desc' },
        },
        attendanceRecords: {
          include: {
            session: {
              include: {
                subject: true,
              },
            },
          },
          orderBy: { session: { date: 'desc' } },
        },
        marks: {
          where: req.user?.role === 'STUDENT' ? { isPublished: true } : {},
          include: {
            examSubject: {
              include: {
                subject: true,
                exam: true,
              },
            },
          },
          orderBy: { examSubject: { examDate: 'desc' } },
        },
        fees: {
          include: {
            feeStructure: true,
            transactions: {
              orderBy: { paymentDate: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!student) {
      throw new AppError('Student not found.', 404);
    }

    // Compute attendance statistics
    const attendanceSummary = calculateAttendance(student.attendanceRecords);

    // Compute fee totals
    const totalFeeAmount = student.fees.reduce((acc, f) => acc + f.totalAmount, 0);
    const totalPaidAmount = student.fees.reduce((acc, f) => acc + f.paidAmount, 0);
    const totalBalance = student.fees.reduce((acc, f) => acc + f.balance, 0);

    return res.json({
      success: true,
      data: {
        ...student,
        attendanceSummary,
        financialSummary: {
          totalFeeAmount,
          totalPaidAmount,
          totalBalance,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createStudent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      email,
      phone,
      address,
      parentName,
      parentPhone,
      parentEmail,
      departmentId,
      courseId,
      classId,
      academicYearId,
      rollNumber,
      emergencyContact,
      photoUrl,
      createLoginAccount,
      password,
    } = req.body;

    // Check duplicate email
    const existingStudentEmail = await prisma.student.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existingStudentEmail) {
      throw new AppError('A student with this email already exists.', 409);
    }

    // Check duplicate roll number in same class & academic year
    const existingRoll = await prisma.student.findFirst({
      where: {
        classId,
        academicYearId,
        rollNumber,
      },
    });
    if (existingRoll) {
      throw new AppError(`Roll number "${rollNumber}" is already assigned in this class.`, 409);
    }

    // Generate unique admission number atomically
    const admissionNumber = await generateAdmissionNumber();

    // Use transaction to create student + enrollment + user account
    const result = await prisma.$transaction(async (tx) => {
      let createdUserId: string | undefined = undefined;

      if (createLoginAccount) {
        const existingUser = await tx.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (!existingUser) {
          const rawPassword = password || 'Student@123';
          const salt = await bcrypt.genSalt(10);
          const passwordHash = await bcrypt.hash(rawPassword, salt);

          const user = await tx.user.create({
            data: {
              email: email.toLowerCase(),
              passwordHash,
              role: 'STUDENT',
              status: 'ACTIVE',
            },
          });
          createdUserId = user.id;
        } else {
          createdUserId = existingUser.id;
        }
      }

      const student = await tx.student.create({
        data: {
          admissionNumber,
          firstName,
          lastName,
          dateOfBirth: new Date(dateOfBirth),
          gender,
          email: email.toLowerCase(),
          phone,
          address,
          parentName,
          parentPhone,
          parentEmail: parentEmail || null,
          departmentId,
          courseId,
          classId,
          academicYearId,
          rollNumber,
          emergencyContact,
          photoUrl,
          userId: createdUserId,
          status: 'ACTIVE',
        },
      });

      // Create initial active enrollment
      await tx.enrollment.create({
        data: {
          studentId: student.id,
          classId,
          academicYearId,
          status: 'ACTIVE',
        },
      });

      return student;
    });

    await logAudit({
      userId: req.user?.id,
      action: 'CREATE_STUDENT',
      entity: 'Student',
      entityId: result.id,
      details: { admissionNumber: result.admissionNumber, name: `${result.firstName} ${result.lastName}` },
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateStudent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const existing = await prisma.student.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Student not found.', 404);
    }

    if (data.email && data.email.toLowerCase() !== existing.email) {
      const duplicate = await prisma.student.findUnique({
        where: { email: data.email.toLowerCase() },
      });
      if (duplicate) {
        throw new AppError('Email address is already in use by another student.', 409);
      }
    }

    if (data.rollNumber && data.classId) {
      const duplicateRoll = await prisma.student.findFirst({
        where: {
          id: { not: id },
          classId: data.classId || existing.classId,
          academicYearId: data.academicYearId || existing.academicYearId,
          rollNumber: data.rollNumber,
        },
      });
      if (duplicateRoll) {
        throw new AppError(`Roll number "${data.rollNumber}" already exists in this class.`, 409);
      }
    }

    const updated = await prisma.student.update({
      where: { id },
      data: {
        ...data,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        email: data.email ? data.email.toLowerCase() : undefined,
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'UPDATE_STUDENT',
      entity: 'Student',
      entityId: id,
      details: data,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: 'Student updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deactivateStudent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason = 'Administrative deactivation' } = req.body;

    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) {
      throw new AppError('Student not found.', 404);
    }

    const updated = await prisma.student.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    // Also deactivate user account if linked
    if (student.userId) {
      await prisma.user.update({
        where: { id: student.userId },
        data: { status: 'INACTIVE' },
      });
    }

    await logAudit({
      userId: req.user?.id,
      action: 'DEACTIVATE_STUDENT',
      entity: 'Student',
      entityId: id,
      details: { reason },
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: 'Student record deactivated safely. Historical records preserved.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const restoreStudent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) {
      throw new AppError('Student not found.', 404);
    }

    const updated = await prisma.student.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    if (student.userId) {
      await prisma.user.update({
        where: { id: student.userId },
        data: { status: 'ACTIVE' },
      });
    }

    await logAudit({
      userId: req.user?.id,
      action: 'RESTORE_STUDENT',
      entity: 'Student',
      entityId: id,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: 'Student restored to ACTIVE status.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteStudent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if referenced by attendance, marks, or fees
    const [attendanceCount, marksCount, feesCount] = await Promise.all([
      prisma.attendanceRecord.count({ where: { studentId: id } }),
      prisma.studentMark.count({ where: { studentId: id } }),
      prisma.studentFee.count({ where: { studentId: id } }),
    ]);

    if (attendanceCount > 0 || marksCount > 0 || feesCount > 0) {
      throw new AppError(
        'Cannot permanently delete student because attendance, examination, or fee records exist. Please use "Deactivate" to preserve institutional history.',
        400
      );
    }

    await prisma.student.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: 'DELETE_STUDENT',
      entity: 'Student',
      entityId: id,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: 'Student permanently deleted.',
    });
  } catch (error) {
    next(error);
  }
};

export const exportStudentsCsv = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { departmentId, courseId, classId, status } = req.query as Record<string, string>;
    const where: any = {};
    if (departmentId) where.departmentId = departmentId;
    if (courseId) where.courseId = courseId;
    if (classId) where.classId = classId;
    if (status) where.status = status;

    const students = await prisma.student.findMany({
      where,
      include: {
        department: { select: { name: true } },
        course: { select: { name: true } },
        class: { select: { name: true } },
        academicYear: { select: { name: true } },
      },
      orderBy: { admissionNumber: 'asc' },
    });

    // Generate CSV lines
    const headers = [
      'Admission Number',
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Roll Number',
      'Department',
      'Course',
      'Class',
      'Academic Year',
      'Status',
      'Date of Birth',
      'Gender',
      'Parent Name',
      'Parent Contact',
    ];

    const rows = students.map((s) => [
      s.admissionNumber,
      `"${s.firstName}"`,
      `"${s.lastName}"`,
      s.email,
      s.phone || '',
      s.rollNumber,
      `"${s.department.name}"`,
      `"${s.course.name}"`,
      `"${s.class.name}"`,
      s.academicYear.name,
      s.status,
      s.dateOfBirth.toISOString().split('T')[0],
      s.gender,
      `"${s.parentName || ''}"`,
      `"${s.parentPhone || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="students_export.csv"');
    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

export const importStudentsCsv = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { studentsData } = req.body; // Array of student objects from frontend CSV parser
    if (!Array.isArray(studentsData) || studentsData.length === 0) {
      throw new AppError('No student data provided for import.', 400);
    }

    const results = {
      imported: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < studentsData.length; i++) {
      const row = studentsData[i];
      try {
        if (!row.firstName || !row.lastName || !row.email || !row.departmentId || !row.courseId || !row.classId || !row.academicYearId || !row.rollNumber) {
          results.failed++;
          results.errors.push(`Row ${i + 1}: Missing required fields.`);
          continue;
        }

        const existingEmail = await prisma.student.findUnique({
          where: { email: row.email.toLowerCase() },
        });
        if (existingEmail) {
          results.failed++;
          results.errors.push(`Row ${i + 1}: Email ${row.email} already exists.`);
          continue;
        }

        const admissionNumber = await generateAdmissionNumber();

        await prisma.student.create({
          data: {
            admissionNumber,
            firstName: row.firstName,
            lastName: row.lastName,
            dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : new Date('2000-01-01'),
            gender: row.gender || 'OTHER',
            email: row.email.toLowerCase(),
            phone: row.phone || null,
            address: row.address || null,
            parentName: row.parentName || null,
            parentPhone: row.parentPhone || null,
            departmentId: row.departmentId,
            courseId: row.courseId,
            classId: row.classId,
            academicYearId: row.academicYearId,
            rollNumber: row.rollNumber,
            status: 'ACTIVE',
          },
        });

        results.imported++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    await logAudit({
      userId: req.user?.id,
      action: 'IMPORT_STUDENTS_CSV',
      entity: 'Student',
      details: results,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: `CSV Import complete. Imported: ${results.imported}, Failed: ${results.failed}`,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};
