import { Router } from 'express';
import {
  getStudentDemographicReport,
  getAcademicPerformanceReport,
  getFinancialAnalyticsReport,
} from './report.controller';
import { authenticate } from '../../middleware/authMiddleware';
import { requireRole } from '../../middleware/roleMiddleware';

const router = Router();

router.use(authenticate);

router.get('/demographics', requireRole(['ADMIN', 'TEACHER']), getStudentDemographicReport);
router.get('/performance', requireRole(['ADMIN', 'TEACHER']), getAcademicPerformanceReport);
router.get('/finances', requireRole(['ADMIN']), getFinancialAnalyticsReport);

export default router;
