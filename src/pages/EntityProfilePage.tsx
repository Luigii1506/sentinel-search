import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useEntity } from '@/hooks/useEntity';
import { useGraph } from '@/hooks/useGraph';
import { cn, getRiskColor, formatDate } from '@/lib/utils';
import type { RiskLevel } from '@/types';

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

// Sanction Entry Card
function SanctionEntry({ entry }: { entry: { source: string; program: string; listing_date: string; reason: string; status: string } }) {
  return (
    <div className="glass rounded-lg p-4 border-l-4 border-red-500">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-white font-medium">{entry.source}</h4>
          <p className="text-sm text-gray-400">{entry.program}</p>
        </div>
        <Badge variant="outline" className={cn(
          'text-xs',
          entry.status === 'active' ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-gray-500/10 text-gray-400'
        )}>
          {entry.status === 'active' ? 'Activo' : entry.status}
        </Badge>
      </div>
      <p className="text-sm text-gray-300 mb-2">{entry.reason}</p>
      <p className="text-xs text-gray-500">Listado: {formatDate(entry.listing_date)}</p>
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
  const [activeTab, setActiveTab] = useState('overview');
  
  const { entity, isLoading, error, refetch } = useEntity(id);
  const { data: graphData, isLoading: graphLoading } = useGraph(id, { enabled: activeTab === 'network' });

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
                  </div>
                </div>
              </div>

              {/* Quick Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-6">
                {entity.date_of_birth && (
                  <InfoItem label="Fecha de Nacimiento" value={formatDate(entity.date_of_birth)} icon={Calendar} />
                )}
                {entity.place_of_birth && (
                  <InfoItem label="Lugar de Nacimiento" value={entity.place_of_birth} icon={MapPin} />
                )}
                {entity.nationalities && entity.nationalities.length > 0 && (
                  <InfoItem label="Nacionalidades" value={entity.nationalities.join(', ')} icon={Globe} />
                )}
                {entity.incorporation_date && (
                  <InfoItem label="Fecha de Constitución" value={formatDate(entity.incorporation_date)} icon={Calendar} />
                )}
                {entity.incorporation_country && (
                  <InfoItem label="País de Constitución" value={entity.incorporation_country} icon={MapPin} />
                )}
              </div>

              {/* Data Sources */}
              <div className="mt-6">
                <p className="text-xs text-gray-500 uppercase mb-2">Fuentes de Datos</p>
                <div className="flex flex-wrap gap-2">
                  {entity.data_sources.map((source) => (
                    <span
                      key={source}
                      className="text-xs px-2 py-1 rounded-full bg-white/5 text-gray-400 border border-white/10"
                    >
                      {source}
                    </span>
                  ))}
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
              Medios
              {entity.adverse_media.length > 0 && (
                <Badge className="ml-2 bg-orange-500/20 text-orange-400 text-[10px]">
                  {entity.adverse_media.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="network" className="data-[state=active]:bg-white/10">
              Red
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

          {/* Media Tab */}
          <TabsContent value="media">
            {entity.adverse_media.length === 0 ? (
              <div className="glass rounded-xl p-12 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">Sin Adverse Media</h3>
                <p className="text-gray-400">No se encontraron noticias adversas sobre esta entidad.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {entity.adverse_media.map((media, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass rounded-lg p-6 border-l-4 border-orange-500"
                  >
                    <h4 className="text-white font-medium text-lg mb-2">{media.title}</h4>
                    <p className="text-gray-300 text-sm mb-3">{media.summary}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{media.source}</span>
                        <span className="text-gray-600">•</span>
                        <span className="text-xs text-gray-500">{formatDate(media.publication_date)}</span>
                      </div>
                      <div className="flex gap-1">
                        {media.categories.map((cat, j) => (
                          <Badge key={j} variant="outline" className="text-[10px]">
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Network Tab */}
          <TabsContent value="network">
            {graphLoading ? (
              <div className="glass rounded-xl p-12 text-center">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Cargando red de relaciones...</p>
              </div>
            ) : graphData?.relationships.length === 0 ? (
              <div className="glass rounded-xl p-12 text-center">
                <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">Sin Relaciones</h3>
                <p className="text-gray-400">No se encontraron relaciones para esta entidad.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {graphData?.relationships.map((rel, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <RelationshipCard rel={rel} />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default EntityProfilePage;
