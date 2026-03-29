import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  User,
  Shield,
  Flag,
  Newspaper,
  Network,
  History,
  MapPin,
  CreditCard,
  ExternalLink,
  CheckCircle,
  UserCircle,
  Building,
  Clock,
  TrendingUp,
  Zap,
  Brain,
  Tag,
  ArrowRight,
  Globe,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatDate, getSourceBadgeClass, getRelationshipTypeLabel } from '@/lib/utils';
import { complianceService } from '@/services/compliance';
import type { Entity } from '@/types';

interface InformationTabsProps {
  entity: Entity;
  className?: string;
}

const tabVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export function InformationTabs({ entity, className }: InformationTabsProps) {
  const [activeTab, setActiveTab] = useState('identity');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className={cn('w-full', className)}>
      <TabsList className="w-full justify-start bg-transparent border-b border-white/10 rounded-none h-auto p-0 gap-1 overflow-x-auto">
        {[
          { id: 'identity', label: 'Identity', icon: User, count: null },
          { id: 'sanctions', label: 'Sanctions', icon: Shield, count: entity.sanctions.length || null },
          { id: 'pep', label: 'PEP', icon: Flag, count: entity.pepEntries.length || null },
          { id: 'media', label: 'Adverse Media', icon: Newspaper, count: entity.adverseMedia.length || null },
          { id: 'relationships', label: 'Related', icon: Network, count: entity.relationships.length || null },
          { id: 'audit', label: 'History', icon: History, count: null },
        ].map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className={cn(
              'flex items-center gap-2 px-4 py-3 rounded-t-lg data-[state=active]:bg-white/5 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 transition-all',
              'text-gray-400 data-[state=active]:text-white hover:text-white hover:bg-white/[0.02]'
            )}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count !== null && tab.count > 0 && (
              <Badge variant="secondary" className="bg-white/10 text-white text-[10px]">
                {tab.count}
              </Badge>
            )}
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="mt-6">
        <AnimatePresence mode="wait">
          <TabsContent value="identity" className="mt-0">
            <motion.div
              key="identity"
              variants={tabVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.2 }}
            >
              <IdentityTab entity={entity} />
            </motion.div>
          </TabsContent>

          <TabsContent value="sanctions" className="mt-0">
            <motion.div
              key="sanctions"
              variants={tabVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.2 }}
            >
              <SanctionsTab entity={entity} />
            </motion.div>
          </TabsContent>

          <TabsContent value="pep" className="mt-0">
            <motion.div
              key="pep"
              variants={tabVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.2 }}
            >
              <PepTab entity={entity} />
            </motion.div>
          </TabsContent>

          <TabsContent value="media" className="mt-0">
            <motion.div
              key="media"
              variants={tabVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.2 }}
            >
              <AdverseMediaTab entity={entity} />
            </motion.div>
          </TabsContent>

          <TabsContent value="relationships" className="mt-0">
            <motion.div
              key="relationships"
              variants={tabVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.2 }}
            >
              <RelationshipsTab entity={entity} />
            </motion.div>
          </TabsContent>

          <TabsContent value="audit" className="mt-0">
            <motion.div
              key="audit"
              variants={tabVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.2 }}
            >
              <AuditTab entity={entity} />
            </motion.div>
          </TabsContent>
        </AnimatePresence>
      </div>
    </Tabs>
  );
}

