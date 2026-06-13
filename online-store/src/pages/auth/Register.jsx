import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import { ChefHat, Eye, EyeOff, Loader2, User, Mail, Phone, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: () => api.post('/online/register', {
      name: form.name, email: form.email, phone: form.phone, password: form.password,
    }),
    onSuccess: (data) => {
      login(data.data.customer, data.data.token);
      toast.success(`Welcome to Sammy's, ${data.data.customer.name}!`);
      navigate('/');
    },
    onError: (err) => toast.error(err.message || 'Registration failed. Try again.'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    mutation.mutate();
  };

  const Field = ({ label, name, type = 'text', icon: Icon, placeholder }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />}
        <input
          type={type}
          value={form[name]}
          onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
          placeholder={placeholder}
          required
          className={`input ${Icon ? 'pl-10' : ''}`}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ChefHat className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-gray-900">Create Account</h1>
          <p className="text-gray-500 mt-1">Join Sammy's and start ordering today</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Full Name" name="name" icon={User} placeholder="Your full name" />
            <Field label="Email Address" name="email" type="email" icon={Mail} placeholder="you@example.com" />
            <Field label="Phone Number" name="phone" icon={Phone} placeholder="+250 7XX XXX XXX" />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min. 6 characters"
                  required
                  className="input pl-10 pr-11"
                />
                <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  placeholder="Repeat your password"
                  required
                  className="input pl-10"
                />
              </div>
            </div>

            {/* Loyalty points teaser */}
            <div className="bg-brand/5 border border-brand/20 rounded-xl p-3 text-sm text-gray-600 flex items-start gap-2">
              <span className="text-brand text-base">⭐</span>
              <p>Earn <strong className="text-brand">loyalty points</strong> with every order — 1 point per 1,000 RWF spent!</p>
            </div>

            <button type="submit" disabled={mutation.isPending} className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-base mt-2">
              {mutation.isPending ? <><Loader2 className="w-5 h-5 animate-spin" /> Creating Account...</> : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-brand font-semibold hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
