import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import PageHeader from '../../components/shared/PageHeader';
import Badge from '../../components/shared/Badge';
import { cn } from '../../lib/utils';
import { useEffect } from 'react';
import { getSocket } from '../../lib/socket';
import { useQueryClient } from '@tanstack/react-query';

const tableColors = { AVAILABLE: 'border-green-500/50 bg-green-500/5 text-green-400', OCCUPIED: 'border-red-500/50 bg-red-500/5 text-red-400', WAITING_PAYMENT: 'border-orange-500/50 bg-orange-500/5 text-orange-400', CLOSED: 'border-border' };

export default function TablesPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['tables'], queryFn: () => api.get('/tables'), refetchInterval: 15000 });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.on('table:updated', () => qc.invalidateQueries(['tables']));
    socket.on('order:new', () => qc.invalidateQueries(['tables']));
    return () => { socket.off('table:updated'); socket.off('order:new'); };
  }, []);

  const tables = data?.data || [];
  const stats = { available: tables.filter(t => t.status === 'AVAILABLE').length, occupied: tables.filter(t => t.status === 'OCCUPIED').length, waiting: tables.filter(t => t.status === 'WAITING_PAYMENT').length };

  return (
    <div className="space-y-6">
      <PageHeader title="Table Management" />
      <div className="flex gap-4 text-sm">
        <span className="px-3 py-1.5 bg-green-500/10 text-green-400 rounded-xl font-semibold">✓ {stats.available} Available</span>
        <span className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-xl font-semibold">● {stats.occupied} Occupied</span>
        <span className="px-3 py-1.5 bg-orange-500/10 text-orange-400 rounded-xl font-semibold">💳 {stats.waiting} Waiting Payment</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tables.map(table => (
          <div key={table.id} className={cn('rounded-2xl border-2 p-5 space-y-3 transition-all', tableColors[table.status] || 'border-border')}>
            <div className="flex items-center justify-between">
              <span className="text-4xl font-black">{table.name}</span>
              <Badge status={table.status} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {table.seats?.map(seat => (
                <div key={seat.id} className={cn('w-10 h-10 rounded-lg border-2 text-xs font-bold flex items-center justify-center', seat.isOccupied ? 'border-red-500/50 bg-red-500/10 text-red-400' : 'border-green-500/50 bg-green-500/10 text-green-400')}>
                  {seat.label}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{table.seats?.filter(s => s.isOccupied).length}/{table.seats?.length} occupied</p>
          </div>
        ))}
      </div>
    </div>
  );
}
