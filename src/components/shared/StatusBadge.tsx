import { cn } from '@/lib/utils';

type StatusType = 'active' | 'inactive' | 'available' | 'assigned' | 'repair' | 'scrapped';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  active: { label: 'Active', className: 'badge-active' },
  inactive: { label: 'Inactive', className: 'badge-inactive' },
  available: { label: 'Available', className: 'badge-available' },
  assigned: { label: 'Assigned', className: 'badge-assigned' },
  repair: { label: 'In Repair', className: 'badge-repair' },
  scrapped: { label: 'Scrapped', className: 'badge-scrapped' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span className={cn('badge-status', config.className, className)}>
      {config.label}
    </span>
  );
}
