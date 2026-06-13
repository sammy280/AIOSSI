import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import { UtensilsCrossed, Delete, Loader2, ChefHat, Wine, UtensilsCrossed as Waiter } from 'lucide-react';
import { cn, getRoleColor } from '../../lib/utils';

const roleIcons = { WAITER: '🍽️', KITCHEN: '👨‍🍳', BAR: '🍺' };

export default function PinLogin() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/auth/pin-users').then(res => setUsers(res.data || [])).catch(() => {});
  }, []);

  const handlePinPress = (digit) => {
    if (pin.length < 6) setPin(p => p + digit);
  };

  const handleDelete = () => setPin(p => p.slice(0, -1));

  const handleSubmit = async () => {
    if (!selectedUser || pin.length < 4) return;
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/pin-login', { userId: selectedUser.id, pin });
      login(res.data.user, res.data.token);
      const roleMap = { WAITER: '/waiter', KITCHEN: '/kitchen', BAR: '/bar' };
      navigate(roleMap[res.data.user.role] || '/', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid PIN');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pin.length === 4 || pin.length === 6) handleSubmit();
  }, [pin]);

  const pinPad = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-4xl relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary shadow-lg shadow-primary/30 mb-4">
            <UtensilsCrossed className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">PIN Login</h1>
          <p className="text-muted-foreground text-sm">Select your profile and enter your PIN</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Staff selection */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wide">Select Staff</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => { setSelectedUser(u); setPin(''); setError(''); }}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                    selectedUser?.id === u.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 hover:bg-accent/50'
                  )}
                >
                  <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-xl shrink-0">
                    {roleIcons[u.role] || '👤'}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{u.name}</p>
                    <p className={cn('text-xs font-medium', getRoleColor(u.role))}>{u.role}</p>
                  </div>
                  {selectedUser?.id === u.id && (
                    <div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* PIN Pad */}
          <div className="bg-card border border-border rounded-2xl p-6">
            {selectedUser ? (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-accent mx-auto flex items-center justify-center text-3xl mb-2">
                    {roleIcons[selectedUser.role] || '👤'}
                  </div>
                  <p className="font-semibold">{selectedUser.name}</p>
                  <p className={cn('text-xs font-medium', getRoleColor(selectedUser.role))}>{selectedUser.role}</p>
                </div>

                {/* PIN dots */}
                <div className="flex justify-center gap-3 mb-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className={cn(
                      'w-4 h-4 rounded-full border-2 transition-all',
                      i < pin.length ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                    )} />
                  ))}
                </div>

                {error && <p className="text-destructive text-sm text-center mb-3">{error}</p>}

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-2">
                  {pinPad.map((key, i) => (
                    <button
                      key={i}
                      onClick={() => key === '⌫' ? handleDelete() : key !== '' ? handlePinPress(key) : null}
                      disabled={loading || key === ''}
                      className={cn(
                        'h-14 rounded-xl font-bold text-lg transition-all',
                        key === '' ? 'invisible' : '',
                        key === '⌫' ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' : 'bg-accent hover:bg-primary hover:text-white active:scale-95'
                      )}
                    >
                      {loading && key !== '⌫' ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : key}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <div className="text-5xl">👈</div>
                <p className="text-sm">Select a staff member</p>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Admin / Manager / Cashier?{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">Email Login →</Link>
        </p>
      </div>
    </div>
  );
}
