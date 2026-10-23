import { Router } from 'express';
import {
  getInstitutionSettings,
  updateInstitutionSettings,
  getUsers,
  updateUserStatus,
  resetUserPassword,
  getAuditLogs,
} from './settings.controller';
import { authenticate } from '../../middleware/authMiddleware';
import { requireRole } from '../../middleware/roleMiddleware';

const router = Router();

router.use(authenticate);

// Institution settings
router.get('/institution', getInstitutionSettings);
router.put('/institution', requireRole(['ADMIN']), updateInstitutionSettings);

// User accounts
router.get('/users', requireRole(['ADMIN']), getUsers);
router.patch('/users/:id/status', requireRole(['ADMIN']), updateUserStatus);
router.post('/users/:id/reset-password', requireRole(['ADMIN']), resetUserPassword);

// Audit logs
router.get('/audit-logs', requireRole(['ADMIN']), getAuditLogs);

export default router;
