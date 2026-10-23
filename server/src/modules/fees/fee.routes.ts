import { Router } from 'express';
import {
  getFeeStructures,
  createFeeStructure,
  getStudentFees,
  recordPayment,
  getReceiptDetails,
  exportFeeReportCsv,
} from './fee.controller';
import { authenticate } from '../../middleware/authMiddleware';
import { requireRole } from '../../middleware/roleMiddleware';

const router = Router();

router.use(authenticate);

router.get('/structures', getFeeStructures);
router.post('/structures', requireRole(['ADMIN']), createFeeStructure);

router.get('/student-fees', getStudentFees);
router.post('/payments', requireRole(['ADMIN']), recordPayment);
router.get('/receipts/:receiptNumber', getReceiptDetails);
router.get('/export/csv', requireRole(['ADMIN']), exportFeeReportCsv);

export default router;
