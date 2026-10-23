import React, { useEffect, useState, useCallback } from 'react';
import {
  CreditCard,
  Plus,
  DollarSign,
  Download,
  Receipt,
  Printer,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StudentFee, FeeStructure, Course, ClassSection, AcademicYear } from '../../types';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';

export const FeesPage: React.FC = () => {
  const { user, isAdmin, isStudent } = useAuth();
  const { success, error: toastError } = useToast();

  const [studentFees, setStudentFees] = useState<StudentFee[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Dropdown data
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);

  // Modals
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Selected fee for payment
  const [selectedFee, setSelectedFee] = useState<StudentFee | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  // Receipt data
  const [receiptData, setReceiptData] = useState<any>(null);

  // Structure Form
  const [structureForm, setStructureForm] = useState({
    name: '',
    courseId: '',
    classId: '',
    academicYearId: '',
    category: 'TUITION',
    amount: 2500,
    dueDate: '2026-03-31',
    autoAssign: true,
  });

  useEffect(() => {
    const fetchAcademicOptions = async () => {
      try {
        const [cRes, clRes, yRes] = await Promise.all([
          api.get('/academics/courses'),
          api.get('/academics/classes'),
          api.get('/academics/academic-years'),
        ]);
        if (cRes.success) setCourses(cRes.data);
        if (clRes.success) setClasses(clRes.data);
        if (yRes.success) {
          setYears(yRes.data);
          if (cRes.data.length > 0 && yRes.data.length > 0) {
            setStructureForm((prev) => ({
              ...prev,
              courseId: cRes.data[0].id,
              academicYearId: yRes.data[0].id,
            }));
          }
        }
      } catch (err) {
        console.error('Failed to load fee options', err);
      }
    };
    fetchAcademicOptions();
  }, []);

  const fetchStudentFees = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/fees/student-fees', {
        page: currentPage,
        limit: pageSize,
        status: statusFilter,
        search,
      });

      if (res.success && res.data) {
        setStudentFees(res.data.studentFees);
        setTotalRecords(res.data.pagination.total);
        setTotalPages(res.data.pagination.totalPages);
      }
    } catch (err: any) {
      toastError('Error', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, statusFilter, search, toastError]);

  useEffect(() => {
    fetchStudentFees();
  }, [fetchStudentFees]);

  // Handle Export CSV
  const handleExportCsv = async () => {
    try {
      const blob = await api.get<Blob>('/fees/export/csv', { status: statusFilter });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fee_report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      success('Export Completed', 'Downloaded fee financial report.');
    } catch (err: any) {
      toastError('Export Failed', err.message);
    }
  };

  // Create Fee Structure Submit
  const handleCreateStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/fees/structures', structureForm);
      if (res.success) {
        success('Fee Structure Created', `Assigned to students of ${res.data.name}`);
        setShowStructureModal(false);
        fetchStudentFees();
      }
    } catch (err: any) {
      toastError('Failed', err.message);
    }
  };

  // Submit Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFee) return;

    setIsRecordingPayment(true);
    try {
      const res = await api.post('/fees/payments', {
        studentFeeId: selectedFee.id,
        amount: Number(paymentAmount),
        paymentMethod,
        notes: paymentNotes,
      });

      if (res.success) {
        success('Payment Recorded', res.message);
        setShowPaymentModal(false);
        fetchStudentFees();

        // Automatically open receipt view
        handleViewReceipt(res.data.receiptNumber);
      }
    } catch (err: any) {
      toastError('Payment Failed', err.message);
    } finally {
      setIsRecordingPayment(false);
    }
  };

  // View Receipt
  const handleViewReceipt = async (receiptNumber: string) => {
    try {
      const res = await api.get(`/fees/receipts/${receiptNumber}`);
      if (res.success && res.data) {
        setReceiptData(res.data);
        setShowReceiptModal(true);
      }
    } catch (err: any) {
      toastError('Receipt Error', err.message);
    }
  };

  const columns: Column<StudentFee>[] = [
    {
      header: 'Student',
      cell: (row) => (
        <div>
          <span className="font-bold text-slate-900 dark:text-slate-100 block">
            {row.student?.firstName} {row.student?.lastName}
          </span>
          <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 block">
            {row.student?.admissionNumber}
          </span>
        </div>
      ),
    },
    {
      header: 'Fee Item',
      cell: (row) => (
        <div>
          <span className="font-semibold block">{row.feeStructure?.name}</span>
          <span className="text-xs text-slate-400 block">{row.feeStructure?.category}</span>
        </div>
      ),
    },
    {
      header: 'Total Billed',
      cell: (row) => <span className="font-mono font-bold">${row.totalAmount.toLocaleString()}</span>,
    },
    {
      header: 'Paid Amount',
      cell: (row) => (
        <span className="font-mono font-bold text-emerald-600">${row.paidAmount.toLocaleString()}</span>
      ),
    },
    {
      header: 'Balance Due',
      cell: (row) => (
        <span className={`font-mono font-bold ${row.balance > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
          ${row.balance.toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Due Date',
      cell: (row) => (
        <span className="text-xs text-slate-500">
          {new Date(row.dueDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (row) => (
        <Badge
          variant={
            row.status === 'PAID'
              ? 'success'
              : row.status === 'PARTIAL'
              ? 'warning'
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
          {isAdmin && row.balance > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedFee(row);
                setPaymentAmount(row.balance);
                setShowPaymentModal(true);
              }}
              icon={<DollarSign className="w-3.5 h-3.5" />}
            >
              Collect
            </Button>
          )}

          {row.transactions && row.transactions.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewReceipt(row.transactions![0].receiptNumber)}
              title="View Latest Receipt"
              icon={<Receipt className="w-3.5 h-3.5 text-indigo-600" />}
            >
              Receipt
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
            Fee & Payment Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track student fee balances, collect payments, and issue official payment receipts
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <Button variant="outline" size="md" onClick={handleExportCsv} icon={<Download className="w-4 h-4" />}>
                Export CSV
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => setShowStructureModal(true)}
                icon={<Plus className="w-4 h-4" />}
              >
                Create Fee Structure
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Student Fee Accounts Table */}
      <DataTable
        columns={columns}
        data={studentFees}
        isLoading={isLoading}
        searchPlaceholder="Search student name or admission number..."
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
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs py-2 px-3 focus:outline-none"
          >
            <option value="">All Fee Statuses</option>
            <option value="UNPAID">UNPAID</option>
            <option value="PARTIAL">PARTIAL</option>
            <option value="PAID">PAID</option>
            <option value="OVERDUE">OVERDUE</option>
          </select>
        }
        onClearFilters={() => {
          setStatusFilter('');
          setSearch('');
          setCurrentPage(1);
        }}
      />

      {/* Record Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Record Fee Payment"
        description={`Student: ${selectedFee?.student?.firstName} ${selectedFee?.student?.lastName} (${selectedFee?.student?.admissionNumber})`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs flex justify-between">
            <span>Outstanding Balance:</span>
            <strong className="text-rose-500 font-mono text-sm">${selectedFee?.balance.toLocaleString()}</strong>
          </div>

          <Input
            label="Payment Amount ($)"
            type="number"
            min={1}
            max={selectedFee?.balance || 100000}
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(Number(e.target.value))}
            required
          />

          <Select
            label="Payment Method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            options={[
              { value: 'CASH', label: 'Cash in Hand' },
              { value: 'BANK_TRANSFER', label: 'Bank Wire Transfer' },
              { value: 'CARD', label: 'Credit / Debit Card' },
              { value: 'CHEQUE', label: 'Cheque Deposit' },
              { value: 'ONLINE', label: 'Online Gateway' },
            ]}
          />

          <Input
            label="Payment Notes / Transaction Reference"
            value={paymentNotes}
            onChange={(e) => setPaymentNotes(e.target.value)}
            placeholder="e.g. Bank slip #98428"
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isRecordingPayment}>
              Confirm Payment & Generate Receipt
            </Button>
          </div>
        </form>
      </Modal>

      {/* Printable Receipt Modal */}
      <Modal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        title="Official Fee Receipt"
        maxWidth="lg"
      >
        {receiptData && (
          <div className="space-y-6 printable-area">
            {/* Header */}
            <div className="text-center border-b border-slate-200 dark:border-slate-700 pb-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                {receiptData.institution?.institutionName || 'Apex Academy'}
              </h2>
              <p className="text-xs text-slate-500">{receiptData.institution?.address}</p>
              <div className="inline-block mt-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 rounded-lg text-emerald-700 dark:text-emerald-300 font-mono text-xs font-bold">
                RECEIPT #{receiptData.transaction.receiptNumber}
              </div>
            </div>

            {/* Receipt Body */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl">
              <div>
                <p>Student: <strong>{receiptData.transaction.studentFee?.student?.firstName} {receiptData.transaction.studentFee?.student?.lastName}</strong></p>
                <p className="mt-1">Admission #: <strong>{receiptData.transaction.studentFee?.student?.admissionNumber}</strong></p>
                <p className="mt-1">Class: <strong>{receiptData.transaction.studentFee?.student?.class?.name}</strong></p>
              </div>
              <div>
                <p>Date: <strong>{new Date(receiptData.transaction.paymentDate).toLocaleDateString()}</strong></p>
                <p className="mt-1">Method: <strong>{receiptData.transaction.paymentMethod}</strong></p>
                <p className="mt-1">Recorded By: <strong>{receiptData.transaction.recordedBy?.email}</strong></p>
              </div>
            </div>

            {/* Amount details */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="flex justify-between text-sm py-1">
                <span>Fee Category:</span>
                <span className="font-semibold">{receiptData.transaction.studentFee?.feeStructure?.name}</span>
              </div>
              <div className="flex justify-between text-base py-2 border-t border-slate-100 dark:border-slate-800 font-bold">
                <span>Amount Paid:</span>
                <span className="font-mono text-emerald-600">${receiptData.transaction.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs py-1 border-t border-slate-100 dark:border-slate-800 text-slate-500">
                <span>Remaining Account Balance:</span>
                <span className="font-mono font-bold">${receiptData.transaction.studentFee?.balance.toLocaleString()}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 no-print">
              <Button variant="secondary" onClick={() => setShowReceiptModal(false)}>
                Close
              </Button>
              <Button variant="primary" onClick={() => window.print()} icon={<Printer className="w-4 h-4" />}>
                Print Official Receipt
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Fee Structure Modal */}
      <Modal
        isOpen={showStructureModal}
        onClose={() => setShowStructureModal(false)}
        title="Create Fee Structure"
        description="Define fee allocation for programs or classes."
      >
        <form onSubmit={handleCreateStructure} className="space-y-4">
          <Input
            label="Fee Structure Name"
            value={structureForm.name}
            onChange={(e) => setStructureForm({ ...structureForm, name: e.target.value })}
            placeholder="e.g. Spring 2026 Tuition Fee"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Course / Program"
              value={structureForm.courseId}
              onChange={(e) => setStructureForm({ ...structureForm, courseId: e.target.value })}
              options={courses.map((c) => ({ value: c.id, label: c.name }))}
              required
            />
            <Select
              label="Class (Optional)"
              value={structureForm.classId}
              onChange={(e) => setStructureForm({ ...structureForm, classId: e.target.value })}
              options={classes.map((cls) => ({ value: cls.id, label: cls.name }))}
              placeholder="All Program Classes"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Fee Category"
              value={structureForm.category}
              onChange={(e) => setStructureForm({ ...structureForm, category: e.target.value })}
              options={[
                { value: 'TUITION', label: 'Tuition Fee' },
                { value: 'EXAMINATION', label: 'Examination Fee' },
                { value: 'LABORATORY', label: 'Laboratory Fee' },
                { value: 'LIBRARY', label: 'Library Fee' },
                { value: 'TRANSPORT', label: 'Transportation' },
                { value: 'OTHER', label: 'Other Assessment' },
              ]}
            />
            <Input
              label="Fee Amount ($)"
              type="number"
              min={1}
              value={structureForm.amount}
              onChange={(e) => setStructureForm({ ...structureForm, amount: Number(e.target.value) })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Academic Year"
              value={structureForm.academicYearId}
              onChange={(e) => setStructureForm({ ...structureForm, academicYearId: e.target.value })}
              options={years.map((y) => ({ value: y.id, label: y.name }))}
              required
            />
            <Input
              label="Due Date"
              type="date"
              value={structureForm.dueDate}
              onChange={(e) => setStructureForm({ ...structureForm, dueDate: e.target.value })}
              required
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={structureForm.autoAssign}
              onChange={(e) => setStructureForm({ ...structureForm, autoAssign: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span>Automatically assign this fee to currently enrolled students</span>
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setShowStructureModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Fee Structure
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
