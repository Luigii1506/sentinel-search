import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { cn, getRiskColor } from '@/lib/utils';
import type { RiskFactor } from '@/types';

interface RiskBreakdownChartProps {
  riskFactors: RiskFactor[];
  variant?: 'radar' | 'bar';
  className?: string;
}

const categoryLabels: Record<string, string> = {
  sanctions: 'Sanctions',
  pep: 'PEP',
  adverse_media: 'Adverse Media',
  geographic: 'Geographic',
  network: 'Network',
  transactional: 'Transactional',
};

export function RiskBreakdownChart({
  riskFactors,
  variant = 'radar',
  className,
}: RiskBreakdownChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Prepare data for charts
  const chartData = riskFactors.map((factor) => ({
    category: categoryLabels[factor.category] || factor.category,
    score: factor.score,
    fullMark: 100,
    color: getRiskColor(factor.level),
    details: factor.details,
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof chartData[0] }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="glass p-3 rounded-lg border border-white/10">
          <p className="font-medium text-white">{data.category}</p>
          <p className="text-2xl font-bold" style={{ color: data.color }}>
            {Math.round(data.score)}
          </p>
          {data.details && (
            <p className="text-xs text-gray-400 mt-1">{data.details}</p>
          )}
        </div>
      );
    }
    return null;
  };

  if (variant === 'radar') {
    return (
      <div className={cn('w-full h-full min-h-[300px]', className)}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
            <PolarGrid
              stroke="rgba(255, 255, 255, 0.1)"
              radialLines={true}
            />
            <PolarAngleAxis
              dataKey="category"
              tick={{ fill: '#a0a0a0', fontSize: 11 }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ fill: '#6a6a6a', fontSize: 10 }}
              tickCount={6}
              stroke="rgba(255, 255, 255, 0.05)"
            />
            <Radar
              name="Risk Score"
              dataKey="score"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="#3b82f6"
              fillOpacity={0.2}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className={cn('w-full h-full min-h-[250px]', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
        >
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: '#6a6a6a', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
            tickLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
          />
          <YAxis
            type="category"
            dataKey="category"
            tick={{ fill: '#a0a0a0', fontSize: 12 }}
            axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
            tickLine={false}
            width={90}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }} />
          <Bar
            dataKey="score"
            radius={[0, 4, 4, 0]}
            onMouseEnter={(_, index) => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                opacity={hoveredIndex === null || hoveredIndex === index ? 1 : 0.5}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Risk Factor Card Component
interface RiskFactorCardProps {
  factor: RiskFactor;
  index?: number;
}

export function RiskFactorCard({ factor, index = 0 }: RiskFactorCardProps) {
  const color = getRiskColor(factor.level);
  const label = categoryLabels[factor.category] || factor.category;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="glass rounded-xl p-4 hover:bg-white/[0.03] transition-colors"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-400">{label}</span>
        <span
          className="text-lg font-bold"
          style={{ color }}
        >
          {Math.round(factor.score)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-2">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${factor.score}%` }}
          transition={{ delay: index * 0.1 + 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      {factor.details && (
        <p className="text-xs text-gray-500">{factor.details}</p>
      )}

      <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
        <span className="capitalize" style={{ color }}>
          {factor.level} Risk
        </span>
        <span>Updated {new Date(factor.lastUpdated).toLocaleDateString()}</span>
      </div>
    </motion.div>
  );
}

export default RiskBreakdownChart;
