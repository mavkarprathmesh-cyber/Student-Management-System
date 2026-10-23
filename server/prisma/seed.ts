import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Student Management System database...');

  // 1. Institution Settings
  await prisma.institutionSetting.upsert({
    where: { id: 'default-setting' },
    update: {},
    create: {
      id: 'default-setting',
      institutionName: 'Apex Academy of Technology & Sciences',
      code: 'AATS',
      address: '100 Innovation Way, Tech Campus, Cambridge, MA',
      email: 'admissions@apex-academy.edu',
      phone: '+1 (555) 234-5678',
      website: 'https://apex-academy.edu',
      currency: 'USD',
      currencySymbol: '$',
      attendanceThreshold: 75.0,
      gradingSystem: 'STANDARD_LETTER',
    },
  });

  // Password hashes
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('Admin@123456', salt);
  const teacherPasswordHash = await bcrypt.hash('Teacher@123456', salt);
  const studentPasswordHash = await bcrypt.hash('Student@123456', salt);

  // 2. Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@sms.edu' },
    update: { passwordHash: adminPasswordHash },
    create: {
      email: 'admin@sms.edu',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  // 3. Departments
  const cseDept = await prisma.department.upsert({
    where: { code: 'CSE' },
    update: {},
    create: {
      code: 'CSE',
      name: 'Computer Science & Engineering',
      description: 'Department of Computing, Software, and Artificial Intelligence',
    },
  });

  const bbaDept = await prisma.department.upsert({
    where: { code: 'DBA' },
    update: {},
    create: {
      code: 'DBA',
      name: 'Business Administration',
      description: 'Department of Business, Finance, and Enterprise Management',
    },
  });

  // 4. Courses
  const cseCourse = await prisma.course.upsert({
    where: { code: 'BTECH-CS' },
    update: {},
    create: {
      code: 'BTECH-CS',
      name: 'B.Tech Computer Science & Engineering',
      departmentId: cseDept.id,
      durationYears: 4,
    },
  });

  const bbaCourse = await prisma.course.upsert({
    where: { code: 'BBA-GEN' },
    update: {},
    create: {
      code: 'BBA-GEN',
      name: 'Bachelor of Business Administration',
      departmentId: bbaDept.id,
      durationYears: 3,
    },
  });

  // 5. Academic Year & Terms
  const currentYear = await prisma.academicYear.upsert({
    where: { name: '2025-2026' },
    update: { isCurrent: true },
    create: {
      name: '2025-2026',
      startDate: new Date('2025-08-01'),
      endDate: new Date('2026-06-30'),
      isCurrent: true,
      terms: {
        create: [
          {
            name: 'Fall 2025',
            startDate: new Date('2025-08-01'),
            endDate: new Date('2025-12-20'),
          },
          {
            name: 'Spring 2026',
            startDate: new Date('2026-01-10'),
            endDate: new Date('2026-05-30'),
          },
        ],
      },
    },
    include: { terms: true },
  });

  const fallTerm = currentYear.terms.find((t) => t.name === 'Fall 2025') || currentYear.terms[0];

  // 6. Classes
  const classCse1A = await prisma.classSection.upsert({
    where: {
      name_academicYearId: {
        name: 'CSE - Year 1 (Sec A)',
        academicYearId: currentYear.id,
      },
    },
    update: {},
    create: {
      name: 'CSE - Year 1 (Sec A)',
      gradeLevel: '1st Year',
      section: 'A',
      courseId: cseCourse.id,
      academicYearId: currentYear.id,
    },
  });

  const classBba1A = await prisma.classSection.upsert({
    where: {
      name_academicYearId: {
        name: 'BBA - Year 1 (Sec A)',
        academicYearId: currentYear.id,
      },
    },
    update: {},
    create: {
      name: 'BBA - Year 1 (Sec A)',
      gradeLevel: '1st Year',
      section: 'A',
      courseId: bbaCourse.id,
      academicYearId: currentYear.id,
    },
  });

  // 7. Subjects
  const subjDsa = await prisma.subject.upsert({
    where: { code: 'CS101' },
    update: {},
    create: {
      code: 'CS101',
      name: 'Data Structures & Algorithms',
      courseId: cseCourse.id,
      departmentId: cseDept.id,
      credits: 4,
    },
  });

  const subjDbms = await prisma.subject.upsert({
    where: { code: 'CS102' },
    update: {},
    create: {
      code: 'CS102',
      name: 'Database Management Systems',
      courseId: cseCourse.id,
      departmentId: cseDept.id,
      credits: 4,
    },
  });

  const subjMgmt = await prisma.subject.upsert({
    where: { code: 'BBA101' },
    update: {},
    create: {
      code: 'BBA101',
      name: 'Principles of Management',
      courseId: bbaCourse.id,
      departmentId: bbaDept.id,
      credits: 3,
    },
  });

  // 8. Teachers
  const teacherUser1 = await prisma.user.upsert({
    where: { email: 'sarah.jenkins@sms.edu' },
    update: { passwordHash: teacherPasswordHash },
    create: {
      email: 'sarah.jenkins@sms.edu',
      passwordHash: teacherPasswordHash,
      role: 'TEACHER',
      status: 'ACTIVE',
    },
  });

  const teacherSarah = await prisma.teacher.upsert({
    where: { employeeId: 'EMP-1001' },
    update: {},
    create: {
      employeeId: 'EMP-1001',
      firstName: 'Sarah',
      lastName: 'Jenkins',
      email: 'sarah.jenkins@sms.edu',
      phone: '+1 555-0101',
      departmentId: cseDept.id,
      designation: 'Associate Professor',
      joiningDate: new Date('2021-08-15'),
      status: 'ACTIVE',
      userId: teacherUser1.id,
    },
  });

  const teacherUser2 = await prisma.user.upsert({
    where: { email: 'david.chen@sms.edu' },
    update: { passwordHash: teacherPasswordHash },
    create: {
      email: 'david.chen@sms.edu',
      passwordHash: teacherPasswordHash,
      role: 'TEACHER',
      status: 'ACTIVE',
    },
  });

  const teacherDavid = await prisma.teacher.upsert({
    where: { employeeId: 'EMP-1002' },
    update: {},
    create: {
      employeeId: 'EMP-1002',
      firstName: 'David',
      lastName: 'Chen',
      email: 'david.chen@sms.edu',
      phone: '+1 555-0102',
      departmentId: bbaDept.id,
      designation: 'Senior Lecturer',
      joiningDate: new Date('2022-01-10'),
      status: 'ACTIVE',
      userId: teacherUser2.id,
    },
  });

  // Teacher Assignments
  await prisma.teacherAssignment.upsert({
    where: {
      teacherId_subjectId_classId_academicYearId: {
        teacherId: teacherSarah.id,
        subjectId: subjDsa.id,
        classId: classCse1A.id,
        academicYearId: currentYear.id,
      },
    },
    update: {},
    create: {
      teacherId: teacherSarah.id,
      subjectId: subjDsa.id,
      classId: classCse1A.id,
      academicYearId: currentYear.id,
    },
  });

  await prisma.teacherAssignment.upsert({
    where: {
      teacherId_subjectId_classId_academicYearId: {
        teacherId: teacherDavid.id,
        subjectId: subjMgmt.id,
        classId: classBba1A.id,
        academicYearId: currentYear.id,
      },
    },
    update: {},
    create: {
      teacherId: teacherDavid.id,
      subjectId: subjMgmt.id,
      classId: classBba1A.id,
      academicYearId: currentYear.id,
    },
  });

  // 9. Students
  const rawStudents = [
    {
      admissionNumber: 'ADM-2025-0001',
      firstName: 'Alex',
      lastName: 'Morgan',
      email: 'alex.morgan@sms.edu',
      phone: '+1 555-1001',
      dateOfBirth: new Date('2005-04-12'),
      gender: 'MALE',
      parentName: 'Robert Morgan',
      parentPhone: '+1 555-9001',
      address: '742 Evergreen Terrace, Springfield',
      classId: classCse1A.id,
      courseId: cseCourse.id,
      departmentId: cseDept.id,
      rollNumber: 'CS-01',
    },
    {
      admissionNumber: 'ADM-2025-0002',
      firstName: 'Emma',
      lastName: 'Watson',
      email: 'emma.watson@sms.edu',
      phone: '+1 555-1002',
      dateOfBirth: new Date('2005-09-21'),
      gender: 'FEMALE',
      parentName: 'Christopher Watson',
      parentPhone: '+1 555-9002',
      address: '12 Grimmauld Place, Boston',
      classId: classCse1A.id,
      courseId: cseCourse.id,
      departmentId: cseDept.id,
      rollNumber: 'CS-02',
    },
    {
      admissionNumber: 'ADM-2025-0003',
      firstName: 'Liam',
      lastName: 'Johnson',
      email: 'liam.johnson@sms.edu',
      phone: '+1 555-1003',
      dateOfBirth: new Date('2004-11-15'),
      gender: 'MALE',
      parentName: 'Mark Johnson',
      parentPhone: '+1 555-9003',
      address: '42 Wallaby Way, Cambridge',
      classId: classCse1A.id,
      courseId: cseCourse.id,
      departmentId: cseDept.id,
      rollNumber: 'CS-03',
    },
    {
      admissionNumber: 'ADM-2025-0004',
      firstName: 'Sophia',
      lastName: 'Martinez',
      email: 'sophia.martinez@sms.edu',
      phone: '+1 555-1004',
      dateOfBirth: new Date('2005-02-18'),
      gender: 'FEMALE',
      parentName: 'Carlos Martinez',
      parentPhone: '+1 555-9004',
      address: '221B Baker Street, Somerville',
      classId: classCse1A.id,
      courseId: cseCourse.id,
      departmentId: cseDept.id,
      rollNumber: 'CS-04',
    },
    {
      admissionNumber: 'ADM-2025-0005',
      firstName: 'Noah',
      lastName: 'Kim',
      email: 'noah.kim@sms.edu',
      phone: '+1 555-1005',
      dateOfBirth: new Date('2005-06-30'),
      gender: 'MALE',
      parentName: 'Daniel Kim',
      parentPhone: '+1 555-9005',
      address: '350 5th Ave, New York',
      classId: classBba1A.id,
      courseId: bbaCourse.id,
      departmentId: bbaDept.id,
      rollNumber: 'BB-01',
    },
    {
      admissionNumber: 'ADM-2025-0006',
      firstName: 'Olivia',
      lastName: 'Brown',
      email: 'olivia.brown@sms.edu',
      phone: '+1 555-1006',
      dateOfBirth: new Date('2005-08-14'),
      gender: 'FEMALE',
      parentName: 'James Brown',
      parentPhone: '+1 555-9006',
      address: '88 Atlantic Ave, Boston',
      classId: classBba1A.id,
      courseId: bbaCourse.id,
      departmentId: bbaDept.id,
      rollNumber: 'BB-02',
    },
  ];

  const createdStudents = [];

  for (const item of rawStudents) {
    const studentUser = await prisma.user.upsert({
      where: { email: item.email },
      update: { passwordHash: studentPasswordHash },
      create: {
        email: item.email,
        passwordHash: studentPasswordHash,
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    });

    const student = await prisma.student.upsert({
      where: { admissionNumber: item.admissionNumber },
      update: {},
      create: {
        ...item,
        academicYearId: currentYear.id,
        status: 'ACTIVE',
        userId: studentUser.id,
      },
    });

    // Ensure enrollment
    await prisma.enrollment.upsert({
      where: {
        studentId_classId_academicYearId: {
          studentId: student.id,
          classId: item.classId,
          academicYearId: currentYear.id,
        },
      },
      update: {},
      create: {
        studentId: student.id,
        classId: item.classId,
        academicYearId: currentYear.id,
        status: 'ACTIVE',
      },
    });

    createdStudents.push(student);
  }

  // 10. Attendance Sessions & Records (Past 5 days)
  const today = new Date();
  const cseStudents = createdStudents.filter((s) => s.classId === classCse1A.id);

  for (let d = 4; d >= 0; d--) {
    const sessionDate = new Date(today);
    sessionDate.setDate(today.getDate() - d);
    sessionDate.setHours(0, 0, 0, 0);

    const session = await prisma.attendanceSession.upsert({
      where: {
        classId_subjectId_date: {
          classId: classCse1A.id,
          subjectId: subjDsa.id,
          date: sessionDate,
        },
      },
      update: {},
      create: {
        classId: classCse1A.id,
        subjectId: subjDsa.id,
        academicYearId: currentYear.id,
        date: sessionDate,
        takenById: teacherUser1.id,
        notes: `Regular lecture on Algorithms - Day ${5 - d}`,
      },
    });

    // Mark records: Alex mostly present, Liam 1 late, Noah absent
    for (let i = 0; i < cseStudents.length; i++) {
      const student = cseStudents[i];
      let status = 'PRESENT';
      if (i === 2 && d === 1) status = 'LATE';
      if (i === 3 && d === 2) status = 'ABSENT';
      if (i === 3 && d === 0) status = 'EXCUSED';

      await prisma.attendanceRecord.upsert({
        where: {
          sessionId_studentId: {
            sessionId: session.id,
            studentId: student.id,
          },
        },
        update: {},
        create: {
          sessionId: session.id,
          studentId: student.id,
          status,
          remarks: status === 'LATE' ? 'Bus delay' : status === 'EXCUSED' ? 'Medical leave approved' : null,
        },
      });
    }
  }

  // 11. Examinations & Marks
  const exam = await prisma.examination.upsert({
    where: { id: 'exam-midterm-fall-2025' },
    update: { isPublished: true },
    create: {
      id: 'exam-midterm-fall-2025',
      name: 'Fall 2025 Mid-Term Examination',
      examType: 'MID_TERM',
      academicYearId: currentYear.id,
      termId: fallTerm.id,
      startDate: new Date('2025-10-15'),
      endDate: new Date('2025-10-25'),
      isPublished: true,
    },
  });

  const examSubjDsa = await prisma.examinationSubject.upsert({
    where: {
      examId_subjectId: {
        examId: exam.id,
        subjectId: subjDsa.id,
      },
    },
    update: {},
    create: {
      examId: exam.id,
      subjectId: subjDsa.id,
      examDate: new Date('2025-10-16'),
      maxMarks: 100,
      passMarks: 40,
    },
  });

  const examSubjDbms = await prisma.examinationSubject.upsert({
    where: {
      examId_subjectId: {
        examId: exam.id,
        subjectId: subjDbms.id,
      },
    },
    update: {},
    create: {
      examId: exam.id,
      subjectId: subjDbms.id,
      examDate: new Date('2025-10-18'),
      maxMarks: 100,
      passMarks: 40,
    },
  });

  // Marks for CSE students
  const marksData = [
    { student: cseStudents[0], dsa: 92, dbms: 88 }, // Alex: A+, A
    { student: cseStudents[1], dsa: 85, dbms: 91 }, // Emma: A, A+
    { student: cseStudents[2], dsa: 74, dbms: 68 }, // Liam: B, C+
    { student: cseStudents[3], dsa: 45, dbms: 52 }, // Sophia: D, D
  ];

  for (const m of marksData) {
    if (m.student) {
      await prisma.studentMark.upsert({
        where: {
          examSubjectId_studentId: {
            examSubjectId: examSubjDsa.id,
            studentId: m.student.id,
          },
        },
        update: {},
        create: {
          examSubjectId: examSubjDsa.id,
          studentId: m.student.id,
          marksObtained: m.dsa,
          status: 'PRESENT',
          grade: m.dsa >= 90 ? 'A+' : m.dsa >= 80 ? 'A' : m.dsa >= 70 ? 'B' : 'D',
          isPublished: true,
        },
      });

      await prisma.studentMark.upsert({
        where: {
          examSubjectId_studentId: {
            examSubjectId: examSubjDbms.id,
            studentId: m.student.id,
          },
        },
        update: {},
        create: {
          examSubjectId: examSubjDbms.id,
          studentId: m.student.id,
          marksObtained: m.dbms,
          status: 'PRESENT',
          grade: m.dbms >= 90 ? 'A+' : m.dbms >= 80 ? 'A' : m.dbms >= 65 ? 'C+' : 'D',
          isPublished: true,
        },
      });
    }
  }

  // 12. Fee Structures & Student Fees
  const feeTuition = await prisma.feeStructure.upsert({
    where: { id: 'fee-btech-fall-2025-tuition' },
    update: {},
    create: {
      id: 'fee-btech-fall-2025-tuition',
      name: 'B.Tech Fall 2025 Tuition Fee',
      courseId: cseCourse.id,
      classId: classCse1A.id,
      academicYearId: currentYear.id,
      category: 'TUITION',
      amount: 2500,
      dueDate: new Date('2025-09-30'),
    },
  });

  const feeLab = await prisma.feeStructure.upsert({
    where: { id: 'fee-btech-lab-2025' },
    update: {},
    create: {
      id: 'fee-btech-lab-2025',
      name: 'Computer Laboratory & Cloud Lab Fee',
      courseId: cseCourse.id,
      academicYearId: currentYear.id,
      category: 'LABORATORY',
      amount: 350,
      dueDate: new Date('2025-09-30'),
    },
  });

  // Assign fees and sample payments
  if (cseStudents[0]) {
    // Alex: Paid in full
    const sf1 = await prisma.studentFee.upsert({
      where: {
        studentId_feeStructureId: {
          studentId: cseStudents[0].id,
          feeStructureId: feeTuition.id,
        },
      },
      update: {},
      create: {
        studentId: cseStudents[0].id,
        feeStructureId: feeTuition.id,
        totalAmount: 2500,
        paidAmount: 2500,
        balance: 0,
        status: 'PAID',
        dueDate: new Date('2025-09-30'),
      },
    });

    await prisma.paymentTransaction.upsert({
      where: { receiptNumber: 'REC-2025-0001' },
      update: {},
      create: {
        studentFeeId: sf1.id,
        receiptNumber: 'REC-2025-0001',
        amount: 2500,
        paymentMethod: 'BANK_TRANSFER',
        recordedById: adminUser.id,
        notes: 'Full tuition payment via Wire Transfer',
        status: 'SUCCESS',
      },
    });
  }

  if (cseStudents[1]) {
    // Emma: Partially paid
    const sf2 = await prisma.studentFee.upsert({
      where: {
        studentId_feeStructureId: {
          studentId: cseStudents[1].id,
          feeStructureId: feeTuition.id,
        },
      },
      update: {},
      create: {
        studentId: cseStudents[1].id,
        feeStructureId: feeTuition.id,
        totalAmount: 2500,
        paidAmount: 1500,
        balance: 1000,
        status: 'PARTIAL',
        dueDate: new Date('2025-09-30'),
      },
    });

    await prisma.paymentTransaction.upsert({
      where: { receiptNumber: 'REC-2025-0002' },
      update: {},
      create: {
        studentFeeId: sf2.id,
        receiptNumber: 'REC-2025-0002',
        amount: 1500,
        paymentMethod: 'CARD',
        recordedById: adminUser.id,
        notes: 'First installment paid by credit card',
        status: 'SUCCESS',
      },
    });
  }

  if (cseStudents[2]) {
    // Liam: Unpaid
    await prisma.studentFee.upsert({
      where: {
        studentId_feeStructureId: {
          studentId: cseStudents[2].id,
          feeStructureId: feeTuition.id,
        },
      },
      update: {},
      create: {
        studentId: cseStudents[2].id,
        feeStructureId: feeTuition.id,
        totalAmount: 2500,
        paidAmount: 0,
        balance: 2500,
        status: 'OVERDUE',
        dueDate: new Date('2025-09-30'),
      },
    });
  }

  // 13. Announcements
  await prisma.announcement.create({
    data: {
      title: 'Welcome to Academic Year 2025-2026',
      content: 'We are thrilled to welcome all new and returning students to Apex Academy. Please review your semester course schedule and class assignments.',
      targetAudience: 'ALL',
      priority: 'HIGH',
      authorId: adminUser.id,
    },
  });

  await prisma.announcement.create({
    data: {
      title: 'Fall 2025 Mid-Term Results Published',
      content: 'Examination results for the Fall 2025 Mid-Term examinations are now published. Students may view and download their official report cards from their academic profile.',
      targetAudience: 'STUDENTS',
      priority: 'NORMAL',
      authorId: adminUser.id,
    },
  });

  await prisma.announcement.create({
    data: {
      title: 'Faculty Senate Meeting: Curriculum Review',
      content: 'A mandatory faculty meeting is scheduled for Friday at 3:00 PM in Conference Hall B to review syllabus updates and assessment grading rubrics.',
      targetAudience: 'TEACHERS',
      priority: 'NORMAL',
      authorId: adminUser.id,
    },
  });

  // 14. In-App Notifications
  await prisma.notification.create({
    data: {
      userId: adminUser.id,
      title: 'System Initialized',
      message: 'Apex Student Management System database setup and verified successfully.',
      type: 'SUCCESS',
    },
  });

  // 15. Initial Audit Log
  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      action: 'SYSTEM_INITIALIZATION',
      entity: 'System',
      details: JSON.stringify({ version: '1.0.0', initializedAt: new Date() }),
      ipAddress: '127.0.0.1',
    },
  });

  console.log('Database seeded successfully!');
  console.log('Default credentials:');
  console.log('  Administrator: admin@sms.edu / Admin@123456');
  console.log('  Teacher:       sarah.jenkins@sms.edu / Teacher@123456');
  console.log('  Student:       alex.morgan@sms.edu / Student@123456');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
