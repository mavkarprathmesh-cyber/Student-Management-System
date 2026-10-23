import React, { useEffect, useState } from 'react';
import { Bell, Plus, Trash2, Users, Calendar, AlertTriangle } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Announcement, ClassSection } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

export const AnnouncementsPage: React.FC = () => {
  const { isAdmin, isTeacher } = useAuth();
  const { success, error: toastError } = useToast();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({
    title: '',
    content: '',
    targetAudience: 'ALL',
    targetClassId: '',
    priority: 'NORMAL',
  });

  const fetchAnnouncements = async () => {
    setIsLoading(true);
    try {
      const [aRes, cRes] = await Promise.all([
        api.get('/announcements'),
        api.get('/academics/classes'),
      ]);
      if (aRes.success) setAnnouncements(aRes.data);
      if (cRes.success) setClasses(cRes.data);
    } catch (err: any) {
      toastError('Failed to load notices', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/announcements', form);
      if (res.success) {
        success('Notice Published', 'Notification sent to targeted audience.');
        setShowCreateModal(false);
        setForm({ title: '', content: '', targetAudience: 'ALL', targetClassId: '', priority: 'NORMAL' });
        fetchAnnouncements();
      }
    } catch (err: any) {
      toastError('Publish Failed', err.message);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await api.delete(`/announcements/${id}`);
      success('Deleted', 'Announcement removed from notice board.');
      fetchAnnouncements();
    } catch (err: any) {
      toastError('Delete Failed', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
            Campus Announcements
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Broadcast institutional notices, alerts, and academic deadlines
          </p>
        </div>

        {(isAdmin || isTeacher) && (
          <Button variant="primary" onClick={() => setShowCreateModal(true)} icon={<Plus className="w-4 h-4" />}>
            Publish Notice
          </Button>
        )}
      </div>

      {/* Grid of Announcements */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400">Loading notices...</div>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-slate-400">
            <Bell className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
            <p className="text-base font-bold">No Active Announcements</p>
            <p className="text-xs text-slate-400 mt-1">Check back later for campus notices and updates.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {announcements.map((a) => (
            <Card key={a.id} className="flex flex-col justify-between">
              <div>
                <CardHeader className="flex flex-row items-start justify-between pb-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base sm:text-lg">{a.title}</CardTitle>
                    <span className="text-[11px] text-slate-400 block">
                      Published on {new Date(a.createdAt).toLocaleDateString()} by {a.author?.email || 'Administration'}
                    </span>
                  </div>
                  <Badge
                    variant={
                      a.priority === 'URGENT'
                        ? 'danger'
                        : a.priority === 'HIGH'
                        ? 'warning'
                        : 'neutral'
                    }
                  >
                    {a.priority}
                  </Badge>
                </CardHeader>
                <CardContent className="pt-2">
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">
                    {a.content}
                  </p>
                </CardContent>
              </div>

              <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-300">
                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                  Audience: {a.targetAudience} {a.targetClass ? `(${a.targetClass.name})` : ''}
                </span>

                {isAdmin && (
                  <button
                    onClick={() => handleDeleteAnnouncement(a.id)}
                    className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                    title="Delete notice"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Publish Notice Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Publish Campus Announcement"
        description="Creates notice and dispatches in-app notifications to targeted users."
      >
        <form onSubmit={handleCreateAnnouncement} className="space-y-4">
          <Input
            label="Notice Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Mid-Term Examination Timetable"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Target Audience"
              value={form.targetAudience}
              onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
              options={[
                { value: 'ALL', label: 'All Users (Everyone)' },
                { value: 'STUDENTS', label: 'All Students' },
                { value: 'TEACHERS', label: 'Faculty & Teachers' },
                { value: 'CLASS', label: 'Specific Class Section' },
              ]}
            />
            <Select
              label="Priority Level"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              options={[
                { value: 'NORMAL', label: 'Normal Priority' },
                { value: 'HIGH', label: 'High Priority' },
                { value: 'URGENT', label: 'Urgent Alert' },
              ]}
            />
          </div>

          {form.targetAudience === 'CLASS' && (
            <Select
              label="Select Target Class"
              value={form.targetClassId}
              onChange={(e) => setForm({ ...form, targetClassId: e.target.value })}
              options={classes.map((c) => ({ value: c.id, label: c.name }))}
              required
            />
          )}

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Notice Content
            </label>
            <textarea
              rows={4}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Detailed announcement details..."
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Broadcast Notice
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
