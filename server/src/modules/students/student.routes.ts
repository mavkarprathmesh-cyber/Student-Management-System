import { Router } from 'express';
import {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deactivateStudent,
  restoreStudent,
  deleteStudent,
  exportStudentsCsv,
  importStudentsCsv,
  getNextAdmissionNum,
} from './student.controller';
import { authenticate } from '../../middleware/authMiddleware';
import { requireRole } from '../../middleware/roleMiddleware';
import { validateRequest } from '../../middleware/validationMiddleware';
import { createStudentSchema, updateStudentSchema } from './student.validation';

const router = Router();

router.use(authenticate);

router.get('/next-admission-number', requireRole(['ADMIN']), getNextAdmissionNum);
router.get('/export/csv', requireRole(['ADMIN', 'TEACHER']), exportStudentsCsv);
router.post('/import/csv', requireRole(['ADMIN']), importStudentsCsv);

router.get('/', getStudents);
router.get('/:id', getStudentById);

router.post('/', requireRole(['ADMIN']), validateRequest({ body: createStudentSchema }), createStudent);
router.put('/:id', requireRole(['ADMIN']), validateRequest({ body: updateStudentSchema }), updateStudent);
router.patch('/:id/deactivate', requireRole(['ADMIN']), deactivateStudent);
router.patch('/:id/restore', requireRole(['ADMIN']), restoreStudent);
router.delete('/:id', requireRole(['ADMIN']), deleteStudent);

export default router;
