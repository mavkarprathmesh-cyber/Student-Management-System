import { describe, it, expect } from 'vitest';
import { calculateAttendance } from '../src/utils/attendanceCalculator';
import { calculateGrade } from '../src/utils/gradeCalculator';

describe('Attendance Calculation Logic', () => {
  it('should return 100% when all sessions are present', () => {
    const records = [
      { status: 'PRESENT' },
      { status: 'PRESENT' },
      { status: 'PRESENT' },
      { status: 'PRESENT' },
    ];
    const result = calculateAttendance(records, 75.0);
    expect(result.percentage).toBe(100);
    expect(result.isLowAttendance).toBe(false);
    expect(result.attendedEligibleCount).toBe(4);
    expect(result.eligibleSessions).toBe(4);
  });

  it('should calculate accurate percentage with present, late, absent, and excused', () => {
    const records = [
      { status: 'PRESENT' }, // attended 1
      { status: 'PRESENT' }, // attended 1
      { status: 'LATE' },    // attended 1
      { status: 'ABSENT' },  // eligible, not attended
      { status: 'EXCUSED' }, // excluded from eligible sessions denominator
    ];
    // Attended: 3 (2 present + 1 late)
    // Eligible: 4 (2 present + 1 late + 1 absent)
    // Percentage: (3 / 4) * 100 = 75.0%
    const result = calculateAttendance(records, 75.0);
    expect(result.totalSessions).toBe(5);
    expect(result.eligibleSessions).toBe(4);
    expect(result.attendedEligibleCount).toBe(3);
    expect(result.percentage).toBe(75);
    expect(result.isLowAttendance).toBe(false);
  });

  it('should trigger low attendance flag when attendance drops below threshold', () => {
    const records = [
      { status: 'PRESENT' },
      { status: 'ABSENT' },
      { status: 'ABSENT' },
      { status: 'ABSENT' },
    ];
    // 1 / 4 = 25%
    const result = calculateAttendance(records, 75.0);
    expect(result.percentage).toBe(25);
    expect(result.isLowAttendance).toBe(true);
  });

  it('should return 100% when there are zero eligible sessions', () => {
    const records: Array<{ status: string }> = [];
    const result = calculateAttendance(records);
    expect(result.percentage).toBe(100);
    expect(result.isLowAttendance).toBe(false);
  });
});

describe('Grading System Calculations', () => {
  it('should calculate A+ for 90% and above', () => {
    const result = calculateGrade(95, 100, 40);
    expect(result.grade).toBe('A+');
    expect(result.percentage).toBe(95);
    expect(result.isPassed).toBe(true);
    expect(result.gpa).toBe(4.0);
  });

  it('should calculate A for 80-89%', () => {
    const result = calculateGrade(85, 100, 40);
    expect(result.grade).toBe('A');
    expect(result.percentage).toBe(85);
    expect(result.isPassed).toBe(true);
    expect(result.gpa).toBe(3.7);
  });

  it('should calculate B for 70-74%', () => {
    const result = calculateGrade(72, 100, 40);
    expect(result.grade).toBe('B');
    expect(result.isPassed).toBe(true);
  });

  it('should calculate F when marks obtained are below passing marks', () => {
    const result = calculateGrade(35, 100, 40);
    expect(result.grade).toBe('F');
    expect(result.isPassed).toBe(false);
    expect(result.gpa).toBe(0.0);
  });
});
