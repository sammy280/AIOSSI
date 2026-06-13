import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import PageHeader from '../../components/shared/PageHeader';
import { formatCurrency, formatDate, getInitials } from '../../lib/utils';

export default function CustomersPage() {
  const { data } = useQuery({ queryKey: ['customers'], queryFn: () => api.get('/customers') });
  const customers = data?.data || [];
  return (
    <div className="space-y-6">
      <PageHeader title="Customer Management" subtitle={`${customers.length} customers`} />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map(c => (
          <div key={c.id} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center"><span className="text-sm font-bold text-primary">{getInitials(c.name || '?')}</span></div>
              <div><p className="font-semibold">{c.name || 'Guest'}</p><p className="text-xs text-muted-foreground">{c.phone || c.email}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-accent/50 rounded-lg p-2"><p className="text-lg font-bold text-primary">{formatCurrency(c.totalSpent)}</p><p className="text-xs text-muted-foreground">Total Spent</p></div>
              <div className="bg-accent/50 rounded-lg p-2"><p className="text-lg font-bold text-yellow-400">{c.loyaltyPoints}</p><p className="text-xs text-muted-foreground">Points</p></div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Last visit: {formatDate(c.lastVisit)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
