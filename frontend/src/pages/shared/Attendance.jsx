import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import api from '../../lib/api';
import PageHeader from '../../components/shared/PageHeader';
import { formatDate, formatTime, cn } from '../../lib/utils';
import { Clock, LogIn, LogOut, UserCheck, Calendar } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function AttendancePage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isManager = ['ADMIN', 'MANAGER'].includes(user?.role);
  const [selectedEmployee, setSelectedEmployee] = useState('');

  // All records (manager/admin only)
  const { data: allAttendance } = useQuery({
    queryKey: ['attendance'],
    queryFn: () => api.get('/attendance'),
    enabled: isManager,
  });

  // My own records (everyone)
  const { data: myAttendance } = useQuery({
    queryKey: ['my-attendance'],
    queryFn: () => api.get('/attendance/my'),
  });

  // Users list for manager to clock in
  const { data: usersData } = useQuery({
    queryKey: ['users-active'],
    queryFn: () => api.get('/users?status=active'),
    enabled: isManager,
  });

  // Manager clocks in an employee
  const clockIn = useMutation({
    mutationFn: (employeeId) => api.post('/attendance/clock-in', { employeeId }),
    onSuccess: () => { qc.invalidateQueries(['attendance']); setSelectedEmployee(''); },
  });

  // Manager clocks out an employee
  const clockOut = useMutation({
    mutationFn: (employeeId) => api.patch('/attendance/clock-out', { employeeId }),
    onSuccess: () => { qc.invalidateQueries(['attendance']); setSelectedEmployee(''); },
  });

  const allRecords = allAttendance?.data || [];
  const myRecords = myAttendance?.data || [];
  const users = (usersData?.data || []).filter(u => u.isActive && u.id !== user?.id);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const myToday = myRecords.find(r => new Date(r.date) >= today);
  const isClockedIn = myToday && !myToday.clockOut;

  // For manager: find if selected employee is currently clocked in
  const selectedRecord = selectedEmployee
    ? allRecords.find(r => r.userId === selectedEmployee && new Date(r.date) >= today)
    : null;
  const selectedClockedIn = selectedRecord && !selectedRecord.clockOut;

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance Management" />

      {/* ── MANAGER CLOCK-IN PANEL ── */}
      {isManager && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5 pb-4 border-b border-border">
            <UserCheck className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Clock In / Out Employees</h3>
            <span className="ml-auto text-xs text-muted-foreground bg-accent px-2 py-1 rounded-full">
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>

          <div className="flex gap-3 flex-wrap items-end">
            <div className="flex-1 min-w-48">
              <label className="block text-sm font-medium mb-1 text-muted-foreground">Select Employee</label>
              <select
                value={selectedEmployee}
                onChange={e => setSelectedEmployee(e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Choose employee...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} — {u.role}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => clockIn.mutate(selectedEmployee)}
                disabled={!selectedEmployee || selectedClockedIn || clockIn.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <LogIn className="w-4 h-4" /> Clock In
              </button>
              <button
                onClick={() => clockOut.mutate(selectedEmployee)}
                disabled={!selectedEmployee || !selectedClockedIn || clockOut.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <LogOut className="w-4 h-4" /> Clock Out
              </button>
            </div>
          </div>

          {selectedRecord && (
            <div className="mt-3 text-sm text-muted-foreground bg-accent/50 rounded-lg px-4 py-2">
              {selectedClockedIn
                ? <span className="text-green-400">✅ Currently clocked in since {formatTime(selectedRecord.clockIn)}</span>
                : <span className="text-muted-foreground">Shift completed today — In: {formatTime(selectedRecord.clockIn)} / Out: {formatTime(selectedRecord.clockOut)}</span>
              }
            </div>
          )}
          {!selectedRecord && selectedEmployee && (
            <p className="mt-3 text-sm text-muted-foreground bg-accent/50 rounded-lg px-4 py-2">
              ⚪ Not yet clocked in today
            </p>
          )}
        </div>
      )}

      {/* ── MY STATUS (non-manager staff view only) ── */}
      {!isManager && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className={cn('w-12 h-12 rounded-full flex items-center justify-center', isClockedIn ? 'bg-green-500/20' : myToday ? 'bg-accent' : 'bg-red-500/10')}>
              <Clock className={cn('w-6 h-6', isClockedIn ? 'text-green-400' : myToday ? 'text-muted-foreground' : 'text-red-400')} />
            </div>
            <div>
              <p className="font-semibold text-lg">{user?.name}</p>
              <p className="text-muted-foreground text-sm">
                {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              {myToday ? (
                <p className="text-sm mt-1">
                  <span className="text-green-400 font-medium">In: {formatTime(myToday.clockIn)}</span>
                  {myToday.clockOut
                    ? <span className="text-muted-foreground ml-3">Out: {formatTime(myToday.clockOut)} • {myToday.hoursWorked || '—'}h</span>
                    : <span className="text-yellow-400 ml-3">● Active shift</span>
                  }
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">⚪ Not clocked in today — ask the manager to clock you in</p>
              )}
            </div>
            <div className="ml-auto">
              {isClockedIn && <span className="px-3 py-1.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-sm font-semibold">● On Duty</span>}
              {myToday && !isClockedIn && <span className="px-3 py-1.5 bg-accent text-muted-foreground rounded-full text-sm">Shift Done</span>}
              {!myToday && <span className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-full text-sm">Not Clocked In</span>}
            </div>
          </div>
        </div>
      )}

      {/* ── ALL RECORDS (manager/admin) ── */}
      {isManager && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">All Attendance Records</h3>
            <span className="ml-auto text-xs text-muted-foreground">{allRecords.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-accent/50 border-b border-border">
                <tr>{['Employee', 'Role', 'Date', 'Clock In', 'Clock Out', 'Hours'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {allRecords.slice(0, 50).map(r => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{r.user?.name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.user?.role}</td>
                    <td className="px-4 py-3">{formatDate(r.date)}</td>
                    <td className="px-4 py-3 text-green-400 font-medium">{formatTime(r.clockIn)}</td>
                    <td className="px-4 py-3">{r.clockOut ? <span className="text-red-400">{formatTime(r.clockOut)}</span> : <span className="text-yellow-400 text-xs font-semibold">● Active</span>}</td>
                    <td className="px-4 py-3 font-semibold">{r.hoursWorked ? `${r.hoursWorked}h` : '—'}</td>
                  </tr>
                ))}
                {allRecords.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No records yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MY HISTORY (all roles) ── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border"><h3 className="font-semibold">My Attendance History</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-accent/50 border-b border-border">
              <tr>{['Date', 'Clock In', 'Clock Out', 'Hours Worked', 'Status'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {myRecords.map(r => (
                <tr key={r.id} className="border-b border-border/50">
                  <td className="px-4 py-3">{formatDate(r.date)}</td>
                  <td className="px-4 py-3 text-green-400 font-medium">{formatTime(r.clockIn)}</td>
                  <td className="px-4 py-3">{r.clockOut ? <span className="text-red-400">{formatTime(r.clockOut)}</span> : <span className="text-yellow-400 text-xs font-semibold">● Active</span>}</td>
                  <td className="px-4 py-3 font-semibold">{r.hoursWorked ? `${r.hoursWorked}h` : '—'}</td>
                  <td className="px-4 py-3">
                    {r.clockOut
                      ? <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-400 rounded-full">Complete</span>
                      : <span className="text-xs px-2 py-0.5 bg-yellow-500/10 text-yellow-400 rounded-full">On Duty</span>
                    }
                  </td>
                </tr>
              ))}
              {myRecords.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No records yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
