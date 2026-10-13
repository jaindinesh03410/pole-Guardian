import { cn } from '@/lib/utils';

interface Props {
  status: 'online' | 'offline' | 'fault' | 'warning';
  className?: string;
}

const colorMap = {
  online: 'bg-safe',
  offline: 'bg-gray-500',
  fault: 'bg-fault',
  warning: 'bg-warning',
};

export function LiveDot({ status, className }: Props) {
  const isLive = status !== 'offline';
  return (
    <span className={cn('relative inline-flex h-2.5 w-2.5', className)}>
      {isLive && (
        <span
          className={cn(
            'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
            colorMap[status]
          )}
        />
      )}
      <span className={cn('relative inline-flex rounded-full h-2.5 w-2.5', colorMap[status])} />
    </span>
  );
}
