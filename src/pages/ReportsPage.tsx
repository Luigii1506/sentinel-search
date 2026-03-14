import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  AlertTriangle,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  TrendingUp,
  Eye,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { complianceService } from '@/services/compliance';
import type { ComplianceReport } from '@/services/compliance';

const severityColors: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const statusLabels: Record<string, string> = {
  open: 'Abiertos',
  in_review: 'En Revisión',
  escalated: 'Escalados',
  closed_tp: 'Cerrados (TP)',
  closed_fp: 'Cerrados (FP)',
  closed_inconclusive: 'Inconclusos',
  sar_filed: 'SAR Reportado',
};

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: typeof BarChart3;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className={cn('p-2 rounded-lg', color || 'bg-blue-500/20')}>
          <Icon className="w-4 h-4 text-blue-400" />
        </div>
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

export default function ReportsPage() {
  const [period, setPeriod] = useState('30');

  const { data: report, isLoading } = useQuery<ComplianceReport>({
    queryKey: ['compliance-report', period],
    queryFn: () => complianceService.getComplianceReport(parseInt(period)),
    staleTime: 60_000,
  });

  const handleExport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-report-${period}d-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="pt-24 px-8 max-w-7xl mx-auto">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 px-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            Reportes de Compliance
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            KPIs y métricas del sistema PLD/AML
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px] bg-gray-800 border-gray-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 días</SelectItem>
              <SelectItem value="30">Últimos 30 días</SelectItem>
              <SelectItem value="90">Últimos 90 días</SelectItem>
              <SelectItem value="365">Último año</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!report}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {report && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={AlertTriangle}
              label="Alertas Generadas"
              value={report.alerts.total}
              sub={`${period} días`}
              color="bg-red-500/20"
            />
            <StatCard
              icon={Shield}
              label="Casos Creados"
              value={report.cases.total}
              sub={`${report.cases.closed} cerrados`}
              color="bg-blue-500/20"
            />
            <StatCard
              icon={CheckCircle}
              label="SLA Compliance"
              value={`${report.cases.sla_compliance_pct}%`}
              sub={`${report.cases.sla_breached} incumplidos`}
              color={report.cases.sla_compliance_pct >= 90 ? 'bg-green-500/20' : 'bg-red-500/20'}
            />
            <StatCard
              icon={XCircle}
              label="Tasa Falsos Positivos"
              value={`${report.decisions.fp_rate_pct}%`}
              sub={`${report.decisions.total} decisiones`}
              color={report.decisions.fp_rate_pct <= 30 ? 'bg-green-500/20' : 'bg-yellow-500/20'}
            />
          </div>

          {/* Detail Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Alertas por Severidad */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Alertas por Severidad
              </h3>
              <div className="space-y-3">
                {Object.entries(report.alerts.by_severity).map(([severity, count]) => (
                  <div key={severity} className="flex items-center justify-between">
                    <Badge variant="outline" className={cn('text-xs', severityColors[severity])}>
                      {severity.toUpperCase()}
                    </Badge>
                    <div className="flex-1 mx-4">
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', {
                            'bg-red-500': severity === 'critical',
                            'bg-orange-500': severity === 'high',
                            'bg-yellow-500': severity === 'medium',
                            'bg-blue-500': severity === 'low',
                          })}
                          style={{ width: `${Math.min((count / Math.max(report.alerts.total, 1)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-mono text-white w-12 text-right">{count}</span>
                  </div>
                ))}
                {Object.keys(report.alerts.by_severity).length === 0 && (
                  <p className="text-sm text-gray-500">Sin alertas en el período</p>
                )}
              </div>
            </div>

            {/* Casos por Estado */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Casos por Estado
              </h3>
              <div className="space-y-3">
                {Object.entries(report.cases.by_status).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm text-gray-400 w-32">{statusLabels[status] || status}</span>
                    <div className="flex-1 mx-4">
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${Math.min((count / Math.max(report.cases.total, 1)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-mono text-white w-12 text-right">{count}</span>
                  </div>
                ))}
                {Object.keys(report.cases.by_status).length === 0 && (
                  <p className="text-sm text-gray-500">Sin casos en el período</p>
                )}
              </div>
            </div>

            {/* Decisiones */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Decisiones de Analistas
              </h3>
              {report.decisions.total > 0 ? (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1 bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-400">{report.decisions.true_positive}</div>
                      <div className="text-xs text-gray-400 mt-1">Verdaderos Positivos</div>
                    </div>
                    <div className="flex-1 bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-red-400">{report.decisions.false_positive}</div>
                      <div className="text-xs text-gray-400 mt-1">Falsos Positivos</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-sm text-gray-400">FP Rate: </span>
                    <span className={cn('text-lg font-bold', {
                      'text-green-400': report.decisions.fp_rate_pct <= 30,
                      'text-yellow-400': report.decisions.fp_rate_pct > 30 && report.decisions.fp_rate_pct <= 60,
                      'text-red-400': report.decisions.fp_rate_pct > 60,
                    })}>
                      {report.decisions.fp_rate_pct}%
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Sin decisiones en el período</p>
              )}
            </div>

            {/* Métricas Operativas */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Métricas Operativas
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Tiempo promedio resolución</span>
                  <span className="text-sm font-mono text-white">
                    {report.cases.avg_resolution_hours
                      ? `${report.cases.avg_resolution_hours}h`
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">SARs presentados</span>
                  <span className="text-sm font-mono text-white">{report.cases.sar_filed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Entidades monitoreadas</span>
                  <span className="text-sm font-mono text-white">{report.monitoring.watchlist_active}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Whitelist activas</span>
                  <span className="text-sm font-mono text-white">{report.monitoring.whitelist_active}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Entities */}
          {report.top_entities.length > 0 && (
            <div className="mt-6 bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Top Entidades con Más Alertas
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700">
                      <th className="text-left py-2 px-3">#</th>
                      <th className="text-left py-2 px-3">Entidad</th>
                      <th className="text-right py-2 px-3">Alertas</th>
                      <th className="text-right py-2 px-3">Risk Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.top_entities.map((entity, i) => (
                      <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                        <td className="py-2 px-3 text-gray-500">{i + 1}</td>
                        <td className="py-2 px-3 text-white font-medium">{entity.name}</td>
                        <td className="py-2 px-3 text-right font-mono">{entity.alert_count}</td>
                        <td className="py-2 px-3 text-right">
                          <Badge variant="outline" className={cn('text-xs', {
                            'bg-red-500/20 text-red-400 border-red-500/30': entity.max_risk >= 90,
                            'bg-orange-500/20 text-orange-400 border-orange-500/30': entity.max_risk >= 70 && entity.max_risk < 90,
                            'bg-yellow-500/20 text-yellow-400 border-yellow-500/30': entity.max_risk >= 40 && entity.max_risk < 70,
                            'bg-blue-500/20 text-blue-400 border-blue-500/30': entity.max_risk < 40,
                          })}>
                            {entity.max_risk}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Generated timestamp */}
          <div className="mt-4 text-xs text-gray-600 text-right">
            Generado: {new Date(report.generated_at).toLocaleString('es-MX')}
          </div>
        </>
      )}
    </div>
  );
}
