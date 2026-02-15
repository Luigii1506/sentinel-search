import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Bell,
  StickyNote,
  Play,
  Download,
  Calendar,
  Clock,
  Shield,
  Globe,
  Flag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { RiskScoreGauge } from '@/components/risk/RiskScoreGauge';
import { cn, getInitials, formatDateTime, getSourceBadgeClass } from '@/lib/utils';
import type { Entity } from '@/types';

interface RiskSummaryHeaderProps {
  entity: Entity;
  onStartInvestigation?: () => void;
  onExportReport?: () => void;
  onAddToMonitoring?: () => void;
  onAddNote?: () => void;
  className?: string;
}

export function RiskSummaryHeader({
  entity,
  onStartInvestigation,
  onExportReport,
  onAddToMonitoring,
  onAddNote,
  className,
}: RiskSummaryHeaderProps) {
  const hasSanctions = entity.sanctions.length > 0;
  const hasPep = entity.pepEntries.length > 0;
  const hasAdverseMedia = entity.adverseMedia.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn('relative overflow-hidden', className)}
    >
      {/* Background gradient based on risk */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          background: `radial-gradient(ellipse at top right, ${
            entity.riskLevel === 'critical'
              ? '#ef4444'
              : entity.riskLevel === 'high'
              ? '#f97316'
              : entity.riskLevel === 'medium'
              ? '#eab308'
              : '#22c55e'
          }, transparent 60%)`,
        }}
      />

      <div className="relative glass rounded-2xl p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left: Entity Info */}
          <div className="flex-1">
            {/* Header Row */}
            <div className="flex flex-wrap items-start gap-4 mb-4">
              <Avatar className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
                <AvatarFallback className="text-xl font-bold text-white bg-transparent">
                  {getInitials(entity.primaryName)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-2xl lg:text-3xl font-semibold text-white truncate">
                    {entity.primaryName}
                  </h1>
                  <Badge className={cn('capitalize', getRiskColorClass(entity.riskLevel))}>
                    {entity.riskLevel}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                  <span className="capitalize flex items-center gap-1">
                    {entity.type === 'person' && <span className="text-blue-400">●</span>}
                    {entity.type === 'company' && <span className="text-purple-400">●</span>}
                    {entity.type === 'vessel' && <span className="text-cyan-400">●</span>}
                    {entity.type === 'aircraft' && <span className="text-amber-400">●</span>}
                    {entity.type === 'organization' && <span className="text-red-400">●</span>}
                    {entity.type}
                  </span>

                  {entity.nationalities && entity.nationalities.length > 0 && (
                    <>
                      <span className="text-gray-600">•</span>
                      <span className="flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5" />
                        {entity.nationalities.join(', ')}
                      </span>
                    </>
                  )}

                  {entity.dateOfBirth && (
                    <>
                      <span className="text-gray-600">•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(entity.dateOfBirth).toLocaleDateString()}
                      </span>
                    </>
                  )}

                  {entity.incorporationDate && (
                    <>
                      <span className="text-gray-600">•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Inc. {new Date(entity.incorporationDate).toLocaleDateString()}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Aliases */}
            {entity.aliases.length > 0 && (
              <div className="mb-4">
                <span className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
                  Also Known As
                </span>
                <div className="flex flex-wrap gap-2">
                  {entity.aliases.slice(0, 5).map((alias, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="bg-white/5 border-white/10 text-gray-300"
                    >
                      {alias.name}
                    </Badge>
                  ))}
                  {entity.aliases.length > 5 && (
                    <Badge variant="outline" className="bg-white/5 border-white/10 text-gray-500">
                      +{entity.aliases.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Data Sources */}
            <div className="mb-6">
              <span className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
                Data Sources
              </span>
              <div className="flex flex-wrap gap-1.5">
                {entity.dataSources.map((source) => (
                  <span
                    key={source}
                    className={cn('text-[10px] px-2 py-1 rounded border', getSourceBadgeClass(source))}
                  >
                    {source}
                  </span>
                ))}
              </div>
            </div>

            {/* Alert Indicators */}
            <div className="flex flex-wrap gap-3">
              {hasSanctions && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30"
                >
                  <Shield className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-400">
                    {entity.sanctions.length} Sanction{entity.sanctions.length > 1 ? 's' : ''}
                  </span>
                </motion.div>
              )}

              {hasPep && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-pink-500/10 border border-pink-500/30"
                >
                  <Flag className="w-4 h-4 text-pink-500" />
                  <span className="text-sm text-pink-400">PEP</span>
                </motion.div>
              )}

              {hasAdverseMedia && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/30"
                >
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span className="text-sm text-orange-400">
                    {entity.adverseMedia.length} Media Alert{entity.adverseMedia.length > 1 ? 's' : ''}
                  </span>
                </motion.div>
              )}
            </div>

            {/* Last Updated */}
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
              <Clock className="w-3.5 h-3.5" />
              <span>Last updated: {formatDateTime(entity.lastUpdated)}</span>
            </div>
          </div>

          {/* Right: Risk Score & Actions */}
          <div className="flex flex-col items-center lg:items-end gap-6">
            {/* Risk Score Gauge */}
            <div className="flex flex-col items-center">
              <RiskScoreGauge
                score={entity.overallRiskScore}
                size="lg"
                showLabel
                showValue
                animated
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center lg:justify-end gap-2">
              <Button
                onClick={onStartInvestigation}
                className="btn-primary gap-2"
              >
                <Play className="w-4 h-4" />
                Start Investigation
              </Button>

              <Button
                variant="outline"
                onClick={onExportReport}
                className="gap-2 border-white/10 hover:bg-white/10"
              >
                <Download className="w-4 h-4" />
                Export Report
              </Button>

              <Button
                variant="outline"
                onClick={onAddToMonitoring}
                className="gap-2 border-white/10 hover:bg-white/10"
              >
                <Bell className="w-4 h-4" />
                Monitor
              </Button>

              <Button
                variant="outline"
                onClick={onAddNote}
                className="gap-2 border-white/10 hover:bg-white/10"
              >
                <StickyNote className="w-4 h-4" />
                Add Note
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function getRiskColorClass(riskLevel: string): string {
  switch (riskLevel) {
    case 'critical':
      return 'bg-red-500/15 text-red-500 border-red-500/30';
    case 'high':
      return 'bg-orange-500/15 text-orange-500 border-orange-500/30';
    case 'medium':
      return 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30';
    case 'low':
      return 'bg-green-500/15 text-green-500 border-green-500/30';
    default:
      return 'bg-gray-500/15 text-gray-500 border-gray-500/30';
  }
}

export default RiskSummaryHeader;
