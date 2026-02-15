import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn, getRiskColor, getRiskLabel } from '@/lib/utils';
import type { RiskLevel } from '@/types';

interface RiskScoreGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  showValue?: boolean;
  animated?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { width: 80, strokeWidth: 8, fontSize: 20, labelSize: 10 },
  md: { width: 120, strokeWidth: 12, fontSize: 28, labelSize: 12 },
  lg: { width: 160, strokeWidth: 16, fontSize: 36, labelSize: 14 },
  xl: { width: 200, strokeWidth: 20, fontSize: 44, labelSize: 16 },
};

export function RiskScoreGauge({
  score,
  size = 'md',
  showLabel = true,
  showValue = true,
  animated = true,
  className,
}: RiskScoreGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const config = sizeConfig[size];
  const radius = (config.width - config.strokeWidth) / 2;
  const circumference = radius * Math.PI; // Half circle
  const center = config.width / 2;

  const riskLevel: RiskLevel =
    score >= 80 ? 'critical' : score >= 60 ? 'high' : score >= 40 ? 'medium' : score >= 20 ? 'low' : 'none';

  const color = getRiskColor(riskLevel);
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  useEffect(() => {
    if (animated) {
      const duration = 1000;
      const steps = 60;
      const increment = score / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= score) {
          setAnimatedScore(score);
          clearInterval(timer);
        } else {
          setAnimatedScore(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    } else {
      setAnimatedScore(score);
    }
  }, [score, animated]);

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="relative" style={{ width: config.width, height: config.width / 2 + 10 }}>
        <svg
          width={config.width}
          height={config.width / 2 + 10}
          viewBox={`0 0 ${config.width} ${config.width / 2 + 10}`}
          className="transform -rotate-90"
        >
          {/* Background arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={0}
            style={{
              transformOrigin: 'center',
              transform: 'rotate(180deg)',
            }}
          />

          {/* Progress arc */}
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: strokeDashoffset }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            style={{
              transformOrigin: 'center',
              transform: 'rotate(180deg)',
              filter: `drop-shadow(0 0 ${config.strokeWidth / 2}px ${color}40)`,
            }}
          />
        </svg>

        {/* Center content */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-end pb-2"
          style={{
            width: config.width,
            height: config.width / 2 + 10,
          }}
        >
          {showValue && (
            <motion.span
              className="font-bold text-white"
              style={{ fontSize: config.fontSize, lineHeight: 1 }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              {animatedScore}
            </motion.span>
          )}
        </div>
      </div>

      {/* Label */}
      {showLabel && (
        <motion.div
          className="mt-2 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          <span
            className="font-semibold uppercase tracking-wider"
            style={{
              fontSize: config.labelSize,
              color,
            }}
          >
            {getRiskLabel(riskLevel)}
          </span>
        </motion.div>
      )}
    </div>
  );
}

export default RiskScoreGauge;
