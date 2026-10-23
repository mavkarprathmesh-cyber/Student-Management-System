import { prisma } from '../config/db';

export const generateReceiptNumber = async (): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const prefix = `REC-${currentYear}-`;

  const latestTransaction = await prisma.paymentTransaction.findMany({
    where: {
      receiptNumber: {
        startsWith: prefix,
      },
    },
    select: {
      receiptNumber: true,
    },
    orderBy: {
      receiptNumber: 'desc',
    },
    take: 1,
  });

  if (latestTransaction.length === 0) {
    return `${prefix}0001`;
  }

  const latestNumStr = latestTransaction[0].receiptNumber.replace(prefix, '');
  const latestNum = parseInt(latestNumStr, 10);
  const nextNum = isNaN(latestNum) ? 1 : latestNum + 1;

  return `${prefix}${String(nextNum).padStart(4, '0')}`;
};
