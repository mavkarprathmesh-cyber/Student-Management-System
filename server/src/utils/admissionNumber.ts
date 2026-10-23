import { prisma } from '../config/db';

export const generateAdmissionNumber = async (): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const prefix = `ADM-${currentYear}-`;

  // Find all students with admission numbers matching this year
  const latestStudents = await prisma.student.findMany({
    where: {
      admissionNumber: {
        startsWith: prefix,
      },
    },
    select: {
      admissionNumber: true,
    },
    orderBy: {
      admissionNumber: 'desc',
    },
    take: 1,
  });

  if (latestStudents.length === 0) {
    return `${prefix}0001`;
  }

  const latestNumStr = latestStudents[0].admissionNumber.replace(prefix, '');
  const latestNum = parseInt(latestNumStr, 10);
  const nextNum = isNaN(latestNum) ? 1 : latestNum + 1;

  return `${prefix}${String(nextNum).padStart(4, '0')}`;
};
