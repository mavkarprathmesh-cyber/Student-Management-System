import { z } from 'zod';

export const createStudentSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date of birth format',
  }),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).default('OTHER'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  parentName: z.string().optional().nullable(),
  parentPhone: z.string().optional().nullable(),
  parentEmail: z.string().email().optional().nullable().or(z.literal('')),
  departmentId: z.string().min(1, 'Department is required'),
  courseId: z.string().min(1, 'Course is required'),
  classId: z.string().min(1, 'Class is required'),
  academicYearId: z.string().min(1, 'Academic year is required'),
  rollNumber: z.string().min(1, 'Roll number is required'),
  emergencyContact: z.string().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
  createLoginAccount: z.boolean().optional().default(true),
  password: z.string().min(6).optional(),
});

export const updateStudentSchema = createStudentSchema.partial();
