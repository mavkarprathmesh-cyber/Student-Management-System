export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface User {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
  avatar?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  student?: {
    id: string;
    admissionNumber: string;
    firstName: string;
    lastName: string;
    classId: string;
    courseId: string;
  } | null;
  studentProfile?: {
    id?: string;
    admissionNumber?: string;
    firstName?: string;
    lastName?: string;
  } | null;
  teacher?: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    departmentId: string;
  } | null;
  teacherProfile?: {
    id?: string;
    employeeId?: string;
    firstName?: string;
    lastName?: string;
  } | null;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  _count?: {
    courses: number;
    teachers: number;
    students: number;
    subjects: number;
  };
}

export interface Course {
  id: string;
  code: string;
  name: string;
  departmentId: string;
  department?: Department;
  durationYears: number;
  _count?: {
    classes: number;
    students: number;
    subjects: number;
  };
}

export interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  terms?: SemesterTerm[];
  _count?: {
    classes: number;
    students: number;
    enrollments: number;
  };
}

export interface SemesterTerm {
  id: string;
  name: string;
  academicYearId: string;
  startDate: string;
  endDate: string;
}

export interface ClassSection {
  id: string;
  name: string;
  gradeLevel: string;
  section: string;
  courseId: string;
  course?: Course;
  academicYearId: string;
  academicYear?: AcademicYear;
  _count?: {
    students: number;
    enrollments: number;
    assignments: number;
  };
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  courseId: string;
  course?: Course;
  departmentId: string;
  department?: Department;
  credits: number;
  assignments?: Array<{
    teacher: { id: string; firstName: string; lastName: string };
    class: { id: string; name: string };
  }>;
}

export interface Student {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
  parentEmail?: string | null;
  admissionDate: string;
  departmentId: string;
  department?: Department;
  courseId: string;
  course?: Course;
  classId: string;
  class?: ClassSection;
  academicYearId: string;
  academicYear?: AcademicYear;
  rollNumber: string;
  status: string;
  emergencyContact?: string | null;
  photoUrl?: string | null;
  attendanceSummary?: {
    totalSessions: number;
    percentage: number;
    attendedEligibleCount: number;
    isLowAttendance: boolean;
  };
  financialSummary?: {
    totalFeeAmount: number;
    totalPaidAmount: number;
    totalBalance: number;
  };
}

export interface Teacher {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  departmentId: string;
  department?: Department;
  designation: string;
  joiningDate: string;
  status: string;
  user?: { id: string; email: string; status: string; avatar?: string | null };
  assignments?: Array<{
    id: string;
    subject: { id: string; name: string; code: string };
    class: { id: string; name: string };
    academicYear: { id: string; name: string };
  }>;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  remarks?: string | null;
  student?: {
    id: string;
    admissionNumber: string;
    firstName: string;
    lastName: string;
    rollNumber: string;
  };
}

export interface Examination {
  id: string;
  name: string;
  examType: string;
  academicYearId: string;
  academicYear?: AcademicYear;
  termId?: string | null;
  term?: SemesterTerm | null;
  startDate: string;
  endDate: string;
  isPublished: boolean;
  subjects?: Array<{
    id: string;
    subjectId: string;
    subject: Subject;
    examDate: string;
    maxMarks: number;
    passMarks: number;
  }>;
}

export interface FeeStructure {
  id: string;
  name: string;
  courseId: string;
  course?: Course;
  classId?: string | null;
  class?: ClassSection | null;
  academicYearId: string;
  academicYear?: AcademicYear;
  category: string;
  amount: number;
  dueDate: string;
}

export interface StudentFee {
  id: string;
  studentId: string;
  student?: Student;
  feeStructureId: string;
  feeStructure?: FeeStructure;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: 'PAID' | 'PARTIAL' | 'OVERDUE' | 'UNPAID';
  dueDate: string;
  transactions?: PaymentTransaction[];
}

export interface PaymentTransaction {
  id: string;
  studentFeeId: string;
  receiptNumber: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  notes?: string | null;
  status: string;
  recordedBy?: { email: string };
  studentFee?: StudentFee;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  targetAudience: string;
  targetClassId?: string | null;
  targetClass?: { name: string } | null;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  isPublished: boolean;
  createdAt: string;
  author?: { email: string };
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ALERT';
  isRead: boolean;
  link?: string | null;
  createdAt: string;
}

export interface InstitutionSetting {
  id: string;
  institutionName: string;
  code: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  currency: string;
  currencySymbol: string;
  attendanceThreshold: number;
  gradingSystem: string;
  logoUrl?: string | null;
}
