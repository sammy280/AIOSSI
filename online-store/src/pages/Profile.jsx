import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { User, Phone, Mail, MapPin, Star, Save, Loader2, LogOut } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const { customer, updateCustomer, logout } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    address: customer?.address || '',
  });
  const [changePw, setChangePw] = useState({ current: '', newPw: '', confirm: '' });
  const [tab, setTab] = useState('profile');

  const updateProfile = useMutation({
    mutationFn: () => api.put('/online/profile', form),
    onSuccess: (data) => { updateCustomer(data.data); toast.success('Profile updated!'); },
    onError: () => toast.error('Failed to update profile'),
  });

  const updatePassword = useMutation({
    mutationFn: () => api.put('/online/profile/password', { currentPassword: changePw.current, newPassword: changePw.newPw }),
    onSuccess: () => { toast.success('Password changed!'); setChangePw({ current: '', newPw: '', confirm: '' }); },
    onError: (err) => toast.error(err.message || 'Failed to change password'),
  });

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-black text-gray-900 mb-8">My Account</h1>

      {/* Profile Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 flex items-center gap-5">
        <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center shrink-0">
          <span className="text-2xl font-black text-brand">{customer?.name?.charAt(0) || 'C'}</span>
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900">{customer?.name}</h2>
          <p className="text-gray-500 text-sm">{customer?.email || customer?.phone}</p>
        </div>
        {/* Loyalty Points */}
        <div className="text-center bg-brand/5 border border-brand/20 rounded-2xl px-5 py-3">
          <div className="flex items-center gap-1 justify-center">
            <Star className="w-4 h-4 text-brand fill-brand" />
            <span className="text-2xl font-black text-brand">{customer?.loyaltyPoints || 0}</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">Loyalty Points</p>
          {customer?.loyaltyPoints > 0 && <p className="text-xs text-brand font-medium mt-0.5">≈ {formatCurrency(customer.loyaltyPoints * 100)} value</p>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[['profile', 'Profile Info'], ['password', 'Change Password']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === key ? 'bg-brand text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-brand'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-5">Personal Information</h3>
          <form onSubmit={e => { e.preventDefault(); updateProfile.mutate(); }} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input pl-10" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input pl-10" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input pl-10" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="input pl-10" placeholder="Your delivery address" />
                </div>
              </div>
            </div>
            <button type="submit" disabled={updateProfile.isPending} className="btn-primary flex items-center gap-2">
              {updateProfile.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Save className="w-4 h-4" />Save Changes</>}
            </button>
          </form>
        </div>
      )}

      {tab === 'password' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-5">Change Password</h3>
          <form onSubmit={e => {
            e.preventDefault();
            if (changePw.newPw !== changePw.confirm) { toast.error('Passwords do not match'); return; }
            updatePassword.mutate();
          }} className="space-y-4 max-w-sm">
            {[['current', 'Current Password'], ['newPw', 'New Password'], ['confirm', 'Confirm New Password']].map(([key, label]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input type="password" value={changePw[key]} onChange={e => setChangePw(c => ({ ...c, [key]: e.target.value }))} className="input" required />
              </div>
            ))}
            <button type="submit" disabled={updatePassword.isPending} className="btn-primary flex items-center gap-2">
              {updatePassword.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Update Password
            </button>
          </form>
        </div>
      )}

      {/* Logout */}
      <div className="mt-6">
        <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 font-medium px-4 py-2 rounded-xl hover:bg-red-50 transition-colors">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );
}
