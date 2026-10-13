import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  glow?: 'safe' | 'warning' | 'fault' | 'blue' | null;
  onClick?: () => void;
}

const glowMap = {
  safe: 'shadow-[0_0_15px_rgba(34,197,94,0.3)] border-safe/40',
  warning: 'shadow-[0_0_15px_rgba(245,158,11,0.3)] border-warning/40',
  fault: 'shadow-[0_0_25px_rgba(239,68,68,0.45)] border-fault/50',
  blue: 'shadow-[0_0_15px_rgba(14,165,233,0.3)] border-electric-500/40',
};

export function GlassCard({ children, className, glow, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl border bg-white/5 backdrop-blur-sm transition-all duration-500',
        glow ? glowMap[glow] : 'border-white/10',
        className
      )}
    >
      {children}
    </div>
  );
}
