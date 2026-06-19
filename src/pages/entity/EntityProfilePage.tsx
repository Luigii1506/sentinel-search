import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
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
  Database,
  Shield,
  CreditCard,
  Network,
  Landmark,
  Newspaper,
  ExternalLink,
  Tag,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEntity, useEntityProfile } from '@/hooks/useEntity';
import { useNetwork, useRelationshipsList } from '@/hooks/useGraph';
import { entityService, type EntityProfile, type WikidataLink } from '@/services/entities';
import { EntityOverviewSummary } from '@/components/entity/EntityOverviewSummary';
import { EntityOverviewDetailsGrid } from '@/components/entity/EntityOverviewDetailsGrid';
import { PublicTrajectoryCard } from '@/components/entity/PublicTrajectoryCard';
import { RelationshipContextSummaryCard } from '@/components/entity/RelationshipContextSummaryCard';
import { EntityLazyTabPanel } from '@/components/entity/EntityLazyTabPanel';
import { EntitySourceRecordsCard } from '@/components/entity/EntitySourceRecordsCard';
import { buildCanonicalPepEntries, buildUnifiedCareerEntries, countryNames, formatSourceName, type CanonicalPepEntry } from '@/components/entity/entityProfileUtils';
import type { RelationshipLevelFilter, RelationshipContextFilter, RelationshipPriorityFilter } from '@/components/entity/relationshipViewModel';
import { getReferenceRelationshipSortScore, translateSubtype } from '@/components/entity/relationshipHelpers';
import { AppPage, PageHeader, DetailPageSkeleton, EmptyState, CategoryBadge, PanelSkeleton } from '@/components/foundation';
import { cn, getRiskColor, formatDate, humanizeEntityName } from '@/lib/utils';
import { fadeUp } from '@/lib/motion';
import { SourceLevelSelector } from '@/components/SourceLevelSelector';
import type { RiskLevel } from '@/types';
import type { APIEntity, APISanctionEntry } from '@/types/api';
import { toast } from 'sonner';

const entityTypeIcons = {
  person: User,
  company: Building2,
  vessel: Ship,
  aircraft: Plane,
  organization: Users,
};

const LazyRelationshipGraph = lazy(() =>
  import('@/components/graph/RelationshipGraph').then((module) => ({
    default: module.RelationshipGraph,
  }))
);

const LazyProvenancePanel = lazy(() =>
  import('@/components/entity/ProvenancePanel').then((module) => ({
    default: module.ProvenancePanel,
  }))
);

const LazyEntityAdverseMediaTab = lazy(() =>
  import('@/components/entity/EntityAdverseMediaTab').then((module) => ({
    default: module.EntityAdverseMediaTab,
  }))
);

const LazyNetworkRiskTab = lazy(() =>
  import('@/components/entity/NetworkRiskTab').then((module) => ({
    default: module.NetworkRiskTab,
  }))
);

const LazyUBOTab = lazy(() =>
  import('@/components/entity/UBOTab').then((module) => ({
    default: module.UBOTab,
  }))
);

const LazyPepAnalyticsTab = lazy(() =>
  import('@/components/entity/PepAnalyticsTab').then((module) => ({
    default: module.PepAnalyticsTab,
  }))
);

const LazyEntityRelationshipsTab = lazy(() =>
  import('@/components/entity/EntityRelationshipsTab').then((module) => ({
    default: module.EntityRelationshipsTab,
  }))
);

const LazyEntityNetworkTab = lazy(() =>
  import('@/components/entity/EntityNetworkTab').then((module) => ({
    default: module.EntityNetworkTab,
  }))
);

function summarizeEntityExposure(t: TFunction, entity: APIEntity, profile?: EntityProfile, pepEntries: CanonicalPepEntry[] = entity.pep_entries): string {
  const activeSanctions = entity.sanctions.filter((item) => item.status === 'active').length;
  const pepState = profile?.overview.pep_status || entity.pep_status || (
    entity.is_current_pep ? 'current_pep' : pepEntries.length > 0 ? 'ex_pep' : 'non_pep'
  );
  const pepStatus =
    pepState === 'current_pep'
      ? t('entity.exposure.statusCurrentPep')
      : pepState === 'former_pep_in_monitoring'
        ? t('entity.exposure.statusFormerPepMonitoring')
        : pepState === 'ex_pep'
          ? t('entity.exposure.statusExPep')
          : null;
  const adverseMediaCount = entity.adverse_media?.length || 0;
  const relationshipCount = profile?.connections?.aml_visible_relationships || 0;
  const contextualCount = profile?.connections?.contextual_relationships || 0;
  const pepSuffix = entity.pep_category ? ` (${entity.pep_category})` : '';

  if (activeSanctions > 0 && pepState === 'current_pep') {
    return t('entity.exposure.highInterest', { count: activeSanctions });
  }
  if (activeSanctions > 0) {
    return t('entity.exposure.sanctioned', { count: activeSanctions });
  }
  if (pepState === 'current_pep') {
    return t('entity.exposure.currentPep', { suffix: pepSuffix });
  }
  if (pepState === 'former_pep_in_monitoring') {
    return t('entity.exposure.monitoringPep', { suffix: pepSuffix });
  }
  if (adverseMediaCount > 0) {
    return t('entity.exposure.adverseMedia', { count: adverseMediaCount });
  }
  if (relationshipCount > 0) {
    return t('entity.exposure.relationships', { count: relationshipCount });
  }
  if (contextualCount > 0) {
    return t('entity.exposure.contextual', { count: contextualCount });
  }
  if (pepStatus) {
    return t('entity.exposure.pepStatusOnly', { status: pepStatus });
  }
  return t('entity.exposure.default');
}

