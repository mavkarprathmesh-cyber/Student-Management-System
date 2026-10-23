import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Lock, Mail, ShieldAlert, Sparkles, User, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { success, error: toastError } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Initial admin setup modal
  const [showInitModal, setShowInitModal] = useState(false);
  const [initEmail, setInitEmail] = useState('admin@sms.edu');
  const [initPassword, setInitPassword] = useState('Admin@123456');
  const [isInitLoading, setIsInitLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    const loginEmail = customEmail || email;
    const loginPass = customPass || password;

    try {
      const res = await api.post('/auth/login', {
        email: loginEmail,
        password: loginPass,
      });

      if (res.success && res.data) {
        login(res.data.token, res.data.user);
        success(`Welcome back, ${res.data.user.role}!`, 'Logged in successfully.');
        navigate('/dashboard');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please verify credentials.');
      toastError('Login Failed', err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInitLoading(true);
    try {
      const res = await api.post('/auth/init-admin', {
        email: initEmail,
        password: initPassword,
      });
      if (res.success) {
        success('Administrator initialized!', 'You can now log in with your credentials.');
        setShowInitModal(false);
        setEmail(initEmail);
        setPassword(initPassword);
      }
    } catch (err: any) {
      toastError('Setup Failed', err.message);
    } finally {
      setIsInitLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/25 mx-auto">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
            Apex Academy SMS
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Next-Generation Student & Institutional Management
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-xl">
          {errorMessage && (
            <div className="mb-5 flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={(e) => handleSubmit(e)} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@sms.edu"
              icon={<Mail className="w-4 h-4" />}
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              icon={<Lock className="w-4 h-4" />}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              Sign In to Dashboard
            </Button>
          </form>

          {/* Quick Demo Logins Section */}
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                1-Click Demo Profiles
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@sms.edu');
                  setPassword('Admin@123456');
                  handleSubmit(undefined, 'admin@sms.edu', 'Admin@123456');
                }}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
              >
                <span className="w-2 h-2 rounded-full bg-purple-500 mb-1" />
                Admin
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('sarah.jenkins@sms.edu');
                  setPassword('Teacher@123456');
                  handleSubmit(undefined, 'sarah.jenkins@sms.edu', 'Teacher@123456');
                }}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
              >
                <span className="w-2 h-2 rounded-full bg-blue-500 mb-1" />
                Faculty
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('alex.morgan@sms.edu');
                  setPassword('Student@123456');
                  handleSubmit(undefined, 'alex.morgan@sms.edu', 'Student@123456');
                }}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 mb-1" />
                Student
              </button>
            </div>
          </div>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setShowInitModal(true)}
              className="text-xs text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
            >
              Need to initialize the first administrator?
            </button>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-400">
          Protected by Enterprise Role-Based Access Control (RBAC) & bcrypt encryption.
        </p>
      </div>

      {/* Initial Admin Setup Modal */}
      <Modal
        isOpen={showInitModal}
        onClose={() => setShowInitModal(false)}
        title="Initialize First Administrator"
        description="Creates the primary system administrator if none exists in the database."
      >
        <form onSubmit={handleInitAdmin} className="space-y-4">
          <Input
            label="Admin Email"
            type="email"
            value={initEmail}
            onChange={(e) => setInitEmail(e.target.value)}
            required
          />
          <Input
            label="Admin Password"
            type="password"
            value={initPassword}
            onChange={(e) => setInitPassword(e.target.value)}
            helperText="Must be at least 8 characters"
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowInitModal(false)} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isInitLoading}>
              Create Administrator
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
