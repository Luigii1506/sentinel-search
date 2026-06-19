/**
 * CountUp — animates a number from 0 to `to` on mount.
 *
 * Used for hero / dashboard KPIs where a number ticking up reads as
 * premium. Honors prefers-reduced-motion (renders the final value
 * immediately). Pass a `format` fn for compact / decimal / locale output.
 */
import { useEffect, useState } from 'react';
import { animate, useMotionValue, useReducedMotion } from 'framer-motion';

export function CountUp({
  to,
  duration = 1.2,
  prefix = '',
  suffix = '',
  format,
  className,
}: {
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  /** Map the in-flight numeric value to its display string. */
  format?: (v: number) => string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const fmt = format ?? ((v: number) => Math.round(v).toLocaleString('es-MX'));
  const [text, setText] = useState(() => fmt(reduce ? to : 0));

  useEffect(() => {
    if (reduce) {
      setText(fmt(to));
      return;
    }
    const controls = animate(mv, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setText(fmt(v)),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, reduce]);

  return (
    <span className={className}>
      {prefix}
      {text}
      {suffix}
    </span>
  );
}
