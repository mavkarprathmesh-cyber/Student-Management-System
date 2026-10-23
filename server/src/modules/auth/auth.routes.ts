import { Router } from 'express';
import {
  login,
  refreshToken,
  getMe,
  changePassword,
  logout,
  initAdmin,
} from './auth.controller';
import { authenticate } from '../../middleware/authMiddleware';
import { validateRequest } from '../../middleware/validationMiddleware';
import { loginSchema, changePasswordSchema, initAdminSchema } from './auth.validation';

const router = Router();

router.post('/login', validateRequest({ body: loginSchema }), login);
router.post('/refresh', refreshToken);
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, validateRequest({ body: changePasswordSchema }), changePassword);
router.post('/logout', authenticate, logout);
router.post('/init-admin', validateRequest({ body: initAdminSchema }), initAdmin);

export default router;
