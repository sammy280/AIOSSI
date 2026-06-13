import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import PageHeader from '../../components/shared/PageHeader';
import Badge from '../../components/shared/Badge';
import { formatDate, formatTime, cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { Plus, Clock, Calendar } from 'lucide-react';

const SHIFT_TYPES = ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT', 'CUSTOM'];

const shiftColors = {
  MORNING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  AFTERNOON: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  EVENING: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  NIGHT: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  CUSTOM: 'bg-green-500/10 text-green-400 border-green-500/20',
};

const defaultTimes = {
  MORNING: { start: '06:00', end: '14:00' },
  AFTERNOON: { start: '14:00', end: '22:00' },
  EVENING: { start: '16:00', end: '00:00' },
  NIGHT: { start: '22:00', end: '06:00' },
  CUSTOM: { start: '09:00', end: '17:00' },
};

export default function ShiftsPage() {
  const { user } = useAuthStore();
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({
    employeeId: '', shiftType: 'MORNING', date: '', startTime: '06:00', endTime: '14:00', notes: '',
  });
  const qc = useQueryClient();

  const { data } = useQuery({ queryKey: ['shifts', filter], queryFn: () => api.get(`/shifts${filter !== 'all' ? `?type=${filter}` : ''}`) });
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users'), enabled: showAdd });

  const create = useMutation({
    mutationFn: d => api.post('/shifts', d),
    onSuccess: () => { qc.invalidateQueries(['shifts']); setShowAdd(false); setForm({ employeeId: '', shiftType: 'MORNING', date: '', startTime: '06:00', endTime: '14:00', notes: '' }); },
  });

  const handleShiftType = (type) => {
    const times = defaultTimes[type];
    setForm(f => ({ ...f, shiftType: type, startTime: times.start, endTime: times.end }));
  };

  const shifts = data?.data || [];
  const canAssign = ['ADMIN', 'MANAGER'].includes(user?.role);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shift Management"
        subtitle={`${shifts.length} shifts scheduled`}
        actions={canAssign && (
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> Assign Shift
          </button>
        )}
      />

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {['all', ...SHIFT_TYPES].map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize',
              filter === t ? 'bg-primary text-white' : 'bg-card border border-border hover:bg-accent'
            )}
          >
            {t === 'all' ? 'All Shifts' : t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Shifts Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {shifts.map(shift => (
          <div key={shift.id} className="bg-card border border-border rounded-xl p-5 space-y-3 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{shift.employee?.name}</p>
                <p className="text-xs text-muted-foreground">{shift.employee?.role}</p>
              </div>
              <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold border', shiftColors[shift.shiftType] || shiftColors.CUSTOM)}>
                {shift.shiftType}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="bg-accent/50 rounded-lg p-2 text-center">
                <Calendar className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs font-medium">{formatDate(shift.date)}</p>
              </div>
              <div className="bg-accent/50 rounded-lg p-2 text-center">
                <Clock className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs font-medium">{shift.startTime}</p>
                <p className="text-xs text-muted-foreground">Start</p>
              </div>
              <div className="bg-accent/50 rounded-lg p-2 text-center">
                <Clock className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs font-medium">{shift.endTime}</p>
                <p className="text-xs text-muted-foreground">End</p>
              </div>
            </div>

            {shift.hoursScheduled && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-semibold">{shift.hoursScheduled}h scheduled</span>
              </div>
            )}

            {shift.notes && (
              <p className="text-xs text-muted-foreground bg-accent/30 rounded-lg px-3 py-2">{shift.notes}</p>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border">
              <span>Assigned by {shift.assignedBy?.name}</span>
            </div>
          </div>
        ))}

        {shifts.length === 0 && (
          <div className="col-span-3 text-center py-16 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No shifts scheduled</p>
            <p className="text-sm mt-1">Assign shifts to your team members</p>
          </div>
        )}
      </div>

      {/* Assign Shift Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-semibold text-lg mb-5">Assign Shift</h3>
            <form onSubmit={e => { e.preventDefault(); create.mutate(form); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Employee</label>
                <select value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))} required className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">Select employee...</option>
                  {(users?.data || []).filter(u => u.isActive).map(u => (
                    <option key={u.id} value={u.id}>{u.name} — {u.role}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Shift Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {SHIFT_TYPES.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleShiftType(t)}
                      className={cn('py-2 rounded-lg text-xs font-semibold border transition-all',
                        form.shiftType === t ? 'bg-primary text-white border-primary' : 'bg-background border-border hover:border-primary/50'
                      )}
                    >
                      {t.charAt(0) + t.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Time</label>
                  <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} required className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Time</label>
                  <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} required className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" rows={2} placeholder="Special instructions..." />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={create.isPending} className="flex-1 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {create.isPending ? 'Assigning...' : 'Assign Shift'}
                </button>
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2.5 bg-accent rounded-xl font-medium hover:bg-accent/80 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
