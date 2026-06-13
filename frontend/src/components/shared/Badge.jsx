import { cn, getStatusColor } from '../../lib/utils';

export default function Badge({ status, children, className }) {
  return (
    <span className={cn('badge-status border', getStatusColor(status), className)}>
      {children || status?.replace(/_/g, ' ')}
    </span>
  );
}
