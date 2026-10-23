import { Response, NextFunction } from 'express';
import { prisma } from '../../config/db';
import { AuthRequest } from '../../types/auth';
import { calculateAttendance } from '../../utils/attendanceCalculator';

export const getStudentDemographicReport = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [totalStudents, genderCounts, statusCounts, courseCounts] = await Promise.all([
      prisma.student.count(),
      prisma.student.groupBy({
        by: ['gender'],
        _count: { id: true },
      }),
      prisma.student.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.student.groupBy({
        by: ['courseId'],
        _count: { id: true },
      }),
    ]);

    // Fetch course names
    const courses = await prisma.course.findMany({ select: { id: true, name: true, code: true } });
    const courseMap = new Map(courses.map((c) => [c.id, `${c.code} - ${c.name}`]));

    const courseBreakdown = courseCounts.map((cc) => ({
      courseName: courseMap.get(cc.courseId) || 'Unknown',
      count: cc._count.id,
    }));

    return res.json({
      success: true,
      data: {
        totalStudents,
        genderBreakdown: genderCounts.map((g) => ({ gender: g.gender, count: g._count.id })),
        statusBreakdown: statusCounts.map((s) => ({ status: s.status, count: s._count.id })),
        courseBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAcademicPerformanceReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { examId } = req.query as Record<string, string>;

    const exams = await prisma.examination.findMany({
      take: 10,
      orderBy: { startDate: 'desc' },
      select: { id: true, name: true, examType: true, isPublished: true },
    });

    const targetExamId = examId || exams[0]?.id;

    if (!targetExamId) {
      return res.json({ success: true, data: { exams: [], subjectStats: [] } });
    }

    const examSubjects = await prisma.examinationSubject.findMany({
      where: { examId: targetExamId },
      include: {
        subject: true,
        marks: true,
      },
    });

    const subjectStats = examSubjects.map((es) => {
      const validMarks = es.marks.filter((m) => m.marksObtained !== null && m.status === 'PRESENT');
      const passMarks = es.passMarks;

      let totalMarks = 0;
      let passedCount = 0;

      for (const m of validMarks) {
        totalMarks += m.marksObtained!;
        if (m.marksObtained! >= passMarks) {
          passedCount++;
        }
      }

      const totalAppeared = validMarks.length;
      const averageMarks = totalAppeared > 0 ? Math.round((totalMarks / totalAppeared) * 10) / 10 : 0;
      const passPercentage = totalAppeared > 0 ? Math.round(((passedCount / totalAppeared) * 100) * 10) / 10 : 0;

      return {
        subjectCode: es.subject.code,
        subjectName: es.subject.name,
        maxMarks: es.maxMarks,
        passMarks: es.passMarks,
        totalAppeared,
        passedCount,
        failedCount: totalAppeared - passedCount,
        passPercentage,
        averageMarks,
      };
    });

    return res.json({
      success: true,
      data: {
        exams,
        selectedExamId: targetExamId,
        subjectStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getFinancialAnalyticsReport = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const feeStructures = await prisma.feeStructure.findMany({
      include: {
        course: { select: { name: true } },
        _count: { select: { studentFees: true } },
      },
    });

    const totals = await prisma.studentFee.aggregate({
      _sum: {
        totalAmount: true,
        paidAmount: true,
        balance: true,
      },
    });

    const statusCounts = await prisma.studentFee.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { balance: true, paidAmount: true },
    });

    return res.json({
      success: true,
      data: {
        totals: {
          totalBilled: totals._sum.totalAmount || 0,
          totalCollected: totals._sum.paidAmount || 0,
          totalOutstanding: totals._sum.balance || 0,
        },
        statusBreakdown: statusCounts.map((s) => ({
          status: s.status,
          count: s._count.id,
          paid: s._sum.paidAmount || 0,
          balance: s._sum.balance || 0,
        })),
        feeStructures,
      },
    });
  } catch (error) {
    next(error);
  }
};
