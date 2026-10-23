import React, { useEffect, useState } from 'react';
import {
  Building2,
  BookOpen,
  Layers,
  GraduationCap,
  Calendar,
  Plus,
  Trash2,
  CheckCircle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Department, Course, ClassSection, Subject, AcademicYear, Student } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

export const AcademicsPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState<'departments' | 'courses' | 'classes' | 'subjects' | 'years' | 'promotion'>('departments');

  // Academic data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modals
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showYearModal, setShowYearModal] = useState(false);

  // Form states
  const [deptForm, setDeptForm] = useState({ code: '', name: '', description: '' });
  const [courseForm, setCourseForm] = useState({ code: '', name: '', departmentId: '', durationYears: 4 });
  const [classForm, setClassForm] = useState({ name: '', gradeLevel: '1st Year', section: 'A', courseId: '', academicYearId: '' });
  const [subjectForm, setSubjectForm] = useState({ code: '', name: '', courseId: '', departmentId: '', credits: 3 });
  const [yearForm, setYearForm] = useState({ name: '', startDate: '2026-08-01', endDate: '2027-06-30', isCurrent: false });

  // Promotion wizard state
  const [promoteSourceClassId, setPromoteSourceClassId] = useState('');
  const [promoteTargetClassId, setPromoteTargetClassId] = useState('');
  const [promoteTargetYearId, setPromoteTargetYearId] = useState('');
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isPromoting, setIsPromoting] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [dRes, cRes, clRes, sRes, yRes] = await Promise.all([
        api.get('/academics/departments'),
        api.get('/academics/courses'),
        api.get('/academics/classes'),
        api.get('/academics/subjects'),
        api.get('/academics/academic-years'),
      ]);
      if (dRes.success) setDepartments(dRes.data);
      if (cRes.success) setCourses(cRes.data);
      if (clRes.success) setClasses(clRes.data);
      if (sRes.success) setSubjects(sRes.data);
      if (yRes.success) setYears(yRes.data);
    } catch (err: any) {
      toastError('Load Error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Department creation
  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/academics/departments', deptForm);
      if (res.success) {
        success('Department Created', deptForm.name);
        setShowDeptModal(false);
        setDeptForm({ code: '', name: '', description: '' });
        fetchData();
      }
    } catch (err: any) {
      toastError('Failed', err.message);
    }
  };

  // Course creation
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/academics/courses', courseForm);
      if (res.success) {
        success('Course Created', courseForm.name);
        setShowCourseModal(false);
        setCourseForm({ code: '', name: '', departmentId: '', durationYears: 4 });
        fetchData();
      }
    } catch (err: any) {
      toastError('Failed', err.message);
    }
  };

  // Class creation
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/academics/classes', classForm);
      if (res.success) {
        success('Class Created', classForm.name);
        setShowClassModal(false);
        setClassForm({ name: '', gradeLevel: '1st Year', section: 'A', courseId: '', academicYearId: '' });
        fetchData();
      }
    } catch (err: any) {
      toastError('Failed', err.message);
    }
  };

  // Subject creation
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/academics/subjects', subjectForm);
      if (res.success) {
        success('Subject Created', subjectForm.name);
        setShowSubjectModal(false);
        setSubjectForm({ code: '', name: '', courseId: '', departmentId: '', credits: 3 });
        fetchData();
      }
    } catch (err: any) {
      toastError('Failed', err.message);
    }
  };

  // Academic Year creation
  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/academics/academic-years', yearForm);
      if (res.success) {
        success('Academic Year Added', yearForm.name);
        setShowYearModal(false);
        setYearForm({ name: '', startDate: '2026-08-01', endDate: '2027-06-30', isCurrent: false });
        fetchData();
      }
    } catch (err: any) {
      toastError('Failed', err.message);
    }
  };

  // Set current year
  const handleSetCurrentYear = async (yearId: string) => {
    try {
      await api.patch(`/academics/academic-years/${yearId}/set-current`, {});
      success('Updated', 'Current academic year set.');
      fetchData();
    } catch (err: any) {
      toastError('Failed', err.message);
    }
  };

  // Load students for promotion wizard
  const loadPromotionStudents = async (classId: string) => {
    setPromoteSourceClassId(classId);
    if (!classId) {
      setClassStudents([]);
      setSelectedStudentIds([]);
      return;
    }
    try {
      const res = await api.get('/students', { classId, status: 'ACTIVE', limit: 100 });
      if (res.success && res.data) {
        setClassStudents(res.data.students);
        setSelectedStudentIds(res.data.students.map((s: any) => s.id));
      }
    } catch (err: any) {
      toastError('Failed', err.message);
    }
  };

  // Execute promotion
  const handleExecutePromotion = async () => {
    if (selectedStudentIds.length === 0 || !promoteTargetClassId || !promoteTargetYearId) {
      toastError('Validation Error', 'Please select target class, year, and at least one student.');
      return;
    }

    setIsPromoting(true);
    try {
      const res = await api.post('/academics/promote', {
        studentIds: selectedStudentIds,
        targetClassId: promoteTargetClassId,
        targetAcademicYearId: promoteTargetYearId,
      });

      if (res.success) {
        success('Promotion Completed', res.message);
        setClassStudents([]);
        setSelectedStudentIds([]);
        setPromoteSourceClassId('');
        fetchData();
      }
    } catch (err: any) {
      toastError('Promotion Failed', err.message);
    } finally {
      setIsPromoting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
          Academic Structure
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure institutional departments, courses, classes, curriculum subjects, and student promotions
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-2 sm:space-x-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('departments')}
          className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition ${
            activeTab === 'departments'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Departments ({departments.length})
        </button>
        <button
          onClick={() => setActiveTab('courses')}
          className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition ${
            activeTab === 'courses'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Courses & Programs ({courses.length})
        </button>
        <button
          onClick={() => setActiveTab('classes')}
          className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition ${
            activeTab === 'classes'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Classes & Sections ({classes.length})
        </button>
        <button
          onClick={() => setActiveTab('subjects')}
          className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition ${
            activeTab === 'subjects'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Subjects ({subjects.length})
        </button>
        <button
          onClick={() => setActiveTab('years')}
          className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition ${
            activeTab === 'years'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Academic Years ({years.length})
        </button>
        <button
          onClick={() => setActiveTab('promotion')}
          className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition ${
            activeTab === 'promotion'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Promotion Wizard
        </button>
      </div>

      {/* Tab 1: Departments */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold">Academic Departments</h3>
            {isAdmin && (
              <Button size="sm" onClick={() => setShowDeptModal(true)} icon={<Plus className="w-4 h-4" />}>
                Add Department
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((d) => (
              <Card key={d.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <Badge variant="purple">{d.code}</Badge>
                  <Building2 className="w-5 h-5 text-indigo-500" />
                </CardHeader>
                <CardContent>
                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">{d.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {d.description || 'No description provided.'}
                  </p>
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs text-slate-400">
                    <span>{d._count?.courses ?? 0} Courses</span>
                    <span>{d._count?.teachers ?? 0} Faculty</span>
                    <span>{d._count?.students ?? 0} Students</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Courses */}
      {activeTab === 'courses' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold">Degree & Certificate Courses</h3>
            {isAdmin && (
              <Button
                size="sm"
                onClick={() => {
                  if (departments.length > 0) {
                    setCourseForm((prev) => ({ ...prev, departmentId: departments[0].id }));
                  }
                  setShowCourseModal(true);
                }}
                icon={<Plus className="w-4 h-4" />}
              >
                Add Course
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((c) => (
              <Card key={c.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <Badge variant="info">{c.code}</Badge>
                  <span className="text-xs text-slate-400">{c.durationYears} Years</span>
                </CardHeader>
                <CardContent>
                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">{c.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Department: {c.department?.name}
                  </p>
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs text-slate-400">
                    <span>{c._count?.classes ?? 0} Class Sections</span>
                    <span>{c._count?.students ?? 0} Enrolled Students</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Classes & Sections */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold">Class Sections</h3>
            {isAdmin && (
              <Button
                size="sm"
                onClick={() => {
                  if (courses.length > 0 && years.length > 0) {
                    setClassForm((prev) => ({
                      ...prev,
                      courseId: courses[0].id,
                      academicYearId: years[0].id,
                    }));
                  }
                  setShowClassModal(true);
                }}
                icon={<Plus className="w-4 h-4" />}
              >
                Add Class
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cl) => (
              <Card key={cl.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <Badge variant="neutral">Sec {cl.section}</Badge>
                  <span className="text-xs text-slate-400">{cl.academicYear?.name}</span>
                </CardHeader>
                <CardContent>
                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">{cl.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Program: {cl.course?.name} ({cl.gradeLevel})
                  </p>
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs text-slate-400">
                    <span>{cl._count?.students ?? 0} Students</span>
                    <span>{cl._count?.assignments ?? 0} Faculty Assigned</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Subjects */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold">Curriculum Subjects</h3>
            {isAdmin && (
              <Button
                size="sm"
                onClick={() => {
                  if (courses.length > 0 && departments.length > 0) {
                    setSubjectForm((prev) => ({
                      ...prev,
                      courseId: courses[0].id,
                      departmentId: departments[0].id,
                    }));
                  }
                  setShowSubjectModal(true);
                }}
                icon={<Plus className="w-4 h-4" />}
              >
                Add Subject
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((sb) => (
              <Card key={sb.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <Badge variant="purple">{sb.code}</Badge>
                  <span className="text-xs font-bold text-indigo-600">{sb.credits} Credits</span>
                </CardHeader>
                <CardContent>
                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">{sb.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {sb.course?.name} • {sb.department?.code}
                  </p>
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
                    <span>{sb.assignments?.length ?? 0} Class Assignments</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Academic Years */}
      {activeTab === 'years' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold">Academic Years & Terms</h3>
            {isAdmin && (
              <Button size="sm" onClick={() => setShowYearModal(true)} icon={<Plus className="w-4 h-4" />}>
                Add Academic Year
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {years.map((y) => (
              <div
                key={y.id}
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">{y.name}</h4>
                    {y.isCurrent && <Badge variant="success">Current Academic Year</Badge>}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {new Date(y.startDate).toLocaleDateString()} to {new Date(y.endDate).toLocaleDateString()}
                  </p>
                  <div className="mt-2 flex gap-2">
                    {y.terms?.map((t) => (
                      <span key={t.id} className="text-xs px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {t.name}
                      </span>
                    ))}
                  </div>
                </div>

                {!y.isCurrent && isAdmin && (
                  <Button variant="outline" size="sm" onClick={() => handleSetCurrentYear(y.id)}>
                    Set as Current
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 6: Promotion Wizard */}
      {activeTab === 'promotion' && (
        <Card>
          <CardHeader>
            <CardTitle>Batch Student Promotion Wizard</CardTitle>
            <p className="text-xs text-slate-500 mt-1">
              Select an existing class section, choose eligible students, and promote them to the next level in bulk.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Source Class Section"
                value={promoteSourceClassId}
                onChange={(e) => loadPromotionStudents(e.target.value)}
                options={classes.map((c) => ({ value: c.id, label: `${c.name} (${c.academicYear?.name})` }))}
                placeholder="-- Select Class --"
              />

              <Select
                label="Target Class Section"
                value={promoteTargetClassId}
                onChange={(e) => setPromoteTargetClassId(e.target.value)}
                options={classes.map((c) => ({ value: c.id, label: `${c.name} (${c.academicYear?.name})` }))}
                placeholder="-- Select Next Class --"
              />

              <Select
                label="Target Academic Year"
                value={promoteTargetYearId}
                onChange={(e) => setPromoteTargetYearId(e.target.value)}
                options={years.map((y) => ({ value: y.id, label: y.name }))}
                placeholder="-- Select Year --"
              />
            </div>

            {/* Students List in Source Class */}
            {promoteSourceClassId && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase text-slate-400">
                    Enrolled Students ({classStudents.length})
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedStudentIds(classStudents.map((s) => s.id))}
                      className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                    >
                      Select All
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedStudentIds([])}
                      className="text-xs text-slate-400 font-semibold hover:underline"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {classStudents.map((st) => (
                    <label
                      key={st.id}
                      className="flex items-center gap-3 py-2 px-1 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer rounded-lg text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(st.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudentIds([...selectedStudentIds, st.id]);
                          } else {
                            setSelectedStudentIds(selectedStudentIds.filter((id) => id !== st.id));
                          }
                        }}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">
                        {st.admissionNumber}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {st.firstName} {st.lastName}
                      </span>
                      <span className="text-xs text-slate-400 ml-auto">Roll: {st.rollNumber}</span>
                    </label>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <Button
                    variant="primary"
                    onClick={handleExecutePromotion}
                    isLoading={isPromoting}
                    disabled={selectedStudentIds.length === 0}
                    icon={<TrendingUp className="w-4 h-4" />}
                  >
                    Promote {selectedStudentIds.length} Selected Students
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Department Modal */}
      <Modal isOpen={showDeptModal} onClose={() => setShowDeptModal(false)} title="Add Department">
        <form onSubmit={handleCreateDept} className="space-y-4">
          <Input label="Code" value={deptForm.code} onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })} placeholder="e.g. MECH" required />
          <Input label="Name" value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} placeholder="Mechanical Engineering" required />
          <Input label="Description" value={deptForm.description} onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowDeptModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Create</Button>
          </div>
        </form>
      </Modal>

      {/* Add Course Modal */}
      <Modal isOpen={showCourseModal} onClose={() => setShowCourseModal(false)} title="Add Course / Program">
        <form onSubmit={handleCreateCourse} className="space-y-4">
          <Input label="Code" value={courseForm.code} onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })} placeholder="e.g. BTECH-ME" required />
          <Input label="Course Name" value={courseForm.name} onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })} required />
          <Select label="Department" value={courseForm.departmentId} onChange={(e) => setCourseForm({ ...courseForm, departmentId: e.target.value })} options={departments.map((d) => ({ value: d.id, label: d.name }))} required />
          <Input label="Duration in Years" type="number" min={1} max={6} value={courseForm.durationYears} onChange={(e) => setCourseForm({ ...courseForm, durationYears: Number(e.target.value) })} required />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowCourseModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Create Course</Button>
          </div>
        </form>
      </Modal>

      {/* Add Class Modal */}
      <Modal isOpen={showClassModal} onClose={() => setShowClassModal(false)} title="Add Class Section">
        <form onSubmit={handleCreateClass} className="space-y-4">
          <Input label="Class Name" value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} placeholder="e.g. CS - Year 2 (Sec B)" required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Grade / Year Level" value={classForm.gradeLevel} onChange={(e) => setClassForm({ ...classForm, gradeLevel: e.target.value })} placeholder="2nd Year" required />
            <Input label="Section" value={classForm.section} onChange={(e) => setClassForm({ ...classForm, section: e.target.value })} placeholder="B" required />
          </div>
          <Select label="Course" value={classForm.courseId} onChange={(e) => setClassForm({ ...classForm, courseId: e.target.value })} options={courses.map((c) => ({ value: c.id, label: c.name }))} required />
          <Select label="Academic Year" value={classForm.academicYearId} onChange={(e) => setClassForm({ ...classForm, academicYearId: e.target.value })} options={years.map((y) => ({ value: y.id, label: y.name }))} required />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowClassModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Create Class</Button>
          </div>
        </form>
      </Modal>

      {/* Add Subject Modal */}
      <Modal isOpen={showSubjectModal} onClose={() => setShowSubjectModal(false)} title="Add Curriculum Subject">
        <form onSubmit={handleCreateSubject} className="space-y-4">
          <Input label="Subject Code" value={subjectForm.code} onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })} placeholder="e.g. CS202" required />
          <Input label="Subject Title" value={subjectForm.name} onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })} placeholder="Operating Systems" required />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Course" value={subjectForm.courseId} onChange={(e) => setSubjectForm({ ...subjectForm, courseId: e.target.value })} options={courses.map((c) => ({ value: c.id, label: c.name }))} required />
            <Select label="Department" value={subjectForm.departmentId} onChange={(e) => setSubjectForm({ ...subjectForm, departmentId: e.target.value })} options={departments.map((d) => ({ value: d.id, label: d.name }))} required />
          </div>
          <Input label="Credits" type="number" min={1} max={10} value={subjectForm.credits} onChange={(e) => setSubjectForm({ ...subjectForm, credits: Number(e.target.value) })} required />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowSubjectModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Create Subject</Button>
          </div>
        </form>
      </Modal>

      {/* Add Year Modal */}
      <Modal isOpen={showYearModal} onClose={() => setShowYearModal(false)} title="Add Academic Year">
        <form onSubmit={handleCreateYear} className="space-y-4">
          <Input label="Academic Year Name" value={yearForm.name} onChange={(e) => setYearForm({ ...yearForm, name: e.target.value })} placeholder="2026-2027" required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" value={yearForm.startDate} onChange={(e) => setYearForm({ ...yearForm, startDate: e.target.value })} required />
            <Input label="End Date" type="date" value={yearForm.endDate} onChange={(e) => setYearForm({ ...yearForm, endDate: e.target.value })} required />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowYearModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Create Academic Year</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
