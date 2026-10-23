import { Router } from 'express';
import {
  getSessionAttendance,
  markAttendance,
  getClassAttendanceSummary,
  getLowAttendanceReport,
} from './attendance.controller';
import { authenticate } from '../../middleware/authMiddleware';
import { requireRole } from '../../middleware/roleMiddleware';

const router = Router();

router.use(authenticate);

router.get('/session', requireRole(['ADMIN', 'TEACHER']), getSessionAttendance);
router.post('/mark', requireRole(['ADMIN', 'TEACHER']), markAttendance);
router.get('/class-summary', getClassAttendanceSummary);
router.get('/low-attendance', requireRole(['ADMIN', 'TEACHER']), getLowAttendanceReport);

export default router;
