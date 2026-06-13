import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import PageHeader from '../../components/shared/PageHeader';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { Save, Database, Moon, Sun, Bell, Shield, Store, DollarSign, Download, RefreshCw, CheckCircle } from 'lucide-react';
import { cn, formatDateTime } from '../../lib/utils';
import { toast } from 'react-hot-toast';

const Section = ({ icon: Icon, title, children }) => (
  <div className="bg-card border border-border rounded-xl p-6 space-y-4">
    <div className="flex items-center gap-3 pb-3 border-b border-border">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <h3 className="font-semibold">{title}</h3>
    </div>
    {children}
  </div>
);

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'ADMIN';

  const { data } = useQuery({ queryKey: ['settings'], queryFn: () => api.get('/settings') });
  const { data: backups } = useQuery({ queryKey: ['backups'], queryFn: () => api.get('/backups'), enabled: isAdmin });

  const [settings, setSettings] = useState({
    restaurantName: '', address: '', phone: '', email: '',
    taxRate: 0, deliveryFee: 1000, loyaltyRate: 1000,
    currency: 'RWF', receiptFooter: '', autoBackup: true,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data?.data) setSettings(prev => ({ ...prev, ...data.data }));
  }, [data]);

  const updateSettings = useMutation({
    mutationFn: d => api.put('/settings', d),
    onSuccess: () => { qc.invalidateQueries(['settings']); setSaved(true); setTimeout(() => setSaved(false), 3000); },
  });

  const createBackup = useMutation({
    mutationFn: () => api.post('/backups'),
    onSuccess: () => { qc.invalidateQueries(['backups']); toast.success('Backup created successfully'); },
  });

  const Field = ({ label, name, type = 'text', ...props }) => (
    <div>
      <label className="block text-sm font-medium mb-1 text-muted-foreground">{label}</label>
      <input
        type={type}
        value={settings[name] ?? ''}
        onChange={e => setSettings(s => ({ ...s, [name]: type === 'number' ? Number(e.target.value) : e.target.value }))}
        disabled={!isAdmin}
        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
        {...props}
      />
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title="System Settings" subtitle="Configure your restaurant ERP settings" />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Restaurant Info */}
        <Section icon={Store} title="Restaurant Information">
          <div className="space-y-3">
            <Field label="Restaurant Name" name="restaurantName" placeholder="Sammy's Restaurant & Bar" />
            <Field label="Address" name="address" placeholder="123 Main Street, Kigali" />
            <Field label="Phone Number" name="phone" placeholder="+250 788 000 000" />
            <Field label="Email" name="email" type="email" placeholder="info@sammy.rw" />
          </div>
        </Section>

        {/* Financial Settings */}
        <Section icon={DollarSign} title="Financial Settings">
          <div className="space-y-3">
            <Field label="Currency" name="currency" placeholder="RWF" />
            <Field label="Tax Rate (%)" name="taxRate" type="number" min="0" max="100" />
            <Field label="Delivery Fee (RWF)" name="deliveryFee" type="number" min="0" />
            <Field label="Loyalty Points Rate (RWF per point)" name="loyaltyRate" type="number" min="1" />
          </div>
        </Section>

        {/* Appearance */}
        <Section icon={Sun} title="Appearance">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-sm">Dark Mode</p>
              <p className="text-xs text-muted-foreground">Toggle between light and dark theme</p>
            </div>
            <button
              onClick={toggleTheme}
              className={cn('relative w-12 h-6 rounded-full transition-colors', theme === 'dark' ? 'bg-primary' : 'bg-border')}
            >
              <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform', theme === 'dark' && 'translate-x-6')} />
            </button>
          </div>
          <div className="flex gap-3">
            <div onClick={() => toggleTheme()} className={cn('flex-1 border-2 rounded-xl p-4 cursor-pointer text-center transition-all', theme === 'light' ? 'border-primary bg-primary/5' : 'border-border')}>
              <Sun className="w-6 h-6 mx-auto mb-1 text-yellow-500" />
              <p className="text-sm font-medium">Light</p>
            </div>
            <div onClick={() => theme === 'light' && toggleTheme()} className={cn('flex-1 border-2 rounded-xl p-4 cursor-pointer text-center transition-all', theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border')}>
              <Moon className="w-6 h-6 mx-auto mb-1 text-blue-400" />
              <p className="text-sm font-medium">Dark</p>
            </div>
          </div>
        </Section>

        {/* Receipt Settings */}
        <Section icon={Bell} title="Receipt & Notifications">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">Receipt Footer Message</label>
              <textarea
                value={settings.receiptFooter}
                onChange={e => setSettings(s => ({ ...s, receiptFooter: e.target.value }))}
                disabled={!isAdmin}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                rows={3}
                placeholder="Thank you for dining with us!"
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">Sound Notifications</p>
                <p className="text-xs text-muted-foreground">Play beep on new notifications</p>
              </div>
              <div className="w-10 h-5 rounded-full bg-primary relative cursor-not-allowed">
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-white rounded-full shadow" />
              </div>
            </div>
          </div>
        </Section>
      </div>

      {/* Backup & Security — Admin only */}
      {isAdmin && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Section icon={Database} title="Database Backup">
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">Auto Backup</p>
                  <p className="text-xs text-muted-foreground">Automatic daily database backups</p>
                </div>
                <button
                  onClick={() => setSettings(s => ({ ...s, autoBackup: !s.autoBackup }))}
                  className={cn('relative w-12 h-6 rounded-full transition-colors', settings.autoBackup ? 'bg-primary' : 'bg-border')}
                >
                  <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform', settings.autoBackup && 'translate-x-6')} />
                </button>
              </div>
              <button
                onClick={() => createBackup.mutate()}
                disabled={createBackup.isPending}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl text-sm font-medium hover:bg-blue-500/20 transition-colors disabled:opacity-50"
              >
                {createBackup.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {createBackup.isPending ? 'Creating Backup...' : 'Create Backup Now'}
              </button>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {(backups?.data || []).slice(0, 5).map(b => (
                  <div key={b.id} className="flex items-center justify-between text-xs p-2 bg-accent/50 rounded-lg">
                    <span className="text-muted-foreground">{formatDateTime(b.createdAt)}</span>
                    <span className="text-green-400 font-medium">{b.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          <Section icon={Shield} title="Security">
            <div className="space-y-3 text-sm">
              {[
                { label: 'Max Failed Login Attempts', value: '5 attempts' },
                { label: 'Account Lockout Duration', value: '15 minutes' },
                { label: 'Email Session Expiry', value: '7 days' },
                { label: 'PIN Session Expiry', value: '12 hours' },
                { label: 'JWT Algorithm', value: 'HS256' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* Save Button — Admin only */}
      {isAdmin && (
        <div className="flex items-center gap-4">
          <button
            onClick={() => updateSettings.mutate(settings)}
            disabled={updateSettings.isPending}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {updateSettings.isPending ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
          </button>
          {saved && <p className="text-sm text-green-400">Settings updated successfully</p>}
        </div>
      )}

      {!isAdmin && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <p className="text-sm text-yellow-400">⚠️ Only Admins can modify system settings. Contact Mory Kaba or Nestor for changes.</p>
        </div>
      )}
    </div>
  );
}
