import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  Download,
  Upload,
  Eye,
  Edit,
  UserX,
  UserCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Student, Department, Course, ClassSection } from '../../types';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

export const StudentList: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { success, error: toastError } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [departmentId, setDepartmentId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [classId, setClassId] = useState('');
  const [status, setStatus] = useState('');

  // Dropdown options
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<ClassSection[]>([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '2005-01-01',
    gender: 'MALE',
    address: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    departmentId: '',
    courseId: '',
    classId: '',
    academicYearId: '',
    rollNumber: '',
    emergencyContact: '',
    createLoginAccount: true,
  });

  const [csvFileContent, setCsvFileContent] = useState<string>('');
  const [importLoading, setImportLoading] = useState(false);

  // Load dropdown lists
  useEffect(() => {
    const loadAcademicOptions = async () => {
      try {
        const [deptRes, courseRes, classRes] = await Promise.all([
          api.get('/academics/departments'),
          api.get('/academics/courses'),
          api.get('/academics/classes'),
        ]);
        if (deptRes.success) setDepartments(deptRes.data);
        if (courseRes.success) setCourses(courseRes.data);
        if (classRes.success) setClasses(classRes.data);
      } catch (err) {
        console.error('Failed to load academic options', err);
      }
    };
    loadAcademicOptions();
  }, []);

  // Fetch students
  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/students', {
        page: currentPage,
        limit: pageSize,
        search,
        departmentId,
        courseId,
        classId,
        status,
      });

      if (res.success && res.data) {
        setStudents(res.data.students);
        setTotalRecords(res.data.pagination.total);
        setTotalPages(res.data.pagination.totalPages);
      }
    } catch (err: any) {
      toastError('Error', err.message || 'Failed to load students');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, search, departmentId, courseId, classId, status, toastError]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Handle Export CSV
  const handleExportCsv = async () => {
    try {
      const blob = await api.get<Blob>('/students/export/csv', {
        departmentId,
        courseId,
        classId,
        status,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `students_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      success('Export Complete', 'Downloaded students CSV report.');
    } catch (err: any) {
      toastError('Export Failed', err.message);
    }
  };

  // Handle Add Student Submit
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/students', formData);
      if (res.success) {
        success('Student Registered', `Admission Number: ${res.data.admissionNumber}`);
        setShowAddModal(false);
        fetchStudents();
      }
    } catch (err: any) {
      toastError('Registration Failed', err.message);
    }
  };

  // Handle Deactivate / Restore
  const handleToggleStatus = async () => {
    if (!selectedStudent) return;
    try {
      if (selectedStudent.status === 'ACTIVE') {
        await api.patch(`/students/${selectedStudent.id}/deactivate`, {
          reason: 'Administrative deactivation',
        });
        success('Deactivated', `${selectedStudent.firstName} record deactivated safely.`);
      } else {
        await api.patch(`/students/${selectedStudent.id}/restore`, {});
        success('Restored', `${selectedStudent.firstName} restored to Active status.`);
      }
      setShowDeactivateModal(false);
      fetchStudents();
    } catch (err: any) {
      toastError('Action Failed', err.message);
    }
  };

  // CSV Import handling
  const handleCsvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvFileContent((event.target?.result as string) || '');
    };
    reader.readAsText(file);
  };

  const handleProcessCsvImport = async () => {
    if (!csvFileContent) {
      toastError('Import Error', 'Please select a valid CSV file.');
      return;
    }

    setImportLoading(true);
    try {
      // Simple parse of CSV
      const lines = csvFileContent.split(/\r?\n/).filter((l) => l.trim() !== '');
      if (lines.length < 2) {
        throw new Error('CSV file contains no data rows.');
      }

      // Expected headers: firstName,lastName,email,departmentId,courseId,classId,academicYearId,rollNumber
      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
      const parsedRows = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
        const rowObj: any = {};
        headers.forEach((h, idx) => {
          rowObj[h] = values[idx] || '';
        });
        parsedRows.push(rowObj);
      }

      const res = await api.post('/students/import/csv', { studentsData: parsedRows });
      if (res.success) {
        success('CSV Import Processed', `Imported: ${res.data.imported}, Failed: ${res.data.failed}`);
        setShowImportModal(false);
        fetchStudents();
      }
    } catch (err: any) {
      toastError('Import Failed', err.message);
    } finally {
      setImportLoading(false);
    }
  };

  // Columns definition for DataTable
  const columns: Column<Student>[] = [
    {
      header: 'Admission #',
      accessorKey: 'admissionNumber',
      sortable: true,
      cell: (row) => (
        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
          {row.admissionNumber}
        </span>
      ),
    },
    {
      header: 'Student Name',
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
      header: 'Class / Program',
      cell: (row) => (
        <div>
          <span className="font-semibold block">{row.class?.name || 'Class N/A'}</span>
          <span className="text-xs text-slate-400 block">{row.course?.name}</span>
        </div>
      ),
    },
    {
      header: 'Roll #',
      accessorKey: 'rollNumber',
      sortable: true,
      cell: (row) => <Badge variant="neutral">{row.rollNumber}</Badge>,
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (row) => (
        <Badge
          variant={
            row.status === 'ACTIVE'
              ? 'success'
              : row.status === 'GRADUATED'
              ? 'info'
              : 'danger'
          }
        >
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/students/${row.id}`)}
            title="View Full Profile"
            icon={<Eye className="w-3.5 h-3.5 text-indigo-600" />}
          >
            Profile
          </Button>

          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedStudent(row);
                setShowDeactivateModal(true);
              }}
              title={row.status === 'ACTIVE' ? 'Deactivate record' : 'Restore record'}
              icon={
                row.status === 'ACTIVE' ? (
                  <UserX className="w-3.5 h-3.5 text-rose-500" />
                ) : (
                  <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                )
              }
            >
              {row.status === 'ACTIVE' ? 'Deactivate' : 'Restore'}
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
            Student Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Browse, register, filter, and manage institutional student records
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" onClick={handleExportCsv} icon={<Download className="w-4 h-4" />}>
            Export CSV
          </Button>

          {isAdmin && (
            <>
              <Button variant="outline" size="md" onClick={() => setShowImportModal(true)} icon={<Upload className="w-4 h-4" />}>
                Import CSV
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={async () => {
                  // Fetch next admission number suggestion
                  const res = await api.get('/students/next-admission-number');
                  if (departments.length > 0 && courses.length > 0 && classes.length > 0) {
                    setFormData((prev) => ({
                      ...prev,
                      departmentId: departments[0].id,
                      courseId: courses[0].id,
                      classId: classes[0].id,
                      academicYearId: classes[0].academicYearId,
                    }));
                  }
                  setShowAddModal(true);
                }}
                icon={<UserPlus className="w-4 h-4" />}
              >
                Add Student
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={students}
        isLoading={isLoading}
        searchPlaceholder="Search by name, roll, or admission #..."
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
          <>
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

            <select
              value={courseId}
              onChange={(e) => {
                setCourseId(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs py-2 px-3 focus:outline-none"
            >
              <option value="">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs py-2 px-3 focus:outline-none"
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs py-2 px-3 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="GRADUATED">GRADUATED</option>
            </select>
          </>
        }
        onClearFilters={() => {
          setDepartmentId('');
          setCourseId('');
          setClassId('');
          setStatus('');
          setSearch('');
          setCurrentPage(1);
        }}
      />

      {/* Add Student Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register New Student"
        description="Fill in academic details to generate admission and student login."
        maxWidth="2xl"
      >
        <form onSubmit={handleAddStudent} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Student Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <Input
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Date of Birth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              required
            />
            <Select
              label="Gender"
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              options={[
                { value: 'MALE', label: 'Male' },
                { value: 'FEMALE', label: 'Female' },
                { value: 'OTHER', label: 'Other' },
              ]}
            />
            <Input
              label="Roll Number"
              value={formData.rollNumber}
              onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
              placeholder="e.g. CS-15"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Department"
              value={formData.departmentId}
              onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
              required
            />
            <Select
              label="Course"
              value={formData.courseId}
              onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
              options={courses.map((c) => ({ value: c.id, label: c.name }))}
              required
            />
            <Select
              label="Class & Section"
              value={formData.classId}
              onChange={(e) => {
                const cls = classes.find((c) => c.id === e.target.value);
                setFormData({
                  ...formData,
                  classId: e.target.value,
                  academicYearId: cls?.academicYearId || formData.academicYearId,
                });
              }}
              options={classes.map((cls) => ({ value: cls.id, label: cls.name }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Parent / Guardian Name"
              value={formData.parentName}
              onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
            />
            <Input
              label="Parent Phone"
              value={formData.parentPhone}
              onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
            />
          </div>

          <Input
            label="Residential Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setShowAddModal(false)} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Complete Registration
            </Button>
          </div>
        </form>
      </Modal>

      {/* Deactivate / Restore Modal */}
      <Modal
        isOpen={showDeactivateModal}
        onClose={() => setShowDeactivateModal(false)}
        title={selectedStudent?.status === 'ACTIVE' ? 'Deactivate Student Record' : 'Restore Student Record'}
        description="Preserves student attendance, examination results, and financial history."
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Are you sure you want to {selectedStudent?.status === 'ACTIVE' ? 'deactivate' : 'restore'}{' '}
          <strong>{selectedStudent?.firstName} {selectedStudent?.lastName}</strong> ({selectedStudent?.admissionNumber})?
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setShowDeactivateModal(false)}>
            Cancel
          </Button>
          <Button
            variant={selectedStudent?.status === 'ACTIVE' ? 'destructive' : 'success'}
            onClick={handleToggleStatus}
          >
            Confirm {selectedStudent?.status === 'ACTIVE' ? 'Deactivation' : 'Restoration'}
          </Button>
        </div>
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Students from CSV"
        description="Upload a CSV with columns: firstName, lastName, email, departmentId, courseId, classId, academicYearId, rollNumber."
      >
        <div className="space-y-4">
          <div className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center">
            <FileSpreadsheet className="w-10 h-10 mx-auto text-indigo-500 mb-2" />
            <p className="text-xs text-slate-500 mb-3">Choose a .csv file from your computer</p>
            <input type="file" accept=".csv" onChange={handleCsvFileSelect} className="text-xs" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowImportModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleProcessCsvImport} isLoading={importLoading}>
              Upload & Process
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