function getRelationshipSignalSummary(t: TFunction, profile?: EntityProfile): Array<{ label: string; value: number }> {
  if (!profile?.connections) return [];

  const counts = profile.connections.relationship_counts || {};
  const summary = [
    { label: t('entity.relationships.type.family'), value: counts.family || 0 },
    { label: t('entity.relationships.type.associate'), value: counts.associate || 0 },
    { label: t('entity.relationships.type.corporate'), value: (counts.corporate || 0) + (counts.beneficial_ownership || 0) },
    { label: t('entity.relationships.type.political'), value: counts.political || 0 },
    { label: t('entity.relationships.type.sanction'), value: counts.sanction || 0 },
  ];

  return summary.filter((item) => item.value > 0);
}

function formatAddressValue(address: {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}): string | null {
  const parts = [
    address.street?.trim(),
    address.city?.trim(),
    address.state?.trim(),
    address.country?.trim() ? (countryNames[address.country.trim()] || address.country.trim()) : undefined,
  ].filter(Boolean);

  if (parts.length === 0) return null;
  return parts.join(', ');
}

function getAliasTypeLabel(t: TFunction, type: string): string {
  const labels: Record<string, string> = {
    primary: t('entity.aliasType.primary'),
    alias: t('entity.aliasType.alias'),
    also_known_as: t('entity.aliasType.aka'),
    former_name: t('entity.aliasType.formerName'),
    maiden_name: t('entity.aliasType.maidenName'),
    trading_as: t('entity.aliasType.tradingAs'),
  };
  return labels[type] || type;
}

type EntityTabId =
  | 'overview'
  | 'sanctions'
  | 'pep'
  | 'media'
  | 'relationships'
  | 'network'
  | 'network-risk'
  | 'ubo'
  | 'provenance';

function isWikidataOnlyProfile(profile?: EntityProfile): boolean {
  const sources = profile?.overview.sources || [];
  return sources.length > 0 && sources.every((source) => source === 'WIKIDATA');
}

function isReferenceLikeEntity(entity: APIEntity, profile?: EntityProfile): boolean {
  const hasPrimarySignals =
    (entity.sanctions?.length || 0) > 0 ||
    (entity.pep_entries?.length || 0) > 0 ||
    entity.is_current_pep === true ||
    (entity.adverse_media?.length || 0) > 0;

  return !hasPrimarySignals && isWikidataOnlyProfile(profile);
}

// Loading Skeleton
function EntityProfileSkeleton() {
  return <DetailPageSkeleton width="wide" />;
}

// Not Found State
function EntityNotFound() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <AppPage width="wide">
      <EmptyState
        icon={AlertTriangle}
        title={t('entity.notFound.title')}
        description={t('entity.notFound.description')}
        action={
          <Button onClick={() => navigate('/search')} className="btn-primary">
            {t('entity.notFound.backToSearch')}
          </Button>
        }
        tone="warning"
      />
    </AppPage>
  );
}

// Risk Score Gauge
function RiskScoreGauge({ score, level }: { score: number; level: RiskLevel }) {
  const { t } = useTranslation();
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
        <span className="text-3xl font-bold text-foreground">{score}</span>
        <span className="text-xs text-muted-foreground uppercase">{t('entity.gauge.risk')}</span>
      </div>
    </div>
  );
}

// Information Item
function InfoItem({ label, value, icon: Icon }: { label: string; value?: any; icon?: React.ComponentType<{className?: string}> }) {
  if (value == null || value === '') return null;
  // Defensive: stringify objects so we never crash with "Objects are not valid as React child"
  const displayValue =
    typeof value === 'string' || typeof value === 'number'
      ? String(value)
      : _stringifyListItem(value);
  if (!displayValue) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="w-4 h-4 text-muted-foreground mt-0.5" />}
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground uppercase">{label}</p>
        <p className="text-sm text-foreground break-words">{displayValue}</p>
      </div>
    </div>
  );
}

// Normaliza un item potencialmente objeto a string legible. Soporta shapes comunes
// del backend: education {institution, role, degree, start_date, end_date},
// career {employer, role, ...}, political {party, role, ...}.
function _stringifyListItem(item: any): string {
  if (item == null) return '';
  if (typeof item === 'string' || typeof item === 'number') return String(item);
  if (typeof item !== 'object') return String(item);
  // Try common education/career/political shapes
  const role = item.role || item.degree || item.position || item.title;
  const place = item.institution || item.employer || item.organization || item.party;
  const start = item.start_date || item.from || '';
  const end = item.end_date || item.to || '';
  const dates = (start || end) ? ` (${start || '?'}–${end || 'present'})` : '';
  if (role && place) return `${role} @ ${place}${dates}`;
  if (place) return `${place}${dates}`;
  if (role) return `${role}${dates}`;
  if (item.description) return String(item.description);
  if (item.name) return String(item.name);
  // Fallback: don't crash — show JSON
  try {
    return JSON.stringify(item);
  } catch {
    return '[object]';
  }
}

