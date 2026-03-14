import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  RefreshCw,
  Share2,
  MoreHorizontal,
  AlertTriangle,
  CheckCircle,
  User,
  Building2,
  Ship,
  Plane,
  Users,
  MapPin,
  Calendar,
  FileText,
  Globe,
  AlertCircle,
  Database,
  Shield,
  CreditCard,
  Network,
  Landmark,
  Newspaper,
  Clock,
  TrendingUp,
  ExternalLink,
  Brain,
  Tag,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { useEntity } from '@/hooks/useEntity';
import { useNetwork, useRelationshipsList } from '@/hooks/useGraph';
import { RelationshipGraph } from '@/components/graph/RelationshipGraph';
import { complianceService } from '@/services/compliance';
import { cn, getRiskColor, formatDate } from '@/lib/utils';
import { SourceLevelSelector } from '@/components/SourceLevelSelector';
import type { RiskLevel } from '@/types';
import type { APISanctionEntry } from '@/types/api';

const entityTypeIcons = {
  person: User,
  company: Building2,
  vessel: Ship,
  aircraft: Plane,
  organization: Users,
};

const entityTypeLabels = {
  person: 'Persona',
  company: 'Empresa',
  vessel: 'Embarcación',
  aircraft: 'Aeronave',
  organization: 'Organización',
};

const riskLevelLabels = {
  critical: 'Crítico',
  high: 'Alto',
  medium: 'Medio',
  low: 'Bajo',
  none: 'Ninguno',
};

const countryNames: Record<string, string> = {
  MX: 'México', US: 'Estados Unidos', BR: 'Brasil', CO: 'Colombia', UY: 'Uruguay',
  AR: 'Argentina', CL: 'Chile', PE: 'Perú', VE: 'Venezuela', PA: 'Panamá',
  GB: 'Reino Unido', ES: 'España', FR: 'Francia', DE: 'Alemania', IT: 'Italia',
  RU: 'Rusia', CN: 'China', JP: 'Japón', KR: 'Corea del Sur', IN: 'India',
  CA: 'Canadá', AU: 'Australia', CU: 'Cuba', NI: 'Nicaragua', BO: 'Bolivia',
  PY: 'Paraguay', EC: 'Ecuador', GT: 'Guatemala', HN: 'Honduras', SV: 'El Salvador',
  CR: 'Costa Rica', DO: 'Rep. Dominicana', HT: 'Haití', JM: 'Jamaica',
  AE: 'Emiratos Árabes', SA: 'Arabia Saudita', IR: 'Irán', IQ: 'Irak',
  SY: 'Siria', LB: 'Líbano', IL: 'Israel', TR: 'Turquía', UA: 'Ucrania',
  BY: 'Bielorrusia', KP: 'Corea del Norte', MM: 'Myanmar', AF: 'Afganistán',
  PK: 'Pakistán', NG: 'Nigeria', ZA: 'Sudáfrica', KE: 'Kenia', ET: 'Etiopía',
  CD: 'RD Congo', SD: 'Sudán', LY: 'Libia', SO: 'Somalia', YE: 'Yemen',
  NL: 'Países Bajos', BE: 'Bélgica', CH: 'Suiza', AT: 'Austria', PT: 'Portugal',
  SE: 'Suecia', NO: 'Noruega', PL: 'Polonia', CZ: 'Chequia', RO: 'Rumania',
};

const amCategoryLabels: Record<string, string> = {
  terrorism: 'Terrorismo', sanctions_evasion: 'Evasion Sanciones', wanted: 'Buscados',
  crime: 'Crimen', human_rights: 'DDHH', financial_crime: 'Crimen Financiero',
  corruption: 'Corrupcion', offshore: 'Offshore', regulatory: 'Regulatorio',
};

const amCategoryColors: Record<string, string> = {
  terrorism: 'bg-red-500/10 text-red-400 border-red-500/30',
  sanctions_evasion: 'bg-red-500/10 text-red-300 border-red-500/30',
  wanted: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  crime: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
  human_rights: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
  financial_crime: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  corruption: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  offshore: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  regulatory: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
};

