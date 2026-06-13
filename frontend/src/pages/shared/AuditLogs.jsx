import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import PageHeader from '../../components/shared/PageHeader';
import { formatDateTime, getRoleColor, cn } from '../../lib/utils';
import { useState } from 'react';

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const { data } = useQuery({ queryKey: ['audit-logs', page], queryFn: () => api.get(`/audit-logs?page=${page}&limit=50`) });
  const logs = data?.data || [];
  const total = data?.meta?.total || 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Logs" subtitle={`${total} total actions`} />
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-accent/50 border-b border-border">
            <tr>{['User', 'Role', 'Action', 'Description', 'IP', 'Time'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} className="border-b border-border/50 hover:bg-accent/30">
                <td className="px-4 py-3 font-medium">{log.user?.name || 'System'}</td>
                <td className="px-4 py-3"><span className={cn('text-xs font-semibold', getRoleColor(log.role))}>{log.role}</span></td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-mono">{log.action}</span></td>
                <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{log.description}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{log.ipAddress}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{formatDateTime(log.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Page {page} of {Math.ceil(total / 50)}</p>
        <div className="flex gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 bg-accent rounded-lg text-sm disabled:opacity-50">← Prev</button>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 50)} className="px-3 py-1.5 bg-accent rounded-lg text-sm disabled:opacity-50">Next →</button>
        </div>
      </div>
    </div>
  );
}
