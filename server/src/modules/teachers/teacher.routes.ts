import { Router } from 'express';
import {
  getTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  assignSubjectClass,
  removeAssignment,
} from './teacher.controller';
import { authenticate } from '../../middleware/authMiddleware';
import { requireRole } from '../../middleware/roleMiddleware';

const router = Router();

router.use(authenticate);

router.get('/', getTeachers);
router.get('/:id', getTeacherById);

router.post('/', requireRole(['ADMIN']), createTeacher);
router.put('/:id', requireRole(['ADMIN']), updateTeacher);
router.delete('/:id', requireRole(['ADMIN']), deleteTeacher);

router.post('/assignments', requireRole(['ADMIN']), assignSubjectClass);
router.delete('/assignments/:id', requireRole(['ADMIN']), removeAssignment);

export default router;