function EntityAdverseMediaTab({ entityId }: { entityId: string }) {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['adverse-media-entity', entityId],
    queryFn: () => complianceService.getAdverseMediaProfile(entityId),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  const articles = profile?.articles?.items || [];
  const riskProfile = profile?.risk_profile;
  const structured = profile?.structured_media;
  const hasContent = articles.length > 0 || structured?.has_adverse_media;

  if (!hasContent) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-white mb-2">Sin Adverse Media</h3>
        <p className="text-gray-400">No se encontraron noticias adversas sobre esta entidad.</p>
      </div>
    );
  }

  const sevColor = (s: number) =>
    s >= 90 ? 'text-red-400' : s >= 70 ? 'text-orange-400' : s >= 50 ? 'text-yellow-400' : 'text-blue-400';
  const sevBg = (s: number) =>
    s >= 90 ? 'bg-red-500' : s >= 70 ? 'bg-orange-500' : s >= 50 ? 'bg-yellow-500' : 'bg-blue-500';
  const sevLabel = (s: number) =>
    s >= 90 ? 'Critico' : s >= 70 ? 'Alto' : s >= 50 ? 'Medio' : s >= 30 ? 'Bajo' : 'Minimo';

  const getMethodBadge = (method: string | undefined) => {
    if (method === 'moonshot_ai' || method === 'moonshot')
      return <Badge variant="outline" className="text-[10px] gap-1 bg-violet-500/10 text-violet-400 border-violet-500/30"><Brain className="w-3 h-3" />Moonshot AI</Badge>;
    if (method === 'claude_ai')
      return <Badge variant="outline" className="text-[10px] gap-1 bg-cyan-500/10 text-cyan-400 border-cyan-500/30"><Brain className="w-3 h-3" />Claude AI</Badge>;
    if (method === 'keyword')
      return <Badge variant="outline" className="text-[10px] gap-1 bg-gray-500/10 text-gray-400 border-gray-500/30"><Tag className="w-3 h-3" />Keywords</Badge>;
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Risk Profile Gauge */}
      {riskProfile && riskProfile.total_articles > 0 && (
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-6">
            <div className="relative w-20 h-20 shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                <circle cx="18" cy="18" r="14" fill="none"
                  stroke={riskProfile.article_risk_score >= 90 ? '#ef4444' :
                    riskProfile.article_risk_score >= 70 ? '#f97316' :
                    riskProfile.article_risk_score >= 50 ? '#eab308' : '#3b82f6'}
                  strokeWidth="3"
                  strokeDasharray={`${(riskProfile.article_risk_score / 100) * 88} 88`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn('text-lg font-bold', sevColor(riskProfile.article_risk_score))}>
                  {Math.round(riskProfile.article_risk_score)}
                </span>
                <span className="text-[8px] text-gray-500">{sevLabel(riskProfile.article_risk_score)}</span>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-3 gap-4">
              <div>
                <p className="text-lg font-bold text-white">{riskProfile.total_articles}</p>
                <p className="text-xs text-gray-400">Articulos</p>
              </div>
              <div>
                <p className="text-lg font-bold text-white">{riskProfile.recent_30d}</p>
                <p className="text-xs text-gray-400">Ultimos 30d</p>
              </div>
              <div>
                <p className={cn('text-lg font-bold', sevColor(riskProfile.max_severity))}>
                  {riskProfile.max_severity}
                </p>
                <p className="text-xs text-gray-400">Max Severity</p>
              </div>
            </div>
            {riskProfile.top_categories.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {riskProfile.top_categories.map((cat) => (
                  <Badge key={cat} variant="outline" className={cn('text-[10px]', amCategoryColors[cat] || 'bg-white/5')}>
                    {amCategoryLabels[cat] || cat}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Structured Media (Tier 1) */}
      {structured?.has_adverse_media && structured.categories.length > 0 && (
        <div className="glass rounded-xl p-5">
          <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Categorias Estructuradas (Sources)
          </h4>
          <div className="space-y-2">
            {structured.categories.map((cat, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                <span className="text-sm text-white">{amCategoryLabels[cat.category] || cat.category}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full', sevBg(cat.severity))} style={{ width: `${cat.severity}%` }} />
                  </div>
                  <span className={cn('text-xs font-mono', sevColor(cat.severity))}>{cat.severity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Articles */}
      {articles.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Newspaper className="w-4 h-4" />
              Articulos de Noticias ({articles.length})
            </h4>
            <a href="/adverse-media" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
              Ver dashboard completo <ArrowRight className="w-3 h-3" />
            </a>
          </div>
          {articles.map((article, index) => {
            let sourceDomain: string | null = null;
            try { sourceDomain = new URL(article.source_url).hostname.replace('www.', ''); } catch { /* */ }

            return (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn('glass rounded-xl p-4 mb-3 border-l-4',
                  (article.severity ?? 0) >= 90 ? 'border-red-500/70' :
                  (article.severity ?? 0) >= 70 ? 'border-orange-500/60' :
                  (article.severity ?? 0) >= 50 ? 'border-yellow-500/50' : 'border-blue-500/40'
                )}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h5 className="text-sm font-medium text-white flex-1 line-clamp-2">{article.title}</h5>
                  {(article.severity ?? 0) > 0 && (
                    <div className="flex items-center gap-1 shrink-0">
                      <div className="w-12 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full', sevBg(article.severity))} style={{ width: `${article.severity}%` }} />
                      </div>
                      <span className={cn('text-xs font-mono font-bold', sevColor(article.severity))}>
                        {article.severity}
                      </span>
                    </div>
                  )}
                </div>

                {article.summary && (
                  <p className="text-xs text-gray-400 mb-2 line-clamp-2">{article.summary}</p>
                )}

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {article.categories?.map((cat) => (
                    <Badge key={cat} variant="outline" className={cn('text-[10px]', amCategoryColors[cat] || 'bg-white/5')}>
                      {amCategoryLabels[cat] || cat}
                    </Badge>
                  ))}
                  {getMethodBadge(article.classification_method)}
                  <span className="text-gray-500 flex items-center gap-1 ml-auto">
                    {sourceDomain && (
                      <>
                        <Globe className="w-3 h-3" />
                        <span className="text-gray-400">{sourceDomain}</span>
                        <span className="text-gray-600 mx-1">·</span>
                      </>
                    )}
                    <Clock className="w-3 h-3" />
                    {article.publication_date ? formatDate(article.publication_date) : 'N/A'}
                  </span>
                  {article.link_confidence != null && (
                    <span className="text-gray-500 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {Math.round(article.link_confidence * 100)}% match
                    </span>
                  )}
                  {article.is_verified && (
                    <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-400 border-green-500/30">
                      Verificado
                    </Badge>
                  )}
                </div>

                {article.source_url && (
                  <a href={article.source_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-blue-400 hover:text-blue-300">
                    <ExternalLink className="w-3 h-3" /> Leer articulo
                  </a>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Network Risk Tab ──

function NetworkRiskTab({ entityId }: { entityId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['network-risk', entityId],
    queryFn: () => complianceService.getNetworkRisk(entityId),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <Network className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-white mb-2">Sin Datos de Riesgo de Red</h3>
        <p className="text-gray-400">No se encontró análisis de riesgo de red para esta entidad.</p>
      </div>
    );
  }

  const nr = data as any;
  const riskColor = nr.propagated_risk_level === 'critical' ? '#ef4444' :
                    nr.propagated_risk_level === 'high' ? '#f97316' :
                    nr.propagated_risk_level === 'medium' ? '#eab308' : '#22c55e';

  return (
    <div className="space-y-6">
      {/* Risk Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-6"
      >
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <Network className="w-5 h-5 text-blue-400" />
          Riesgo Propagado por Red
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500">Riesgo Directo</p>
            <p className="text-2xl font-bold text-white">{nr.direct_risk_score ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Riesgo Propagado</p>
            <p className="text-2xl font-bold" style={{ color: riskColor }}>
              {nr.propagated_risk_score ?? '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Nivel</p>
            <Badge
              variant="outline"
              className="mt-1"
              style={{ backgroundColor: `${riskColor}20`, color: riskColor, borderColor: `${riskColor}40` }}
            >
              {nr.propagated_risk_level || '-'}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-gray-500">Conexiones Riesgosas</p>
            <p className="text-2xl font-bold text-white">{nr.risky_connections ?? 0}</p>
          </div>
        </div>
      </motion.div>

      {/* Risk Neighbors */}
      {nr.risk_neighbors && nr.risk_neighbors.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-xl p-6"
        >
          <h3 className="text-lg font-medium text-white mb-4">
            Vecinos de Riesgo ({nr.risk_neighbors.length})
          </h3>
          <div className="space-y-3">
            {nr.risk_neighbors.map((neighbor: any, i: number) => {
              const nColor = neighbor.risk_level === 'critical' ? 'text-red-400' :
                            neighbor.risk_level === 'high' ? 'text-orange-400' :
                            neighbor.risk_level === 'medium' ? 'text-yellow-400' : 'text-green-400';
              return (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div>
                    <p className="text-white font-medium">{neighbor.name || neighbor.entity_name}</p>
                    <p className="text-xs text-gray-500">
                      {neighbor.relationship_type} — Distancia: {neighbor.distance ?? 1}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn('text-sm font-bold', nColor)}>
                      {neighbor.risk_score ?? '-'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Contribución: {neighbor.contribution != null ? `${Math.round(neighbor.contribution)}%` : '-'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Formula explanation */}
      <div className="glass rounded-xl p-4">
        <p className="text-xs text-gray-500">
          El riesgo propagado se calcula como: risk = neighbor_risk * 0.5^distance * weight.
          Entidades directamente conectadas a sanciones o PEP contribuyen más al riesgo.
        </p>
      </div>
    </div>
  );
}

// ── UBO Tab ──

function UBOTab({ entityId }: { entityId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['ubo-analysis', entityId],
    queryFn: () => complianceService.getUBOAnalysis(entityId),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <Landmark className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-white mb-2">Sin Análisis UBO</h3>
        <p className="text-gray-400">No se encontró análisis de beneficiario final para esta entidad.</p>
      </div>
    );
  }

  const ubo = data as any;
  const owners = ubo.ultimate_beneficial_owners || ubo.ubos || [];
  const chain = ubo.ownership_chain || [];

  return (
    <div className="space-y-6">
      {/* UBO Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-6"
      >
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <Landmark className="w-5 h-5 text-blue-400" />
          Beneficiario Final (UBO)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500">UBOs Identificados</p>
            <p className="text-2xl font-bold text-white">{owners.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Niveles de Propiedad</p>
            <p className="text-2xl font-bold text-white">{ubo.max_depth ?? chain.length}</p>
          </div>
          {ubo.total_ownership_resolved != null && (
            <div>
              <p className="text-xs text-gray-500">Propiedad Resuelta</p>
              <p className="text-2xl font-bold text-white">{Math.round(ubo.total_ownership_resolved * 100)}%</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* UBO List */}
      {owners.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-xl p-6"
        >
          <h3 className="text-lg font-medium text-white mb-4">Beneficiarios Finales</h3>
          <div className="space-y-3">
            {owners.map((owner: any, i: number) => {
              const ownerRiskColor = owner.risk_level === 'critical' ? 'text-red-400' :
                                    owner.risk_level === 'high' ? 'text-orange-400' :
                                    owner.risk_level === 'medium' ? 'text-yellow-400' : 'text-green-400';
              return (
                <div key={i} className="p-4 rounded-lg bg-white/5 border-l-4 border-blue-500">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white font-medium text-lg">{owner.name || owner.entity_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {owner.ownership_percentage != null && (
                          <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">
                            {Math.round(owner.ownership_percentage * 100)}% propiedad
                          </Badge>
                        )}
                        {owner.is_pep && (
                          <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/30">
                            PEP
                          </Badge>
                        )}
                        {owner.is_sanctioned && (
                          <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400 border-red-500/30">
                            Sancionado
                          </Badge>
                        )}
                        {owner.country && (
                          <span className="text-xs text-gray-500">{owner.country}</span>
                        )}
                      </div>
                    </div>
                    {owner.risk_score != null && (
                      <div className="text-right">
                        <p className={cn('text-lg font-bold', ownerRiskColor)}>{owner.risk_score}</p>
                        <p className="text-xs text-gray-500">Risk Score</p>
                      </div>
                    )}
                  </div>
                  {owner.path && owner.path.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <p className="text-xs text-gray-500 mb-1">Cadena de propiedad:</p>
                      <div className="flex items-center gap-1 flex-wrap">
                        {owner.path.map((step: string, j: number) => (
                          <span key={j} className="flex items-center gap-1">
                            <span className="text-xs text-gray-300">{step}</span>
                            {j < owner.path.length - 1 && (
                              <span className="text-gray-600">→</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Ownership Chain */}
      {chain.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-xl p-6"
        >
          <h3 className="text-lg font-medium text-white mb-4">Cadena de Propiedad</h3>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-white/10" />
            {chain.map((link: any, i: number) => (
              <div key={i} className="relative pl-10 py-3">
                <div className="absolute left-2 w-5 h-5 rounded-full bg-[#0a0a0a] border-2 border-blue-500/50 flex items-center justify-center">
                  <span className="text-[8px] text-blue-400 font-bold">{i + 1}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">{link.entity_name || link.name}</p>
                    {link.relationship_type && (
                      <p className="text-xs text-gray-500">{link.relationship_type}</p>
                    )}
                  </div>
                  {link.ownership_share != null && (
                    <Badge variant="outline" className="text-xs">
                      {Math.round(link.ownership_share * 100)}%
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* FATF Explanation */}
      <div className="glass rounded-xl p-4">
        <p className="text-xs text-gray-500">
          Análisis UBO basado en FATF Recomendación 24/25. Se considera Beneficiario Final
          a toda persona natural con participación directa o indirecta ≥25% o con control efectivo.
        </p>
      </div>
    </div>
  );
}

// Loading Skeleton
function EntityProfileSkeleton() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="glass rounded-2xl p-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="w-16 h-16 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="w-40 h-40 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl lg:col-span-2" />
        </div>
      </div>
    </div>
  );
}

// Not Found State
function EntityNotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="text-center">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Entidad No Encontrada</h1>
        <p className="text-gray-400 mb-6">
          La entidad que buscas no existe o ha sido eliminada.
        </p>
        <Button onClick={() => navigate('/search')} className="btn-primary">
          Volver a Búsqueda
        </Button>
      </div>
    </div>
  );
}

// Risk Score Gauge
function RiskScoreGauge({ score, level }: { score: number; level: RiskLevel }) {
  const circumference = 2 * Math.PI * 56;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = getRiskColor(level);

  return (
    <div className="relative w-40 h-40">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        {/* Background circle */}
        <circle
          cx="60"
          cy="60"
          r="56"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="8"
        />
        {/* Progress circle */}
        <motion.circle
          cx="60"
          cy="60"
          r="56"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white">{score}</span>
        <span className="text-xs text-gray-400 uppercase">Riesgo</span>
      </div>
    </div>
  );
}

// Information Item
function InfoItem({ label, value, icon: Icon }: { label: string; value?: string; icon?: React.ComponentType<{className?: string}> }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="w-4 h-4 text-gray-500 mt-0.5" />}
      <div>
        <p className="text-xs text-gray-500 uppercase">{label}</p>
        <p className="text-sm text-white">{value}</p>
      </div>
    </div>
  );
}

// Risk level color for border
function getRiskBorderColor(riesgo?: string): string {
  if (!riesgo) return 'border-red-500';
  const r = riesgo.toUpperCase();
  if (r === 'CRITICAL') return 'border-red-600';
  if (r === 'HIGH') return 'border-orange-500';
  if (r === 'MEDIUM') return 'border-yellow-500';
  return 'border-red-500';
}

function getRiskBadgeClasses(riesgo?: string): string {
  if (!riesgo) return 'bg-gray-500/10 text-gray-400';
  const r = riesgo.toUpperCase();
  if (r === 'CRITICAL') return 'bg-red-500/10 text-red-400 border-red-500/30';
  if (r === 'HIGH') return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
  if (r === 'MEDIUM') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
  return 'bg-green-500/10 text-green-400 border-green-500/30';
}

// Sanction Entry Card (enriched)
function SanctionEntry({ entry }: { entry: APISanctionEntry }) {
  const details = entry.details;
  const borderColor = details?.riesgo ? getRiskBorderColor(details.riesgo) : 'border-red-500';

  return (
    <div className={cn('glass rounded-lg p-4 border-l-4', borderColor)}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-white font-medium">{entry.source}</h4>
          <p className="text-sm text-gray-400">{entry.program}</p>
        </div>
        <div className="flex items-center gap-2">
          {details?.riesgo && (
            <Badge variant="outline" className={cn('text-xs', getRiskBadgeClasses(details.riesgo))}>
              {details.riesgo}
            </Badge>
          )}
          <Badge variant="outline" className={cn(
            'text-xs',
            entry.status === 'active' ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-gray-500/10 text-gray-400'
          )}>
            {entry.status === 'active' ? 'Activo' : entry.status}
          </Badge>
        </div>
      </div>
      <p className="text-sm text-gray-300 mb-2">{entry.reason}</p>

      {/* Enriched details grid */}
      {details && Object.keys(details).length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {details.rfc && (
              <div>
                <p className="text-[10px] text-gray-500 uppercase">RFC</p>
                <p className="text-sm text-white font-mono">{details.rfc}</p>
              </div>
            )}
            {details.dataset_label && (
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Dataset</p>
                <p className="text-sm text-white">{details.dataset_label}</p>
              </div>
            )}
            {details.supuesto && (
              <div className="col-span-2 md:col-span-1">
                <p className="text-[10px] text-gray-500 uppercase">Supuesto</p>
                <p className="text-sm text-white">{details.supuesto}</p>
              </div>
            )}
            {details.monto && (
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Monto</p>
                <p className="text-sm text-white">{details.monto}</p>
              </div>
            )}
            {details.entidad_federativa && (
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Entidad Federativa</p>
                <p className="text-sm text-white">{details.entidad_federativa}</p>
              </div>
            )}
            {details.tipo_persona && (
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Tipo Persona</p>
                <p className="text-sm text-white">{details.tipo_persona}</p>
              </div>
            )}
            {details.fecha_publicacion && (
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Fecha Publicacion</p>
                <p className="text-sm text-white">{details.fecha_publicacion}</p>
              </div>
            )}
          </div>

          {/* Nested datasets (aggregated format) */}
          {details.datasets && Array.isArray(details.datasets) && details.datasets.length > 1 && (
            <div className="mt-3 pt-3 border-t border-white/5">
              <p className="text-xs text-gray-500 mb-2">
                Aparece en {details.dataset_count || details.datasets.length} datasets:
              </p>
              <div className="space-y-2">
                {details.datasets.map((ds, idx) => {
                  const d = ds as Record<string, unknown>;
                  return (
                    <div key={idx} className="flex items-center gap-3 p-2 rounded bg-white/5">
                      <Badge variant="outline" className={cn('text-[10px]', getRiskBadgeClasses(String(d.riesgo || '')))}>
                        {String(d.riesgo || 'N/A')}
                      </Badge>
                      <span className="text-xs text-white">{String(d.dataset_label || d.dataset || '')}</span>
                      {d.supuesto ? <span className="text-xs text-gray-500 truncate max-w-[200px]">{String(d.supuesto)}</span> : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-500 mt-2">Listado: {formatDate(entry.listing_date)}</p>
    </div>
  );
}

// Relationship Card
function RelationshipCard({ rel }: { rel: { target_name?: string; type: string; description?: string; confidence: number } }) {
  return (
    <div className="glass rounded-lg p-4 flex items-center justify-between">
      <div>
        <h4 className="text-white font-medium">{rel.target_name || 'Entidad relacionada'}</h4>
        <p className="text-sm text-gray-400">{rel.description || rel.type}</p>
      </div>
      <div className="text-right">
        <div className="text-sm text-white">{rel.confidence}%</div>
        <div className="text-xs text-gray-500">confianza</div>
      </div>
    </div>
  );
}

export function EntityProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [relLevelFilter, setRelLevelFilter] = useState<string | undefined>(undefined);
  const [graphDepth, setGraphDepth] = useState(2);

  const sourceLevelParam = searchParams.get('source_level');
  const [sourceLevel, setSourceLevel] = useState<1 | 2 | 3 | 4>(
    sourceLevelParam ? (parseInt(sourceLevelParam) as 1 | 2 | 3 | 4) : 2
  );

  const handleSourceLevelChange = (level: 1 | 2 | 3 | 4) => {
    setSourceLevel(level);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('source_level', String(level));
    setSearchParams(newParams, { replace: true });
  };

  const { entity, isLoading, error, refetch } = useEntity(id, sourceLevel);
  const { data: networkData, isLoading: networkLoading } = useNetwork(id, { depth: graphDepth, enabled: activeTab === 'network' });
  const { data: relationshipsList } = useRelationshipsList(id, {
    enabled: activeTab === 'relationships',
    level: relLevelFilter,
    hide_noise: true,
    limit: 200,
  });

  if (isLoading) {
    return <EntityProfileSkeleton />;
  }

  if (error || !entity) {
    return <EntityNotFound />;
  }

  const Icon = entityTypeIcons[entity.entity_type] || User;
  const riskColor = getRiskColor(entity.risk_level);

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-20 pb-12">
      {/* Back Button & Actions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="gap-2 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="gap-2 text-gray-400 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-gray-400 hover:text-white"
            >
              <Share2 className="w-4 h-4" />
              Compartir
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 lg:p-8 mb-6"
        >
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left: Info */}
            <div className="flex-1">
              <div className="flex items-start gap-4 mb-4">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="w-16 h-16 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${riskColor}15` }}
                >
                  <Icon className="w-8 h-8" style={{ color: riskColor }} />
                </motion.div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-white mb-1">
                    {entity.primary_name}
                  </h1>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-gray-400">
                      {entityTypeLabels[entity.entity_type]}
                    </Badge>
                    <Badge
                      style={{
                        backgroundColor: `${riskColor}20`,
                        color: riskColor,
                        borderColor: `${riskColor}40`,
                      }}
                    >
                      Riesgo {riskLevelLabels[entity.risk_level]}
                    </Badge>
                    {/* Topics */}
                    {entity.topics?.map((topic: string) => {
                      const topicColors: Record<string, string> = {
                        sanction: 'bg-red-500/10 text-red-400 border-red-500/20',
                        pep: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                        crime: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
                        debarment: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                        poi: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                      };
                      return (
                        <Badge
                          key={topic}
                          variant="outline"
                          className={`text-xs capitalize ${topicColors[topic] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}
                        >
                          {topic}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Quick Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-6">
                {entity.country && (
                  <InfoItem label="País" value={countryNames[entity.country] || entity.country} icon={Globe} />
                )}
                {entity.identifications?.length > 0 && entity.identifications.find(i => i.type === 'tax_id') && (
                  <InfoItem
                    label={entity.identifications.find(i => i.type === 'tax_id')?.label || 'RFC'}
                    value={entity.identifications.find(i => i.type === 'tax_id')?.number}
                    icon={CreditCard}
                  />
                )}
                {(entity.birth_date || entity.date_of_birth) && (
                  <InfoItem label="Fecha de Nacimiento" value={formatDate(entity.birth_date || entity.date_of_birth)} icon={Calendar} />
                )}
                {entity.gender && (
                  <InfoItem label="Género" value={entity.gender === 'male' ? 'Masculino' : entity.gender === 'female' ? 'Femenino' : entity.gender} icon={User} />
                )}
                {entity.place_of_birth && (
                  <InfoItem label="Lugar de Nacimiento" value={entity.place_of_birth} icon={MapPin} />
                )}
                {entity.nationalities && entity.nationalities.length > 0 && (
                  <InfoItem label="Nacionalidades" value={entity.nationalities.map((n: string) => countryNames[n] || n).join(', ')} icon={Globe} />
                )}
                {entity.incorporation_date && (
                  <InfoItem label="Fecha de Constitución" value={formatDate(entity.incorporation_date)} icon={Calendar} />
                )}
                {entity.incorporation_country && (
                  <InfoItem label="País de Constitución" value={entity.incorporation_country} icon={MapPin} />
                )}
                {entity.is_current_pep !== undefined && entity.is_current_pep !== null && (
                  <InfoItem
                    label="PEP"
                    value={entity.is_current_pep ? `Activo — ${entity.pep_category || 'PEP'}` : `Histórico — ${entity.pep_category || 'PEP'}`}
                    icon={Shield}
                  />
                )}
              </div>

              {/* Data Sources */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500 uppercase">Fuentes de Datos</p>
                  <SourceLevelSelector value={sourceLevel} onChange={handleSourceLevelChange} size="sm" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {(entity.data_sources_display || entity.data_sources.map((s: string) => ({ id: s, display_name: s, category: '' }))).map((src: { id: string; display_name: string; category: string }) => {
                    const catColors: Record<string, string> = {
                      SANCTIONS: 'bg-red-500/10 text-red-400 border-red-500/30',
                      LAW_ENFORCEMENT: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
                      PEP: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
                      REGULATORY: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                      TAX: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
                    };
                    return (
                      <span
                        key={src.id}
                        className={`text-xs px-2 py-1 rounded-full border ${catColors[src.category] || 'bg-white/5 text-gray-400 border-white/10'}`}
                      >
                        {src.display_name}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Risk Score */}
            <div className="flex flex-col items-center justify-center">
              <RiskScoreGauge score={entity.overall_risk_score} level={entity.risk_level} />
              <p className="text-sm text-gray-400 mt-4">Score de Riesgo</p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white/10">
              General
            </TabsTrigger>
            <TabsTrigger value="sanctions" className="data-[state=active]:bg-white/10">
              Sanciones
              {entity.sanctions.length > 0 && (
                <Badge className="ml-2 bg-red-500/20 text-red-400 text-[10px]">
                  {entity.sanctions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pep" className="data-[state=active]:bg-white/10">
              PEP
              {entity.pep_entries.length > 0 && (
                <Badge className="ml-2 bg-pink-500/20 text-pink-400 text-[10px]">
                  {entity.pep_entries.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="media" className="data-[state=active]:bg-white/10">
              <Newspaper className="w-4 h-4 mr-1" />
              Medios
            </TabsTrigger>
            <TabsTrigger value="network" className="data-[state=active]:bg-white/10">
              Grafo
              {networkData && networkData.total_nodes > 0 && (
                <Badge className="ml-2 bg-blue-500/20 text-blue-400 text-[10px]">
                  {networkData.total_nodes}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="relationships" className="data-[state=active]:bg-white/10">
              Relaciones
              {relationshipsList && relationshipsList.total > 0 && (
                <Badge className="ml-2 bg-purple-500/20 text-purple-400 text-[10px]">
                  {relationshipsList.total}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="network-risk" className="data-[state=active]:bg-white/10">
              <Network className="w-4 h-4 mr-1" />
              Riesgo Red
            </TabsTrigger>
            <TabsTrigger value="ubo" className="data-[state=active]:bg-white/10">
              <Landmark className="w-4 h-4 mr-1" />
              UBO
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Aliases */}
              {entity.aliases.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-xl p-6"
                >
                  <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-400" />
                    Alias Conocidos
                  </h3>
                  <div className="space-y-2">
                    {entity.aliases.map((alias, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                        <span className="text-white">{alias.name}</span>
                        <Badge variant="outline" className="text-xs text-gray-400">
                          {alias.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Addresses */}
              {entity.addresses.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="glass rounded-xl p-6"
                >
                  <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-400" />
                    Direcciones
                  </h3>
                  <div className="space-y-3">
                    {entity.addresses.map((addr, i) => (
                      <div key={i} className="p-3 rounded-lg bg-white/5">
                        <p className="text-white text-sm">
                          {[addr.street, addr.city, addr.state, addr.country].filter(Boolean).join(', ')}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px]">
                            {addr.type}
                          </Badge>
                          {addr.is_current && (
                            <Badge className="text-[10px] bg-green-500/20 text-green-400">
                              Actual
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Identifications */}
              {entity.identifications?.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="glass rounded-xl p-6"
                >
                  <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-blue-400" />
                    Identificaciones
                  </h3>
                  <div className="space-y-3">
                    {entity.identifications.map((ident, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                        <div className="flex items-center gap-3">
                          <Badge className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">
                            {ident.label || ident.type.toUpperCase()}
                          </Badge>
                          <span className="text-white font-mono text-sm">{ident.number}</span>
                        </div>
                        {ident.country && (
                          <span className="text-xs text-gray-500">{ident.country}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Source Records */}
              {entity.source_records && entity.source_records.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="glass rounded-xl p-6"
                >
                  <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-400" />
                    Registros por Fuente
                  </h3>
                  <div className="space-y-3">
                    {entity.source_records.map((rec, i) => (
                      <div key={i} className="p-3 rounded-lg bg-white/5">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-white text-sm font-medium">{rec.source_display || rec.source}</span>
                            {rec.category && (
                              <Badge variant="outline" className="text-[10px] text-gray-400">
                                {rec.category}
                              </Badge>
                            )}
                          </div>
                          {rec.risk_level && (
                            <Badge variant="outline" className={cn('text-[10px]', getRiskBadgeClasses(rec.risk_level))}>
                              {rec.risk_level}
                            </Badge>
                          )}
                        </div>
                        {rec.external_id && (
                          <p className="text-xs text-gray-500">
                            <span className="text-gray-600">ID:</span> <span className="font-mono">{rec.external_id}</span>
                          </p>
                        )}
                        {rec.country && (
                          <p className="text-xs text-gray-500">
                            <span className="text-gray-600">País:</span> {rec.country}
                          </p>
                        )}
                        {rec.programs && rec.programs.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {rec.programs.map((prog, j) => (
                              <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400">
                                {prog}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Risk Factors */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass rounded-xl p-6 lg:col-span-2"
              >
                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-400" />
                  Factores de Riesgo
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {entity.risk_factors.map((factor, i) => (
                    <div key={i} className="p-4 rounded-lg bg-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-300 capitalize">{factor.category}</span>
                        <span className={cn(
                          'text-sm font-medium',
                          factor.level === 'critical' ? 'text-red-400' :
                          factor.level === 'high' ? 'text-orange-400' :
                          factor.level === 'medium' ? 'text-yellow-400' : 'text-green-400'
                        )}>
                          {factor.score}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${factor.score}%` }}
                          transition={{ duration: 0.5, delay: i * 0.1 }}
                          className={cn(
                            'h-full rounded-full',
                            factor.level === 'critical' ? 'bg-red-500' :
                            factor.level === 'high' ? 'bg-orange-500' :
                            factor.level === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                          )}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">{factor.details}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </TabsContent>

          {/* Sanctions Tab */}
          <TabsContent value="sanctions">
            {entity.sanctions.length === 0 ? (
              <div className="glass rounded-xl p-12 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">Sin Sanciones</h3>
                <p className="text-gray-400">Esta entidad no aparece en listas de sanciones.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {entity.sanctions.map((sanction, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <SanctionEntry entry={sanction} />
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* PEP Tab */}
          <TabsContent value="pep">
            {entity.pep_entries.length === 0 ? (
              <div className="glass rounded-xl p-12 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">No es PEP</h3>
                <p className="text-gray-400">Esta entidad no es Persona Políticamente Expuesta.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {entity.pep_entries.map((pep, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass rounded-lg p-6 border-l-4 border-pink-500"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-white font-medium text-lg">{pep.role}</h4>
                        <p className="text-pink-400 text-sm">{pep.category}</p>
                        {pep.institution && (
                          <p className="text-gray-300 text-sm mt-1">{pep.institution}</p>
                        )}
                        <p className="text-gray-400 text-sm mt-1">{pep.country}</p>
                      </div>
                      <Badge className={pep.is_current ? 'bg-pink-500/20 text-pink-400' : 'bg-gray-500/20 text-gray-400'}>
                        {pep.is_current ? 'En Cargo' : 'Histórico'}
                      </Badge>
                    </div>
                    {(pep.start_date || pep.end_date) && (
                      <p className="text-sm text-gray-500 mt-3">
                        {pep.start_date && `Desde: ${formatDate(pep.start_date)}`}
                        {pep.end_date && ` | Hasta: ${formatDate(pep.end_date)}`}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Media Tab — uses adverse media API */}
          <TabsContent value="media">
            <EntityAdverseMediaTab entityId={entity.id} />
          </TabsContent>

          {/* Relationships List Tab */}
          <TabsContent value="relationships">
            {!relationshipsList ? (
              <div className="glass rounded-xl p-12 text-center">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Cargando relaciones...</p>
              </div>
            ) : relationshipsList.total === 0 ? (
              <div className="glass rounded-xl p-12 text-center">
                <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">Sin Relaciones</h3>
                <p className="text-gray-400">No se encontraron relaciones para esta entidad.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Level filter chips */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {[
                    { key: undefined, label: 'Todos' },
                    { key: 'DIRECT', label: 'Directas' },
                    { key: 'AFFILIATION', label: 'Afiliacion' },
                    { key: 'INDIRECT', label: 'Indirectas' },
                  ].map((filter) => (
                    <button
                      key={filter.label}
                      onClick={() => setRelLevelFilter(filter.key)}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                        relLevelFilter === filter.key
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                      )}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                {/* Summary by type */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {Object.entries(relationshipsList.by_type).map(([type, count]) => (
                    <Badge key={type} variant="outline" className="text-xs capitalize">
                      {type}: {count}
                    </Badge>
                  ))}
                </div>

                {/* Relationships list */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {relationshipsList.relationships.map((rel, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="glass rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-white font-medium">
                            {rel.related_entity_name}
                          </p>
                          {rel.subtype && (
                            <p className="text-sm text-gray-400 mt-0.5">
                              {rel.subtype}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Strength badge */}
                          {rel.relationship_strength != null && (
                            <span className={cn(
                              'text-[10px] font-mono px-1.5 py-0.5 rounded',
                              rel.relationship_strength > 0.7
                                ? 'bg-red-500/15 text-red-400'
                                : rel.relationship_strength > 0.4
                                ? 'bg-orange-500/15 text-orange-400'
                                : 'bg-gray-500/15 text-gray-400'
                            )}>
                              {rel.relationship_strength.toFixed(2)}
                            </span>
                          )}
                          {/* Type badge */}
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs',
                              rel.type === 'family' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                              rel.type === 'beneficial_ownership' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                              rel.type === 'corporate' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                              rel.type === 'membership' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                              rel.type === 'political' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                              'bg-gray-500/10 text-gray-400 border-gray-500/20'
                            )}
                          >
                            {rel.type === 'family' ? 'Familiar' :
                             rel.type === 'beneficial_ownership' ? 'Propiedad' :
                             rel.type === 'corporate' ? 'Corporativa' :
                             rel.type === 'membership' ? 'Miembro' :
                             rel.type === 'political' ? 'Politico' :
                             rel.type === 'associate' ? 'Asociado' :
                             rel.type === 'representation' ? 'Representante' :
                             rel.type === 'sanction' ? 'Sancion' :
                             rel.type === 'unknown' ? 'Vinculado' :
                             rel.type}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs mt-2">
                        <div className="flex items-center gap-2">
                          {/* Level label */}
                          {rel.relationship_level && (
                            <span className={cn(
                              'px-1.5 py-0.5 rounded text-[10px] font-medium',
                              rel.relationship_level === 'DIRECT'
                                ? 'bg-red-500/10 text-red-400'
                                : rel.relationship_level === 'AFFILIATION'
                                ? 'bg-yellow-500/10 text-yellow-400'
                                : 'bg-gray-500/10 text-gray-400'
                            )}>
                              {rel.relationship_level === 'DIRECT' ? 'Directa' :
                               rel.relationship_level === 'AFFILIATION' ? 'Afiliacion' :
                               'Indirecta'}
                            </span>
                          )}
                          <span className="text-gray-500">
                            {rel.direction === 'outgoing'
                              ? `Relacionado con ${rel.related_entity_name.split(' ')[0]}`
                              : `${rel.related_entity_name.split(' ')[0]} vinculado a esta entidad`}
                          </span>
                        </div>
                        {!rel.is_resolved && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">
                            Sin identificar
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Network Tab */}
          <TabsContent value="network">
            {networkLoading ? (
              <div className="glass rounded-xl p-12 text-center">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Cargando red de relaciones...</p>
              </div>
            ) : !networkData?.center ? (
              <div className="glass rounded-xl p-12 text-center">
                <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">Sin Relaciones</h3>
                <p className="text-gray-400">No se encontraron relaciones para esta entidad.</p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <RelationshipGraph
                  center={networkData.center}
                  nodes={networkData.nodes}
                  edges={networkData.edges}
                  height="600px"
                  depth={graphDepth}
                  onDepthChange={setGraphDepth}
                  totalNodes={networkData.total_nodes}
                  totalEdges={networkData.total_edges}
                  onNavigate={(entityId) => navigate(`/entity/${entityId}`)}
                />
              </motion.div>
            )}
          </TabsContent>

          {/* Network Risk Tab */}
          <TabsContent value="network-risk">
            <NetworkRiskTab entityId={id!} />
          </TabsContent>

          {/* UBO Tab */}
          <TabsContent value="ubo">
            <UBOTab entityId={id!} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default EntityProfilePage;
