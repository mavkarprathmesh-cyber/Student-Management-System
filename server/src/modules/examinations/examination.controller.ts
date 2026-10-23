import { Response, NextFunction } from 'express';
import { prisma } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import { AuthRequest } from '../../types/auth';
import { calculateGrade } from '../../utils/gradeCalculator';
import { logAudit } from '../../utils/auditLogger';

export const getExaminations = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { academicYearId, isPublished } = req.query as Record<string, string>;

    const where: any = {};
    if (academicYearId) where.academicYearId = academicYearId;

    // Students only see published exams
    if (req.user?.role === 'STUDENT') {
      where.isPublished = true;
    } else if (isPublished !== undefined) {
      where.isPublished = isPublished === 'true';
    }

    const exams = await prisma.examination.findMany({
      where,
      include: {
        academicYear: { select: { id: true, name: true } },
        term: { select: { id: true, name: true } },
        subjects: {
          include: {
            subject: { select: { id: true, name: true, code: true, credits: true } },
            _count: { select: { marks: true } },
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    return res.json({ success: true, data: exams });
  } catch (error) {
    next(error);
  }
};

export const getExaminationById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const exam = await prisma.examination.findUnique({
      where: { id },
      include: {
        academicYear: true,
        term: true,
        subjects: {
          include: {
            subject: true,
          },
        },
      },
    });

    if (!exam) throw new AppError('Examination not found.', 404);

    if (req.user?.role === 'STUDENT' && !exam.isPublished) {
      throw new AppError('Examination results are not yet published.', 403);
    }

    return res.json({ success: true, data: exam });
  } catch (error) {
    next(error);
  }
};

export const createExamination = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, examType = 'MID_TERM', academicYearId, termId, startDate, endDate, subjects } = req.body;

    const exam = await prisma.examination.create({
      data: {
        name,
        examType,
        academicYearId,
        termId: termId || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isPublished: false,
        subjects: {
          create: Array.isArray(subjects)
            ? subjects.map((s: any) => ({
                subjectId: s.subjectId,
                examDate: new Date(s.examDate || startDate),
                maxMarks: Number(s.maxMarks || 100),
                passMarks: Number(s.passMarks || 40),
              }))
            : [],
        },
      },
      include: {
        subjects: { include: { subject: true } },
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'CREATE_EXAMINATION',
      entity: 'Examination',
      entityId: exam.id,
      details: { name, examType },
      ipAddress: req.ip,
    });

    return res.status(201).json({ success: true, data: exam });
  } catch (error) {
    next(error);
  }
};

export const togglePublishExam = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { isPublished } = req.body;

    const exam = await prisma.examination.update({
      where: { id },
      data: { isPublished: Boolean(isPublished) },
    });

    // Also update all marks under this exam
    const examSubjects = await prisma.examinationSubject.findMany({
      where: { examId: id },
      select: { id: true },
    });
    const examSubjectIds = examSubjects.map((es) => es.id);

    await prisma.studentMark.updateMany({
      where: { examSubjectId: { in: examSubjectIds } },
      data: { isPublished: Boolean(isPublished) },
    });

    await logAudit({
      userId: req.user?.id,
      action: isPublished ? 'PUBLISH_EXAM_RESULTS' : 'UNPUBLISH_EXAM_RESULTS',
      entity: 'Examination',
      entityId: id,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: `Examination results ${isPublished ? 'published' : 'unpublished'} successfully.`,
      data: exam,
    });
  } catch (error) {
    next(error);
  }
};

