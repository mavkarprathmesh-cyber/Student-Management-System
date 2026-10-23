import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/auth';
import { AppError } from './errorHandler';

export const requireRole = (allowedRoles: string | string[]) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Forbidden: Access denied. Required role: ${roles.join(' or ')}.`,
          403
        )
      );
    }

    next();
  };
};
