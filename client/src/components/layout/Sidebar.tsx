import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  Award,
  CreditCard,
  BarChart3,
  Bell,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  LogOut,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../ui/Badge';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const { user, isAdmin, isTeacher, isStudent, logout } = useAuth();

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 select-none ${
      isActive
        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 dark:bg-indigo-500 font-semibold'
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
    } ${collapsed ? 'justify-center px-2' : ''}`;

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800/80 transition-all duration-300 ease-in-out lg:static ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight block truncate">
                  Apex SMS
                </span>
                <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider block">
                  Institution Portal
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Main Navigation */}
          <div className="space-y-1">
            {!collapsed && (
              <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">
                Main
              </span>
            )}
            <NavLink to="/dashboard" onClick={onCloseMobile} className={navItemClass} title="Dashboard">
              <LayoutDashboard className="w-5 h-5 shrink-0" />
              {!collapsed && <span>Dashboard</span>}
            </NavLink>
          </div>

          {/* Academic Modules (Admin & Teacher) */}
          {(isAdmin || isTeacher) && (
            <div className="space-y-1">
              {!collapsed && (
                <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">
                  Academic Operations
                </span>
              )}
              <NavLink to="/students" onClick={onCloseMobile} className={navItemClass} title="Students">
                <GraduationCap className="w-5 h-5 shrink-0" />
                {!collapsed && <span>Students</span>}
              </NavLink>

              {isAdmin && (
                <>
                  <NavLink to="/teachers" onClick={onCloseMobile} className={navItemClass} title="Teachers & Staff">
                    <Users className="w-5 h-5 shrink-0" />
                    {!collapsed && <span>Faculty & Staff</span>}
                  </NavLink>
                  <NavLink to="/academics" onClick={onCloseMobile} className={navItemClass} title="Academic Structure">
                    <BookOpen className="w-5 h-5 shrink-0" />
                    {!collapsed && <span>Academics</span>}
                  </NavLink>
                </>
              )}

              <NavLink to="/attendance" onClick={onCloseMobile} className={navItemClass} title="Attendance">
                <CalendarCheck className="w-5 h-5 shrink-0" />
                {!collapsed && <span>Attendance</span>}
              </NavLink>

              <NavLink to="/examinations" onClick={onCloseMobile} className={navItemClass} title="Examinations & Marks">
                <Award className="w-5 h-5 shrink-0" />
                {!collapsed && <span>Examinations</span>}
              </NavLink>

              {isAdmin && (
                <NavLink to="/fees" onClick={onCloseMobile} className={navItemClass} title="Fee Management">
                  <CreditCard className="w-5 h-5 shrink-0" />
                  {!collapsed && <span>Fees & Finance</span>}
                </NavLink>
              )}

              <NavLink to="/reports" onClick={onCloseMobile} className={navItemClass} title="Reports & Analytics">
                <BarChart3 className="w-5 h-5 shrink-0" />
                {!collapsed && <span>Reports</span>}
              </NavLink>
            </div>
          )}

          {/* Student Dedicated Views */}
          {isStudent && (
            <div className="space-y-1">
              {!collapsed && (
                <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">
                  My Academic Center
                </span>
              )}
              <NavLink to="/my-profile" onClick={onCloseMobile} className={navItemClass} title="My Student Profile">
                <UserCheck className="w-5 h-5 shrink-0" />
                {!collapsed && <span>My Profile</span>}
              </NavLink>
              <NavLink to="/attendance" onClick={onCloseMobile} className={navItemClass} title="My Attendance">
                <CalendarCheck className="w-5 h-5 shrink-0" />
                {!collapsed && <span>My Attendance</span>}
              </NavLink>
              <NavLink to="/examinations" onClick={onCloseMobile} className={navItemClass} title="My Exam Results">
                <Award className="w-5 h-5 shrink-0" />
                {!collapsed && <span>Results & Grades</span>}
              </NavLink>
              <NavLink to="/fees" onClick={onCloseMobile} className={navItemClass} title="My Fees & Receipts">
                <CreditCard className="w-5 h-5 shrink-0" />
                {!collapsed && <span>Fee Statement</span>}
              </NavLink>
            </div>
          )}

          {/* Communication & Announcements */}
          <div className="space-y-1">
            {!collapsed && (
              <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">
                Communication
              </span>
            )}
            <NavLink to="/announcements" onClick={onCloseMobile} className={navItemClass} title="Announcements">
              <Bell className="w-5 h-5 shrink-0" />
              {!collapsed && <span>Notice Board</span>}
            </NavLink>
          </div>

          {/* Administration & System */}
          {isAdmin && (
            <div className="space-y-1">
              {!collapsed && (
                <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">
                  Administration
                </span>
              )}
              <NavLink to="/settings" onClick={onCloseMobile} className={navItemClass} title="Settings & Audit">
                <Settings className="w-5 h-5 shrink-0" />
                {!collapsed && <span>System Settings</span>}
              </NavLink>
            </div>
          )}
        </div>

        {/* User Card & Logout Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 shrink-0">
          <div
            className={`flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 ${
              collapsed ? 'justify-center p-1.5' : ''
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center font-bold text-indigo-700 dark:text-indigo-300 text-xs shrink-0 uppercase">
              {user?.email?.charAt(0) || 'U'}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {user?.email}
                </p>
                <div className="mt-0.5">
                  <Badge
                    size="sm"
                    variant={isAdmin ? 'purple' : isTeacher ? 'info' : 'success'}
                  >
                    {user?.role}
                  </Badge>
                </div>
              </div>
            )}
            <button
              onClick={() => logout()}
              title="Logout"
              className="text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
