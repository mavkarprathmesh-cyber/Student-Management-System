export interface GradeResult {
  percentage: number;
  grade: string;
  isPassed: boolean;
  gpa: number;
}

export const calculateGrade = (
  marksObtained: number,
  maxMarks: number,
  passMarks: number = 40
): GradeResult => {
  if (maxMarks <= 0) {
    return { percentage: 0, grade: 'F', isPassed: false, gpa: 0 };
  }

  const percentage = Math.round(((marksObtained / maxMarks) * 100) * 100) / 100;
  const isPassed = marksObtained >= passMarks;

  let grade = 'F';
  let gpa = 0.0;

  if (percentage >= 90) {
    grade = 'A+';
    gpa = 4.0;
  } else if (percentage >= 80) {
    grade = 'A';
    gpa = 3.7;
  } else if (percentage >= 75) {
    grade = 'B+';
    gpa = 3.3;
  } else if (percentage >= 70) {
    grade = 'B';
    gpa = 3.0;
  } else if (percentage >= 65) {
    grade = 'C+';
    gpa = 2.7;
  } else if (percentage >= 60) {
    grade = 'C';
    gpa = 2.4;
  } else if (percentage >= 50) {
    grade = 'D';
    gpa = 2.0;
  } else if (percentage >= 40) {
    grade = 'E';
    gpa = 1.0;
  } else {
    grade = 'F';
    gpa = 0.0;
  }

  // If below passMarks, force fail grade if not already F
  if (!isPassed && grade !== 'F') {
    grade = 'F';
    gpa = 0.0;
  }

  return {
    percentage,
    grade,
    isPassed,
    gpa,
  };
};
