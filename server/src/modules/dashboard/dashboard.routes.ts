import { Router } from 'express';
import { getDashboardStats, getDashboardCharts } from './dashboard.controller';
import { authenticate } from '../../middleware/authMiddleware';

const router = Router();

router.get('/stats', authenticate, getDashboardStats);
router.get('/charts', authenticate, getDashboardCharts);

export default router;