function ListInfoItem({ label, items, icon: Icon, maxVisible = 5 }: {
  label: string;
  items?: any[] | string | null;
  icon?: React.ComponentType<{className?: string}>;
  maxVisible?: number;
}) {
  const { t } = useTranslation();
  if (!items) return null;
  const rawList = Array.isArray(items) ? items : [items];
  // Normalize each item to string (defensive against objects)
  const list = rawList.map(_stringifyListItem).filter(Boolean);
  if (list.length === 0) return null;

  // Si solo hay 1 item, mostrarlo como InfoItem normal
  if (list.length === 1) {
    return <InfoItem label={label} value={list[0]} icon={Icon} />;
  }

  const visible = list.slice(0, maxVisible);
  const remaining = list.length - maxVisible;

  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="w-4 h-4 text-muted-foreground mt-0.5" />}
      <div>
        <p className="text-xs text-muted-foreground uppercase">{label}</p>
        <ul className="text-sm text-foreground space-y-0.5 mt-0.5">
          {visible.map((item, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="text-muted-foreground mt-1">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        {remaining > 0 && (
          <p className="text-xs text-muted-foreground mt-1">{t('entity.list.more', { count: remaining })}</p>
        )}
      </div>
    </div>
  );
}

function ReferenceLinksList({
  label,
  items,
  icon: Icon,
  onOpenReference,
  maxVisible = 5,
}: {
  label: string;
  items?: WikidataLink[] | null;
  icon?: React.ComponentType<{ className?: string }>;
  onOpenReference: (item: WikidataLink) => void;
  maxVisible?: number;
}) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  if (!items || items.length === 0) return null;

  const visible = isExpanded ? items : items.slice(0, maxVisible);
  const remaining = items.length - maxVisible;

  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="w-4 h-4 text-muted-foreground mt-0.5" />}
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground uppercase">{label}</p>
        <div className="space-y-2 mt-1">
          {visible.map((item, i) => (
            <button
              key={`${item.qid || item.name}-${i}`}
              type="button"
              onClick={() => onOpenReference(item)}
              className="w-full rounded-lg border border-foreground/10 bg-foreground/[0.03] px-3 py-2 text-left hover:bg-foreground/[0.06] transition-colors"
            >
              <span className="text-sm text-foreground leading-snug block">
                {humanizeEntityName(item.name)}
              </span>
            </button>
          ))}
        </div>
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => setIsExpanded((value) => !value)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-300 mt-1"
          >
            {isExpanded ? t('entity.list.showLess') : t('entity.list.showMore', { count: remaining })}
          </button>
        )}
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
  if (!riesgo) return 'bg-gray-500/10 text-muted-foreground';
  const r = riesgo.toUpperCase();
  if (r === 'CRITICAL') return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30';
  if (r === 'HIGH') return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30';
  if (r === 'MEDIUM') return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30';
  return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30';
}

