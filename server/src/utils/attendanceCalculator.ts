export interface AttendanceMetrics {
  totalSessions: number;
  eligibleSessions: number;
  presentCount: number;
  lateCount: number;
  excusedCount: number;
  absentCount: number;
  attendedEligibleCount: number;
  percentage: number;
  isLowAttendance: boolean; // below threshold (e.g. 75%)
}

export const calculateAttendance = (
  records: Array<{ status: string }>,
  threshold: number = 75.0
): AttendanceMetrics => {
  let presentCount = 0;
  let lateCount = 0;
  let excusedCount = 0;
  let absentCount = 0;

  for (const record of records) {
    const status = record.status.toUpperCase();
    if (status === 'PRESENT') {
      presentCount++;
    } else if (status === 'LATE') {
      lateCount++;
    } else if (status === 'EXCUSED') {
      excusedCount++;
    } else if (status === 'ABSENT') {
      absentCount++;
    }
  }

  const totalSessions = records.length;
  // Excused sessions are excluded from total eligible sessions so students with documented excuses aren't penalized
  const eligibleSessions = presentCount + lateCount + absentCount;
  const attendedEligibleCount = presentCount + lateCount;

  let percentage = 100;
  if (eligibleSessions > 0) {
    percentage = Math.round(((attendedEligibleCount / eligibleSessions) * 100) * 100) / 100;
  }

  return {
    totalSessions,
    eligibleSessions,
    presentCount,
    lateCount,
    excusedCount,
    absentCount,
    attendedEligibleCount,
    percentage,
    isLowAttendance: percentage < threshold,
  };
};
