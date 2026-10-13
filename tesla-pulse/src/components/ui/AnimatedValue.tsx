/**
 * Smoothly animates number changes instead of snapping.
 * Uses CSS transitions via state interpolation.
 */
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  value: number;
  decimals?: number;
  unit?: string;
  className?: string;
  flash?: boolean; // flashes accent color on change
}

export function AnimatedValue({ value, decimals = 1, unit, className, flash = true }: Props) {
  const [display, setDisplay] = useState(value);
  const [flashing, setFlashing] = useState(false);
  const prev = useRef(value);

  useEffect(() => {
    if (value === prev.current) return;
    prev.current = value;

    // Simple animation: step toward target over 400ms
    const steps = 20;
    const start = display;
    const diff = value - start;
    let step = 0;

    const id = setInterval(() => {
      step++;
      setDisplay(parseFloat((start + (diff * step) / steps).toFixed(decimals)));
      if (step >= steps) clearInterval(id);
    }, 20);

    if (flash) {
      setFlashing(true);
      setTimeout(() => setFlashing(false), 600);
    }

    return () => clearInterval(id);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span className={cn('transition-colors duration-300', flashing && 'text-electric-400', className)}>
      {display.toFixed(decimals)}
      {unit && <span className="text-xs ml-1 opacity-60">{unit}</span>}
    </span>
  );
}