export const getExamMarksSheet = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { examSubjectId, classId } = req.query as Record<string, string>;

    if (!examSubjectId) {
      throw new AppError('Exam Subject ID is required.', 400);
    }

    const examSubject = await prisma.examinationSubject.findUnique({
      where: { id: examSubjectId },
      include: {
        exam: true,
        subject: true,
      },
    });

    if (!examSubject) throw new AppError('Exam subject configuration not found.', 404);

    // Get students in the specified class or all students enrolled in subject course
    const students = await prisma.student.findMany({
      where: {
        classId: classId || undefined,
        courseId: examSubject.subject.courseId,
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

    const existingMarks = await prisma.studentMark.findMany({
      where: { examSubjectId },
    });

    const marksMap = new Map();
    for (const m of existingMarks) {
      marksMap.set(m.studentId, m);
    }

    const markSheet = students.map((s) => {
      const mark = marksMap.get(s.id);
      return {
        studentId: s.id,
        admissionNumber: s.admissionNumber,
        name: `${s.firstName} ${s.lastName}`,
        rollNumber: s.rollNumber,
        marksObtained: mark ? mark.marksObtained : null,
        status: mark ? mark.status : 'PRESENT',
        grade: mark ? mark.grade : null,
        remarks: mark ? mark.remarks : '',
      };
    });

    return res.json({
      success: true,
      data: {
        examSubject,
        markSheet,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const saveExamMarks = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { examSubjectId, marks } = req.body;

    if (!examSubjectId || !Array.isArray(marks) || marks.length === 0) {
      throw new AppError('Exam Subject ID and marks list are required.', 400);
    }

    const examSubject = await prisma.examinationSubject.findUnique({
      where: { id: examSubjectId },
      include: { exam: true },
    });

    if (!examSubject) throw new AppError('Exam subject not found.', 404);

    const maxMarks = examSubject.maxMarks;
    const passMarks = examSubject.passMarks;

    // Validate marks values
    for (const entry of marks) {
      if (entry.status === 'PRESENT') {
        const val = Number(entry.marksObtained);
        if (isNaN(val) || val < 0 || val > maxMarks) {
          throw new AppError(`Marks for student must be between 0 and ${maxMarks}. Received: ${entry.marksObtained}`, 400);
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const entry of marks) {
        let grade: string | null = null;
        let marksObtained: number | null = null;

        if (entry.status === 'PRESENT') {
          marksObtained = Number(entry.marksObtained);
          const gradeCalc = calculateGrade(marksObtained, maxMarks, passMarks);
          grade = gradeCalc.grade;
        } else if (entry.status === 'ABSENT') {
          grade = 'F';
          marksObtained = 0;
        } else if (entry.status === 'EXEMPT') {
          grade = 'EX';
          marksObtained = null;
        }

        await tx.studentMark.upsert({
          where: {
            examSubjectId_studentId: {
              examSubjectId,
              studentId: entry.studentId,
            },
          },
          update: {
            marksObtained,
            status: entry.status || 'PRESENT',
            grade,
            remarks: entry.remarks || null,
            isPublished: examSubject.exam.isPublished,
          },
          create: {
            examSubjectId,
            studentId: entry.studentId,
            marksObtained,
            status: entry.status || 'PRESENT',
            grade,
            remarks: entry.remarks || null,
            isPublished: examSubject.exam.isPublished,
          },
        });
      }
    });

    await logAudit({
      userId: req.user?.id,
      action: 'ENTER_MARKS',
      entity: 'StudentMark',
      entityId: examSubjectId,
      details: { count: marks.length },
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: `Marks recorded successfully for ${marks.length} students.`,
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentReportCard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { studentId, examId } = req.params;

    // RBAC: If student, ensure matches own profile
    if (req.user?.role === 'STUDENT' && req.user.studentId !== studentId) {
      throw new AppError('Forbidden: You can only view your own report card.', 403);
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        department: true,
        course: true,
        class: true,
        academicYear: true,
      },
    });

    if (!student) throw new AppError('Student not found.', 404);

    const exam = await prisma.examination.findUnique({
      where: { id: examId },
      include: {
        academicYear: true,
        term: true,
        subjects: {
          include: {
            subject: true,
            marks: {
              where: {
                studentId,
                ...(req.user?.role === 'STUDENT' ? { isPublished: true } : {}),
              },
            },
          },
        },
      },
    });

    if (!exam) throw new AppError('Examination not found.', 404);

    if (req.user?.role === 'STUDENT' && !exam.isPublished) {
      throw new AppError('Results for this examination have not been published yet.', 403);
    }

    let totalMaxMarks = 0;
    let totalMarksObtained = 0;
    let totalCredits = 0;
    let totalGpaPoints = 0;
    let passedAll = true;

    const subjectResults = exam.subjects.map((es) => {
      const mark = es.marks[0];
      const obtained = mark?.marksObtained ?? 0;
      const isAbsent = mark?.status === 'ABSENT';
      const isExempt = mark?.status === 'EXEMPT';

      const gradeInfo = calculateGrade(obtained, es.maxMarks, es.passMarks);

      if (!isExempt) {
        totalMaxMarks += es.maxMarks;
        totalMarksObtained += obtained;
        totalCredits += es.subject.credits;
        totalGpaPoints += gradeInfo.gpa * es.subject.credits;

        if (!gradeInfo.isPassed || isAbsent) {
          passedAll = false;
        }
      }

      return {
        subjectCode: es.subject.code,
        subjectName: es.subject.name,
        credits: es.subject.credits,
        maxMarks: es.maxMarks,
        passMarks: es.passMarks,
        marksObtained: mark?.marksObtained ?? null,
        status: mark?.status || 'NOT_ENTERED',
        grade: mark?.grade || gradeInfo.grade,
        isPassed: gradeInfo.isPassed && !isAbsent,
        gpa: gradeInfo.gpa,
      };
    });

    const overallPercentage = totalMaxMarks > 0
      ? Math.round(((totalMarksObtained / totalMaxMarks) * 100) * 100) / 100
      : 0;

    const overallGpa = totalCredits > 0
      ? Math.round((totalGpaPoints / totalCredits) * 100) / 100
      : 0;

    const overallGradeInfo = calculateGrade(totalMarksObtained, totalMaxMarks);

    // Fetch institution settings for official header
    const institution = await prisma.institutionSetting.findFirst();

    return res.json({
      success: true,
      data: {
        institution,
        student,
        exam: {
          id: exam.id,
          name: exam.name,
          examType: exam.examType,
          academicYear: exam.academicYear.name,
          term: exam.term?.name,
          startDate: exam.startDate,
          endDate: exam.endDate,
        },
        subjectResults,
        summary: {
          totalMaxMarks,
          totalMarksObtained,
          overallPercentage,
          overallGrade: passedAll ? overallGradeInfo.grade : 'F',
          overallGpa,
          isPassed: passedAll,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
