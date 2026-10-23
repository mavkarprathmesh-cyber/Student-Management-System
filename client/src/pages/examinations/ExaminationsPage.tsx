import React, { useEffect, useState } from 'react';
import {
  Award,
  Plus,
  Eye,
  Edit,
  CheckCircle,
  FileText,
  Printer,
  Calendar,
  Lock,
  Unlock,
  Sparkles,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Examination, Subject, AcademicYear } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

export const ExaminationsPage: React.FC = () => {
  const { user, isAdmin, isTeacher, isStudent } = useAuth();
  const { success, error: toastError } = useToast();

  const [exams, setExams] = useState<Examination[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMarksModal, setShowMarksModal] = useState(false);
  const [showReportCardModal, setShowReportCardModal] = useState(false);

  // Create Exam Form
  const [examForm, setExamForm] = useState({
    name: '',
    examType: 'MID_TERM',
    academicYearId: '',
    startDate: '2025-11-10',
    endDate: '2025-11-20',
  });
  const [examSubjectRows, setExamSubjectRows] = useState<Array<{ subjectId: string; maxMarks: number; passMarks: number }>>([]);

  // Marks Entry State
  const [selectedExamSubject, setSelectedExamSubject] = useState<any>(null);
  const [marksSheet, setMarksSheet] = useState<any[]>([]);
  const [isSavingMarks, setIsSavingMarks] = useState(false);

  // Report Card State
  const [reportCardData, setReportCardData] = useState<any>(null);
  const [loadingReportCard, setLoadingReportCard] = useState(false);

  const fetchExaminations = async () => {
    setIsLoading(true);
    try {
      const [exRes, subjRes, yearRes] = await Promise.all([
        api.get('/examinations'),
        api.get('/academics/subjects'),
        api.get('/academics/academic-years'),
      ]);
      if (exRes.success) setExams(exRes.data);
      if (subjRes.success) setSubjects(subjRes.data);
      if (yearRes.success) {
        setAcademicYears(yearRes.data);
        if (yearRes.data.length > 0) {
          setExamForm((prev) => ({ ...prev, academicYearId: yearRes.data[0].id }));
        }
      }
    } catch (err: any) {
      toastError('Failed to load examinations', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExaminations();
  }, []);

  // Publish / Unpublish Toggle
  const handleTogglePublish = async (examId: string, currentStatus: boolean) => {
    try {
      const res = await api.patch(`/examinations/${examId}/publish`, {
        isPublished: !currentStatus,
      });
      if (res.success) {
        success('Exam Results Updated', res.message);
        fetchExaminations();
      }
    } catch (err: any) {
      toastError('Error', err.message);
    }
  };

  // Open Marks Entry Sheet
  const handleOpenMarksSheet = async (examSubjectId: string) => {
    try {
      const res = await api.get('/examinations/marks/sheet', { examSubjectId });
      if (res.success && res.data) {
        setSelectedExamSubject(res.data.examSubject);
        setMarksSheet(res.data.markSheet || []);
        setShowMarksModal(true);
      }
    } catch (err: any) {
      toastError('Failed to load marks sheet', err.message);
    }
  };

  // Save Marks Sheet
  const handleSaveMarks = async () => {
    if (!selectedExamSubject) return;
    setIsSavingMarks(true);
    try {
      const res = await api.post('/examinations/marks/save', {
        examSubjectId: selectedExamSubject.id,
        marks: marksSheet.map((m) => ({
          studentId: m.studentId,
          marksObtained: m.marksObtained,
          status: m.status,
          remarks: m.remarks,
        })),
      });

      if (res.success) {
        success('Marks Saved', res.message);
        setShowMarksModal(false);
      }
    } catch (err: any) {
      toastError('Save Marks Error', err.message);
    } finally {
      setIsSavingMarks(false);
    }
  };

  // Open Report Card Modal
  const handleViewReportCard = async (studentId: string, examId: string) => {
    setLoadingReportCard(true);
    setShowReportCardModal(true);
    try {
      const res = await api.get(`/examinations/report-card/${studentId}/${examId}`);
      if (res.success && res.data) {
        setReportCardData(res.data);
      }
    } catch (err: any) {
      toastError('Report Card Error', err.message);
      setShowReportCardModal(false);
    } finally {
      setLoadingReportCard(false);
    }
  };

  // Create Exam Submit
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (examSubjectRows.length === 0) {
      toastError('Validation Error', 'Please add at least one subject to the examination schedule.');
      return;
    }

    try {
      const res = await api.post('/examinations', {
        ...examForm,
        subjects: examSubjectRows,
      });

      if (res.success) {
        success('Examination Scheduled', examForm.name);
        setShowCreateModal(false);
        setExamSubjectRows([]);
        fetchExaminations();
      }
    } catch (err: any) {
      toastError('Failed to create examination', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
            Examinations & Results
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Schedule examinations, record student marks, calculate letter grades, and publish report cards
          </p>
        </div>

        {isAdmin && (
          <Button
            variant="primary"
            onClick={() => {
              if (subjects.length > 0) {
                setExamSubjectRows([{ subjectId: subjects[0].id, maxMarks: 100, passMarks: 40 }]);
              }
              setShowCreateModal(true);
            }}
            icon={<Plus className="w-4 h-4" />}
          >
            Create Examination
          </Button>
        )}
      </div>

      {/* Examinations Cards List */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400">Loading examinations...</div>
      ) : exams.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-slate-400">
            <Award className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
            <p className="text-base font-bold">No Examinations Scheduled</p>
            <p className="text-xs text-slate-400 mt-1">Examinations and assessments will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {exams.map((ex) => (
            <Card key={ex.id} className="overflow-hidden">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-950/20">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle>{ex.name}</CardTitle>
                    <Badge variant={ex.isPublished ? 'success' : 'neutral'}>
                      {ex.isPublished ? 'Results Published' : 'Unpublished (Draft)'}
                    </Badge>
                    <Badge variant="purple">{ex.examType}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Academic Year: <strong>{ex.academicYear?.name}</strong> • Dates:{' '}
                    <strong>{new Date(ex.startDate).toLocaleDateString()}</strong> to{' '}
                    <strong>{new Date(ex.endDate).toLocaleDateString()}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Student View Own Report Card */}
                  {isStudent && user?.student?.id && ex.isPublished && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleViewReportCard(user.student!.id, ex.id)}
                      icon={<FileText className="w-3.5 h-3.5" />}
                    >
                      View My Report Card
                    </Button>
                  )}

                  {/* Admin Publish / Unpublish */}
                  {isAdmin && (
                    <Button
                      variant={ex.isPublished ? 'secondary' : 'primary'}
                      size="sm"
                      onClick={() => handleTogglePublish(ex.id, ex.isPublished)}
                      icon={ex.isPublished ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    >
                      {ex.isPublished ? 'Unpublish' : 'Publish Results'}
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase bg-slate-50/20 dark:bg-slate-950/10">
                        <th className="py-3 px-4 sm:px-6">Subject Code</th>
                        <th className="py-3 px-4 sm:px-6">Subject Name</th>
                        <th className="py-3 px-4 sm:px-6">Credits</th>
                        <th className="py-3 px-4 sm:px-6">Max Marks</th>
                        <th className="py-3 px-4 sm:px-6">Pass Marks</th>
                        {(isAdmin || isTeacher) && <th className="py-3 px-4 sm:px-6 text-right">Marks Entry</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {ex.subjects?.map((es) => (
                        <tr key={es.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                          <td className="py-3 px-4 sm:px-6 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {es.subject.code}
                          </td>
                          <td className="py-3 px-4 sm:px-6 font-semibold">{es.subject.name}</td>
                          <td className="py-3 px-4 sm:px-6">{es.subject.credits}</td>
                          <td className="py-3 px-4 sm:px-6 font-mono">{es.maxMarks}</td>
                          <td className="py-3 px-4 sm:px-6 font-mono">{es.passMarks}</td>
                          {(isAdmin || isTeacher) && (
                            <td className="py-3 px-4 sm:px-6 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenMarksSheet(es.id)}
                                icon={<Edit className="w-3.5 h-3.5" />}
                              >
                                Enter / Edit Marks
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Marks Entry Modal */}
      <Modal
        isOpen={showMarksModal}
        onClose={() => setShowMarksModal(false)}
        title={`Marks Entry: ${selectedExamSubject?.subject?.name} (${selectedExamSubject?.subject?.code})`}
        description={`Max Marks: ${selectedExamSubject?.maxMarks} • Passing Marks: ${selectedExamSubject?.passMarks}`}
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <div className="max-h-96 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/60 sticky top-0 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase">
                <tr>
                  <th className="py-2.5 px-3">Roll</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Marks (0-{selectedExamSubject?.maxMarks})</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {marksSheet.map((m, idx) => (
                  <tr key={m.studentId}>
                    <td className="py-2 px-3 font-mono text-xs">{m.rollNumber}</td>
                    <td className="py-2 px-3 font-semibold">{m.name}</td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min={0}
                        max={selectedExamSubject?.maxMarks || 100}
                        value={m.marksObtained ?? ''}
                        disabled={m.status !== 'PRESENT'}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : Number(e.target.value);
                          const updated = [...marksSheet];
                          updated[idx].marksObtained = val;
                          setMarksSheet(updated);
                        }}
                        className="w-24 text-sm font-mono font-bold px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <select
                        value={m.status}
                        onChange={(e) => {
                          const updated = [...marksSheet];
                          updated[idx].status = e.target.value;
                          if (e.target.value !== 'PRESENT') {
                            updated[idx].marksObtained = null;
                          }
                          setMarksSheet(updated);
                        }}
                        className="text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent py-1 px-2 focus:outline-none"
                      >
                        <option value="PRESENT">PRESENT</option>
                        <option value="ABSENT">ABSENT</option>
                        <option value="EXEMPT">EXEMPT</option>
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <Badge
                        variant={
                          m.marksObtained >= (selectedExamSubject?.passMarks || 40)
                            ? 'success'
                            : 'danger'
                        }
                        size="sm"
                      >
                        {m.status !== 'PRESENT'
                          ? m.status
                          : m.marksObtained >= 90
                          ? 'A+'
                          : m.marksObtained >= 80
                          ? 'A'
                          : m.marksObtained >= 70
                          ? 'B'
                          : m.marksObtained >= 50
                          ? 'C'
                          : m.marksObtained >= 40
                          ? 'D'
                          : 'F'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setShowMarksModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveMarks} isLoading={isSavingMarks}>
              Save Student Marks
            </Button>
          </div>
        </div>
      </Modal>

      {/* Printable Report Card Modal */}
      <Modal
        isOpen={showReportCardModal}
        onClose={() => setShowReportCardModal(false)}
        title="Official Academic Report Card"
        maxWidth="2xl"
      >
        {loadingReportCard || !reportCardData ? (
          <div className="p-8 text-center text-slate-400">Loading official report card...</div>
        ) : (
          <div className="space-y-6 printable-area">
            {/* Institutional Header */}
            <div className="text-center border-b border-slate-200 dark:border-slate-700 pb-4">
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                {reportCardData.institution?.institutionName || 'Apex Academy & Institute of Technology'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {reportCardData.institution?.address} • Phone: {reportCardData.institution?.phone}
              </p>
              <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mt-2">
                Official Statement of Examination Results
              </h3>
            </div>

            {/* Student & Exam Info */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl">
              <div>
                <p>Student Name: <strong>{reportCardData.student?.firstName} {reportCardData.student?.lastName}</strong></p>
                <p className="mt-1">Admission Number: <strong>{reportCardData.student?.admissionNumber}</strong></p>
                <p className="mt-1">Class Section: <strong>{reportCardData.student?.class?.name}</strong></p>
              </div>
              <div>
                <p>Examination: <strong>{reportCardData.exam?.name}</strong></p>
                <p className="mt-1">Academic Year: <strong>{reportCardData.exam?.academicYear}</strong></p>
                <p className="mt-1">Assessment Type: <strong>{reportCardData.exam?.examType}</strong></p>
              </div>
            </div>

            {/* Subject Marks Breakdown */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 font-bold uppercase text-slate-500">
                    <th className="py-2">Code</th>
                    <th className="py-2">Subject Name</th>
                    <th className="py-2">Credits</th>
                    <th className="py-2">Max</th>
                    <th className="py-2">Pass</th>
                    <th className="py-2">Marks</th>
                    <th className="py-2">Grade</th>
                    <th className="py-2">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {reportCardData.subjectResults?.map((sr: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-2 font-mono font-bold">{sr.subjectCode}</td>
                      <td className="py-2 font-semibold">{sr.subjectName}</td>
                      <td className="py-2">{sr.credits}</td>
                      <td className="py-2 font-mono">{sr.maxMarks}</td>
                      <td className="py-2 font-mono">{sr.passMarks}</td>
                      <td className="py-2 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {sr.marksObtained ?? '—'}
                      </td>
                      <td className="py-2 font-bold">{sr.grade}</td>
                      <td className="py-2">
                        <span className={sr.isPassed ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'}>
                          {sr.isPassed ? 'PASSED' : 'FAILED'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary GPA & Overall Grade */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">Overall Percentage</span>
                <span className="text-xl font-black text-slate-900 dark:text-slate-100">
                  {reportCardData.summary?.overallPercentage}%
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Cumulative GPA</span>
                <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                  {reportCardData.summary?.overallGpa} / 4.0
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Final Status</span>
                <Badge variant={reportCardData.summary?.isPassed ? 'success' : 'danger'} size="md">
                  {reportCardData.summary?.isPassed ? 'PASS' : 'FAIL'}
                </Badge>
              </div>
            </div>

            {/* Action Print Button */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 no-print">
              <Button variant="secondary" onClick={() => setShowReportCardModal(false)}>
                Close
              </Button>
              <Button variant="primary" onClick={() => window.print()} icon={<Printer className="w-4 h-4" />}>
                Print Report Card
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Examination Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Schedule New Examination"
        description="Configure examination details and add assessment subjects."
        maxWidth="xl"
      >
        <form onSubmit={handleCreateExam} className="space-y-4">
          <Input
            label="Examination Name"
            value={examForm.name}
            onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
            placeholder="e.g. Spring 2026 Final Examinations"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Exam Type"
              value={examForm.examType}
              onChange={(e) => setExamForm({ ...examForm, examType: e.target.value })}
              options={[
                { value: 'MID_TERM', label: 'Mid-Term Exam' },
                { value: 'FINAL', label: 'Final Exam' },
                { value: 'QUIZ', label: 'Quiz Assessment' },
                { value: 'PRACTICAL', label: 'Laboratory Practical' },
              ]}
            />
            <Select
              label="Academic Year"
              value={examForm.academicYearId}
              onChange={(e) => setExamForm({ ...examForm, academicYearId: e.target.value })}
              options={academicYears.map((y) => ({ value: y.id, label: y.name }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={examForm.startDate}
              onChange={(e) => setExamForm({ ...examForm, startDate: e.target.value })}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={examForm.endDate}
              onChange={(e) => setExamForm({ ...examForm, endDate: e.target.value })}
              required
            />
          </div>

          {/* Subjects selection */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-400">Examination Subjects</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (subjects.length > 0) {
                    setExamSubjectRows([...examSubjectRows, { subjectId: subjects[0].id, maxMarks: 100, passMarks: 40 }]);
                  }
                }}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Subject
              </Button>
            </div>

            {examSubjectRows.map((row, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  value={row.subjectId}
                  onChange={(e) => {
                    const updated = [...examSubjectRows];
                    updated[idx].subjectId = e.target.value;
                    setExamSubjectRows(updated);
                  }}
                  className="flex-1 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 px-3"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Max"
                  value={row.maxMarks}
                  onChange={(e) => {
                    const updated = [...examSubjectRows];
                    updated[idx].maxMarks = Number(e.target.value);
                    setExamSubjectRows(updated);
                  }}
                  className="w-20 text-xs rounded-xl border border-slate-300 dark:border-slate-700 py-2 px-2 text-center"
                />
                <input
                  type="number"
                  placeholder="Pass"
                  value={row.passMarks}
                  onChange={(e) => {
                    const updated = [...examSubjectRows];
                    updated[idx].passMarks = Number(e.target.value);
                    setExamSubjectRows(updated);
                  }}
                  className="w-20 text-xs rounded-xl border border-slate-300 dark:border-slate-700 py-2 px-2 text-center"
                />
                <button
                  type="button"
                  onClick={() => setExamSubjectRows(examSubjectRows.filter((_, i) => i !== idx))}
                  className="text-rose-500 hover:text-rose-700 p-1"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Examination
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
