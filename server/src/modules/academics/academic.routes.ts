import { Router } from 'express';
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getClasses,
  createClass,
  updateClass,
  deleteClass,
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  getAcademicYears,
  createAcademicYear,
  setCurrentAcademicYear,
  promoteStudents,
} from './academic.controller';
import { authenticate } from '../../middleware/authMiddleware';
import { requireRole } from '../../middleware/roleMiddleware';

const router = Router();

router.use(authenticate);

// Departments
router.get('/departments', getDepartments);
router.post('/departments', requireRole(['ADMIN']), createDepartment);
router.put('/departments/:id', requireRole(['ADMIN']), updateDepartment);
router.delete('/departments/:id', requireRole(['ADMIN']), deleteDepartment);

// Courses
router.get('/courses', getCourses);
router.post('/courses', requireRole(['ADMIN']), createCourse);
router.put('/courses/:id', requireRole(['ADMIN']), updateCourse);
router.delete('/courses/:id', requireRole(['ADMIN']), deleteCourse);

// Classes
router.get('/classes', getClasses);
router.post('/classes', requireRole(['ADMIN']), createClass);
router.put('/classes/:id', requireRole(['ADMIN']), updateClass);
router.delete('/classes/:id', requireRole(['ADMIN']), deleteClass);

// Subjects
router.get('/subjects', getSubjects);
router.post('/subjects', requireRole(['ADMIN']), createSubject);
router.put('/subjects/:id', requireRole(['ADMIN']), updateSubject);
router.delete('/subjects/:id', requireRole(['ADMIN']), deleteSubject);

// Academic Years
router.get('/academic-years', getAcademicYears);
router.post('/academic-years', requireRole(['ADMIN']), createAcademicYear);
router.patch('/academic-years/:id/set-current', requireRole(['ADMIN']), setCurrentAcademicYear);

// Promotions
router.post('/promote', requireRole(['ADMIN']), promoteStudents);

export default router;
