import { Router } from 'express';
import {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from './announcement.controller';
import { authenticate } from '../../middleware/authMiddleware';
import { requireRole } from '../../middleware/roleMiddleware';

const router = Router();

router.use(authenticate);

router.get('/', getAnnouncements);
router.post('/', requireRole(['ADMIN', 'TEACHER']), createAnnouncement);
router.delete('/:id', requireRole(['ADMIN']), deleteAnnouncement);

router.get('/notifications', getUserNotifications);
router.patch('/notifications/:id/read', markNotificationRead);
router.post('/notifications/read-all', markAllNotificationsRead);

export default router;
