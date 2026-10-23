import { Router } from 'express';
import {
  getExaminations,
  getExaminationById,
  createExamination,
  togglePublishExam,
  getExamMarksSheet,
  saveExamMarks,
  getStudentReportCard,
} from './examination.controller';
import { authenticate } from '../../middleware/authMiddleware';
import { requireRole } from '../../middleware/roleMiddleware';

const router = Router();

router.use(authenticate);

router.get('/', getExaminations);
router.get('/:id', getExaminationById);
router.post('/', requireRole(['ADMIN']), createExamination);
router.patch('/:id/publish', requireRole(['ADMIN']), togglePublishExam);

router.get('/marks/sheet', requireRole(['ADMIN', 'TEACHER']), getExamMarksSheet);
router.post('/marks/save', requireRole(['ADMIN', 'TEACHER']), saveExamMarks);

router.get('/report-card/:studentId/:examId', getStudentReportCard);

export default router;
