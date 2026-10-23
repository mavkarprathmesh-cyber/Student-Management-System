import { Response, NextFunction } from 'express';
import { prisma } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import { AuthRequest } from '../../types/auth';
import { generateReceiptNumber } from '../../utils/receiptNumber';
import { logAudit } from '../../utils/auditLogger';

export const getFeeStructures = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId, classId, academicYearId } = req.query as Record<string, string>;
    const where: any = {};
    if (courseId) where.courseId = courseId;
    if (classId) where.classId = classId;
    if (academicYearId) where.academicYearId = academicYearId;

    const structures = await prisma.feeStructure.findMany({
      where,
      include: {
        course: { select: { id: true, name: true, code: true } },
        class: { select: { id: true, name: true } },
        academicYear: { select: { id: true, name: true } },
        _count: { select: { studentFees: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    return res.json({ success: true, data: structures });
  } catch (error) {
    next(error);
  }
};

export const createFeeStructure = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, courseId, classId, academicYearId, category = 'TUITION', amount, dueDate, autoAssign = true } = req.body;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new AppError('Fee amount must be greater than zero.', 400);
    }

    const structure = await prisma.$transaction(async (tx) => {
      const createdStructure = await tx.feeStructure.create({
        data: {
          name,
          courseId,
          classId: classId || null,
          academicYearId,
          category,
          amount: numAmount,
          dueDate: new Date(dueDate),
        },
      });

      // If autoAssign, create StudentFee records for all enrolled students
      if (autoAssign) {
        const studentWhere: any = {
          courseId,
          academicYearId,
          status: 'ACTIVE',
        };
        if (classId) studentWhere.classId = classId;

        const students = await tx.student.findMany({
          where: studentWhere,
          select: { id: true },
        });

        for (const st of students) {
          await tx.studentFee.create({
            data: {
              studentId: st.id,
              feeStructureId: createdStructure.id,
              totalAmount: numAmount,
              paidAmount: 0,
              balance: numAmount,
              status: 'UNPAID',
              dueDate: new Date(dueDate),
            },
          });
        }
      }

      return createdStructure;
    });

    await logAudit({
      userId: req.user?.id,
      action: 'CREATE_FEE_STRUCTURE',
      entity: 'FeeStructure',
      entityId: structure.id,
      details: { name, amount: numAmount },
      ipAddress: req.ip,
    });

    return res.status(201).json({ success: true, data: structure });
  } catch (error) {
    next(error);
  }
};

export const getStudentFees = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const { status, classId, courseId, search } = req.query as Record<string, string>;

    const where: any = {};
    if (status) where.status = status;

    // RBAC: If student, show only their fees
    if (req.user?.role === 'STUDENT' && req.user.studentId) {
      where.studentId = req.user.studentId;
    } else {
      if (classId) where.student = { ...where.student, classId };
      if (courseId) where.student = { ...where.student, courseId };

      if (search && search.trim() !== '') {
        const q = search.trim();
        where.student = {
          ...where.student,
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { admissionNumber: { contains: q } },
          ],
        };
      }
    }

    const [total, studentFees] = await Promise.all([
      prisma.studentFee.count({ where }),
      prisma.studentFee.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dueDate: 'asc' },
        include: {
          feeStructure: {
            include: {
              course: { select: { name: true } },
              academicYear: { select: { name: true } },
            },
          },
          student: {
            select: {
              id: true,
              admissionNumber: true,
              firstName: true,
              lastName: true,
              rollNumber: true,
              email: true,
              class: { select: { name: true } },
              course: { select: { name: true } },
            },
          },
          transactions: {
            orderBy: { paymentDate: 'desc' },
          },
        },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        studentFees,
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

export const recordPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { studentFeeId, amount, paymentMethod = 'CASH', notes } = req.body;

    const payAmount = Number(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      throw new AppError('Payment amount must be greater than zero.', 400);
    }

    const studentFee = await prisma.studentFee.findUnique({
      where: { id: studentFeeId },
      include: {
        student: true,
        feeStructure: true,
      },
    });

    if (!studentFee) throw new AppError('Student fee record not found.', 404);

    if (payAmount > studentFee.balance) {
      throw new AppError(
        `Payment amount ($${payAmount}) cannot exceed outstanding balance ($${studentFee.balance}).`,
        400
      );
    }

    const receiptNumber = await generateReceiptNumber();

    const transaction = await prisma.$transaction(async (tx) => {
      // 1. Create PaymentTransaction
      const payment = await tx.paymentTransaction.create({
        data: {
          studentFeeId,
          receiptNumber,
          amount: payAmount,
          paymentMethod,
          recordedById: req.user!.id,
          notes,
          status: 'SUCCESS',
        },
      });

      // 2. Update StudentFee balances and status
      const newPaidAmount = studentFee.paidAmount + payAmount;
      const newBalance = studentFee.totalAmount - newPaidAmount;
      const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIAL';

      await tx.studentFee.update({
        where: { id: studentFeeId },
        data: {
          paidAmount: newPaidAmount,
          balance: newBalance,
          status: newStatus,
        },
      });

      return payment;
    });

    await logAudit({
      userId: req.user?.id,
      action: 'RECORD_FEE_PAYMENT',
      entity: 'PaymentTransaction',
      entityId: transaction.id,
      details: {
        receiptNumber,
        amount: payAmount,
        student: studentFee.student.admissionNumber,
      },
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: `Payment of $${payAmount} recorded successfully. Receipt #${receiptNumber}`,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

export const getReceiptDetails = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { receiptNumber } = req.params;

    const transaction = await prisma.paymentTransaction.findUnique({
      where: { receiptNumber },
      include: {
        recordedBy: { select: { email: true } },
        studentFee: {
          include: {
            feeStructure: true,
            student: {
              include: {
                class: true,
                course: true,
                department: true,
              },
            },
          },
        },
      },
    });

    if (!transaction) throw new AppError('Receipt not found.', 404);

    // RBAC: If student, ensure it's their own payment
    if (req.user?.role === 'STUDENT' && req.user.studentId !== transaction.studentFee.studentId) {
      throw new AppError('Forbidden: Access denied to this receipt.', 403);
    }

    const institution = await prisma.institutionSetting.findFirst();

    return res.json({
      success: true,
      data: {
        transaction,
        institution,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const exportFeeReportCsv = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, classId } = req.query as Record<string, string>;
    const where: any = {};
    if (status) where.status = status;
    if (classId) where.student = { classId };

    const records = await prisma.studentFee.findMany({
      where,
      include: {
        student: {
          select: {
            admissionNumber: true,
            firstName: true,
            lastName: true,
            class: { select: { name: true } },
          },
        },
        feeStructure: {
          select: {
            name: true,
            category: true,
          },
        },
      },
    });

    const headers = ['Admission Number', 'Student Name', 'Class', 'Fee Category', 'Fee Name', 'Total Amount', 'Paid Amount', 'Balance', 'Status', 'Due Date'];
    const rows = records.map((r) => [
      r.student.admissionNumber,
      `"${r.student.firstName} ${r.student.lastName}"`,
      `"${r.student.class.name}"`,
      r.feeStructure.category,
      `"${r.feeStructure.name}"`,
      r.totalAmount,
      r.paidAmount,
      r.balance,
      r.status,
      r.dueDate.toISOString().split('T')[0],
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="fee_report.csv"');
    return res.send(csv);
  } catch (error) {
    next(error);
  }
};
