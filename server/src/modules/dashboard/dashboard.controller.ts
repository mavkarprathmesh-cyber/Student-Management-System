import { Response, NextFunction } from 'express';
import { prisma } from '../../config/db';
import { AuthRequest } from '../../types/auth';
import { calculateAttendance } from '../../utils/attendanceCalculator';

export const getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;

    // If logged in as Student, return customized student dashboard metrics
    if (user.role === 'STUDENT' && user.studentId) {
      const student = await prisma.student.findUnique({
        where: { id: user.studentId },
        include: {
          class: true,
          course: true,
          attendanceRecords: true,
          marks: {
            where: { isPublished: true },
            include: { examSubject: { include: { subject: true } } },
          },
          fees: {
            include: { feeStructure: true },
          },
        },
      });

      if (!student) {
        return res.status(404).json({ success: false, message: 'Student profile not found' });
      }

      const attendanceMetrics = calculateAttendance(student.attendanceRecords);
      const totalFees = student.fees.reduce((acc, f) => acc + f.totalAmount, 0);
      const paidFees = student.fees.reduce((acc, f) => acc + f.paidAmount, 0);
      const pendingFees = student.fees.reduce((acc, f) => acc + f.balance, 0);

      const passedExams = student.marks.filter((m) => {
        const passMarks = m.examSubject.passMarks;
        return (m.marksObtained ?? 0) >= passMarks;
      }).length;

      const upcomingExams = await prisma.examination.findMany({
        where: {
          startDate: { gte: new Date() },
        },
        take: 3,
        orderBy: { startDate: 'asc' },
      });

      return res.json({
        success: true,
        data: {
          role: 'STUDENT',
          studentInfo: {
            name: `${student.firstName} ${student.lastName}`,
            admissionNumber: student.admissionNumber,
            className: student.class.name,
            courseName: student.course.name,
          },
          stats: {
            attendancePercentage: attendanceMetrics.percentage,
            totalSessions: attendanceMetrics.totalSessions,
            attendedSessions: attendanceMetrics.attendedEligibleCount,
            totalSubjects: student.marks.length,
            examsPassed: passedExams,
            totalFees,
            paidFees,
            pendingFees,
            upcomingExamsCount: upcomingExams.length,
          },
          upcomingExams,
        },
      });
    }

    // Admin & Teacher stats
    const [
      totalActiveStudents,
      totalTeachers,
      totalCourses,
      totalClasses,
      pendingFeeResult,
      upcomingExams,
      recentStudents,
      recentAnnouncements,
    ] = await Promise.all([
      prisma.student.count({ where: { status: 'ACTIVE' } }),
      prisma.teacher.count({ where: { status: 'ACTIVE' } }),
      prisma.course.count(),
      prisma.classSection.count(),
      prisma.studentFee.aggregate({
        _sum: {
          balance: true,
          totalAmount: true,
          paidAmount: true,
        },
      }),
      prisma.examination.findMany({
        where: {
          startDate: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        take: 5,
        orderBy: { startDate: 'asc' },
      }),
      prisma.student.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          class: { select: { name: true } },
          course: { select: { name: true } },
        },
      }),
      prisma.announcement.findMany({
        where: { isPublished: true },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { author: { select: { email: true } } },
      }),
    ]);

    // Calculate today's attendance percentage
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todaySessions = await prisma.attendanceSession.findMany({
      where: {
        date: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
      include: {
        records: true,
      },
    });

    let todayAttendancePercentage = 0;
    if (todaySessions.length > 0) {
      const allTodayRecords = todaySessions.flatMap((s) => s.records);
      const metrics = calculateAttendance(allTodayRecords);
      todayAttendancePercentage = metrics.percentage;
    } else {
      // If no session today, calculate aggregate from latest 30 days
      const recentRecords = await prisma.attendanceRecord.findMany({
        take: 500,
        orderBy: { createdAt: 'desc' },
      });
      if (recentRecords.length > 0) {
        const metrics = calculateAttendance(recentRecords);
        todayAttendancePercentage = metrics.percentage;
      }
    }

    // Count students with low attendance (< 75%)
    const allStudentsAttendance = await prisma.student.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        attendanceRecords: {
          select: { status: true },
        },
      },
    });

    let lowAttendanceCount = 0;
    for (const st of allStudentsAttendance) {
      if (st.attendanceRecords.length > 0) {
        const metrics = calculateAttendance(st.attendanceRecords, 75.0);
        if (metrics.isLowAttendance) {
          lowAttendanceCount++;
        }
      }
    }

    return res.json({
      success: true,
      data: {
        role: user.role,
        stats: {
          totalStudents: totalActiveStudents,
          totalTeachers,
          totalCourses,
          totalClasses,
          todayAttendancePercentage: Math.round(todayAttendancePercentage * 10) / 10,
          lowAttendanceStudentsCount: lowAttendanceCount,
          totalFeeAmount: pendingFeeResult._sum.totalAmount || 0,
          collectedFeeAmount: pendingFeeResult._sum.paidAmount || 0,
          pendingFeeAmount: pendingFeeResult._sum.balance || 0,
          upcomingExamsCount: upcomingExams.length,
        },
        upcomingExams,
        recentStudents,
        recentAnnouncements,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getDashboardCharts = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // 1. Course Distribution
    const courses = await prisma.course.findMany({
      include: {
        _count: {
          select: { students: true },
        },
      },
    });

    const courseDistribution = courses.map((c) => ({
      name: c.name,
      code: c.code,
      studentCount: c._count.students,
    }));

    // 2. Fee Collection vs Outstanding
    const feeTotals = await prisma.studentFee.aggregate({
      _sum: {
        paidAmount: true,
        balance: true,
        totalAmount: true,
      },
    });

    const feeComparison = [
      { name: 'Collected', amount: feeTotals._sum.paidAmount || 0 },
      { name: 'Outstanding', amount: feeTotals._sum.balance || 0 },
    ];

    // 3. Monthly admissions (last 6 months)
    const now = new Date();
    const monthsData: { month: string; admissions: number }[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextD = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const count = await prisma.student.count({
        where: {
          admissionDate: {
            gte: d,
            lt: nextD,
          },
        },
      });

      monthsData.push({
        month: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
        admissions: count,
      });
    }

    // 4. Attendance Trends (last 7 sessions or recent dates)
    const recentSessions = await prisma.attendanceSession.findMany({
      take: 7,
      orderBy: { date: 'desc' },
      include: {
        records: true,
        class: { select: { name: true } },
      },
    });

    const attendanceTrends = recentSessions
      .map((session) => {
        const metrics = calculateAttendance(session.records);
        const dateStr = new Date(session.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
        return {
          date: dateStr,
          percentage: metrics.percentage,
          present: metrics.presentCount,
          absent: metrics.absentCount,
          late: metrics.lateCount,
        };
      })
      .reverse();

    // 5. Exam Performance Distribution (Grade breakdown)
    const allMarks = await prisma.studentMark.findMany({
      where: { isPublished: true },
      select: { grade: true, marksObtained: true },
    });

    const gradeCounts: Record<string, number> = {
      'A+': 0,
      A: 0,
      'B+': 0,
      B: 0,
      'C+': 0,
      C: 0,
      D: 0,
      F: 0,
    };

    allMarks.forEach((m) => {
      if (m.grade && gradeCounts[m.grade] !== undefined) {
        gradeCounts[m.grade]++;
      }
    });

    const examGradeDistribution = Object.keys(gradeCounts).map((grade) => ({
      grade,
      count: gradeCounts[grade],
    }));

    return res.json({
      success: true,
      data: {
        courseDistribution,
        feeComparison,
        monthlyAdmissions: monthsData,
        attendanceTrends,
        examGradeDistribution,
      },
    });
  } catch (error) {
    next(error);
  }
};
