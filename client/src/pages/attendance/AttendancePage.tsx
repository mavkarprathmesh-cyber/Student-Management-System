import React, { useEffect, useState } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileCheck,
  Save,
  Download,
  AlertCircle,
  Phone,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ClassSection, Subject, AcademicYear } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';

interface StudentAttendanceRow {
  studentId: string;
  admissionNumber: string;
  name: string;
  rollNumber: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  remarks?: string;
  recordId?: string | null;
}

export const AttendancePage: React.FC = () => {
  const { user, isStudent } = useAuth();
  const { success, error: toastError } = useToast();

  const [viewMode, setViewMode] = useState<'mark' | 'summary' | 'low-attendance'>('mark');

  // Academic Dropdown options
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Selection states
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Attendance Sheet
  const [students, setStudents] = useState<StudentAttendanceRow[]>([]);
  const [sessionExists, setSessionExists] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Summary & Low Attendance states
  const [classSummary, setClassSummary] = useState<any[]>([]);
  const [lowAttendanceData, setLowAttendanceData] = useState<any>(null);

  // Load classes & subjects
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [clsRes, subjRes] = await Promise.all([
          api.get('/academics/classes'),
          api.get('/academics/subjects'),
        ]);
        if (clsRes.success && clsRes.data.length > 0) {
          setClasses(clsRes.data);
          setSelectedClassId(clsRes.data[0].id);
        }
        if (subjRes.success && subjRes.data.length > 0) {
          setSubjects(subjRes.data);
        }
      } catch (err) {
        console.error('Failed to load classes', err);
      }
    };
    fetchOptions();
  }, []);

  // Fetch Attendance Session
  const fetchSession = async () => {
    if (!selectedClassId || !selectedDate) return;
    setIsLoadingSession(true);
    try {
      const res = await api.get('/attendance/session', {
        classId: selectedClassId,
        subjectId: selectedSubjectId || undefined,
        date: selectedDate,
      });

      if (res.success && res.data) {
        setStudents(res.data.students || []);
        setSessionExists(res.data.sessionExists);
      }
    } catch (err: any) {
      toastError('Session Load Error', err.message);
    } finally {
      setIsLoadingSession(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'mark') {
      fetchSession();
    } else if (viewMode === 'summary') {
      fetchClassSummary();
    } else if (viewMode === 'low-attendance') {
      fetchLowAttendance();
    }
  }, [selectedClassId, selectedSubjectId, selectedDate, viewMode]);

  const fetchClassSummary = async () => {
    if (!selectedClassId) return;
    try {
      const res = await api.get('/attendance/class-summary', { classId: selectedClassId });
      if (res.success) setClassSummary(res.data);
    } catch (err: any) {
      toastError('Summary Error', err.message);
    }
  };

  const fetchLowAttendance = async () => {
    try {
      const res = await api.get('/attendance/low-attendance', {
        classId: selectedClassId || undefined,
        threshold: 75,
      });
      if (res.success) setLowAttendanceData(res.data);
    } catch (err: any) {
      toastError('Report Error', err.message);
    }
  };

  // Quick mark all
  const markAll = (status: 'PRESENT' | 'ABSENT') => {
    setStudents((prev) => prev.map((s) => ({ ...s, status })));
  };

  // Update single student
  const updateStudentStatus = (studentId: string, status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED') => {
    setStudents((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, status } : s))
    );
  };

  const updateStudentRemarks = (studentId: string, remarks: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, remarks } : s))
    );
  };

  // Save Attendance
  const handleSaveAttendance = async () => {
    if (students.length === 0) {
      toastError('Error', 'No students to record attendance for.');
      return;
    }

    setIsSaving(true);
    try {
      const selectedClass = classes.find((c) => c.id === selectedClassId);
      const res = await api.post('/attendance/mark', {
        classId: selectedClassId,
        subjectId: selectedSubjectId || undefined,
        academicYearId: selectedClass?.academicYearId,
        date: selectedDate,
        notes,
        records: students.map((s) => ({
          studentId: s.studentId,
          status: s.status,
          remarks: s.remarks,
        })),
      });

      if (res.success) {
        success('Attendance Recorded', `Saved session for ${students.length} students.`);
        setSessionExists(true);
      }
    } catch (err: any) {
      toastError('Save Error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate live session stats
  const presentCount = students.filter((s) => s.status === 'PRESENT').length;
  const lateCount = students.filter((s) => s.status === 'LATE').length;
  const absentCount = students.filter((s) => s.status === 'ABSENT').length;
  const excusedCount = students.filter((s) => s.status === 'EXCUSED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
            Attendance Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Mark daily class sessions, review attendance metrics, and monitor low attendance alerts
          </p>
        </div>

        {/* View mode switcher */}
        <div className="flex rounded-xl bg-slate-200/80 dark:bg-slate-800/80 p-1">
          <button
            onClick={() => setViewMode('mark')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              viewMode === 'mark'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Mark Session
          </button>
          <button
            onClick={() => setViewMode('summary')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              viewMode === 'summary'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Class Summary
          </button>
          <button
            onClick={() => setViewMode('low-attendance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              viewMode === 'low-attendance'
                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Low Attendance (&lt;75%)
          </button>
        </div>
      </div>

      {/* Select Filters Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Select
          label="Class & Section"
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          options={classes.map((c) => ({ value: c.id, label: `${c.name} (${c.academicYear?.name || ''})` }))}
        />

        {viewMode === 'mark' && (
          <>
            <Select
              label="Subject (Optional)"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              options={subjects.map((s) => ({ value: s.id, label: `${s.code} - ${s.name}` }))}
              placeholder="All Class General Attendance"
            />

            <Input
              label="Session Date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </>
        )}
      </div>

      {/* VIEW MODE 1: MARK ATTENDANCE */}
      {viewMode === 'mark' && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Attendance Sheet</CardTitle>
                {sessionExists ? (
                  <Badge variant="success">Saved Session</Badge>
                ) : (
                  <Badge variant="warning">New Session</Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Present: <strong className="text-emerald-600">{presentCount}</strong> • Late:{' '}
                <strong className="text-amber-600">{lateCount}</strong> • Absent:{' '}
                <strong className="text-rose-600">{absentCount}</strong> • Excused:{' '}
                <strong className="text-sky-600">{excusedCount}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => markAll('PRESENT')}>
                Mark All Present
              </Button>
              <Button variant="outline" size="sm" onClick={() => markAll('ABSENT')}>
                Mark All Absent
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleSaveAttendance}
                isLoading={isSaving}
                icon={<Save className="w-4 h-4" />}
              >
                Save Attendance
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {isLoadingSession ? (
              <div className="p-8 text-center text-slate-400">Loading student roster...</div>
            ) : students.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No active students enrolled in this class.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase">
                      <th className="py-3 px-4">Roll</th>
                      <th className="py-3 px-4">Admission #</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                    {students.map((st) => (
                      <tr key={st.studentId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="py-3 px-4 font-mono font-bold text-slate-500">
                          {st.rollNumber}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-indigo-600 dark:text-indigo-400">
                          {st.admissionNumber}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                          {st.name}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateStudentStatus(st.studentId, 'PRESENT')}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                                st.status === 'PRESENT'
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                              }`}
                            >
                              P
                            </button>
                            <button
                              type="button"
                              onClick={() => updateStudentStatus(st.studentId, 'LATE')}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                                st.status === 'LATE'
                                  ? 'bg-amber-600 text-white shadow-sm'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                              }`}
                            >
                              L
                            </button>
                            <button
                              type="button"
                              onClick={() => updateStudentStatus(st.studentId, 'EXCUSED')}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                                st.status === 'EXCUSED'
                                  ? 'bg-sky-600 text-white shadow-sm'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                              }`}
                            >
                              E
                            </button>
                            <button
                              type="button"
                              onClick={() => updateStudentStatus(st.studentId, 'ABSENT')}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                                st.status === 'ABSENT'
                                  ? 'bg-rose-600 text-white shadow-sm'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                              }`}
                            >
                              A
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={st.remarks || ''}
                            onChange={(e) => updateStudentRemarks(st.studentId, e.target.value)}
                            placeholder="Optional note..."
                            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* VIEW MODE 2: CLASS SUMMARY */}
      {viewMode === 'summary' && (
        <Card>
          <CardHeader>
            <CardTitle>Class Attendance Aggregates</CardTitle>
            <p className="text-xs text-slate-400 mt-1">
              Formula: (Attended Eligible Sessions / Total Eligible Sessions) × 100
            </p>
          </CardHeader>
          <CardContent>
            {classSummary.length === 0 ? (
              <p className="text-xs text-slate-400">No session records found for this class.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase">
                      <th className="py-3 px-4">Roll</th>
                      <th className="py-3 px-4">Admission #</th>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Total Sessions</th>
                      <th className="py-3 px-4">Attended</th>
                      <th className="py-3 px-4">Absent</th>
                      <th className="py-3 px-4">Attendance Rate</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {classSummary.map((s) => (
                      <tr key={s.studentId}>
                        <td className="py-3 px-4 font-mono font-bold">{s.rollNumber}</td>
                        <td className="py-3 px-4 font-mono text-xs text-indigo-600 dark:text-indigo-400">
                          {s.admissionNumber}
                        </td>
                        <td className="py-3 px-4 font-bold">{s.name}</td>
                        <td className="py-3 px-4">{s.totalSessions}</td>
                        <td className="py-3 px-4 text-emerald-600 font-semibold">{s.attendedEligibleCount}</td>
                        <td className="py-3 px-4 text-rose-500 font-semibold">{s.absentCount}</td>
                        <td className="py-3 px-4 font-bold text-base">
                          <span className={s.percentage >= 75 ? 'text-emerald-600' : 'text-rose-500'}>
                            {s.percentage}%
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={s.percentage >= 75 ? 'success' : 'danger'}>
                            {s.percentage >= 75 ? 'Good' : 'Critical Low'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* VIEW MODE 3: LOW ATTENDANCE ALERTS */}
      {viewMode === 'low-attendance' && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle className="text-rose-600 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Critical Low Attendance Alerts ({lowAttendanceData?.totalFlagged ?? 0} Students)
              </CardTitle>
              <p className="text-xs text-slate-400 mt-1">
                Students below {lowAttendanceData?.threshold ?? 75}% attendance threshold requiring institutional follow-up.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {!lowAttendanceData || lowAttendanceData.students?.length === 0 ? (
              <div className="p-8 text-center text-emerald-600 font-bold">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
                All active students are meeting the minimum 75% attendance threshold!
              </div>
            ) : (
              <div className="space-y-3">
                {lowAttendanceData.students?.map((st: any) => (
                  <div
                    key={st.studentId}
                    className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100">{st.name}</span>
                        <Badge variant="danger">{st.percentage}% Attendance</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Admission: <strong>{st.admissionNumber}</strong> • Class: <strong>{st.className}</strong>
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                        Parent Contact: <strong>{st.parentName || 'N/A'}</strong> ({st.parentPhone || 'No phone'})
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {st.parentPhone && (
                        <a
                          href={`tel:${st.parentPhone}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:border-indigo-500 transition"
                        >
                          <Phone className="w-3.5 h-3.5 text-indigo-500" />
                          Call Guardian
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
