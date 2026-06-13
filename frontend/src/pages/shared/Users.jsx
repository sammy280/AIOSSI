import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import PageHeader from '../../components/shared/PageHeader';
import Badge from '../../components/shared/Badge';
import { formatDate, formatDateTime, cn, getRoleColor, getInitials } from '../../lib/utils';
import { Plus, Search, UserX, UserCheck, Camera, Eye, Edit2, Activity } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const ROLES = ['ADMIN', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN', 'BAR', 'DELIVERY_RIDER'];
const PIN_ROLES = ['WAITER', 'KITCHEN', 'BAR'];

function Avatar({ user, size = 'md' }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-16 h-16 text-lg' };
  return (
    <div className={cn('rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center overflow-hidden shrink-0', sizes[size])}>
      {user.profile?.avatar
        ? <img src={`/uploads/${user.profile.avatar}`} alt={user.name} className="w-full h-full object-cover" />
        : <span className="font-bold text-primary">{getInitials(user.name)}</span>
      }
    </div>
  );
}

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [viewUser, setViewUser] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [activityUser, setActivityUser] = useState(null);
  const [form, setForm] = useState({
    name: '', email: '', password: '', pin: '', role: 'WAITER',
    loginType: 'PIN', phone: '', address: '', nationalId: '',
    employmentDate: new Date().toISOString().split('T')[0],
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const avatarInputRef = useRef();
  const { user: me } = useAuthStore();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['users', search, roleFilter],
    queryFn: () => api.get(`/users?search=${search}&role=${roleFilter}`),
  });

  const createUser = useMutation({
    mutationFn: async (formData) => {
      // If avatar selected, upload first then create user
      if (avatarFile) {
        const fd = new FormData();
        fd.append('avatar', avatarFile);
        Object.entries(formData).forEach(([k, v]) => fd.append(k, v));
        return api.post('/users', fd);
      }
      return api.post('/users', formData);
    },
    onSuccess: () => {
      qc.invalidateQueries(['users']);
      setShowCreate(false);
      setAvatarFile(null);
      setAvatarPreview(null);
      setForm({ name: '', email: '', password: '', pin: '', role: 'WAITER', loginType: 'PIN', phone: '', address: '', nationalId: '', employmentDate: new Date().toISOString().split('T')[0] });
    },
  });

  const uploadAvatar = useMutation({
    mutationFn: ({ id, file }) => {
      const fd = new FormData();
      fd.append('avatar', file);
      return api.post(`/users/${id}/avatar`, fd);
    },
    onSuccess: () => qc.invalidateQueries(['users']),
  });

  const deactivate = useMutation({ mutationFn: (id) => api.patch(`/users/${id}/deactivate`), onSuccess: () => qc.invalidateQueries(['users']) });
  const reactivate = useMutation({ mutationFn: (id) => api.patch(`/users/${id}/reactivate`), onSuccess: () => qc.invalidateQueries(['users']) });
  const updateUser = useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/users/${id}`, data),
    onSuccess: () => { qc.invalidateQueries(['users']); setEditUser(null); toast.success('User updated'); },
    onError: (e) => toast.error(e.message || 'Failed to update'),
  });

  const { data: activityData } = useQuery({
    queryKey: ['user-activity', activityUser?.id],
    queryFn: () => api.get(`/audit-logs?userId=${activityUser?.id}&limit=30`),
    enabled: !!activityUser,
  });

  const users = data?.data || [];
  const isAdmin = me?.role === 'ADMIN';
  const canManage = ['ADMIN', 'MANAGER'].includes(me?.role);

  const handleRoleChange = (role) => {
    setForm(f => ({ ...f, role, loginType: PIN_ROLES.includes(role) ? 'PIN' : 'EMAIL_PASSWORD' }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff Management"
        subtitle={`${users.length} employees`}
        actions={isAdmin && (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90">
            <Plus className="w-4 h-4" /> Add Staff
          </button>
        )}
      />

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name..." className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="px-4 py-2 bg-card border border-border rounded-xl text-sm focus:outline-none">
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Staff Cards Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {users.map(u => (
          <div key={u.id} className={cn('bg-card border border-border rounded-xl p-4 space-y-3 hover:shadow-lg transition-shadow', !u.isActive && 'opacity-60')}>
            {/* Avatar + Name */}
            <div className="flex items-center gap-3">
              <div className="relative group">
                <Avatar user={u} size="lg" />
                {/* Admin/Manager can upload avatar for non-admin staff */}
                {canManage && u.role !== 'ADMIN' && (
                  <>
                    <label
                      className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                      htmlFor={`avatar-${u.id}`}
                    >
                      <Camera className="w-4 h-4 text-white" />
                    </label>
                    <input
                      id={`avatar-${u.id}`}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files[0];
                        if (file) uploadAvatar.mutate({ id: u.id, file });
                      }}
                    />
                  </>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate">{u.name}</p>
                <span className={cn('text-xs font-semibold', getRoleColor(u.role))}>{u.role}</span>
              </div>
            </div>

            {/* Info */}
            <div className="space-y-1 text-xs text-muted-foreground">
              {u.email && <p>✉️ {u.email}</p>}
              {u.profile?.phone && <p>📞 {u.profile.phone}</p>}
              <p>📅 Joined {formatDate(u.profile?.employmentDate)}</p>
            </div>

            {/* Login info */}
            <div className="flex items-center justify-between">
              <Badge status={u.isActive ? 'ACTIVE' : 'INACTIVE'} />
              <span className="text-xs bg-accent px-2 py-0.5 rounded-full">
                {u.loginType === 'PIN' ? '🔢 PIN Login' : '✉️ Email Login'}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-1 pt-1 border-t border-border flex-wrap">
              <button
                onClick={() => setViewUser(u)}
                className="flex-1 py-1.5 text-xs bg-accent rounded-lg hover:bg-accent/80 flex items-center justify-center gap-1"
              >
                <Eye className="w-3 h-3" /> View
              </button>
              {canManage && u.id !== me?.id && u.role !== 'ADMIN' && (
                <button
                  onClick={() => { setEditUser(u); setEditForm({ name: u.name, email: u.email || '', phone: u.profile?.phone || '', role: u.role, address: u.profile?.address || '', emergencyContact: u.profile?.emergencyContact || '', emergencyPhone: u.profile?.emergencyPhone || '' }); }}
                  className="flex-1 py-1.5 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 flex items-center justify-center gap-1"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
              )}
              {canManage && (
                <button onClick={() => setActivityUser(u)} className="py-1.5 px-2 text-xs bg-accent rounded-lg hover:bg-accent/80 flex items-center justify-center">
                  <Activity className="w-3 h-3" />
                </button>
              )}
              {isAdmin && u.id !== me?.id && (
                u.isActive
                  ? <button onClick={() => deactivate.mutate(u.id)} className="flex-1 py-1.5 text-xs bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 flex items-center justify-center gap-1">
                      <UserX className="w-3 h-3" /> Deactivate
                    </button>
                  : <button onClick={() => reactivate.mutate(u.id)} className="flex-1 py-1.5 text-xs bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 flex items-center justify-center gap-1">
                      <UserCheck className="w-3 h-3" /> Reactivate
                    </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* View User Modal */}
      {viewUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-center mb-4">
              <div className="flex justify-center mb-3">
                <Avatar user={viewUser} size="lg" />
              </div>
              <h3 className="font-bold text-lg">{viewUser.name}</h3>
              <span className={cn('text-sm font-semibold', getRoleColor(viewUser.role))}>{viewUser.role}</span>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ['Email', viewUser.email || '—'],
                ['Phone', viewUser.profile?.phone || '—'],
                ['Address', viewUser.profile?.address || '—'],
                ['National ID', viewUser.profile?.nationalId || '—'],
                ['Employment Date', formatDate(viewUser.profile?.employmentDate)],
                ['Login Type', viewUser.loginType === 'PIN' ? 'PIN Login' : 'Email + Password'],
                ['Status', viewUser.isActive ? '✅ Active' : '❌ Inactive'],
                ...(['ADMIN', 'MANAGER'].includes(viewUser.role) ? [
                  ['Emergency Contact', viewUser.profile?.emergencyContact || '—'],
                  ['Emergency Phone', viewUser.profile?.emergencyPhone || '—'],
                ] : []),
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium">{v}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setViewUser(null)} className="w-full mt-4 py-2.5 bg-accent rounded-xl font-medium">Close</button>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><Edit2 className="w-5 h-5 text-primary" /> Edit {editUser.name}</h3>
            <form onSubmit={e => { e.preventDefault(); updateUser.mutate({ id: editUser.id, ...editForm }); }} className="space-y-3">
              {[['name', 'Full Name', 'text', true], ['email', 'Email', 'email', false], ['phone', 'Phone', 'tel', false], ['address', 'Address', 'text', false]].map(([k, l, t, req]) => (
                <div key={k}>
                  <label className="block text-sm font-medium mb-1">{l}</label>
                  <input type={t} required={req} value={editForm[k] || ''} onChange={e => setEditForm(f => ({ ...f, [k]: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              ))}
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium mb-1">Role</label>
                  <select value={editForm.role || editUser.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none">
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              )}
              {['ADMIN', 'MANAGER'].includes(editForm.role || editUser.role) && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Emergency Contact</label>
                    <input value={editForm.emergencyContact || ''} onChange={e => setEditForm(f => ({ ...f, emergencyContact: e.target.value }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Emergency Phone</label>
                    <input value={editForm.emergencyPhone || ''} onChange={e => setEditForm(f => ({ ...f, emergencyPhone: e.target.value }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none" />
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={updateUser.isPending} className="flex-1 py-2.5 bg-primary text-white rounded-xl font-semibold disabled:opacity-50">
                  {updateUser.isPending ? 'Saving…' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => setEditUser(null)} className="flex-1 py-2.5 bg-accent rounded-xl">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Activity Log Modal */}
      {activityUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2"><Activity className="w-5 h-5 text-primary" /> Activity — {activityUser.name}</h3>
              <button onClick={() => setActivityUser(null)} className="text-sm text-muted-foreground hover:text-foreground">Close</button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-2">
              {(activityData?.data || []).length === 0 && (
                <p className="text-center text-muted-foreground py-8">No activity logs found</p>
              )}
              {(activityData?.data || []).map(log => (
                <div key={log.id} className="flex gap-3 py-2 border-b border-border/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{log.action}</p>
                    <p className="text-xs text-muted-foreground truncate">{log.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{formatDateTime(log.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Staff Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-lg font-semibold mb-5">Add New Staff</h3>
            <form onSubmit={e => { e.preventDefault(); createUser.mutate(form); }} className="space-y-4">

              {/* Avatar upload */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-dashed border-primary/40 flex items-center justify-center overflow-hidden">
                    {avatarPreview
                      ? <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                      : <Camera className="w-8 h-8 text-primary/50" />
                    }
                  </div>
                  <label htmlFor="new-avatar" className="absolute bottom-0 right-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center cursor-pointer">
                    <Plus className="w-3 h-3 text-white" />
                  </label>
                  <input id="new-avatar" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </div>
              </div>
              <p className="text-center text-xs text-muted-foreground -mt-2">Upload photo (optional)</p>

              {[
                ['name', 'Full Name', 'text', true],
                ['email', 'Email (optional for PIN users)', 'email', false],
                ['phone', 'Phone', 'tel', false],
                ['address', 'Address', 'text', false],
                ['nationalId', 'National ID', 'text', false],
              ].map(([key, label, type, required]) => (
                <div key={key}>
                  <label className="block text-sm font-medium mb-1">{label}</label>
                  <input
                    type={type}
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    required={required}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Role</label>
                  <select value={form.role} onChange={e => handleRoleChange(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none">
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Employment Date</label>
                  <input type="date" value={form.employmentDate} onChange={e => setForm(f => ({ ...f, employmentDate: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none" />
                </div>
              </div>

              {/* Emergency contact — shown for ADMIN/MANAGER roles */}
              {['ADMIN', 'MANAGER'].includes(form.role) && (
                <div className="bg-accent/30 border border-border rounded-xl p-3 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Emergency Contact</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Contact Name</label>
                      <input type="text" value={form.emergencyContact || ''} onChange={e => setForm(f => ({ ...f, emergencyContact: e.target.value }))}
                        placeholder="Full name" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Contact Phone</label>
                      <input type="tel" value={form.emergencyPhone || ''} onChange={e => setForm(f => ({ ...f, emergencyPhone: e.target.value }))}
                        placeholder="+250 7xx xxx xxx" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                  </div>
                </div>
              )}

              {form.loginType === 'EMAIL_PASSWORD' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Password</label>
                  <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none" />
                </div>
              )}
              {form.loginType === 'PIN' && (
                <div>
                  <label className="block text-sm font-medium mb-1">PIN (4–6 digits)</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    pattern="[0-9]{4,6}"
                    value={form.pin}
                    onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '') }))}
                    required
                    placeholder="e.g. 1234"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Each staff member must have a unique PIN</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={createUser.isPending} className="flex-1 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50">
                  {createUser.isPending ? 'Creating...' : 'Create Staff'}
                </button>
                <button type="button" onClick={() => { setShowCreate(false); setAvatarFile(null); setAvatarPreview(null); }} className="flex-1 py-2.5 bg-accent rounded-xl font-medium">
                  Cancel
                </button>
              </div>
              {createUser.isError && <p className="text-red-400 text-sm">{createUser.error?.message}</p>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
