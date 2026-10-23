import { prisma } from '../config/db';

export const logAudit = async ({
  userId,
  action,
  entity,
  entityId,
  details,
  ipAddress,
}: {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: any;
  ipAddress?: string;
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entity,
        entityId: entityId || null,
        details: details ? JSON.stringify(details) : null,
        ipAddress: ipAddress || null,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
};
