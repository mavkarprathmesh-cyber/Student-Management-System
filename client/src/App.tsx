import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';

import { Layout } from './components/layout/Layout';
import { Login } from './pages/auth/Login';
import { Dashboard } from './pages/dashboard/Dashboard';
import { StudentList } from './pages/students/StudentList';
import { StudentProfile } from './pages/students/StudentProfile';
import { TeacherList } from './pages/teachers/TeacherList';
import { AcademicsPage } from './pages/academics/AcademicsPage';
import { AttendancePage } from './pages/attendance/AttendancePage';
import { ExaminationsPage } from './pages/examinations/ExaminationsPage';
import { FeesPage } from './pages/fees/FeesPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { AnnouncementsPage } from './pages/announcements/AnnouncementsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { NotFound } from './pages/common/NotFound';

const ProtectedRoute: React.FC<{
  children: React.ReactElement;
  allowedRoles?: string[];
}> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, role } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Authentication Route */}
              <Route path="/login" element={<Login />} />

              {/* Protected App Routes */}
              <Route
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route
                  path="/students"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'TEACHER']}>
                      <StudentList />
                    </ProtectedRoute>
                  }
                />
                <Route path="/students/:id" element={<StudentProfile />} />
                <Route path="/my-profile" element={<StudentProfile />} />

                <Route
                  path="/teachers"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <TeacherList />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/academics"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AcademicsPage />
                    </ProtectedRoute>
                  }
                />

                <Route path="/attendance" element={<AttendancePage />} />
                <Route path="/examinations" element={<ExaminationsPage />} />
                <Route path="/fees" element={<FeesPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/announcements" element={<AnnouncementsPage />} />

                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />

                <Route path="/profile" element={<ProfilePage />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