// Sanction Entry Card (enriched)
function SanctionEntry({ entry }: { entry: APISanctionEntry }) {
  const { t } = useTranslation();
  const details = entry.details;
  const borderColor = details?.riesgo ? getRiskBorderColor(details.riesgo) : 'border-red-500';

  return (
    <div className={cn('glass rounded-lg p-4 border-l-4', borderColor)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-2">
        <div className="min-w-0">
          <h4 className="text-foreground font-medium">{entry.source}</h4>
          <p className="text-sm text-muted-foreground">{entry.program}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {details?.riesgo && (
            <Badge variant="outline" className={cn('text-xs', getRiskBadgeClasses(details.riesgo))}>
              {details.riesgo}
            </Badge>
          )}
          <Badge variant="outline" className={cn(
            'text-xs',
            entry.status === 'active' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' : 'bg-gray-500/10 text-muted-foreground'
          )}>
            {entry.status === 'active' ? t('entity.sanctions.statusActive') : entry.status}
          </Badge>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-2">{entry.reason}</p>

      {/* Enriched details grid */}
      {details && Object.keys(details).length > 0 && (
        <div className="mt-3 pt-3 border-t border-foreground/5">
          <div className="grid grid-cols-1 sm:grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {details.rfc && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">{t('entity.sanctions.details.rfc')}</p>
                <p className="text-sm text-foreground font-mono break-all">{details.rfc}</p>
              </div>
            )}
            {details.dataset_label && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">{t('entity.sanctions.details.dataset')}</p>
                <p className="text-sm text-foreground break-words">{details.dataset_label}</p>
              </div>
            )}
            {details.supuesto && (
              <div className="col-span-2 md:col-span-1">
                <p className="text-[10px] text-muted-foreground uppercase">{t('entity.sanctions.details.supuesto')}</p>
                <p className="text-sm text-foreground break-words">{details.supuesto}</p>
              </div>
            )}
            {details.monto && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">{t('entity.sanctions.details.amount')}</p>
                <p className="text-sm text-foreground break-words">{details.monto}</p>
              </div>
            )}
            {details.entidad_federativa && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">{t('entity.sanctions.details.federalEntity')}</p>
                <p className="text-sm text-foreground break-words">{details.entidad_federativa}</p>
              </div>
            )}
            {details.tipo_persona && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">{t('entity.sanctions.details.personType')}</p>
                <p className="text-sm text-foreground break-words">{details.tipo_persona}</p>
              </div>
            )}
            {details.fecha_publicacion && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">{t('entity.sanctions.details.publicationDate')}</p>
                <p className="text-sm text-foreground break-words">{details.fecha_publicacion}</p>
              </div>
            )}
          </div>

          {/* Nested datasets (aggregated format) */}
          {details.datasets && Array.isArray(details.datasets) && details.datasets.length > 1 && (
            <div className="mt-3 pt-3 border-t border-foreground/5">
              <p className="text-xs text-muted-foreground mb-2">
                {t('entity.sanctions.appearsInDatasets', { count: details.dataset_count || details.datasets.length })}
              </p>
              <div className="space-y-2">
                {details.datasets.map((ds, idx) => {
                  const d = ds as Record<string, unknown>;
                  return (
                    <div key={idx} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 p-2 rounded bg-foreground/5">
                      <Badge variant="outline" className={cn('text-[10px]', getRiskBadgeClasses(String(d.riesgo || '')))}>
                        {String(d.riesgo || 'N/A')}
                      </Badge>
                      <span className="text-xs text-foreground break-words">{String(d.dataset_label || d.dataset || '')}</span>
                      {d.supuesto ? <span className="text-xs text-muted-foreground break-words">{String(d.supuesto)}</span> : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-2">{t('entity.sanctions.listing', { date: formatDate(entry.listing_date) })}</p>
    </div>
  );
}

function TabPanelFallback({ lines = 4 }: { lines?: number }) {
  return <PanelSkeleton className="rounded-xl" lines={lines} />;
}

export function EntityProfilePage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [showAllAliases, setShowAllAliases] = useState(false);
  const [relLevelFilter, setRelLevelFilter] = useState<RelationshipLevelFilter>(undefined);
  const [relContextFilter, setRelContextFilter] = useState<RelationshipContextFilter>(undefined);
  const [relPriorityFilter, setRelPriorityFilter] = useState<RelationshipPriorityFilter>(undefined);
  const [relSearch, setRelSearch] = useState('');
  const [includeContextualRelationships, setIncludeContextualRelationships] = useState(false);
  const [showRelationshipFilters, setShowRelationshipFilters] = useState(true);
  const [collapsedRelationshipSections, setCollapsedRelationshipSections] = useState<Record<string, boolean>>({});
  const [graphDepth, setGraphDepth] = useState(1);

  const sourceLevelParam = searchParams.get('source_level');
  const [sourceLevel, setSourceLevel] = useState<1 | 2 | 3 | 4 | 5>(
    sourceLevelParam ? (parseInt(sourceLevelParam) as 1 | 2 | 3 | 4 | 5) : 2
  );

  const handleSourceLevelChange = (level: 1 | 2 | 3 | 4 | 5) => {
    setSourceLevel(level);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('source_level', String(level));
    setSearchParams(newParams, { replace: true });
  };

  const handleOpenReference = async (item: WikidataLink) => {
    if (item.entity_id) {
      navigate(`/entity/${item.entity_id}?source_level=${sourceLevel}`);
      return;
    }

    try {
      const resolved = await entityService.resolveReference({
        qid: item.qid,
        name: item.name,
      });

      if (resolved.found && resolved.entity_id) {
        navigate(`/entity/${resolved.entity_id}?source_level=${sourceLevel}`);
        return;
      }

      if (resolved.reference_tier === 'suppress') {
        toast.message(t('entity.reference.suppressNotice', { name: item.name }));
        return;
      }

      toast.message(t('entity.reference.noLocalProfile', { name: item.name }));
    } catch {
      toast.error(t('entity.reference.resolveError'));
    }
  };

  const lang = (i18n.resolvedLanguage || i18n.language || 'es').split('-')[0] as 'es' | 'en';
  const { entity, isLoading, error, refetch } = useEntity(id, sourceLevel);
  const { profile, isLoading: profileLoading } = useEntityProfile(id, lang);
  const isProfilePending = profileLoading && !profile;
  const referenceLikeForQueries = entity ? isReferenceLikeEntity(entity, profile) : isWikidataOnlyProfile(profile);
  const overviewStructuredFamilyCount =
    (profile?.connections?.family?.father ? 1 : 0) +
    (profile?.connections?.family?.mother ? 1 : 0) +
    (profile?.connections?.family?.spouses?.length || 0) +
    (profile?.connections?.family?.children?.length || 0) +
    (profile?.connections?.family?.siblings?.length || 0);
  const shouldFetchOverviewFamilyRelationships =
    activeTab === 'overview' &&
    !referenceLikeForQueries &&
    overviewStructuredFamilyCount === 0;
  const { data: networkData, isLoading: networkLoading } = useNetwork(id, { depth: graphDepth, enabled: activeTab === 'network' });
  const { data: familyRelationships } = useRelationshipsList(id, {
    enabled: shouldFetchOverviewFamilyRelationships,
    type: referenceLikeForQueries ? undefined : 'family',
    hide_noise: false,
    limit: 12,
  });
  const { data: relationshipsList } = useRelationshipsList(id, {
    enabled: activeTab === 'relationships',
    level: relLevelFilter,
    aml_priority: relPriorityFilter,
    context_category: relContextFilter,
    // Always fetch the full set (AML + contextual). The contextual toggle is
    // applied client-side so the summary counts and the rendered list derive
    // from one consistent source and always reconcile.
    hide_noise: false,
    limit: 100,
  });

  const validAddresses = useMemo(() => entity?.addresses?.filter((address) => formatAddressValue(address)) || [], [entity?.addresses]);
  const relationshipSignals = useMemo(() => getRelationshipSignalSummary(t, profile), [profile, t]);
const overviewFamilyRelationships = useMemo(() => [...(familyRelationships?.relationships || [])].sort((a, b) => {
  if (referenceLikeForQueries) {
    return getReferenceRelationshipSortScore(b) - getReferenceRelationshipSortScore(a)
      || a.related_entity_name.localeCompare(b.related_entity_name);
  }
  return (b.related_entity_risk_score || 0) - (a.related_entity_risk_score || 0)
    || Number(Boolean(b.related_entity_is_pep)) - Number(Boolean(a.related_entity_is_pep))
    || a.related_entity_name.localeCompare(b.related_entity_name);
}), [familyRelationships?.relationships, referenceLikeForQueries]);
const overviewStructuredFamily = useMemo(() => {
  const family = profile?.connections?.family;
  if (!family) return [];

  return [
    family.father ? { ...family.father, relationship_label: t('entity.relationships.family.father') } : null,
    family.mother ? { ...family.mother, relationship_label: t('entity.relationships.family.mother') } : null,
    ...family.spouses.map((link) => ({ ...link, relationship_label: t('entity.relationships.family.spouse') })),
    ...family.children.map((link) => ({ ...link, relationship_label: t('entity.relationships.family.child') })),
    ...family.siblings.map((link) => ({ ...link, relationship_label: t('entity.relationships.family.sibling') })),
  ].filter((link): link is WikidataLink & { relationship_label: string } => Boolean(link?.name));
}, [profile?.connections?.family, t]);
const canonicalPepEntries = useMemo(() => buildCanonicalPepEntries(entity, profile), [entity, profile]);
const unifiedCareerEntries = useMemo(() => buildUnifiedCareerEntries(profile, canonicalPepEntries), [profile, canonicalPepEntries]);
const pepStatus = profile?.overview.pep_status || entity?.pep_status || 'non_pep';
const pepMonitoringUntil = profile?.overview.pep_monitoring_until || entity?.pep_monitoring_until || null;
const taxIdentification = useMemo(() => entity?.identifications?.find((item) => item.type === 'tax_id'), [entity?.identifications]);
const hasSanctions =

 (entity?.sanctions?.length || 0) > 0;
  const hasPep = canonicalPepEntries.length > 0 || entity?.is_current_pep === true || !!entity?.pep_category;
  const hasMedia = (entity?.adverse_media?.length || 0) > 0;
  const totalRelationships = profile?.connections?.total_relationships || 0;
  const amlVisibleRelationships = profile?.connections?.aml_visible_relationships ?? totalRelationships;
  const totalDetectedRelationships = profile?.connections?.total_detected_relationships ?? Math.max(totalRelationships, amlVisibleRelationships);
  const contextualRelationships = profile?.connections?.contextual_relationships ?? Math.max(totalDetectedRelationships - amlVisibleRelationships, 0);
  const prioritizedRelationshipCounts = profile?.connections?.relationship_counts || {};
  const allRelationshipCounts = profile?.connections?.all_relationship_counts || {};
  const hasRelationships = amlVisibleRelationships > 0;
  const hasContextualProfileData =
    !!profile?.header.description ||
    (profile?.career.positions?.length || 0) > 0 ||
    (profile?.career.education?.length || 0) > 0 ||
    (profile?.career.political?.length || 0) > 0 ||
    validAddresses.length > 0;
  const referenceLike = entity ? isReferenceLikeEntity(entity, profile) : false;
  const isCorporateEntity = entity?.entity_type === 'company' || entity?.entity_type === 'organization';
  const shouldShowRelationshipsTab = isProfilePending || hasRelationships || hasContextualProfileData;
  const relationshipsTabCount = relationshipsList?.total
    ?? (isProfilePending ? undefined : totalDetectedRelationships || undefined);
  const showNetwork = hasRelationships;
  const showNetworkRisk = !referenceLike && ((entity?.overall_risk_score || 0) >= 40 || hasRelationships);
  const showUBO = isCorporateEntity && !referenceLike && hasRelationships;
  const canUseProfileRelationshipsPreview =
    !referenceLike &&
    !includeContextualRelationships &&
    !relLevelFilter &&
    !relContextFilter &&
    !relPriorityFilter;
  const profileRelationshipsPreview = canUseProfileRelationshipsPreview && profile?.connections
    ? {
        entity_id: entity?.id || id || '',
        entity_name: entity?.primary_name || profile.header.canonical_name,
        relationships: profile.connections.visible_relationships_preview || [],
        total: profile.connections.visible_relationships_preview_total || 0,
        by_type: profile.connections.visible_relationships_preview_by_type || {},
      }
    : null;
  const effectiveRelationshipsList = relationshipsList ?? profileRelationshipsPreview;
  const availableTabs = useMemo<Array<{ id: EntityTabId; label: string; count?: number; icon?: typeof Newspaper }>>(() => {
    const tabs: Array<{ id: EntityTabId; label: string; count?: number; icon?: typeof Newspaper }> = [
      { id: 'overview', label: referenceLike ? t('entity.tabs.context') : t('entity.tabs.overview') },
    ];

    if (hasSanctions) tabs.push({ id: 'sanctions', label: t('entity.tabs.sanctions'), count: entity?.sanctions?.length });
    if (hasPep) tabs.push({ id: 'pep', label: t('entity.tabs.pep'), count: canonicalPepEntries.length || undefined });
    if (hasMedia && !referenceLike) tabs.push({ id: 'media', label: t('entity.tabs.media'), icon: Newspaper });
    if (shouldShowRelationshipsTab) {
      tabs.push({ id: 'relationships', label: t('entity.tabs.relationships'), count: relationshipsTabCount });
    }
    if (showNetwork) tabs.push({ id: 'network', label: t('entity.tabs.network') });
    if (showNetworkRisk) tabs.push({ id: 'network-risk', label: t('entity.tabs.networkRisk'), icon: Network });
    if (showUBO) tabs.push({ id: 'ubo', label: t('entity.tabs.ubo'), icon: Landmark });
    // Provenance siempre disponible (motor nuevo, FtM-shaped)
    tabs.push({ id: 'provenance', label: t('entity.tabs.provenance'), icon: Database });

    return tabs;
  }, [
    entity?.sanctions?.length,
    canonicalPepEntries.length,
    entity?.entity_type,
    entity?.overall_risk_score,
    hasContextualProfileData,
    hasMedia,
    hasPep,
    hasRelationships,
    hasSanctions,
    isProfilePending,
    referenceLike,
    relationshipsTabCount,
    shouldShowRelationshipsTab,
    showNetwork,
    showNetworkRisk,
    showUBO,
    totalDetectedRelationships,
    totalRelationships,
    t,
  ]);

  useEffect(() => {
    if (!availableTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab('overview');
    }
  }, [activeTab, availableTabs]);

  useEffect(() => {
    if (referenceLikeForQueries || activeTab !== 'relationships') {
      return;
    }

    const prioritizedFamilyCount = Number(prioritizedRelationshipCounts.family || 0);
    const totalFamilyCount = Number(allRelationshipCounts.family || 0);

    if (prioritizedFamilyCount === 0 && totalFamilyCount > 0 && !includeContextualRelationships) {
      setIncludeContextualRelationships(true);
    }
  }, [
    activeTab,
    allRelationshipCounts.family,
    includeContextualRelationships,
    prioritizedRelationshipCounts.family,
    referenceLikeForQueries,
  ]);

  if (isLoading) {
    return <EntityProfileSkeleton />;
  }

  if (error || !entity) {
    return <EntityNotFound />;
  }

  const Icon = entityTypeIcons[entity.entity_type] || User;
  const riskColor = getRiskColor(entity.risk_level);
  const entityTypeLabels: Record<string, string> = {
    person: t('common.entityType.person'),
    company: t('common.entityType.company'),
    vessel: t('common.entityType.vessel'),
    aircraft: t('common.entityType.aircraft'),
    organization: t('common.entityType.organization'),
  };
  const riskLevelLabels: Record<string, string> = {
    critical: t('common.risk.critical'),
    high: t('common.risk.high'),
    medium: t('common.risk.medium'),
    low: t('common.risk.low'),
    none: t('common.states.none'),
  };

  return (
    <AppPage width="wide">
      <PageHeader
        title={humanizeEntityName(profile?.header.display_name || entity.primary_name)}
        description={profile?.header.description}
        icon={
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${riskColor}15` }}
          >
            <Icon className="w-6 h-6" style={{ color: riskColor }} />
          </div>
        }
        actions={
          <>
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('entity.header.back')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">{t('entity.header.refresh')}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">{t('entity.header.share')}</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </>
        }
      />
        {/* Header Card */}
        <motion.div
          {...fadeUp}
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-muted-foreground">
                      {entityTypeLabels[entity.entity_type]}
                    </Badge>
                    {referenceLike ? (
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/30">
                        {t('entity.badges.contextualReference')}
                      </Badge>
                    ) : hasRelationships && !hasSanctions && !hasPep ? (
                      <Badge variant="outline" className="bg-violet-500/10 text-violet-600 dark:text-violet-300 border-violet-500/30">
                        {t('entity.badges.relatedEntity')}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                        {t('entity.badges.mainSubject')}
                      </Badge>
                    )}
                    {referenceLike && profile?.header.reference_tier ? (
                      <Badge
                        variant="outline"
                        className={cn(
                          'capitalize',
                          profile.header.reference_tier === 'premium' && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
                          profile.header.reference_tier === 'graph_only' && 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
                          profile.header.reference_tier === 'suppress' && 'bg-gray-500/10 text-muted-foreground border-gray-500/30',
                        )}
                        title={profile.header.reference_tier_reason || undefined}
                      >
                        {profile.header.reference_tier === 'premium'
                          ? t('entity.badges.premiumReference')
                          : profile.header.reference_tier === 'graph_only'
                            ? t('entity.badges.contextOnly')
                            : t('entity.badges.lowValue')}
                      </Badge>
                    ) : null}
                    <Badge
                      style={{
                        backgroundColor: `${riskColor}20`,
                        color: riskColor,
                        borderColor: `${riskColor}40`,
                      }}
                    >
                      {t('entity.header.riskLabel', { level: riskLevelLabels[entity.risk_level] })}
                    </Badge>
                    {/* Topics */}
                    {entity.topics?.map((topic: string) => {
                      const topicColors: Record<string, string> = {
                        sanction: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
                        pep: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
                        crime: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
                        debarment: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
                        poi: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
                      };
                      return (
                        <Badge
                          key={topic}
                          variant="outline"
                          className={`text-xs capitalize ${topicColors[topic] || 'bg-gray-500/10 text-muted-foreground border-gray-500/20'}`}
                        >
                          {topic}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Quick Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-6 min-w-0">
                {entity.country && (
                  <InfoItem label={t('entity.fields.country')} value={countryNames[entity.country] || entity.country} icon={Globe} />
                )}
                {taxIdentification && (
                  <InfoItem
                    label={taxIdentification.label || t('entity.fields.rfc')}
                    value={taxIdentification.number}
                    icon={CreditCard}
                  />
                )}
                {(entity.birth_date || entity.date_of_birth) && (
                  <InfoItem label={t('entity.fields.birthDate')} value={formatDate(entity.birth_date || entity.date_of_birth || '')} icon={Calendar} />
                )}
                {entity.gender && (
                  <InfoItem label={t('entity.fields.gender')} value={entity.gender === 'male' ? t('entity.fields.genderMale') : entity.gender === 'female' ? t('entity.fields.genderFemale') : entity.gender} icon={User} />
                )}
                {(profile?.overview.birth_place || entity.place_of_birth) && (
                  <InfoItem label={t('entity.fields.birthPlace')} value={profile?.overview.birth_place || entity.place_of_birth} icon={MapPin} />
                )}
                {validAddresses.length === 1 && (
                  <InfoItem label={t('entity.fields.mainLocation')} value={formatAddressValue(validAddresses[0]) || undefined} icon={MapPin} />
                )}
                {(profile?.overview.nationalities?.length || (entity.nationalities && entity.nationalities.length > 0)) && (
                  <InfoItem
                    label={t('entity.fields.nationalities')}
                    value={profile?.overview.nationalities?.map(n => n.name).join(', ') || entity.nationalities?.map((n: string) => countryNames[n] || n).join(', ')}
                    icon={Globe}
                  />
                )}
                {profile?.career.education?.length ? (
                  <ReferenceLinksList
                    label={t('entity.fields.education')}
                    items={profile.career.education}
                    icon={FileText}
                    onOpenReference={handleOpenReference}
                    maxVisible={5}
                  />
                ) : (
                  <ListInfoItem
                    label={t('entity.fields.education')}
                    items={entity.education}
                    icon={FileText}
                    maxVisible={5}
                  />
                )}
                {profile?.career.political?.length ? (
                  <ReferenceLinksList
                    label={t('entity.fields.politicalAssociation')}
                    items={profile.career.political}
                    icon={Landmark}
                    onOpenReference={handleOpenReference}
                  />
                ) : (
                  <ListInfoItem
                    label={t('entity.fields.politicalAssociation')}
                    items={entity.political}
                    icon={Landmark}
                  />
                )}
                <InfoItem label={t('entity.fields.religion')} value={profile?.personal.religion || (Array.isArray(entity.religion) ? entity.religion[0] : entity.religion)} icon={Tag} />
                <InfoItem label={t('entity.fields.ethnicity')} value={profile?.personal.ethnicity || (Array.isArray(entity.ethnicity) ? entity.ethnicity[0] : entity.ethnicity)} icon={Tag} />
                {entity.incorporation_date && (
                  <InfoItem label={t('entity.fields.incorporationDate')} value={formatDate(entity.incorporation_date)} icon={Calendar} />
                )}
                {entity.incorporation_country && (
                  <InfoItem label={t('entity.fields.incorporationCountry')} value={entity.incorporation_country} icon={MapPin} />
                )}
              </div>

              {/* Data Sources */}
              <div className="mt-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-2">
                  <p className="text-xs text-muted-foreground uppercase">{t('entity.header.dataSources')}</p>
                  <SourceLevelSelector value={sourceLevel} onChange={handleSourceLevelChange} size="sm" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {(entity.data_sources_display || entity.data_sources.map((s: string) => ({ id: s, display_name: s, category: '' }))).map((src: { id: string; display_name: string; category: string }) => {
                    return (
                      <CategoryBadge
                        key={src.id}
                        category={src.category || 'OTHER'}
                        label={src.display_name}
                        className="text-xs"
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Risk Score */}
            <div className="flex flex-col items-center justify-center">
              <RiskScoreGauge score={entity.overall_risk_score} level={entity.risk_level} />
              <p className="text-sm text-muted-foreground mt-4">{t('entity.header.riskScore')}</p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-foreground/5 border border-foreground/10 p-1">
            {availableTabs.map((tab) => {
              const TabIcon = tab.icon;
              const isRelationshipsLoading = tab.id === 'relationships' && isProfilePending;
              const dynamicCount =
                tab.id === 'network' ? networkData?.total_nodes :
                tab.id === 'relationships' ? (totalDetectedRelationships || tab.count) :
                tab.count;

              return (
                <TabsTrigger key={tab.id} value={tab.id} className="data-[state=active]:bg-foreground/10 whitespace-nowrap">
                  {TabIcon ? <TabIcon className="w-4 h-4 sm:mr-1" /> : null}
                  {tab.label}
                  {dynamicCount ? (
                    <Badge className="ml-2 bg-foreground/10 text-gray-200 text-[10px]">
                      {dynamicCount}
                    </Badge>
                  ) : isRelationshipsLoading ? (
                    <span className="ml-2 inline-flex h-5 min-w-8 animate-pulse rounded-full border border-foreground/10 bg-foreground/5" />
                  ) : null}
                </TabsTrigger>
              );
            })}
          </TabsList>

{/* Overview Tab */}
<TabsContent value="overview" className="space-y-6">
  <EntityOverviewSummary
    entity={entity}
    profile={profile}
    canonicalPepCount={canonicalPepEntries.length}
    amlVisibleRelationships={amlVisibleRelationships}
    relationshipSignals={relationshipSignals}
    summaryText={summarizeEntityExposure(t, entity, profile, canonicalPepEntries)}
  />

  {/* Row 2: AML Evidence Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sanciones Activas */}
              {entity.sanctions.length > 0 && (
                <motion.div {...fadeUp} transition={{ delay: 0.05 }}
                  className="glass rounded-xl p-6">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                      <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
                      {t('entity.sanctions.title')}
                    </h3>
                    <Badge className="w-fit bg-red-500/20 text-red-600 dark:text-red-400 text-xs">{entity.sanctions.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {entity.sanctions.slice(0, 5).map((s, i) => (
                      <div key={i} className={cn('p-3 rounded-lg border-l-2',
                        s.status === 'active' ? 'bg-red-500/5 border-red-500/50' : 'bg-foreground/[0.02] border-border/30'
                      )}>
                        <div className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm text-foreground font-medium break-words">{s.source}</span>
                            {s.authority && s.authority !== s.source && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/30">
                                {s.authority}
                              </span>
                            )}
                          </div>
                          <Badge variant="outline" className={cn('text-[10px]',
                            s.status === 'active' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' : 'bg-gray-500/10 text-muted-foreground'
                          )}>
                            {s.status === 'active' ? t('entity.sanctions.statusActiveFem') : s.status === 'removed' ? t('entity.sanctions.statusRemoved') : s.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground break-words">{s.program}</p>
                        {s.reason && <p className="text-xs text-muted-foreground mt-1 break-words line-clamp-2">{s.reason}</p>}
                        <div className="mt-1 flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-[10px] text-muted-foreground">{t('entity.sanctions.listing', { date: formatDate(s.listing_date) })}</p>
                          {s.source_url && (
                            <a
                              href={s.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 dark:text-blue-400 hover:text-blue-300"
                            >
                              {t('entity.sanctions.officialSource')} <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                    {entity.sanctions.length > 5 && (
                      <button onClick={() => setActiveTab('sanctions')}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-300 flex items-center gap-1">
                        {t('entity.sanctions.viewMore', { count: entity.sanctions.length - 5 })} <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

  {/* Public trajectory */}
  {unifiedCareerEntries.length > 0 && (
    <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
      <PublicTrajectoryCard
        unifiedCareerEntries={unifiedCareerEntries}
        canonicalPepEntries={canonicalPepEntries}
        pepStatus={pepStatus}
        onOpenPepDetail={() => setActiveTab('pep')}
      />
    </motion.div>
  )}

{/* Row 3: Relational context */}
            {(profile?.connections && (profile.connections.total_detected_relationships || profile.connections.total_relationships) > 0) && (
              <RelationshipContextSummaryCard
                referenceLike={referenceLike}
                overviewFamilyRelationships={overviewFamilyRelationships}
                overviewStructuredFamily={overviewStructuredFamily}
                totalDetectedRelationships={totalDetectedRelationships}
                amlVisibleRelationships={amlVisibleRelationships}
                contextualRelationships={contextualRelationships}
                relationshipCounts={profile.connections.relationship_counts || {}}
                onOpenRelationships={() => setActiveTab('relationships')}
                translateSubtype={translateSubtype}
                getRiskBadgeClasses={getRiskBadgeClasses}
              />
            )}
            {isProfilePending ? <TabPanelFallback lines={3} /> : null}
          </div>

{/* Row 4: IDs + Aliases + Addresses */}
<EntityOverviewDetailsGrid
  entity={entity}
  validAddresses={validAddresses}
  showAllAliases={showAllAliases}
  setShowAllAliases={setShowAllAliases}
  countryNames={countryNames}
  formatAddressValue={formatAddressValue}
  getAliasTypeLabel={(type) => getAliasTypeLabel(t, type)}
/>

{/* Row 5: Source records */}
  <EntitySourceRecordsCard
    sourceRecords={entity.source_records || []}
    countryNames={countryNames}
    formatSourceName={formatSourceName}
    getRiskBadgeClasses={getRiskBadgeClasses}
  />
</TabsContent>

          {/* Sanctions Tab */}
          <TabsContent value="sanctions">
            {entity.sanctions.length === 0 ? (
              <div className="glass rounded-xl p-12 text-center">
                <CheckCircle className="w-16 h-16 text-green-700 dark:text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-foreground mb-2">{t('entity.sanctions.empty.title')}</h3>
                <p className="text-muted-foreground">{t('entity.sanctions.empty.description')}</p>
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
            <Suspense fallback={<TabPanelFallback lines={4} />}>
              <LazyPepAnalyticsTab
                canonicalPepEntries={canonicalPepEntries}
                pepStatus={pepStatus}
                pepMonitoringUntil={pepMonitoringUntil}
              />
            </Suspense>
          </TabsContent>


          {/* Media Tab — uses adverse media API */}
          <TabsContent value="media">
            <EntityLazyTabPanel
              entityId={entity.id}
              component={LazyEntityAdverseMediaTab}
              fallback={<TabPanelFallback lines={4} />}
            />
          </TabsContent>

{/* Relationships List Tab */}
<TabsContent value="relationships">
  <Suspense fallback={<TabPanelFallback lines={5} />}>
    <LazyEntityRelationshipsTab
    relationshipsList={effectiveRelationshipsList ?? null}
    totalDetectedRelationships={totalDetectedRelationships}
    referenceLike={referenceLike}
    includeContextualRelationships={includeContextualRelationships}
    setIncludeContextualRelationships={setIncludeContextualRelationships}
    showRelationshipFilters={showRelationshipFilters}
    setShowRelationshipFilters={setShowRelationshipFilters}
    relLevelFilter={relLevelFilter}
    setRelLevelFilter={setRelLevelFilter}
    relContextFilter={relContextFilter}
    setRelContextFilter={setRelContextFilter}
    relPriorityFilter={relPriorityFilter}
    setRelPriorityFilter={setRelPriorityFilter}
    relSearch={relSearch}
    setRelSearch={setRelSearch}
    collapsedRelationshipSections={collapsedRelationshipSections}
    setCollapsedRelationshipSections={setCollapsedRelationshipSections}
    countryNames={countryNames}
    onNavigateEntity={(entityId) => navigate(`/entity/${entityId}${sourceLevelParam ? `?source_level=${sourceLevelParam}` : ''}`)}
    hasDetectedOrContextualRelationships={Boolean(profile?.connections?.total_detected_relationships || profile?.connections?.contextual_relationships)}
  />
  </Suspense>
</TabsContent>

{/* Network Tab */}

<TabsContent value="network">
  <Suspense fallback={<TabPanelFallback lines={5} />}>
    <LazyEntityNetworkTab
    networkLoading={networkLoading}
    networkData={networkData}
    graphDepth={graphDepth}
    setGraphDepth={setGraphDepth}
    RelationshipGraphComponent={LazyRelationshipGraph}
    fallback={<TabPanelFallback lines={5} />}
    onNavigateEntity={(entityId: string) => navigate(`/entity/${entityId}`)}
  />
  </Suspense>
</TabsContent>

{/* Network Risk Tab */}

          <TabsContent value="network-risk">
            <EntityLazyTabPanel
              entityId={id!}
              component={LazyNetworkRiskTab}
              fallback={<TabPanelFallback lines={4} />}
            />
          </TabsContent>

          {/* UBO Tab */}
          <TabsContent value="ubo">
            <EntityLazyTabPanel
              entityId={id!}
              component={LazyUBOTab}
              fallback={<TabPanelFallback lines={4} />}
            />
          </TabsContent>

          {/* Provenance Tab (FtM Statement-based: per-property audit trail + time-travel) */}
          <TabsContent value="provenance">
            <EntityLazyTabPanel
              entityId={id!}
              component={LazyProvenancePanel}
              fallback={<TabPanelFallback lines={5} />}
            />
          </TabsContent>
        </Tabs>
    </AppPage>
  );
}

export default EntityProfilePage;
