import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Download,
  Users,
  Award,
  CreditCard,
  PieChart as PieIcon,
  CalendarCheck,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

export const ReportsPage: React.FC = () => {
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState<'demographics' | 'performance' | 'finances'>('demographics');

  const [demographics, setDemographics] = useState<any>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [finances, setFinances] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchReports = async () => {
      setIsLoading(true);
      try {
        const [dRes, pRes, fRes] = await Promise.all([
          api.get('/reports/demographics'),
          api.get('/reports/performance'),
          api.get('/reports/finances'),
        ]);

        if (dRes.success) setDemographics(dRes.data);
        if (pRes.success) setPerformance(dRes.data);
        if (fRes.success) setFinances(fRes.data);
      } catch (err: any) {
        console.error('Reports fetch error', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReports();
  }, []);

  const handleExportDemographicsCsv = () => {
    if (!demographics) return;
    const headers = ['Category', 'Item', 'Student Count'];
    const rows: string[] = [];

    demographics.genderBreakdown?.forEach((g: any) => rows.push(`Gender,${g.gender},${g.count}`));
    demographics.courseBreakdown?.forEach((c: any) => rows.push(`Course,"${c.courseName}",${c.count}`));

    const csv = [headers.join(','), ...rows].join('\n');
    downloadCsv(csv, 'student_demographics_report.csv');
  };

  const handleExportFinancesCsv = () => {
    if (!finances) return;
    const headers = ['Fee Category', 'Total Billed', 'Collected', 'Outstanding'];
    const rows = finances.feeStructures?.map((fs: any) =>
      `"${fs.name}",${fs.amount},${fs.amount},0`
    );

    const csv = [headers.join(','), ...rows].join('\n');
    downloadCsv(csv, 'financial_analytics_report.csv');
  };

  const downloadCsv = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    success('Exported', `Saved ${filename}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
            Institutional Analytics & Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Data-driven institutional insights across demographics, academic performance, and financials
          </p>
        </div>

        <div className="flex rounded-xl bg-slate-200/80 dark:bg-slate-800/80 p-1">
          <button
            onClick={() => setActiveTab('demographics')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'demographics'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Demographics
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'performance'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Academic Performance
          </button>
          <button
            onClick={() => setActiveTab('finances')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'finances'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Financial Analytics
          </button>
        </div>
      </div>

      {/* TAB 1: DEMOGRAPHICS */}
      {activeTab === 'demographics' && demographics && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold">Student Enrollment & Demographics</h3>
            <Button variant="outline" size="sm" onClick={handleExportDemographicsCsv} icon={<Download className="w-4 h-4" />}>
              Export Demographics CSV
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gender breakdown pie */}
            <Card>
              <CardHeader>
                <CardTitle>Gender Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={demographics.genderBreakdown || []}
                      dataKey="count"
                      nameKey="gender"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {demographics.genderBreakdown?.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Course distribution bar */}
            <Card>
              <CardHeader>
                <CardTitle>Program Wise Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={demographics.courseBreakdown || []}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="courseName" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Students" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: ACADEMIC PERFORMANCE */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assessment & Examination Pass Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase">
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Students Appeared</th>
                      <th className="py-3 px-4">Passed</th>
                      <th className="py-3 px-4">Failed</th>
                      <th className="py-3 px-4">Pass Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr>
                      <td className="py-3 px-4 font-bold">CS101 - Data Structures & Algorithms</td>
                      <td className="py-3 px-4">4</td>
                      <td className="py-3 px-4 text-emerald-600 font-bold">4</td>
                      <td className="py-3 px-4 text-rose-500 font-bold">0</td>
                      <td className="py-3 px-4">
                        <Badge variant="success">100%</Badge>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-bold">CS102 - Database Management Systems</td>
                      <td className="py-3 px-4">4</td>
                      <td className="py-3 px-4 text-emerald-600 font-bold">4</td>
                      <td className="py-3 px-4 text-rose-500 font-bold">0</td>
                      <td className="py-3 px-4">
                        <Badge variant="success">100%</Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: FINANCIAL ANALYTICS */}
      {activeTab === 'finances' && finances && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold">Financial Analytics Overview</h3>
            <Button variant="outline" size="sm" onClick={handleExportFinancesCsv} icon={<Download className="w-4 h-4" />}>
              Export Financials CSV
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <span className="text-xs uppercase font-bold text-slate-400">Total Billed</span>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  ${finances.totals?.totalBilled?.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <span className="text-xs uppercase font-bold text-slate-400">Total Collected</span>
                <p className="text-2xl font-black text-emerald-600 mt-1">
                  ${finances.totals?.totalCollected?.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <span className="text-xs uppercase font-bold text-slate-400">Total Outstanding</span>
                <p className="text-2xl font-black text-rose-500 mt-1">
                  ${finances.totals?.totalOutstanding?.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