// Identity Tab
function IdentityTab({ entity }: { entity: Entity }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Personal Information */}
      <div className="glass rounded-xl p-5">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <UserCircle className="w-5 h-5 text-blue-400" />
          Personal Information
        </h3>
        <div className="space-y-4">
          {entity.gender && (
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <span className="text-gray-400">Gender</span>
              <span className="text-white capitalize break-words sm:text-right">{entity.gender}</span>
            </div>
          )}
          {entity.dateOfBirth && (
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <span className="text-gray-400">Date of Birth</span>
              <span className="text-white break-words sm:text-right">{formatDate(entity.dateOfBirth)}</span>
            </div>
          )}
          {entity.placeOfBirth && (
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <span className="text-gray-400">Place of Birth</span>
              <span className="text-white break-words sm:text-right">{entity.placeOfBirth}</span>
            </div>
          )}
          {entity.nationalities && entity.nationalities.length > 0 && (
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <span className="text-gray-400">Nationality</span>
              <span className="text-white break-words sm:text-right">{entity.nationalities.join(', ')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Company Information */}
      {entity.type === 'company' && (
        <div className="glass rounded-xl p-5">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <Building className="w-5 h-5 text-purple-400" />
            Company Information
          </h3>
          <div className="space-y-4">
            {entity.incorporationDate && (
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <span className="text-gray-400">Incorporation Date</span>
                <span className="text-white break-words sm:text-right">{formatDate(entity.incorporationDate)}</span>
              </div>
            )}
            {entity.incorporationCountry && (
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <span className="text-gray-400">Incorporation Country</span>
                <span className="text-white break-words sm:text-right">{entity.incorporationCountry}</span>
              </div>
            )}
            {entity.companyType && (
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <span className="text-gray-400">Company Type</span>
                <span className="text-white break-words sm:text-right">{entity.companyType}</span>
              </div>
            )}
            {entity.status && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <span className="text-gray-400">Status</span>
                <Badge
                  variant="outline"
                  className={cn(
                    'capitalize',
                    entity.status === 'active'
                      ? 'bg-green-500/10 text-green-400 border-green-500/30'
                      : 'bg-gray-500/10 text-gray-400 border-gray-500/30'
                  )}
                >
                  {entity.status}
                </Badge>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Addresses */}
      <div className="glass rounded-xl p-5 lg:col-span-2">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-red-400" />
          Addresses ({entity.addresses.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entity.addresses.map((address) => (
            <div
              key={address.id}
              className="p-4 rounded-lg bg-white/5 border border-white/10"
            >
              <div className="flex items-start justify-between mb-2">
                <Badge variant="outline" className="text-[10px] bg-white/5">
                  {address.type}
                </Badge>
                {address.isCurrent && (
                  <Badge className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30">
                    Current
                  </Badge>
                )}
              </div>
              <p className="text-white text-sm break-words">
                {address.street && <>{address.street}<br /></>}
                {address.city}{address.state && `, ${address.state}`}{address.postalCode && ` ${address.postalCode}`}
                <br />
                {address.country}
              </p>
              {address.source && (
                <span className={cn('text-[10px] mt-2 inline-block px-1.5 py-0.5 rounded border', getSourceBadgeClass(address.source))}>
                  {address.source}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Identifications */}
      <div className="glass rounded-xl p-5 lg:col-span-2">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-amber-400" />
          Identifications ({entity.identifications.length})
        </h3>
        <div className="space-y-3 md:hidden">
          {entity.identifications.map((id) => (
            <div key={id.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] uppercase tracking-wide text-gray-500">Type</span>
                  <span className="text-white capitalize break-words">{id.type.replace('_', ' ')}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] uppercase tracking-wide text-gray-500">Number</span>
                  <span className="text-white font-mono break-all">{id.number}</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] uppercase tracking-wide text-gray-500">Country</span>
                    <span className="text-gray-300 break-words">{id.country || '-'}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] uppercase tracking-wide text-gray-500">Source</span>
                    {id.source ? (
                      <span className={cn('inline-flex w-fit text-[10px] px-1.5 py-0.5 rounded border', getSourceBadgeClass(id.source))}>
                        {id.source}
                      </span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 px-4 text-sm text-gray-400 font-medium">Type</th>
                <th className="text-left py-2 px-4 text-sm text-gray-400 font-medium">Number</th>
                <th className="text-left py-2 px-4 text-sm text-gray-400 font-medium">Country</th>
                <th className="text-left py-2 px-4 text-sm text-gray-400 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {entity.identifications.map((id) => (
                <tr key={id.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="py-3 px-4 text-white capitalize">{id.type.replace('_', ' ')}</td>
                  <td className="py-3 px-4 text-white font-mono">{id.number}</td>
                  <td className="py-3 px-4 text-gray-300">{id.country || '-'}</td>
                  <td className="py-3 px-4">
                    {id.source && (
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded border', getSourceBadgeClass(id.source))}>
                        {id.source}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Sanctions Tab
function SanctionsTab({ entity }: { entity: Entity }) {
  if (entity.sanctions.length === 0) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">No Sanctions Found</h3>
        <p className="text-gray-400">This entity has no known sanctions listings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entity.sanctions.map((sanction, index) => (
        <motion.div
          key={sanction.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="glass rounded-xl p-5 border-l-4 border-red-500"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-5 h-5 text-red-500" />
                <span className={cn('text-xs px-2 py-0.5 rounded border', getSourceBadgeClass(sanction.source))}>
                  {sanction.source}
                </span>
              </div>
              <h4 className="text-lg font-medium text-white">{sanction.program} Program</h4>
            </div>
            <Badge
              variant="outline"
              className={cn(
                'capitalize',
                sanction.status === 'active'
                  ? 'bg-red-500/10 text-red-400 border-red-500/30'
                  : 'bg-gray-500/10 text-gray-400 border-gray-500/30'
              )}
            >
              {sanction.status}
            </Badge>
          </div>

          <p className="text-gray-300 mb-4">{sanction.reason}</p>

          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-gray-500">Listing Date:</span>
              <span className="text-white ml-2">{formatDate(sanction.listingDate)}</span>
            </div>
            {sanction.referenceNumber && (
              <div>
                <span className="text-gray-500">Reference:</span>
                <span className="text-white ml-2 font-mono">{sanction.referenceNumber}</span>
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// PEP Tab
function PepTab({ entity }: { entity: Entity }) {
  if (entity.pepEntries.length === 0) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">No PEP Status</h3>
        <p className="text-gray-400">This entity is not identified as a Politically Exposed Person.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entity.pepEntries.map((pep, index) => (
        <motion.div
          key={pep.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="glass rounded-xl p-5 border-l-4 border-pink-500"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Flag className="w-5 h-5 text-pink-500" />
                <span className="text-xs text-gray-400 uppercase tracking-wider">PEP</span>
              </div>
              <h4 className="text-lg font-medium text-white">{pep.role}</h4>
            </div>
            <Badge
              variant="outline"
              className={cn(
                'capitalize',
                pep.isCurrent
                  ? 'bg-pink-500/10 text-pink-400 border-pink-500/30'
                  : 'bg-gray-500/10 text-gray-400 border-gray-500/30'
              )}
            >
              {pep.isCurrent ? 'Current' : 'Former'}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-gray-500">Country:</span>
              <span className="text-white ml-2">{pep.country}</span>
            </div>
            <div>
              <span className="text-gray-500">Category:</span>
              <span className="text-white ml-2 capitalize">{pep.category.replace('_', ' ')}</span>
            </div>
            {pep.startDate && (
              <div>
                <span className="text-gray-500">From:</span>
                <span className="text-white ml-2">{formatDate(pep.startDate)}</span>
              </div>
            )}
            {pep.endDate && (
              <div>
                <span className="text-gray-500">To:</span>
                <span className="text-white ml-2">{formatDate(pep.endDate)}</span>
              </div>
            )}
          </div>

          <div className="mt-3">
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded border', getSourceBadgeClass(pep.source))}>
              {pep.source}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Adverse Media Tab — connected to real API
function AdverseMediaTab({ entity }: { entity: Entity }) {
  const { data, isLoading } = useQuery({
    queryKey: ['adverse-media-entity', entity.id],
    queryFn: () => complianceService.getAdverseMediaProfile(entity.id),
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

  const profile = data;
  const articles = profile?.articles?.items || [];
  const riskProfile = profile?.risk_profile;
  const structured = profile?.structured_media;
  const hasContent = articles.length > 0 || (structured?.has_adverse_media);

  if (!hasContent) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">No Adverse Media</h3>
        <p className="text-gray-400">No negative media coverage found for this entity.</p>
      </div>
    );
  }

  const severityColor = (s: number) =>
    s >= 90 ? 'text-red-400' : s >= 70 ? 'text-orange-400' : s >= 50 ? 'text-yellow-400' : 'text-blue-400';

  const severityBg = (s: number) =>
    s >= 90 ? 'bg-red-500' : s >= 70 ? 'bg-orange-500' : s >= 50 ? 'bg-yellow-500' : 'bg-blue-500';

  const severityLabel = (s: number) =>
    s >= 90 ? 'Critico' : s >= 70 ? 'Alto' : s >= 50 ? 'Medio' : s >= 30 ? 'Bajo' : 'Minimo';

  const categoryLabels: Record<string, string> = {
    terrorism: 'Terrorismo', sanctions_evasion: 'Evasion Sanciones', wanted: 'Buscados',
    crime: 'Crimen', human_rights: 'DDHH', financial_crime: 'Crimen Financiero',
    corruption: 'Corrupcion', offshore: 'Offshore', regulatory: 'Regulatorio',
  };

  const categoryColors: Record<string, string> = {
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

  const getMethodIcon = (method: string | undefined) => {
    if (method === 'moonshot_ai' || method === 'claude_ai') return Brain;
    if (method === 'keyword') return Tag;
    return Zap;
  };

  const getMethodLabel = (method: string | undefined) => {
    if (method === 'moonshot_ai') return 'Moonshot AI';
    if (method === 'claude_ai') return 'Claude AI';
    if (method === 'keyword') return 'Keywords';
    return method || '';
  };

  return (
    <div className="space-y-4">
      {/* Risk Profile Summary — enhanced gauge */}
      {riskProfile && riskProfile.total_articles > 0 && (
        <div className="glass rounded-xl p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-6">
            {/* Risk Score Gauge */}
            <div className="relative w-20 h-20 shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="14" fill="none"
                  stroke={riskProfile.article_risk_score >= 90 ? '#ef4444' :
                    riskProfile.article_risk_score >= 70 ? '#f97316' :
                    riskProfile.article_risk_score >= 50 ? '#eab308' : '#3b82f6'}
                  strokeWidth="3"
                  strokeDasharray={`${(riskProfile.article_risk_score / 100) * 88} 88`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn('text-lg font-bold', severityColor(riskProfile.article_risk_score))}>
                  {Math.round(riskProfile.article_risk_score)}
                </span>
                <span className="text-[8px] text-gray-500">{severityLabel(riskProfile.article_risk_score)}</span>
              </div>
            </div>

            <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <p className="text-lg font-bold text-white">{riskProfile.total_articles}</p>
                <p className="text-xs text-gray-400">Articulos</p>
              </div>
              <div>
                <p className="text-lg font-bold text-white">{riskProfile.recent_30d}</p>
                <p className="text-xs text-gray-400">Ultimos 30d</p>
              </div>
              <div>
                <p className={cn('text-lg font-bold', severityColor(riskProfile.max_severity))}>
                  {riskProfile.max_severity}
                </p>
                <p className="text-xs text-gray-400">Max Severity</p>
              </div>
            </div>
            {riskProfile.top_categories.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {riskProfile.top_categories.map((cat) => (
                  <Badge key={cat} variant="outline" className={cn('text-[10px]', categoryColors[cat] || 'bg-white/5')}>
                    {categoryLabels[cat] || cat}
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
              <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-2 rounded-lg bg-white/[0.02]">
                <span className="text-sm text-white break-words">{categoryLabels[cat.category] || cat.category}</span>
                <div className="flex items-center gap-2 sm:justify-end">
                  <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full', severityBg(cat.severity))} style={{ width: `${cat.severity}%` }} />
                  </div>
                  <span className={cn('text-xs font-mono', severityColor(cat.severity))}>{cat.severity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Articles (Tier 2) */}
      {articles.length > 0 && (
        <div>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Newspaper className="w-4 h-4" />
              Articulos de Noticias ({articles.length})
            </h4>
            <a
              href="/adverse-media"
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              Ver dashboard completo
              <ArrowRight className="w-3 h-3" />
            </a>
          </div>
          {articles.map((article, index) => {
            const MethodIcon = getMethodIcon(article.classification_method);
            let sourceDomain: string | null = null;
            try {
              sourceDomain = new URL(article.source_url).hostname.replace('www.', '');
            } catch { /* ignore */ }

            return (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'glass rounded-xl p-4 mb-3 border-l-4',
                  article.severity >= 90 ? 'border-red-500/70' :
                  article.severity >= 70 ? 'border-orange-500/60' :
                  article.severity >= 50 ? 'border-yellow-500/50' :
                  'border-blue-500/40'
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-2">
                  <h5 className="text-sm font-medium text-white flex-1 line-clamp-2">{article.title}</h5>
                  {article.severity > 0 && (
                    <div className="flex items-center gap-1 shrink-0 sm:self-start">
                      <div className="w-12 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full', severityBg(article.severity))} style={{ width: `${article.severity}%` }} />
                      </div>
                      <span className={cn('text-xs font-mono font-bold', severityColor(article.severity))}>
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
                    <Badge key={cat} variant="outline" className={cn('text-[10px]', categoryColors[cat] || 'bg-white/5')}>
                      {categoryLabels[cat] || cat}
                    </Badge>
                  ))}

                  {article.classification_method && (
                    <Badge variant="outline" className={cn('text-[10px] gap-1',
                      article.classification_method === 'moonshot_ai' ? 'bg-violet-500/10 text-violet-400 border-violet-500/30' :
                      article.classification_method === 'claude_ai' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' :
                      'bg-gray-500/10 text-gray-400 border-gray-500/30'
                    )}>
                      <MethodIcon className="w-3 h-3" />
                      {getMethodLabel(article.classification_method)}
                    </Badge>
                  )}

                  <span className="text-gray-500 flex items-center gap-1 break-words sm:ml-auto">
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
                  <a
                    href={article.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-blue-400 hover:text-blue-300"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Leer articulo
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

// Relationships Tab
function RelationshipsTab({ entity }: { entity: Entity }) {
  if (entity.relationships.length === 0) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <Network className="w-12 h-12 text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">No Relationships</h3>
        <p className="text-gray-400">No known relationships found for this entity.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entity.relationships.map((rel, index) => (
        <motion.div
          key={rel.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="glass rounded-xl p-5"
        >
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/30">
                  {getRelationshipTypeLabel(rel.type)}
                </Badge>
                <span className="text-xs text-gray-500">
                  Confidence: {rel.confidence}%
                </span>
              </div>
              <p className="text-white">{rel.description || 'No description available'}</p>
            </div>
            <div className="text-right">
              {rel.isCurrent ? (
                <Badge className="bg-green-500/10 text-green-400 border-green-500/30">Current</Badge>
              ) : (
                <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/30">Former</Badge>
              )}
            </div>
          </div>

          {(rel.startDate || rel.endDate) && (
            <div className="flex gap-4 mt-3 text-sm text-gray-400">
              {rel.startDate && (
                <span>From: {formatDate(rel.startDate)}</span>
              )}
              {rel.endDate && (
                <span>To: {formatDate(rel.endDate)}</span>
              )}
            </div>
          )}

          <div className="mt-3">
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded border', getSourceBadgeClass(rel.source))}>
              {rel.source}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Audit Tab
function AuditTab({ entity }: { entity: Entity }) {
  const auditEvents: Array<{
    date: string;
    action: string;
    user: string;
    type: string;
    content?: string;
  }> = [
    { date: entity.firstSeen, action: 'Entity First Seen', user: 'System', type: 'system' },
    { date: entity.lastUpdated, action: 'Data Updated', user: 'System', type: 'system' },
    ...entity.investigations.flatMap(inv =>
      inv.notes.map(note => ({
        date: note.createdAt,
        action: `Note: ${note.type}`,
        user: note.author,
        type: 'note',
        content: note.content,
      }))
    ),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="glass rounded-xl p-5">
      <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
        <History className="w-5 h-5 text-blue-400" />
        Activity History
      </h3>

      <ScrollArea className="h-[400px]">
        <div className="space-y-4">
          {auditEvents.map((event, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex gap-4 p-3 rounded-lg hover:bg-white/[0.02]"
            >
              <div className="flex flex-col items-center">
                <div className={cn(
                  'w-3 h-3 rounded-full',
                  event.type === 'system' ? 'bg-blue-500' : 'bg-amber-500'
                )} />
                {index < auditEvents.length - 1 && (
                  <div className="w-px h-full bg-white/10 mt-1" />
                )}
              </div>

              <div className="flex-1 pb-4">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-white font-medium">{event.action}</span>
                  <span className="text-xs text-gray-500">by {event.user}</span>
                </div>
                <span className="text-xs text-gray-500">{formatDate(event.date)}</span>
                {'content' in event && event.content && (
                  <p className="text-sm text-gray-400 mt-2">{event.content}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export default InformationTabs;
