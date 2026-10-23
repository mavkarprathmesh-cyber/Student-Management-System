import React, { useEffect, useState, useCallback } from 'react';
import { UserPlus, BookOpen, Trash2, Edit, Users, Briefcase } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Teacher, Department, Subject, ClassSection, AcademicYear } from '../../types';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

export const TeacherList: React.FC = () => {
  const { isAdmin } = useAuth();
  const { success, error: toastError } = useToast();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Dropdown states
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    employeeId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    departmentId: '',
    designation: 'Lecturer',
    password: 'Teacher@123',
    createLoginAccount: true,
  });

  const [assignData, setAssignData] = useState({
    subjectId: '',
    classId: '',
    academicYearId: '',
  });

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [deptRes, subjRes, classRes, yearRes] = await Promise.all([
          api.get('/academics/departments'),
          api.get('/academics/subjects'),
          api.get('/academics/classes'),
          api.get('/academics/academic-years'),
        ]);
        if (deptRes.success) setDepartments(deptRes.data);
        if (subjRes.success) setSubjects(subjRes.data);
        if (classRes.success) setClasses(classRes.data);
        if (yearRes.success) setAcademicYears(yearRes.data);
      } catch (err) {
        console.error('Failed to load academic options', err);
      }
    };
    fetchOptions();
  }, []);

  const fetchTeachers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/teachers', {
        page: currentPage,
        limit: pageSize,
        search,
        departmentId,
      });
      if (res.success && res.data) {
        setTeachers(res.data.teachers);
        setTotalRecords(res.data.pagination.total);
        setTotalPages(res.data.pagination.totalPages);
      }
    } catch (err: any) {
      toastError('Error', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, search, departmentId, toastError]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/teachers', formData);
      if (res.success) {
        success('Faculty Registered', `Employee ID: ${res.data.employeeId}`);
        setShowAddModal(false);
        fetchTeachers();
      }
    } catch (err: any) {
      toastError('Registration Failed', err.message);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher) return;
    try {
      const res = await api.post('/teachers/assignments', {
        teacherId: selectedTeacher.id,
        ...assignData,
      });
      if (res.success) {
        success('Assignment Saved', 'Subject & class assigned successfully.');
        setShowAssignModal(false);
        fetchTeachers();
      }
    } catch (err: any) {
      toastError('Assignment Failed', err.message);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      await api.delete(`/teachers/assignments/${assignmentId}`);
      success('Removed', 'Teacher assignment removed.');
      fetchTeachers();
    } catch (err: any) {
      toastError('Failed', err.message);
    }
  };

  const columns: Column<Teacher>[] = [
    {
      header: 'Employee ID',
      accessorKey: 'employeeId',
      sortable: true,
      cell: (row) => (
        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
          {row.employeeId}
        </span>
      ),
    },
    {
      header: 'Teacher Name',
      accessorKey: 'firstName',
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-bold text-slate-900 dark:text-slate-100 block">
            {row.firstName} {row.lastName}
          </span>
          <span className="text-xs text-slate-400 block">{row.email}</span>
        </div>
      ),
    },
    {
      header: 'Department / Role',
      cell: (row) => (
        <div>
          <span className="font-semibold block">{row.department?.name}</span>
          <span className="text-xs text-slate-400 block">{row.designation}</span>
        </div>
      ),
    },
    {
      header: 'Assigned Classes & Subjects',
      cell: (row) => (
        <div className="flex flex-wrap gap-1 max-w-xs">
          {row.assignments?.length === 0 ? (
            <span className="text-xs text-slate-400">None assigned</span>
          ) : (
            row.assignments?.map((a) => (
              <span
                key={a.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40"
              >
                {a.subject.code} ({a.class.name})
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteAssignment(a.id)}
                    className="hover:text-rose-500 ml-1 text-slate-400"
                    title="Remove assignment"
                  >
                    ×
                  </button>
                )}
              </span>
            ))
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (row) => (
        <Badge variant={row.status === 'ACTIVE' ? 'success' : 'danger'}>
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedTeacher(row);
                if (subjects.length > 0 && classes.length > 0 && academicYears.length > 0) {
                  setAssignData({
                    subjectId: subjects[0].id,
                    classId: classes[0].id,
                    academicYearId: academicYears[0].id,
                  });
                }
                setShowAssignModal(true);
              }}
              icon={<BookOpen className="w-3.5 h-3.5" />}
            >
              Assign
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
            Faculty & Staff Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage academic instructors, departments, designations, and class assignments
          </p>
        </div>

        {isAdmin && (
          <Button
            variant="primary"
            onClick={() => {
              if (departments.length > 0) {
                setFormData((prev) => ({
                  ...prev,
                  departmentId: departments[0].id,
                  employeeId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
                }));
              }
              setShowAddModal(true);
            }}
            icon={<UserPlus className="w-4 h-4" />}
          >
            Add Faculty Member
          </Button>
        )}
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={teachers}
        isLoading={isLoading}
        searchPlaceholder="Search by name, employee ID, or email..."
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setCurrentPage(1);
        }}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalRecords={totalRecords}
        onPageChange={setCurrentPage}
        onPageSizeChange={(sz) => {
          setPageSize(sz);
          setCurrentPage(1);
        }}
        filters={
          <select
            value={departmentId}
            onChange={(e) => {
              setDepartmentId(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs py-2 px-3 focus:outline-none"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        }
        onClearFilters={() => {
          setDepartmentId('');
          setSearch('');
          setCurrentPage(1);
        }}
      />

      {/* Add Teacher Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Faculty Member"
        description="Creates instructor record and links login credentials."
        maxWidth="lg"
      >
        <form onSubmit={handleAddTeacher} className="space-y-4">
          <Input
            label="Employee ID"
            value={formData.employeeId}
            onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
            placeholder="e.g. EMP-1050"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <Input
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Department"
              value={formData.departmentId}
              onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
              required
            />
            <Input
              label="Designation"
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              placeholder="e.g. Associate Professor"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setShowAddModal(false)} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Register Faculty
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign Subject & Class Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title={`Assign Subject to ${selectedTeacher?.firstName} ${selectedTeacher?.lastName}`}
        description="Select a class section and subject course for the active academic year."
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <Select
            label="Subject"
            value={assignData.subjectId}
            onChange={(e) => setAssignData({ ...assignData, subjectId: e.target.value })}
            options={subjects.map((s) => ({ value: s.id, label: `${s.code} - ${s.name}` }))}
            required
          />

          <Select
            label="Class & Section"
            value={assignData.classId}
            onChange={(e) => setAssignData({ ...assignData, classId: e.target.value })}
            options={classes.map((c) => ({ value: c.id, label: c.name }))}
            required
          />

          <Select
            label="Academic Year"
            value={assignData.academicYearId}
            onChange={(e) => setAssignData({ ...assignData, academicYearId: e.target.value })}
            options={academicYears.map((y) => ({ value: y.id, label: y.name }))}
            required
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setShowAssignModal(false)} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Assignment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
