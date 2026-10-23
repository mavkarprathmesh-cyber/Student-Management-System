import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  CreditCard,
  Award,
  CalendarCheck,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';

export const StudentProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isStudent } = useAuth();

  // If student role, they view their own student ID or param ID
  const studentId = id || (isStudent ? user?.student?.id : null);

  const [student, setStudent] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'personal' | 'enrollment' | 'attendance' | 'marks' | 'fees'>('personal');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStudent = async () => {
      if (!studentId) return;
      setIsLoading(true);
      try {
        const res = await api.get(`/students/${studentId}`);
        if (res.success && res.data) {
          setStudent(res.data);
        }
      } catch (err) {
        console.error('Failed to load profile', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStudent();
  }, [studentId]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-16">
        <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300">Student Profile Not Found</h2>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/students')}>
          Back to Student List
        </Button>
      </div>
    );
  }

  const att = student.attendanceSummary || {};
  const fin = student.financialSummary || {};

  return (
    <div className="space-y-6">
      {/* Back button */}
      {!isStudent && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/students')}
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Students
        </Button>
      )}

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-black shadow-md shadow-indigo-500/20 uppercase">
            {student.firstName.charAt(0)}
            {student.lastName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                {student.firstName} {student.lastName}
              </h1>
              <Badge variant={student.status === 'ACTIVE' ? 'success' : 'danger'}>
                {student.status}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Admission: <strong className="font-mono text-indigo-600 dark:text-indigo-400">{student.admissionNumber}</strong> • Class: <strong>{student.class?.name}</strong> • Roll: <strong>{student.rollNumber}</strong>
            </p>
          </div>
        </div>

        {/* Quick Highlights */}
        <div className="flex items-center gap-4 text-center">
          <div className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
            <span className="block text-[11px] uppercase font-bold text-slate-400">Attendance</span>
            <span className={`text-lg font-black ${att.percentage >= 75 ? 'text-emerald-600' : 'text-rose-500'}`}>
              {att.percentage ?? 100}%
            </span>
          </div>

          <div className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
            <span className="block text-[11px] uppercase font-bold text-slate-400">Fee Balance</span>
            <span className={`text-lg font-black ${fin.totalBalance === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
              ${(fin.totalBalance ?? 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1 sm:space-x-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('personal')}
          className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition ${
            activeTab === 'personal'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Personal & Guardian
        </button>
        <button
          onClick={() => setActiveTab('enrollment')}
          className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition ${
            activeTab === 'enrollment'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Academic & Enrollment
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition ${
            activeTab === 'attendance'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Attendance History
        </button>
        <button
          onClick={() => setActiveTab('marks')}
          className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition ${
            activeTab === 'marks'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Examinations & Marks
        </button>
        <button
          onClick={() => setActiveTab('fees')}
          className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition ${
            activeTab === 'fees'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Fee Accounts & Receipts
        </button>
      </div>

      {/* Tab 1: Personal Details */}
      {activeTab === 'personal' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-slate-400 block">Date of Birth</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {new Date(student.dateOfBirth).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Gender</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{student.gender}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Email Address</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{student.email}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Contact Phone</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{student.phone || 'N/A'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-slate-400 block">Residential Address</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{student.address || 'N/A'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Parent / Guardian Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-slate-400 block">Parent / Guardian Name</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {student.parentName || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Primary Phone</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {student.parentPhone || 'N/A'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-slate-400 block">Parent Email</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {student.parentEmail || 'N/A'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-slate-400 block">Emergency Contact</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {student.emergencyContact || student.parentPhone || 'N/A'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 2: Enrollment */}
      {activeTab === 'enrollment' && (
        <Card>
          <CardHeader>
            <CardTitle>Academic Program & Enrollment Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-400 block">Department</span>
                <span className="text-sm font-bold">{student.department?.name}</span>
              </div>
              <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-400 block">Course / Program</span>
                <span className="text-sm font-bold">{student.course?.name}</span>
              </div>
              <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-400 block">Academic Year</span>
                <span className="text-sm font-bold">{student.academicYear?.name}</span>
              </div>
            </div>

            <h4 className="text-xs font-bold uppercase text-slate-400 mb-3">Enrollment History</h4>
            <div className="space-y-3">
              {student.enrollments?.map((e: any) => (
                <div key={e.id} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h5 className="text-sm font-bold">{e.class.name}</h5>
                    <p className="text-xs text-slate-400">
                      Enrolled: {new Date(e.enrolledAt).toLocaleDateString()} • {e.academicYear.name}
                    </p>
                  </div>
                  <Badge variant={e.status === 'ACTIVE' ? 'success' : 'purple'}>{e.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Attendance History */}
      {activeTab === 'attendance' && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Attendance History & Sessions</CardTitle>
              <p className="text-xs text-slate-400 mt-1">
                Calculated using: (Attended Eligible Sessions / Total Eligible Sessions) × 100
              </p>
            </div>
            <Badge variant={att.percentage >= 75 ? 'success' : 'danger'} size="md">
              {att.percentage ?? 100}% Overall Attendance
            </Badge>
          </CardHeader>
          <CardContent>
            {student.attendanceRecords?.length === 0 ? (
              <p className="text-xs text-slate-400">No attendance sessions recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Subject</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {student.attendanceRecords?.map((r: any) => (
                      <tr key={r.id}>
                        <td className="py-3 px-3 font-semibold">
                          {new Date(r.session.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                          {r.session.subject?.name || 'General Session'}
                        </td>
                        <td className="py-3 px-3">
                          <Badge
                            variant={
                              r.status === 'PRESENT'
                                ? 'success'
                                : r.status === 'LATE'
                                ? 'warning'
                                : r.status === 'EXCUSED'
                                ? 'info'
                                : 'danger'
                            }
                            size="sm"
                          >
                            {r.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-400">
                          {r.remarks || '—'}
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

      {/* Tab 4: Examination Results */}
      {activeTab === 'marks' && (
        <Card>
          <CardHeader>
            <CardTitle>Official Examination Results & Marks</CardTitle>
          </CardHeader>
          <CardContent>
            {student.marks?.length === 0 ? (
              <p className="text-xs text-slate-400">No published examination results available.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase">
                      <th className="py-2.5 px-3">Exam Name</th>
                      <th className="py-2.5 px-3">Subject</th>
                      <th className="py-2.5 px-3">Max Marks</th>
                      <th className="py-2.5 px-3">Obtained</th>
                      <th className="py-2.5 px-3">Grade</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {student.marks?.map((m: any) => (
                      <tr key={m.id}>
                        <td className="py-3 px-3 font-semibold">
                          {m.examSubject.exam.name}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                          {m.examSubject.subject.name} ({m.examSubject.subject.code})
                        </td>
                        <td className="py-3 px-3 font-mono">{m.examSubject.maxMarks}</td>
                        <td className="py-3 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {m.marksObtained ?? '—'}
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant={m.grade === 'F' ? 'danger' : 'success'} size="sm">
                            {m.grade || 'N/A'}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-xs">
                          {m.status === 'PRESENT' ? 'Passed' : m.status}
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

      {/* Tab 5: Fees & Receipts */}
      {activeTab === 'fees' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Fee Structures & Balances</CardTitle>
            </CardHeader>
            <CardContent>
              {student.fees?.length === 0 ? (
                <p className="text-xs text-slate-400">No fees assigned.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase">
                        <th className="py-2.5 px-3">Fee Name</th>
                        <th className="py-2.5 px-3">Total Amount</th>
                        <th className="py-2.5 px-3">Paid Amount</th>
                        <th className="py-2.5 px-3">Balance</th>
                        <th className="py-2.5 px-3">Due Date</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {student.fees?.map((f: any) => (
                        <tr key={f.id}>
                          <td className="py-3 px-3 font-semibold">{f.feeStructure.name}</td>
                          <td className="py-3 px-3 font-mono">${f.totalAmount.toLocaleString()}</td>
                          <td className="py-3 px-3 font-mono text-emerald-600 font-bold">
                            ${f.paidAmount.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 font-mono text-rose-500 font-bold">
                            ${f.balance.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-xs text-slate-400">
                            {new Date(f.dueDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-3">
                            <Badge
                              variant={
                                f.status === 'PAID'
                                  ? 'success'
                                  : f.status === 'PARTIAL'
                                  ? 'warning'
                                  : 'danger'
                              }
                              size="sm"
                            >
                              {f.status}
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
        </div>
      )}
    </div>
  );
};
