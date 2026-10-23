import React, { useEffect, useState } from 'react';
import {
  Users,
  GraduationCap,
  CalendarCheck,
  AlertTriangle,
  CreditCard,
  BookOpen,
  Calendar,
  Bell,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
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
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { StatCard } from '../../components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Link } from 'react-router-dom';

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

export const Dashboard: React.FC = () => {
  const { user, isStudent } = useAuth();

  const [statsData, setStatsData] = useState<any>(null);
  const [chartsData, setChartsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [statsRes, chartsRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/charts'),
        ]);

        if (statsRes.success) setStatsData(statsRes.data);
        if (chartsRes.success) setChartsData(chartsRes.data);
      } catch (err) {
        console.error('Error fetching dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  // STUDENT SPECIFIC DASHBOARD VIEW
  if (isStudent && statsData?.role === 'STUDENT') {
    const s = statsData.stats;
    const studentInfo = statsData.studentInfo;

    return (
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white shadow-lg">
          <h2 className="text-xl sm:text-2xl font-black">Welcome back, {studentInfo?.name}!</h2>
          <p className="text-xs sm:text-sm text-indigo-100 mt-1">
            Admission No: <strong className="text-white">{studentInfo?.admissionNumber}</strong> • Class: <strong className="text-white">{studentInfo?.className}</strong> • Program: <strong className="text-white">{studentInfo?.courseName}</strong>
          </p>
        </div>

        {/* Student Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCard
            title="My Attendance"
            value={`${s.attendancePercentage}%`}
            icon={<CalendarCheck className="w-5 h-5" />}
            color={s.attendancePercentage >= 75 ? 'emerald' : 'rose'}
            subtitle={`${s.attendedSessions} of ${s.totalSessions} sessions attended`}
          />
          <StatCard
            title="Subjects Enrolled"
            value={s.totalSubjects}
            icon={<BookOpen className="w-5 h-5" />}
            color="indigo"
            subtitle="Active semester courses"
          />
          <StatCard
            title="Fee Outstanding"
            value={`$${s.pendingFees.toLocaleString()}`}
            icon={<CreditCard className="w-5 h-5" />}
            color={s.pendingFees === 0 ? 'emerald' : 'amber'}
            subtitle={`$${s.paidFees.toLocaleString()} paid of $${s.totalFees.toLocaleString()}`}
          />
          <StatCard
            title="Upcoming Exams"
            value={s.upcomingExamsCount}
            icon={<Calendar className="w-5 h-5" />}
            color="sky"
            subtitle="Scheduled assessments"
          />
        </div>

        {/* Quick Links & Upcoming Exams */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Upcoming Examination Dates</CardTitle>
              <Link to="/examinations" className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                View Schedule
              </Link>
            </CardHeader>
            <CardContent>
              {statsData.upcomingExams?.length === 0 ? (
                <p className="text-sm text-slate-400">No scheduled exams at this time.</p>
              ) : (
                <div className="space-y-3">
                  {statsData.upcomingExams?.map((ex: any) => (
                    <div key={ex.id} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{ex.name}</h4>
                        <p className="text-xs text-slate-500">
                          {new Date(ex.startDate).toLocaleDateString()} to {new Date(ex.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="purple" size="sm">{ex.examType}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Student Shortcuts</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Link to="/my-profile" className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition flex flex-col items-center text-center">
                <GraduationCap className="w-6 h-6 text-indigo-600 mb-2" />
                <span className="text-sm font-bold">Academic Profile</span>
                <span className="text-[11px] text-slate-400">Personal & enrollment</span>
              </Link>
              <Link to="/examinations" className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition flex flex-col items-center text-center">
                <TrendingUp className="w-6 h-6 text-emerald-600 mb-2" />
                <span className="text-sm font-bold">My Report Card</span>
                <span className="text-[11px] text-slate-400">Results, grades & GPA</span>
              </Link>
              <Link to="/attendance" className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition flex flex-col items-center text-center">
                <CalendarCheck className="w-6 h-6 text-amber-600 mb-2" />
                <span className="text-sm font-bold">Attendance Record</span>
                <span className="text-[11px] text-slate-400">Daily session log</span>
              </Link>
              <Link to="/fees" className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition flex flex-col items-center text-center">
                <CreditCard className="w-6 h-6 text-purple-600 mb-2" />
                <span className="text-sm font-bold">Fee Receipts</span>
                <span className="text-[11px] text-slate-400">Payments & balance</span>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ADMIN & TEACHER DASHBOARD VIEW
  const s = statsData?.stats || {};

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
            Institutional Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time academic performance, attendance metrics, and administrative data
          </p>
        </div>
      </div>

      {/* Primary Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Active Students"
          value={s.totalStudents ?? 0}
          icon={<GraduationCap className="w-5 h-5" />}
          color="indigo"
          subtitle="Enrolled learners"
        />
        <StatCard
          title="Faculty & Staff"
          value={s.totalTeachers ?? 0}
          icon={<Users className="w-5 h-5" />}
          color="sky"
          subtitle="Academic personnel"
        />
        <StatCard
          title="Courses & Programs"
          value={s.totalCourses ?? 0}
          icon={<BookOpen className="w-5 h-5" />}
          color="purple"
          subtitle={`${s.totalClasses ?? 0} class sections`}
        />
        <StatCard
          title="Avg Attendance"
          value={`${s.todayAttendancePercentage ?? 0}%`}
          icon={<CalendarCheck className="w-5 h-5" />}
          color={s.todayAttendancePercentage >= 75 ? 'emerald' : 'amber'}
          subtitle="Recent eligible sessions"
        />
        <StatCard
          title="Low Attendance"
          value={s.lowAttendanceStudentsCount ?? 0}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="rose"
          subtitle="Students < 75% rate"
        />
        <StatCard
          title="Pending Fees"
          value={`$${(s.pendingFeeAmount ?? 0).toLocaleString()}`}
          icon={<CreditCard className="w-5 h-5" />}
          color="amber"
          subtitle={`$${(s.collectedFeeAmount ?? 0).toLocaleString()} collected`}
        />
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trends Line Chart */}
        <Card>
          <CardHeader className="flex items-center justify-between pb-2">
            <CardTitle>Attendance Trends</CardTitle>
            <span className="text-xs text-slate-400">Recent Class Sessions</span>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartsData?.attendanceTrends || []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} unit="%" tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="percentage"
                  name="Attendance %"
                  stroke="#6366f1"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#6366f1' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Admissions Area Chart */}
        <Card>
          <CardHeader className="flex items-center justify-between pb-2">
            <CardTitle>Monthly Student Admissions</CardTitle>
            <span className="text-xs text-slate-400">Past 6 Months</span>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartsData?.monthlyAdmissions || []}>
                <defs>
                  <linearGradient id="admissionsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="admissions"
                  name="New Students"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#admissionsGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Charts: Course Distribution & Exam Grade Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Course-wise Student Distribution */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Course Enrollment</CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center">
            {chartsData?.courseDistribution?.length === 0 ? (
              <p className="text-xs text-slate-400">No course data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartsData?.courseDistribution || []}
                    dataKey="studentCount"
                    nameKey="code"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {chartsData?.courseDistribution?.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '12px',
                      border: 'none',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Examination Performance Distribution */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Exam Grade Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartsData?.examGradeDistribution || []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="grade" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" name="Students" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Fee Collection vs Outstanding */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Fee Collection vs Balance</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartsData?.feeComparison || []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} unit="$" tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [`$${val.toLocaleString()}`, 'Amount']}
                />
                <Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Notice Board */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Student Registrations */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Recent Student Registrations</CardTitle>
            <Link to="/students" className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {statsData?.recentStudents?.length === 0 ? (
              <p className="text-xs text-slate-400">No recent students.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {statsData?.recentStudents?.map((st: any) => (
                  <div key={st.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {st.firstName} {st.lastName}
                      </p>
                      <p className="text-xs text-slate-400">
                        {st.admissionNumber} • {st.class?.name || 'Class N/A'}
                      </p>
                    </div>
                    <Badge variant={st.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm">
                      {st.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notice Board */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Campus Notice Board</CardTitle>
            <Link to="/announcements" className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1">
              All announcements <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {statsData?.recentAnnouncements?.length === 0 ? (
              <p className="text-xs text-slate-400">No active notices.</p>
            ) : (
              <div className="space-y-3">
                {statsData?.recentAnnouncements?.map((a: any) => (
                  <div key={a.id} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{a.title}</h4>
                      <Badge variant={a.priority === 'URGENT' ? 'danger' : a.priority === 'HIGH' ? 'warning' : 'neutral'} size="sm">
                        {a.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {a.content}
                    </p>
                    <span className="text-[10px] text-slate-400 block mt-2">
                      {new Date(a.createdAt).toLocaleDateString()} • Target: {a.targetAudience}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
