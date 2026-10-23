import React, { useState } from 'react';
import { User, Lock, KeyRound, Shield, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChanging, setIsChanging] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toastError('Mismatch', 'New password and confirmation do not match.');
      return;
    }
    if (newPassword.length < 8) {
      toastError('Weak Password', 'New password must be at least 8 characters.');
      return;
    }

    setIsChanging(true);
    try {
      const res = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      if (res.success) {
        success('Password Changed', 'Your password has been successfully updated.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      toastError('Change Password Failed', err.message);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
          Account Profile & Security
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your account credentials, security preferences, and authentication details
        </p>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>Account Credentials</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-xl uppercase shadow-md">
              {user?.email?.charAt(0) || 'U'}
            </div>
            <div>
              <p className="text-base font-bold text-slate-900 dark:text-slate-100">{user?.email}</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant={user?.role === 'ADMIN' ? 'purple' : user?.role === 'TEACHER' ? 'info' : 'success'}>
                  {user?.role}
                </Badge>
                <Badge variant="success">{user?.status}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-indigo-500" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />

            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
              helperText="Must be at least 8 characters"
              required
            />

            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="primary" type="submit" isLoading={isChanging} icon={<Save className="w-4 h-4" />}>
                Update Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
