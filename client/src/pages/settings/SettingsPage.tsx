import React, { useEffect, useState } from 'react';
import { Settings, ShieldCheck, Users, Save, KeyRound, CheckCircle2, RotateCcw } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { InstitutionSetting, User } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState<'institution' | 'users' | 'audit'>('institution');

  // Institution settings
  const [instSettings, setInstSettings] = useState<InstitutionSetting | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // Users management
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Audit logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    const fetchInstitution = async () => {
      try {
        const res = await api.get('/settings/institution');
        if (res.success) setInstSettings(res.data);
      } catch (err: any) {
        toastError('Failed to load settings', err.message);
      }
    };
    fetchInstitution();
  }, []);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.get('/settings/users', { limit: 50 });
      if (res.success && res.data) setUsers(res.data.users);
    } catch (err: any) {
      toastError('Failed to load users', err.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchAuditLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await api.get('/settings/audit-logs', { limit: 50 });
      if (res.success && res.data) setAuditLogs(res.data.logs);
    } catch (err: any) {
      toastError('Failed to load audit logs', err.message);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'audit') fetchAuditLogs();
  }, [activeTab]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instSettings) return;

    setSavingSettings(true);
    try {
      const res = await api.put('/settings/institution', instSettings);
      if (res.success) {
        success('Settings Saved', 'Institution configuration updated.');
      }
    } catch (err: any) {
      toastError('Save Error', err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleToggleUserStatus = async (targetUser: User) => {
    const newStatus = targetUser.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await api.patch(`/settings/users/${targetUser.id}/status`, { status: newStatus });
      if (res.success) {
        success('Updated', `User status changed to ${newStatus}`);
        fetchUsers();
      }
    } catch (err: any) {
      toastError('Failed', err.message);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForReset) return;
    try {
      const res = await api.post(`/settings/users/${selectedUserForReset.id}/reset-password`, {
        newPassword,
      });
      if (res.success) {
        success('Password Reset', res.message);
        setSelectedUserForReset(null);
        setNewPassword('');
      }
    } catch (err: any) {
      toastError('Reset Failed', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
          System Settings & Administration
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure institutional parameters, manage user credentials, and review immutable audit trails
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-4">
        <button
          onClick={() => setActiveTab('institution')}
          className={`py-3 px-3 text-sm font-bold border-b-2 transition ${
            activeTab === 'institution'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Institution Profile
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`py-3 px-3 text-sm font-bold border-b-2 transition ${
            activeTab === 'users'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          User Account Management
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`py-3 px-3 text-sm font-bold border-b-2 transition ${
            activeTab === 'audit'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Security Audit Logs
        </button>
      </div>

      {/* TAB 1: INSTITUTION SETTINGS */}
      {activeTab === 'institution' && instSettings && (
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Institutional Details & Policies</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Institution Name"
                  value={instSettings.institutionName}
                  onChange={(e) => setInstSettings({ ...instSettings, institutionName: e.target.value })}
                  required
                />
                <Input
                  label="Institution Code"
                  value={instSettings.code}
                  onChange={(e) => setInstSettings({ ...instSettings, code: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Official Email"
                  type="email"
                  value={instSettings.email}
                  onChange={(e) => setInstSettings({ ...instSettings, email: e.target.value })}
                  required
                />
                <Input
                  label="Contact Phone"
                  value={instSettings.phone}
                  onChange={(e) => setInstSettings({ ...instSettings, phone: e.target.value })}
                  required
                />
              </div>

              <Input
                label="Physical Campus Address"
                value={instSettings.address}
                onChange={(e) => setInstSettings({ ...instSettings, address: e.target.value })}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Attendance Threshold (%)"
                  type="number"
                  min={1}
                  max={100}
                  value={instSettings.attendanceThreshold}
                  onChange={(e) => setInstSettings({ ...instSettings, attendanceThreshold: Number(e.target.value) })}
                  helperText="Alerts when below this %"
                  required
                />
                <Input
                  label="Currency Code"
                  value={instSettings.currency}
                  onChange={(e) => setInstSettings({ ...instSettings, currency: e.target.value })}
                  required
                />
                <Input
                  label="Currency Symbol"
                  value={instSettings.currencySymbol}
                  onChange={(e) => setInstSettings({ ...instSettings, currencySymbol: e.target.value })}
                  required
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button variant="primary" type="submit" isLoading={savingSettings} icon={<Save className="w-4 h-4" />}>
                  Save Configuration
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* TAB 2: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <Card>
          <CardHeader>
            <CardTitle>System User Accounts ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="p-8 text-center text-slate-400">Loading accounts...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase">
                      <th className="py-3 px-4">User Email</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Linked Profile</th>
                      <th className="py-3 px-4">Last Login</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                          {u.email}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={u.role === 'ADMIN' ? 'purple' : u.role === 'TEACHER' ? 'info' : 'success'}>
                            {u.role}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={u.status === 'ACTIVE' ? 'success' : 'danger'}>
                            {u.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">
                          {u.studentProfile
                            ? `${u.studentProfile.firstName} ${u.studentProfile.lastName} (${u.studentProfile.admissionNumber})`
                            : u.teacherProfile
                            ? `${u.teacherProfile.firstName} ${u.teacherProfile.lastName} (${u.teacherProfile.employeeId})`
                            : 'System Administrator'}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-400">
                          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedUserForReset(u)}
                            icon={<KeyRound className="w-3.5 h-3.5" />}
                          >
                            Reset
                          </Button>
                          {u.id !== user?.id && (
                            <Button
                              variant={u.status === 'ACTIVE' ? 'destructive' : 'success'}
                              size="sm"
                              onClick={() => handleToggleUserStatus(u)}
                            >
                              {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 3: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <Card>
          <CardHeader>
            <CardTitle>System Security & Activity Audit Trail</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingLogs ? (
              <div className="p-8 text-center text-slate-400">Loading audit records...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 font-bold uppercase text-slate-400">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Entity</th>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">IP Address</th>
                      <th className="py-3 px-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="py-2.5 px-4 font-mono text-slate-400">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">{log.entity}</td>
                        <td className="py-2.5 px-4 text-slate-500">{log.user?.email || 'System'}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-400">{log.ipAddress || '127.0.0.1'}</td>
                        <td className="py-2.5 px-4 max-w-xs truncate text-slate-400">
                          {log.details || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reset Password Modal */}
      <Modal
        isOpen={!!selectedUserForReset}
        onClose={() => setSelectedUserForReset(null)}
        title={`Reset Password for ${selectedUserForReset?.email}`}
        description="Set a new secure password for this user account."
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 6 characters"
            required
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setSelectedUserForReset(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Update Password
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
