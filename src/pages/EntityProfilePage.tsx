import { useEffect, useMemo, useState } from 'react';
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
  Search,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { useEntity, useEntityProfile } from '@/hooks/useEntity';
import { useNetwork, useRelationshipsList } from '@/hooks/useGraph';
import { RelationshipGraph } from '@/components/graph/RelationshipGraph';
import { complianceService } from '@/services/compliance';
import { entityService, type EntityProfile, type WikidataLink } from '@/services/entities';
import { cn, getRiskColor, formatDate, humanizeEntityName } from '@/lib/utils';
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

// Traduccion de subtipos de relaciones al español
const subtypeLabels: Record<string, string> = {
  // Familiares
  spouse: 'Cónyuge', wife: 'Esposa', husband: 'Esposo',
  child: 'Hijo/a', son: 'Hijo', daughter: 'Hija',
  parent: 'Padre/Madre', father: 'Padre', mother: 'Madre',
  relative: 'Familiar', family: 'Familiar', relation: 'Familiar',
  sibling: 'Hermano/a', brother: 'Hermano', sister: 'Hermana',
  grandparent: 'Abuelo/a', grandmother: 'Abuela', grandfather: 'Abuelo',
  grandchild: 'Nieto/a', grandson: 'Nieto', granddaughter: 'Nieta',
  uncle: 'Tío', aunt: 'Tía', cousin: 'Primo/a',
  nephew: 'Sobrino', niece: 'Sobrina',
  'in-law': 'Pariente político', 'father-in-law': 'Suegro', 'mother-in-law': 'Suegra',
  'son-in-law': 'Yerno', 'daughter-in-law': 'Nuera',
  'brother-in-law': 'Cuñado', 'sister-in-law': 'Cuñada',
  stepfather: 'Padrastro', stepmother: 'Madrastra',
  stepson: 'Hijastro', stepdaughter: 'Hijastra',
  // Compuestos familiares (e.g., "son's daughter")
  "son's daughter": 'Nieta', "son's son": 'Nieto',
  "daughter's daughter": 'Nieta', "daughter's son": 'Nieto',
  "son's wife": 'Nuera', "daughter's husband": 'Yerno',
  "wife's son": 'Hijastro', "wife's daughter": 'Hijastra',
  "husband's son": 'Hijastro', "husband's daughter": 'Hijastra',
  "ex-spouse": 'Excónyuge', "ex-wife": 'Exesposa', "ex-husband": 'Exesposo',
  "former spouse": 'Excónyuge',
  "male first cousin": 'Primo', "female first cousin": 'Prima',
  "first cousin": 'Primo/a', "second cousin": 'Primo/a segundo',
  "half-brother": 'Medio hermano', "half-sister": 'Media hermana',
  "wife's father": 'Suegro', "wife's mother": 'Suegra',
  "husband's father": 'Suegro', "husband's mother": 'Suegra',
  // Sobrinos/primos con calificador
  "fraternal niece": 'Sobrina', "fraternal nephew": 'Sobrino',
  "maternal niece": 'Sobrina', "maternal nephew": 'Sobrino',
  "paternal niece": 'Sobrina', "paternal nephew": 'Sobrino',
  "male paternal parallel cousin": 'Primo paterno',
  "female paternal parallel cousin": 'Prima paterna',
  "paternal cousin": 'Primo/a paterno', "maternal cousin": 'Primo/a materno',
  // Otros compuestos familiares
  stepbrother: 'Hermanastro', stepsister: 'Hermanastra',
  "younger brother": 'Hermano menor', "older brother": 'Hermano mayor',
  "younger sister": 'Hermana menor', "older sister": 'Hermana mayor',
  godparent: 'Padrino/Madrina', godfather: 'Padrino', godmother: 'Madrina',
  godson: 'Ahijado', goddaughter: 'Ahijada',
  fiancé: 'Prometido', fiancée: 'Prometida', fiance: 'Prometido/a',
  cohabitant: 'Concubino/a', cohabitator: 'Concubino/a',
  // Asociados / genéricos
  "significant person": 'Persona relevante', "significant other": 'Pareja',
  "close associate": 'Asociado cercano', "business partner": 'Socio comercial',
  "known associate": 'Asociado conocido',
  // Corporativas
  owner: 'Propietario', shareholder: 'Accionista', beneficiary: 'Beneficiario',
  director: 'Director', board_member: 'Consejero', chairman: 'Presidente',
  ceo: 'Director General', cfo: 'Director Financiero', coo: 'Director Operaciones',
  secretary: 'Secretario', treasurer: 'Tesorero',
  member: 'Miembro', employee: 'Empleado', manager: 'Gerente',
  education: 'Educación',
  founder: 'Fundador', partner: 'Socio',
  subsidiary: 'Subsidiaria', parent_company: 'Empresa Matriz',
  // Politicas
  advisor: 'Asesor', representative: 'Representante', agent: 'Agente',
  nominee: 'Nominado', appointee: 'Designado',
  // Asociados
  associate: 'Asociado', colleague: 'Colega', ally: 'Aliado',
  linked: 'Vinculado', related: 'Relacionado',
};

const translateOne = (term: string): string => {
  const lower = term.toLowerCase().trim();
  if (subtypeLabels[lower]) return subtypeLabels[lower];
  // Match sin guiones/espacios/apóstrofes (e.g., "daughter-in-law" → "daughterinlaw")
  const normalized = lower.replace(/[-_\s']/g, '');
  for (const [key, val] of Object.entries(subtypeLabels)) {
    if (key.replace(/[-_\s']/g, '') === normalized) return val;
  }
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

const translateSubtype = (subtype: string): string => {
  // Soporta múltiples valores separados por " · " (como viene del FTM)
  if (subtype.includes(' · ')) {
    const parts = subtype.split(' · ').map(translateOne);
    // Deduplicar traducciones idénticas (e.g., "child · father" → "Hijo/a · Padre/Madre")
    const unique = [...new Set(parts)];
    return unique.join(' · ');
  }
  return translateOne(subtype);
};

// Formatear nombre de fuente — mostrar origen comprensible para compliance
const sourceDisplayNames: Record<string, string> = {
  OS_DEFAULT: 'Wikidata',
  OS_WIKIDATA_RELATED: 'Wikidata',
  OS_US_OFAC_SDN: 'OFAC SDN',
  OS_US_OFAC_NONSDN: 'OFAC No-SDN',
  OS_US_OFAC_CONS: 'OFAC Consolidado',
  OS_UN_SC_SANCTIONS: 'ONU Sanciones',
  OS_EU_SANCTIONS: 'UE Sanciones',
  OS_GB_HMT_SANCTIONS: 'Reino Unido OFSI',
  OS_CA_DFATD: 'Canadá Sanciones',
  OS_INTERPOL_RED: 'Interpol',
  OS_EU_EUROPOL: 'Europol',
  OFAC_SDN: 'OFAC SDN',
  OFAC_NON_SDN: 'OFAC No-SDN',
  US_FBI_MOST_WANTED: 'FBI',
  US_DEA_FUGITIVES: 'DEA',
  INTERPOL_RED_NOTICES: 'Interpol',
};

const formatSourceName = (source: string): string | null => {
  if (!source) return null;
  if (sourceDisplayNames[source]) return sourceDisplayNames[source];
  // Genérico: quitar prefijo OS_ y humanizar
  if (source.startsWith('OS_')) {
    const clean = source.slice(3);
    // Detectar país/org del prefijo
    if (clean.startsWith('US_')) return 'EE.UU. ' + clean.slice(3).replace(/_/g, ' ');
    if (clean.startsWith('EU_')) return 'UE ' + clean.slice(3).replace(/_/g, ' ');
    if (clean.startsWith('GB_')) return 'UK ' + clean.slice(3).replace(/_/g, ' ');
    if (clean.startsWith('CA_')) return 'Canadá ' + clean.slice(3).replace(/_/g, ' ');
    if (clean.startsWith('UN_')) return 'ONU ' + clean.slice(3).replace(/_/g, ' ');
    return clean.replace(/_/g, ' ');
  }
  if (source.startsWith('PEP_')) return 'PEP ' + source.slice(4).replace(/_/g, ' ');
  return source.replace(/_/g, ' ');
};

// Mapeo extendido de entity types (el FTM usa variantes)
const entityTypeLabelExtended: Record<string, string> = {
  person: 'Persona', individual: 'Persona',
  company: 'Empresa', legalentity: 'Entidad Legal',
  vessel: 'Embarcación', aircraft: 'Aeronave',
  organization: 'Organización', publicbody: 'Entidad Pública',
  unknown: '', // No mostrar
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

function summarizeEntityExposure(entity: APIEntity, profile?: EntityProfile): string {
  const activeSanctions = entity.sanctions.filter((item) => item.status === 'active').length;
  const pepStatus = entity.is_current_pep ? 'PEP activa' : entity.pep_entries.length > 0 ? 'PEP histórica' : null;
  const adverseMediaCount = entity.adverse_media?.length || 0;
  const relationshipCount = profile?.connections?.total_relationships || 0;

  if (activeSanctions > 0 && entity.is_current_pep) {
    return `Entidad de alto interés AML: ${activeSanctions} sanción${activeSanctions !== 1 ? 'es' : ''} activa${activeSanctions !== 1 ? 's' : ''} y condición PEP vigente.`;
  }
  if (activeSanctions > 0) {
    return `Entidad sancionada con ${activeSanctions} registro${activeSanctions !== 1 ? 's' : ''} activo${activeSanctions !== 1 ? 's' : ''} en fuentes primarias.`;
  }
  if (entity.is_current_pep) {
    return `Entidad con exposición política vigente${entity.pep_category ? ` (${entity.pep_category})` : ''}.`;
  }
  if (adverseMediaCount > 0) {
    return `Entidad sin sanciones activas, pero con ${adverseMediaCount} señal${adverseMediaCount !== 1 ? 'es' : ''} de adverse media para análisis.`;
  }
  if (relationshipCount > 0) {
    return `Entidad sin alertas directas críticas, pero con ${relationshipCount} relacion${relationshipCount !== 1 ? 'es' : ''} disponibles para análisis contextual.`;
  }
  if (pepStatus) {
    return `Entidad con ${pepStatus} y sin sanciones activas registradas.`;
  }
  return 'Entidad sin alertas directas críticas en la vista actual; el valor principal está en cobertura de fuentes y trazabilidad.';
}

function getRelationshipSignalSummary(profile?: EntityProfile): Array<{ label: string; value: number }> {
  if (!profile?.connections) return [];

  const counts = profile.connections.relationship_counts || {};
  const summary = [
    { label: 'Familiares', value: counts.family || 0 },
    { label: 'Asociados', value: counts.associate || 0 },
    { label: 'Corporativo', value: (counts.corporate || 0) + (counts.beneficial_ownership || 0) },
    { label: 'Político', value: counts.political || 0 },
    { label: 'Sancionatorio', value: counts.sanction || 0 },
  ];

  return summary.filter((item) => item.value > 0);
}

function formatAddressValue(address: {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
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

function getAliasTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    primary: 'Principal',
    alias: 'Alias',
    also_known_as: 'AKA',
    former_name: 'Nombre previo',
    maiden_name: 'Apellido de soltera',
    trading_as: 'Nombre comercial',
  };
  return labels[type] || type;
}

function getReferenceRelationshipSection(rel: {
  related_entity_type?: string;
  type: string;
}): 'people' | 'organizations' | 'other' {
  const relatedType = (rel.related_entity_type || '').toLowerCase();
  if (relatedType === 'individual' || relatedType === 'person') return 'people';
  if (relatedType === 'organization' || relatedType === 'company' || relatedType === 'legalentity') return 'organizations';
  return 'other';
}

function getReferenceRelationshipSummary(rel: {
  type: string;
  subtype?: string;
}): string | null {
  const type = rel.type?.toLowerCase();
  const subtype = rel.subtype?.toLowerCase();

  if (type === 'membership' && subtype === 'education') {
    return 'Estudió en esta institución';
  }
  if (type === 'political' && subtype === 'member') {
    return 'Miembro de este partido';
  }
  if (type === 'membership' && subtype === 'member') {
    return 'Miembro de esta organización';
  }
  if (type === 'professional') {
    return 'Vínculo profesional con esta entidad';
  }
  if (type === 'representation') {
    return 'Representación vinculada a esta entidad';
  }
  if (type === 'sanction') {
    return 'Relación sancionatoria con esta entidad';
  }

  return null;
}

function getReferenceRelationshipSortScore(rel: {
  related_entity_risk_score?: number;
  related_entity_is_pep?: boolean;
  related_entity_sources?: string[];
  relationship_strength?: number;
  related_entity_name: string;
}): number {
  const riskScore = rel.related_entity_risk_score || 0;
  const pepBoost = rel.related_entity_is_pep ? 25 : 0;
  const sourceBoost = Math.min((rel.related_entity_sources?.length || 0) * 1.5, 30);
  const strengthBoost = (rel.relationship_strength || 0) * 10;
  return riskScore + pepBoost + sourceBoost + strengthBoost;
}

type EntityTabId =
  | 'overview'
  | 'sanctions'
  | 'pep'
  | 'media'
  | 'relationships'
  | 'network'
  | 'network-risk'
  | 'ubo';

function isWikidataOnlyProfile(profile?: EntityProfile): boolean {
  const sources = profile?.overview.sources || [];
  return sources.length > 0 && sources.every((source) => source === 'WIKIDATA');
}

function isReferenceLikeEntity(entity: APIEntity, profile?: EntityProfile): boolean {
  const hasPrimarySignals =
    entity.sanctions.length > 0 ||
    entity.pep_entries.length > 0 ||
    entity.is_current_pep === true ||
    (entity.adverse_media?.length || 0) > 0;

  return !hasPrimarySignals && isWikidataOnlyProfile(profile);
}

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
          <div className="space-y-2">
            {nr.risk_neighbors.map((neighbor: any, i: number) => {
              const nColor = neighbor.risk_level === 'critical' ? 'text-red-400' :
                            neighbor.risk_level === 'high' ? 'text-orange-400' :
                            neighbor.risk_level === 'medium' ? 'text-yellow-400' : 'text-green-400';
              const relLabels: Record<string, string> = {
                beneficial_ownership: 'Propiedad',
                corporate: 'Corporativo',
                family: 'Familiar',
                political: 'Político',
                associate: 'Asociado',
                membership: 'Membresía',
              };
              return (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn('w-2 h-2 rounded-full flex-shrink-0',
                      neighbor.risk_level === 'critical' ? 'bg-red-400' :
                      neighbor.risk_level === 'high' ? 'bg-orange-400' :
                      neighbor.risk_level === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                    )} />
                    <div className="min-w-0">
                      <p className="text-white font-medium text-sm truncate">{neighbor.entity_name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-gray-500">
                          {relLabels[neighbor.relationship_type] || neighbor.relationship_type}
                          {neighbor.relationship_subtype ? ` · ${neighbor.relationship_subtype}` : ''}
                        </span>
                        <span className="text-xs text-gray-600">Dist: {neighbor.distance}</span>
                        {neighbor.is_pep && (
                          <Badge variant="outline" className="text-[10px] py-0 bg-purple-500/10 text-purple-400 border-purple-500/30">
                            PEP
                          </Badge>
                        )}
                        {neighbor.is_sanctioned && (
                          <Badge variant="outline" className="text-[10px] py-0 bg-red-500/10 text-red-400 border-red-500/30">
                            Sancionado
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className={cn('text-sm font-bold', nColor)}>
                      {neighbor.risk_score}
                    </p>
                    <p className="text-[10px] text-gray-600">
                      propaga {neighbor.propagated_risk}
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
  const owners = ubo.ubos || [];
  const controlled = ubo.controlled_entities || [];
  const keyRels = ubo.key_relationships || [];
  const isIndividual = ubo.entity_type === 'INDIVIDUAL';

  const riskColor = (level: string) =>
    level === 'critical' ? 'text-red-400' :
    level === 'high' ? 'text-orange-400' :
    level === 'medium' ? 'text-yellow-400' : 'text-green-400';

  const riskBorderColor = (level: string) =>
    level === 'critical' ? 'border-red-500' :
    level === 'high' ? 'border-orange-500' :
    level === 'medium' ? 'border-yellow-500' : 'border-green-500';

  const relTypeLabel: Record<string, string> = {
    beneficial_ownership: 'Propiedad',
    corporate: 'Corporativo',
    family: 'Familiar',
    associate: 'Asociado',
    political: 'Político',
    membership: 'Membresía',
  };

  const hasContent = owners.length > 0 || controlled.length > 0 || keyRels.length > 0;

  if (!hasContent) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <Landmark className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-white mb-2">Sin Datos de Propiedad</h3>
        <p className="text-gray-400">
          No se encontraron relaciones de propiedad, control o vínculos de riesgo para esta entidad.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-6"
      >
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <Landmark className="w-5 h-5 text-blue-400" />
          {isIndividual ? 'Análisis de Control y Exposición' : 'Beneficiario Final (UBO)'}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {owners.length > 0 && (
            <>
              <div>
                <p className="text-xs text-gray-500">UBOs Identificados</p>
                <p className="text-2xl font-bold text-white">{owners.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">UBOs &gt;25%</p>
                <p className="text-2xl font-bold text-white">{ubo.ubos_above_25pct || 0}</p>
              </div>
            </>
          )}
          {controlled.length > 0 && (
            <>
              <div>
                <p className="text-xs text-gray-500">Entidades Controladas</p>
                <p className="text-2xl font-bold text-white">{controlled.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Controladas Sancionadas</p>
                <p className={cn('text-2xl font-bold', ubo.controlled_sanctioned > 0 ? 'text-red-400' : 'text-white')}>
                  {ubo.controlled_sanctioned || 0}
                </p>
              </div>
            </>
          )}
          {keyRels.length > 0 && (
            <div>
              <p className="text-xs text-gray-500">Vínculos de Riesgo</p>
              <p className="text-2xl font-bold text-white">{keyRels.length}</p>
            </div>
          )}
          {ubo.risk_flag && (
            <div>
              <p className="text-xs text-gray-500">Alerta</p>
              <p className="text-2xl font-bold text-red-400">RIESGO UBO</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* UBO List (incoming ownership — who owns this entity) */}
      {owners.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-xl p-6"
        >
          <h3 className="text-lg font-medium text-white mb-4">Beneficiarios Finales</h3>
          <div className="space-y-3">
            {owners.map((owner: any, i: number) => (
              <div key={i} className={cn('p-4 rounded-lg bg-white/5 border-l-4', riskBorderColor(owner.risk_level))}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white font-medium">{owner.ubo_name || owner.name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {owner.effective_ownership_pct != null && (
                        <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">
                          {owner.effective_ownership_pct}% efectivo
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
                      {owner.threshold_25pct && (
                        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/30">
                          &gt;25% FATF
                        </Badge>
                      )}
                    </div>
                  </div>
                  {owner.risk_score != null && (
                    <div className="text-right">
                      <p className={cn('text-lg font-bold', riskColor(owner.risk_level))}>{owner.risk_score}</p>
                      <p className="text-xs text-gray-500">Risk</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Controlled Entities (outgoing ownership — what does this entity own) */}
      {controlled.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass rounded-xl p-6"
        >
          <h3 className="text-lg font-medium text-white mb-1">Entidades Controladas</h3>
          <p className="text-xs text-gray-500 mb-4">Empresas y entidades sobre las que tiene propiedad o dirección</p>
          <div className="space-y-3">
            {controlled.map((ent: any, i: number) => (
              <div key={i} className={cn('p-4 rounded-lg bg-white/5 border-l-4', riskBorderColor(ent.risk_level))}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white font-medium">{ent.entity_name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
                        {ent.relationship_subtype || ent.relationship_type}
                      </Badge>
                      {ent.description && (
                        <span className="text-xs text-gray-500">{ent.description}</span>
                      )}
                      {ent.percentage != null && (
                        <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">
                          {ent.percentage}%
                        </Badge>
                      )}
                      {ent.is_sanctioned && (
                        <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400 border-red-500/30">
                          Sancionado
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn('text-lg font-bold', riskColor(ent.risk_level))}>{ent.risk_score}</p>
                    <p className="text-xs text-gray-500">Risk</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Key Risk Relationships */}
      {keyRels.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-xl p-6"
        >
          <h3 className="text-lg font-medium text-white mb-1">Vínculos de Riesgo</h3>
          <p className="text-xs text-gray-500 mb-4">Relaciones familiares, políticas y asociaciones con entidades de riesgo medio-alto</p>
          <div className="space-y-2">
            {keyRels.map((rel: any, i: number) => (
              <div key={i} className="p-3 rounded-lg bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn('w-2 h-2 rounded-full',
                    rel.risk_level === 'critical' ? 'bg-red-400' :
                    rel.risk_level === 'high' ? 'bg-orange-400' :
                    rel.risk_level === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                  )} />
                  <div>
                    <p className="text-white text-sm font-medium">{rel.entity_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">
                        {relTypeLabel[rel.relationship_type] || rel.relationship_type}
                        {rel.relationship_subtype ? ` · ${rel.relationship_subtype}` : ''}
                      </span>
                      {rel.is_pep && (
                        <Badge variant="outline" className="text-[10px] py-0 bg-purple-500/10 text-purple-400 border-purple-500/30">
                          PEP
                        </Badge>
                      )}
                      {rel.is_sanctioned && (
                        <Badge variant="outline" className="text-[10px] py-0 bg-red-500/10 text-red-400 border-red-500/30">
                          Sancionado
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <p className={cn('text-sm font-bold', riskColor(rel.risk_level))}>{rel.risk_score}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* FATF Explanation */}
      <div className="glass rounded-xl p-4">
        <p className="text-xs text-gray-500">
          Análisis basado en FATF Recomendación 24/25. Se considera Beneficiario Final
          a toda persona natural con participación directa o indirecta ≥25% o con control efectivo.
          Para personas, se muestran entidades controladas y vínculos de riesgo por exposición.
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

function ListInfoItem({ label, items, icon: Icon, maxVisible = 5 }: {
  label: string;
  items?: string[] | string | null;
  icon?: React.ComponentType<{className?: string}>;
  maxVisible?: number;
}) {
  if (!items) return null;
  const list = Array.isArray(items) ? items : [items];
  if (list.length === 0) return null;

  // Si solo hay 1 item, mostrarlo como InfoItem normal
  if (list.length === 1) {
    return <InfoItem label={label} value={list[0]} icon={Icon} />;
  }

  const visible = list.slice(0, maxVisible);
  const remaining = list.length - maxVisible;

  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="w-4 h-4 text-gray-500 mt-0.5" />}
      <div>
        <p className="text-xs text-gray-500 uppercase">{label}</p>
        <ul className="text-sm text-white space-y-0.5 mt-0.5">
          {visible.map((item, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="text-gray-600 mt-1">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        {remaining > 0 && (
          <p className="text-xs text-gray-500 mt-1">+{remaining} más</p>
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
  const [isExpanded, setIsExpanded] = useState(false);
  if (!items || items.length === 0) return null;

  const visible = isExpanded ? items : items.slice(0, maxVisible);
  const remaining = items.length - maxVisible;

  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="w-4 h-4 text-gray-500 mt-0.5" />}
      <div className="min-w-0">
        <p className="text-xs text-gray-500 uppercase">{label}</p>
        <div className="space-y-2 mt-1">
          {visible.map((item, i) => (
            <button
              key={`${item.qid || item.name}-${i}`}
              type="button"
              onClick={() => onOpenReference(item)}
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left hover:bg-white/[0.06] transition-colors"
            >
              <span className="text-sm text-white leading-snug block">
                {humanizeEntityName(item.name)}
              </span>
            </button>
          ))}
        </div>
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => setIsExpanded((value) => !value)}
            className="text-xs text-blue-400 hover:text-blue-300 mt-1"
          >
            {isExpanded ? 'Mostrar menos' : `Ver ${remaining} más`}
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

export function EntityProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [showAllAliases, setShowAllAliases] = useState(false);
  const [relLevelFilter, setRelLevelFilter] = useState<string | undefined>(undefined);
  const [relContextFilter, setRelContextFilter] = useState<'aml_core' | 'affiliation' | 'profile_context' | undefined>(undefined);
  const [relPriorityFilter, setRelPriorityFilter] = useState<'critical' | 'high' | 'medium' | 'low' | undefined>(undefined);
  const [relSearch, setRelSearch] = useState('');
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
        toast.message(`"${item.name}" solo se conserva como contexto y no tiene ficha propia`);
        return;
      }

      toast.message(`No existe aún un perfil local para "${item.name}"`);
    } catch {
      toast.error('No se pudo resolver la referencia');
    }
  };

  const { entity, isLoading, error, refetch } = useEntity(id, sourceLevel);
  const { profile } = useEntityProfile(id);
  const referenceLikeForQueries = entity ? isReferenceLikeEntity(entity, profile) : isWikidataOnlyProfile(profile);
  const { data: networkData, isLoading: networkLoading } = useNetwork(id, { depth: graphDepth, enabled: activeTab === 'network' });
  const { data: familyRelationships } = useRelationshipsList(id, {
    enabled: activeTab === 'overview' && !referenceLikeForQueries,
    type: referenceLikeForQueries ? undefined : 'family',
    hide_noise: referenceLikeForQueries ? false : true,
    limit: 12,
  });
  const { data: relationshipsList } = useRelationshipsList(id, {
    enabled: activeTab === 'relationships',
    level: relLevelFilter,
    aml_priority: relPriorityFilter,
    context_category: relContextFilter,
    hide_noise: referenceLikeForQueries ? false : true,
    limit: 200,
  });

  const validAddresses = entity?.addresses?.filter((address) => formatAddressValue(address)) || [];
  const relationshipSignals = getRelationshipSignalSummary(profile);
  const overviewFamilyRelationships = [...(familyRelationships?.relationships || [])].sort((a, b) => {
    if (referenceLikeForQueries) {
      return getReferenceRelationshipSortScore(b) - getReferenceRelationshipSortScore(a)
        || a.related_entity_name.localeCompare(b.related_entity_name);
    }
    return (b.related_entity_risk_score || 0) - (a.related_entity_risk_score || 0)
      || Number(Boolean(b.related_entity_is_pep)) - Number(Boolean(a.related_entity_is_pep))
      || a.related_entity_name.localeCompare(b.related_entity_name);
  });
  const hasSanctions = (entity?.sanctions?.length || 0) > 0;
  const hasPep = (entity?.pep_entries?.length || 0) > 0 || entity?.is_current_pep === true || !!entity?.pep_category;
  const hasMedia = (entity?.adverse_media?.length || 0) > 0;
  const totalRelationships = profile?.connections?.total_relationships || 0;
  const hasRelationships = totalRelationships > 0;
  const hasContextualProfileData =
    !!profile?.header.description ||
    (profile?.career.positions?.length || 0) > 0 ||
    (profile?.career.education?.length || 0) > 0 ||
    (profile?.career.political?.length || 0) > 0 ||
    validAddresses.length > 0;
  const referenceLike = entity ? isReferenceLikeEntity(entity, profile) : false;
  const isCorporateEntity = entity?.entity_type === 'company' || entity?.entity_type === 'organization';
  const showNetwork = hasRelationships;
  const showNetworkRisk = !referenceLike && ((entity?.overall_risk_score || 0) >= 40 || hasRelationships);
  const showUBO = isCorporateEntity && !referenceLike && hasRelationships;

  const availableTabs = useMemo<Array<{ id: EntityTabId; label: string; count?: number; icon?: typeof Newspaper }>>(() => {
    const tabs: Array<{ id: EntityTabId; label: string; count?: number; icon?: typeof Newspaper }> = [
      { id: 'overview', label: referenceLike ? 'Contexto' : 'General' },
    ];

    if (hasSanctions) tabs.push({ id: 'sanctions', label: 'Sanciones', count: entity?.sanctions?.length });
    if (hasPep) tabs.push({ id: 'pep', label: 'PEP', count: entity?.pep_entries?.length || undefined });
    if (hasMedia && !referenceLike) tabs.push({ id: 'media', label: 'Medios', icon: Newspaper });
    if (hasRelationships || hasContextualProfileData) {
      tabs.push({ id: 'relationships', label: 'Relaciones', count: hasRelationships ? totalRelationships : undefined });
    }
    if (showNetwork) tabs.push({ id: 'network', label: 'Grafo' });
    if (showNetworkRisk) tabs.push({ id: 'network-risk', label: 'Riesgo Red', icon: Network });
    if (showUBO) tabs.push({ id: 'ubo', label: 'UBO', icon: Landmark });

    return tabs;
  }, [
    entity?.sanctions?.length,
    entity?.pep_entries?.length,
    entity?.entity_type,
    entity?.overall_risk_score,
    hasContextualProfileData,
    hasMedia,
    hasPep,
    hasRelationships,
    hasSanctions,
    referenceLike,
    showNetwork,
    showNetworkRisk,
    showUBO,
    totalRelationships,
  ]);

  useEffect(() => {
    if (!availableTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab('overview');
    }
  }, [activeTab, availableTabs]);

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
                    {humanizeEntityName(profile?.header.display_name || entity.primary_name)}
                  </h1>
                  {profile?.header.description && (
                    <p className="text-sm text-gray-400 mb-2">{profile.header.description}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-gray-400">
                      {entityTypeLabels[entity.entity_type]}
                    </Badge>
                    {referenceLike ? (
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-500/30">
                        Referencia contextual
                      </Badge>
                    ) : hasRelationships && !hasSanctions && !hasPep ? (
                      <Badge variant="outline" className="bg-violet-500/10 text-violet-300 border-violet-500/30">
                        Entidad relacionada
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
                        Sujeto principal
                      </Badge>
                    )}
                    {referenceLike && profile?.header.reference_tier ? (
                      <Badge
                        variant="outline"
                        className={cn(
                          'capitalize',
                          profile.header.reference_tier === 'premium' && 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
                          profile.header.reference_tier === 'graph_only' && 'bg-amber-500/10 text-amber-300 border-amber-500/30',
                          profile.header.reference_tier === 'suppress' && 'bg-gray-500/10 text-gray-300 border-gray-500/30',
                        )}
                        title={profile.header.reference_tier_reason || undefined}
                      >
                        {profile.header.reference_tier === 'premium'
                          ? 'Referencia premium'
                          : profile.header.reference_tier === 'graph_only'
                            ? 'Solo contexto'
                            : 'Bajo valor'}
                      </Badge>
                    ) : null}
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
                  <InfoItem label="Fecha de Nacimiento" value={formatDate(entity.birth_date || entity.date_of_birth || '')} icon={Calendar} />
                )}
                {entity.gender && (
                  <InfoItem label="Género" value={entity.gender === 'male' ? 'Masculino' : entity.gender === 'female' ? 'Femenino' : entity.gender} icon={User} />
                )}
                {(profile?.overview.birth_place || entity.place_of_birth) && (
                  <InfoItem label="Lugar de Nacimiento" value={profile?.overview.birth_place || entity.place_of_birth} icon={MapPin} />
                )}
                {validAddresses.length === 1 && (
                  <InfoItem label="Ubicación principal" value={formatAddressValue(validAddresses[0]) || undefined} icon={MapPin} />
                )}
                {(profile?.overview.nationalities?.length || (entity.nationalities && entity.nationalities.length > 0)) && (
                  <InfoItem
                    label="Nacionalidades"
                    value={profile?.overview.nationalities?.map(n => n.name).join(', ') || entity.nationalities?.map((n: string) => countryNames[n] || n).join(', ')}
                    icon={Globe}
                  />
                )}
                {profile?.career.education?.length ? (
                  <ReferenceLinksList
                    label="Educación"
                    items={profile.career.education}
                    icon={FileText}
                    onOpenReference={handleOpenReference}
                    maxVisible={5}
                  />
                ) : (
                  <ListInfoItem
                    label="Educación"
                    items={entity.education}
                    icon={FileText}
                    maxVisible={5}
                  />
                )}
                {profile?.career.political?.length ? (
                  <ReferenceLinksList
                    label="Asociación Política"
                    items={profile.career.political}
                    icon={Landmark}
                    onOpenReference={handleOpenReference}
                  />
                ) : (
                  <ListInfoItem
                    label="Asociación Política"
                    items={entity.political}
                    icon={Landmark}
                  />
                )}
                <InfoItem label="Religión" value={profile?.personal.religion || (Array.isArray(entity.religion) ? entity.religion[0] : entity.religion)} icon={Tag} />
                <InfoItem label="Etnicidad" value={profile?.personal.ethnicity || (Array.isArray(entity.ethnicity) ? entity.ethnicity[0] : entity.ethnicity)} icon={Tag} />
                {profile?.career.positions?.length ? (
                  <ReferenceLinksList
                    label="Cargos"
                    items={profile.career.positions}
                    icon={Shield}
                    onOpenReference={handleOpenReference}
                    maxVisible={5}
                  />
                ) : (
                  <ListInfoItem
                    label="Cargos"
                    items={entity.positions_held}
                    icon={Shield}
                    maxVisible={5}
                  />
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
            {availableTabs.map((tab) => {
              const TabIcon = tab.icon;
              const dynamicCount =
                tab.id === 'network' ? networkData?.total_nodes :
                tab.id === 'relationships' ? (relationshipsList?.total || tab.count) :
                tab.count;

              return (
                <TabsTrigger key={tab.id} value={tab.id} className="data-[state=active]:bg-white/10">
                  {TabIcon ? <TabIcon className="w-4 h-4 mr-1" /> : null}
                  {tab.label}
                  {dynamicCount ? (
                    <Badge className="ml-2 bg-white/10 text-gray-200 text-[10px]">
                      {dynamicCount}
                    </Badge>
                  ) : null}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Row 1: Executive Alert Banner */}
            {(() => {
              const hasSanctions = entity.sanctions.length > 0;
              const activeSanctions = entity.sanctions.filter(s => s.status === 'active');
              const isPep = entity.is_current_pep === true;
              const hasAdverseMedia = entity.adverse_media?.length > 0;
              const riskFactorLabels: Record<string, string> = {
                sanctions: 'Sanciones', pep: 'PEP', adverse_media: 'Medios Adversos',
                geographic: 'Geográfico', network: 'Red', transactional: 'Transaccional',
              };
              const criticalFactors = entity.risk_factors.filter(f => f.level === 'critical' || f.level === 'high');

              if (!hasSanctions && !isPep && !hasAdverseMedia && criticalFactors.length === 0) {
                return (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-xl p-5 border-l-4 border-green-500/60">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-6 h-6 text-green-400 shrink-0" />
                      <div>
                        <p className="text-white font-medium">Sin alertas activas</p>
                        <p className="text-sm text-gray-400">
                          Esta entidad no tiene sanciones, registros PEP ni medios adversos. Presente en {entity.data_sources.length} fuente{entity.data_sources.length !== 1 ? 's' : ''}.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              }

              return (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className={cn('glass rounded-xl p-5 border-l-4',
                    entity.risk_level === 'critical' ? 'border-red-500/60' :
                    entity.risk_level === 'high' ? 'border-orange-500/60' : 'border-yellow-500/60'
                  )}>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={cn('w-6 h-6 shrink-0 mt-0.5',
                      entity.risk_level === 'critical' ? 'text-red-400' :
                      entity.risk_level === 'high' ? 'text-orange-400' : 'text-yellow-400'
                    )} />
                    <div className="flex-1">
                      <p className="text-white font-medium mb-2">Resumen de Alertas</p>
                      <div className="flex flex-wrap gap-3">
                        {hasSanctions && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                            <Shield className="w-4 h-4 text-red-400" />
                            <span className="text-sm text-red-300 font-medium">
                              {activeSanctions.length} sanción{activeSanctions.length !== 1 ? 'es' : ''} activa{activeSanctions.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                        {isPep && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                            <Landmark className="w-4 h-4 text-purple-400" />
                            <span className="text-sm text-purple-300 font-medium">
                              Persona Políticamente Expuesta
                            </span>
                          </div>
                        )}
                        {hasAdverseMedia && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <Newspaper className="w-4 h-4 text-amber-400" />
                            <span className="text-sm text-amber-300 font-medium">
                              Medios adversos
                            </span>
                          </div>
                        )}
                        {criticalFactors.map((f, i) => (
                          <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                            <AlertCircle className={cn('w-4 h-4', f.level === 'critical' ? 'text-red-400' : 'text-orange-400')} />
                            <span className="text-sm text-gray-300">
                              {riskFactorLabels[f.category] || f.category}: {f.score}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })()}

            {/* Row 1.5: Executive Case Readout */}
            <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 }}
                className="glass rounded-xl p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                      Lectura Ejecutiva
                    </p>
                    <h3 className="text-lg font-medium text-white">
                      {summarizeEntityExposure(entity, profile)}
                    </h3>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs shrink-0',
                      entity.risk_level === 'critical'
                        ? 'bg-red-500/10 text-red-400 border-red-500/30'
                        : entity.risk_level === 'high'
                          ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                          : entity.risk_level === 'medium'
                            ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                            : 'bg-green-500/10 text-green-400 border-green-500/30'
                    )}
                  >
                    Riesgo {riskLevelLabels[entity.risk_level]}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
                  <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
                    <p className="text-[11px] text-gray-500 uppercase tracking-wide">Sanciones activas</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {entity.sanctions.filter((item) => item.status === 'active').length}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
                    <p className="text-[11px] text-gray-500 uppercase tracking-wide">Estado PEP</p>
                    <p className="text-sm font-semibold text-white mt-2">
                      {entity.is_current_pep ? 'Activo' : entity.pep_entries.length > 0 ? 'Histórico' : 'No registrado'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
                    <p className="text-[11px] text-gray-500 uppercase tracking-wide">Medios adversos</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {entity.adverse_media?.length || 0}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
                    <p className="text-[11px] text-gray-500 uppercase tracking-wide">Relaciones</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {profile?.connections?.total_relationships || 0}
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="glass rounded-xl p-6"
              >
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">
                  Cobertura y Trazabilidad
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Fuentes activas</span>
                    <span className="text-sm font-semibold text-white">
                      {profile?.overview.source_count || entity.data_sources.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Datasets</span>
                    <span className="text-sm font-semibold text-white">
                      {(profile?.cross_references?.datasets?.length || entity.source_records?.length || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Primera aparición</span>
                    <span className="text-sm font-semibold text-white">
                      {profile?.first_seen_at || entity.first_seen
                        ? formatDate(profile?.first_seen_at || entity.first_seen)
                        : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Última actualización</span>
                    <span className="text-sm font-semibold text-white">
                      {profile?.last_seen_at || entity.last_updated
                        ? formatDate(profile?.last_seen_at || entity.last_updated)
                        : '—'}
                    </span>
                  </div>
                </div>

                {relationshipSignals.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-white/5">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                      Señales relacionales
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {relationshipSignals.map((item) => (
                        <Badge
                          key={item.label}
                          variant="outline"
                          className="text-xs bg-white/5 text-gray-300 border-white/10"
                        >
                          {item.label}: {item.value}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Row 2: AML Evidence Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sanciones Activas */}
              {entity.sanctions.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                  className="glass rounded-xl p-6">
                  <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-red-400" />
                    Sanciones
                    <Badge className="ml-auto bg-red-500/20 text-red-400 text-xs">{entity.sanctions.length}</Badge>
                  </h3>
                  <div className="space-y-3">
                    {entity.sanctions.slice(0, 5).map((s, i) => (
                      <div key={i} className={cn('p-3 rounded-lg border-l-2',
                        s.status === 'active' ? 'bg-red-500/5 border-red-500/50' : 'bg-white/[0.02] border-gray-600/30'
                      )}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-white font-medium">{s.source}</span>
                          <Badge variant="outline" className={cn('text-[10px]',
                            s.status === 'active' ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-gray-500/10 text-gray-400'
                          )}>
                            {s.status === 'active' ? 'Activa' : s.status === 'removed' ? 'Removida' : s.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-400">{s.program}</p>
                        {s.reason && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{s.reason}</p>}
                        <p className="text-[10px] text-gray-600 mt-1">Listado: {formatDate(s.listing_date)}</p>
                      </div>
                    ))}
                    {entity.sanctions.length > 5 && (
                      <button onClick={() => setActiveTab('sanctions')}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                        Ver {entity.sanctions.length - 5} más <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* PEP Status */}
              {entity.pep_entries.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  className="glass rounded-xl p-6">
                  <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-purple-400" />
                    Exposición Política (PEP)
                    <Badge className={cn('ml-auto text-xs',
                      entity.is_current_pep ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400'
                    )}>
                      {entity.is_current_pep ? 'Activo' : 'Histórico'}
                    </Badge>
                  </h3>
                  <div className="space-y-3">
                    {entity.pep_entries
                      .sort((a, b) => {
                        if (a.is_current !== b.is_current) return a.is_current ? -1 : 1;
                        return (b.start_date || '').localeCompare(a.start_date || '');
                      })
                      .slice(0, 5).map((pep, i) => (
                      <div key={i} className={cn('p-3 rounded-lg border-l-2',
                        pep.is_current ? 'bg-purple-500/5 border-purple-500/50' : 'bg-white/[0.02] border-gray-600/30'
                      )}>
                        <p className="text-sm text-white font-medium">{pep.role}</p>
                        {(pep.institution || pep.department) && (
                          <p className="text-xs text-gray-400">{pep.department || pep.institution}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-[10px] text-gray-500">
                            {countryNames[pep.country] || pep.country}
                          </span>
                          {pep.state && (
                            <span className="text-[10px] text-gray-500">{pep.state}</span>
                          )}
                          {pep.party && (
                            <span className="text-[10px] text-blue-400">{pep.party}</span>
                          )}
                          {pep.start_date && (
                            <span className="text-[10px] text-gray-600">
                              {formatDate(pep.start_date)} — {pep.end_date ? formatDate(pep.end_date) : 'Presente'}
                            </span>
                          )}
                          <Badge variant="outline" className={cn('text-[10px] ml-auto',
                            pep.is_current ? 'text-purple-400 border-purple-500/30' : 'text-gray-500'
                          )}>
                            {pep.is_current ? 'Vigente' : 'Finalizado'}
                          </Badge>
                        </div>
                        )}
                      </div>
                    ))}
                    {entity.pep_entries.length > 5 && (
                      <button onClick={() => setActiveTab('pep')}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                        Ver {entity.pep_entries.length - 5} más <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Row 3: Relational context */}
            {(profile?.connections && profile.connections.total_relationships > 0) && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
                className="glass rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2 uppercase tracking-wide">
                    <Users className="w-4 h-4" />
                    Contexto Relacional
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab('relationships')}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Ver relaciones
                  </Button>
                </div>

                {!referenceLike && overviewFamilyRelationships.length > 0 ? (
                  <div className="mb-4">
                    <p className="text-xs text-purple-400 uppercase mb-2">
                      {referenceLike ? 'Vínculos contextuales destacados' : 'Familiares relevantes detectados'}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                      {overviewFamilyRelationships.slice(0, 6).map((rel, i) => (
                        <div key={`${rel.related_entity_id || rel.related_entity_name}-${i}`} className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
                          <p className="text-sm text-white font-medium">{humanizeEntityName(rel.related_entity_name)}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {rel.subtype && (
                              <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-300 border-purple-500/20">
                                {translateSubtype(rel.subtype)}
                              </Badge>
                            )}
                            {rel.related_entity_is_pep && (
                              <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/30">
                                PEP
                              </Badge>
                            )}
                            {rel.related_entity_risk_level && (
                              <Badge variant="outline" className={cn('text-[10px]', getRiskBadgeClasses(rel.related_entity_risk_level))}>
                                {rel.related_entity_risk_level}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {overviewFamilyRelationships.length > 6 && (
                      <p className="text-xs text-gray-500 mt-2">
                        +{overviewFamilyRelationships.length - 6} {referenceLike ? 'vínculos más' : 'familiares más'} en la pestaña de relaciones
                      </p>
                    )}
                  </div>
                ) : referenceLike ? (
                  <div className="mb-4 rounded-lg bg-white/[0.03] border border-white/5 p-3">
                    <p className="text-sm text-white">
                      Se identificaron {profile.connections.total_relationships} relaciones para esta entidad contextual.
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Para acelerar la apertura de referencias, el resumen general no carga el detalle completo de relaciones. Usa la pestaña de relaciones para ver personas y organizaciones vinculadas.
                    </p>
                  </div>
                ) : (
                  <div className="mb-4 rounded-lg bg-white/[0.03] border border-white/5 p-3">
                    <p className="text-sm text-white">
                      Se identificaron {profile.connections.total_relationships} relaciones en total.
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {referenceLike
                        ? 'En esta referencia no se encontraron vínculos destacados en el resumen rápido; revisa la pestaña de relaciones para ver el contexto completo.'
                        : 'En esta vista rápida no aparecieron familiares resueltos; el contexto principal está en vínculos corporativos, asociados o políticos.'}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {Object.entries(profile.connections.relationship_counts)
                    .filter(([, count]) => count > 0)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 6)
                    .map(([type, count]) => {
                      const typeLabels: Record<string, string> = {
                        family: 'Familiar', associate: 'Asociado', corporate: 'Corporativo',
                        beneficial_ownership: 'Beneficiario', membership: 'Miembro',
                        political: 'Político', sanction: 'Sanción', unknown: 'Otro',
                      };
                      return (
                        <div key={type} className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-500">{typeLabels[type] || type}</span>
                          <Badge className="bg-white/10 text-gray-300 text-[10px]">{count}</Badge>
                        </div>
                      );
                    })}
                </div>
              </motion.div>
            )}

            {/* Row 4: IDs + Aliases + Addresses */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Identificaciones */}
              {entity.identifications?.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                  className="glass rounded-xl p-6">
                  <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2 uppercase tracking-wide">
                    <CreditCard className="w-4 h-4" />
                    Identificaciones
                  </h3>
                  <div className="space-y-2">
                    {entity.identifications.map((ident, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                        <div className="flex items-center gap-2">
                          <Badge className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/30">
                            {ident.label || ident.type.toUpperCase()}
                          </Badge>
                          <span className="text-white font-mono text-sm">{ident.number}</span>
                        </div>
                        {ident.country && (
                          <span className="text-[10px] text-gray-500">{countryNames[ident.country] || ident.country}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Aliases */}
              {entity.aliases.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                  className="glass rounded-xl p-6">
                  <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2 uppercase tracking-wide">
                    <FileText className="w-4 h-4" />
                    Nombres y Alias
                    <span className="text-[10px] text-gray-600 ml-auto">{entity.aliases?.length || 0}</span>
                  </h3>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {(showAllAliases ? entity.aliases : entity.aliases.slice(0, 12)).map((alias, i) => (
                        <div
                          key={`${alias.name}-${i}`}
                          className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5"
                        >
                          <span className="text-sm text-white truncate max-w-[220px]">{alias.name}</span>
                          <Badge variant="outline" className="text-[10px] text-gray-400 shrink-0 border-white/10">
                            {getAliasTypeLabel(alias.type)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                    {entity.aliases.length > 12 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAllAliases((value) => !value)}
                        className="text-xs text-blue-400 hover:text-blue-300 px-0"
                      >
                        {showAllAliases
                          ? 'Mostrar menos'
                          : `Ver todos los alias (${entity.aliases?.length || 0})`}
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Direcciones */}
              {validAddresses.length > 1 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                  className="glass rounded-xl p-6">
                  <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2 uppercase tracking-wide">
                    <MapPin className="w-4 h-4" />
                    Direcciones
                  </h3>
                  <div className="space-y-2">
                    {validAddresses.slice(0, 5).map((addr, i) => (
                      <div key={i} className="p-2 rounded-lg bg-white/[0.03]">
                        <p className="text-sm text-white">
                          {formatAddressValue(addr)}
                        </p>
                        {addr.is_current && (
                          <Badge className="text-[10px] bg-green-500/10 text-green-400 mt-1">Actual</Badge>
                        )}
                      </div>
                    ))}
                    {validAddresses.length > 5 && (
                      <p className="text-[10px] text-gray-600">+{validAddresses.length - 5} más</p>
                    )}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Row 5: Source records */}
            <div className="grid grid-cols-1 gap-6">
              {entity.source_records && entity.source_records.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="glass rounded-xl p-6">
                  <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2 uppercase tracking-wide">
                    <Database className="w-4 h-4" />
                    Registros por Fuente
                    <span className="text-[10px] text-gray-600 ml-auto">{entity.source_records?.length || 0} fuentes</span>
                  </h3>
                  <div className="space-y-2">
                    {entity.source_records.map((rec, i) => {
                      const catLabels: Record<string, string> = {
                        SANCTIONS: 'Sanciones', LAW_ENFORCEMENT: 'Ley', PEP: 'PEP',
                        REGULATORY: 'Regulatorio', TAX: 'Fiscal', DEBARMENT: 'Inhabilitación',
                      };
                      const catColors: Record<string, string> = {
                        SANCTIONS: 'bg-red-500/10 text-red-400 border-red-500/20',
                        LAW_ENFORCEMENT: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
                        PEP: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                        REGULATORY: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                        TAX: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
                        DEBARMENT: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
                      };
                      return (
                        <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.03]">
                          {rec.category && (
                            <Badge variant="outline" className={cn('text-[10px] shrink-0', catColors[rec.category] || 'bg-white/5 text-gray-400')}>
                              {catLabels[rec.category] || rec.category}
                            </Badge>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-white">{rec.source_display || formatSourceName(rec.source) || rec.source}</span>
                            {rec.country && (
                              <span className="text-[10px] text-gray-500 ml-2">{countryNames[rec.country] || rec.country}</span>
                            )}
                          </div>
                          {rec.risk_level && (
                            <Badge variant="outline" className={cn('text-[10px] shrink-0', getRiskBadgeClasses(rec.risk_level))}>
                              {rec.risk_level}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
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
              <div className="space-y-2">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-white flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-purple-400" />
                    Positions Held
                  </h3>
                  <Badge className={entity.is_current_pep ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400'}>
                    {entity.is_current_pep ? 'PEP Activo' : 'PEP Histórico'}
                  </Badge>
                </div>

                {/* Timeline */}
                <div className="relative">
                  {entity.pep_entries
                    .sort((a, b) => {
                      // Current first, then by start_date descending
                      if (a.is_current !== b.is_current) return a.is_current ? -1 : 1;
                      const aDate = a.start_date || '';
                      const bDate = b.start_date || '';
                      return bDate.localeCompare(aDate);
                    })
                    .map((pep, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="relative pl-8 pb-4 last:pb-0"
                    >
                      {/* Timeline line */}
                      {i < entity.pep_entries.length - 1 && (
                        <div className="absolute left-[11px] top-6 bottom-0 w-px bg-gray-700" />
                      )}
                      {/* Timeline dot */}
                      <div className={cn(
                        'absolute left-0 top-1.5 w-6 h-6 rounded-full flex items-center justify-center',
                        pep.is_current ? 'bg-purple-500/20 ring-2 ring-purple-500' : 'bg-gray-700 ring-2 ring-gray-600'
                      )}>
                        <Landmark className={cn('w-3 h-3', pep.is_current ? 'text-purple-400' : 'text-gray-400')} />
                      </div>

                      {/* Card */}
                      <div className={cn(
                        'glass rounded-lg p-5 border-l-4 transition-colors',
                        pep.is_current ? 'border-purple-500 bg-purple-500/5' : 'border-gray-600 hover:border-gray-500'
                      )}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-medium text-base leading-tight">{pep.role}</h4>

                            {/* Institution / Department */}
                            {(pep.institution || pep.department) && (
                              <p className="text-gray-300 text-sm mt-1 flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                                {pep.department || pep.institution}
                              </p>
                            )}

                            {/* Location details */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                              {/* Country */}
                              {pep.country && (
                                <span className="text-sm text-gray-400 flex items-center gap-1">
                                  <Globe className="w-3.5 h-3.5 text-gray-500" />
                                  {countryNames[pep.country] || pep.country}
                                </span>
                              )}
                              {/* State */}
                              {pep.state && (
                                <span className="text-sm text-gray-400 flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-gray-500" />
                                  {pep.state}
                                </span>
                              )}
                              {/* Party */}
                              {pep.party && (
                                <span className="text-sm text-blue-400 flex items-center gap-1">
                                  <Tag className="w-3.5 h-3.5 text-blue-500" />
                                  {pep.party}
                                </span>
                              )}
                            </div>

                            {/* Dates */}
                            {(pep.start_date || pep.end_date) && (
                              <div className="flex items-center gap-1.5 mt-2">
                                <Calendar className="w-3.5 h-3.5 text-gray-500" />
                                <span className="text-sm text-gray-500">
                                  {pep.start_date ? formatDate(pep.start_date) : '?'}
                                  {' — '}
                                  {pep.end_date ? formatDate(pep.end_date) : 'Presente'}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Status badge */}
                          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            <Badge className={cn('text-xs',
                              pep.is_current ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400'
                            )}>
                              {pep.is_current ? 'En Cargo' : 'Histórico'}
                            </Badge>
                            {pep.category && pep.category !== 'PEP' && (
                              <span className="text-[10px] text-gray-600 uppercase tracking-wide">
                                {pep.category.replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
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
            ) : (() => {
              const contextSections: Array<{
                key: 'aml_core' | 'affiliation' | 'profile_context' | 'unknown';
                label: string;
                icon: typeof Users;
                color: string;
                badgeColor: string;
              }> = [
                {
                  key: 'aml_core',
                  label: 'AML Core',
                  icon: Shield,
                  color: 'text-red-400',
                  badgeColor: 'bg-red-500/10 text-red-400 border-red-500/20',
                },
                {
                  key: 'affiliation',
                  label: 'Afiliaciones',
                  icon: Building2,
                  color: 'text-cyan-400',
                  badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
                },
                {
                  key: 'profile_context',
                  label: 'Contexto de Perfil',
                  icon: FileText,
                  color: 'text-violet-400',
                  badgeColor: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
                },
                {
                  key: 'unknown',
                  label: 'Contexto Adicional',
                  icon: Share2,
                  color: 'text-gray-400',
                  badgeColor: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
                },
              ];

              const sectionConfig: Array<{
                key: string;
                label: string;
                icon: typeof Users;
                types: string[];
                color: string;
                badgeColor: string;
              }> = referenceLike ? [
                {
                  key: 'people',
                  label: 'Personas vinculadas',
                  icon: Users,
                  types: [],
                  color: 'text-blue-400',
                  badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                },
                {
                  key: 'organizations',
                  label: 'Organizaciones vinculadas',
                  icon: Building2,
                  types: [],
                  color: 'text-cyan-400',
                  badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
                },
                {
                  key: 'other',
                  label: 'Otras conexiones',
                  icon: Share2,
                  types: [],
                  color: 'text-gray-400',
                  badgeColor: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
                },
              ] : [
                {
                  key: 'family',
                  label: 'Familiares',
                  icon: Users,
                  types: ['family'],
                  color: 'text-purple-400',
                  badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                },
                {
                  key: 'associates',
                  label: 'Asociados',
                  icon: Network,
                  types: ['associate'],
                  color: 'text-blue-400',
                  badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                },
                {
                  key: 'corporate',
                  label: 'Propiedad y Corporativo',
                  icon: Building2,
                  types: ['beneficial_ownership', 'corporate', 'directorship', 'membership', 'employment'],
                  color: 'text-cyan-400',
                  badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
                },
                {
                  key: 'political',
                  label: 'Política y Representación',
                  icon: Landmark,
                  types: ['political', 'representation', 'occupancy'],
                  color: 'text-amber-400',
                  badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                },
                {
                  key: 'sanctions',
                  label: 'Sanciones',
                  icon: Shield,
                  types: ['sanction'],
                  color: 'text-red-400',
                  badgeColor: 'bg-red-500/10 text-red-400 border-red-500/20',
                },
                {
                  key: 'profile',
                  label: 'Perfil',
                  icon: FileText,
                  types: ['professional'],
                  color: 'text-violet-400',
                  badgeColor: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
                },
                {
                  key: 'other',
                  label: 'Otras Relaciones',
                  icon: Share2,
                  types: [],
                  color: 'text-gray-400',
                  badgeColor: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
                },
              ];

              const normalizedRelationshipSearch = relSearch.trim().toLowerCase();
              const filteredRelationships = normalizedRelationshipSearch
                ? relationshipsList.relationships.filter((rel) => {
                    const searchableParts = [
                      rel.related_entity_name,
                      rel.type,
                      rel.subtype,
                      rel.description,
                      rel.source,
                      rel.relationship_level,
                      rel.context_category,
                      rel.related_entity_type,
                      ...(rel.related_entity_sources || []),
                      ...(rel.related_entity_countries || []),
                    ]
                      .filter(Boolean)
                      .map((value) => String(value).toLowerCase());

                    return searchableParts.some((value) => value.includes(normalizedRelationshipSearch));
                  })
                : relationshipsList.relationships;

              const groupedByContext: Record<string, typeof filteredRelationships> = {
                aml_core: [],
                affiliation: [],
                profile_context: [],
                unknown: [],
              };
              const groupedByType: Record<string, typeof filteredRelationships> = {};
              for (const section of sectionConfig) {
                groupedByType[section.key] = [];
              }

              for (const rel of filteredRelationships) {
                const contextKey = rel.context_category || 'unknown';
                groupedByContext[contextKey] = groupedByContext[contextKey] || [];
                groupedByContext[contextKey].push(rel);

                const typeSection = referenceLike
                  ? sectionConfig.find((section) => section.key === getReferenceRelationshipSection(rel))
                    || sectionConfig[sectionConfig.length - 1]
                  : sectionConfig.find((section) => section.types.includes(rel.type))
                    || sectionConfig[sectionConfig.length - 1];
                groupedByType[typeSection.key].push(rel);
              }

              for (const key of Object.keys(groupedByType)) {
                groupedByType[key].sort((a, b) => {
                  if (referenceLike) {
                    return getReferenceRelationshipSortScore(b) - getReferenceRelationshipSortScore(a)
                      || a.related_entity_name.localeCompare(b.related_entity_name);
                  }
                  return (b.relationship_strength || 0) - (a.relationship_strength || 0)
                    || (b.related_entity_risk_score || 0) - (a.related_entity_risk_score || 0)
                    || Number(Boolean(b.related_entity_is_pep)) - Number(Boolean(a.related_entity_is_pep))
                    || a.related_entity_name.localeCompare(b.related_entity_name);
                });
              }

              const priorityBadgeStyles: Record<string, string> = {
                critical: 'bg-red-500/10 text-red-400 border border-red-500/20',
                high: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
                medium: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
                low: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
              };

              const contextFilterOptions: Array<{
                key: 'aml_core' | 'affiliation' | 'profile_context' | undefined;
                label: string;
              }> = [
                { key: undefined, label: 'Todas las vistas' },
                { key: 'aml_core', label: 'AML Core' },
                { key: 'affiliation', label: 'Afiliaciones' },
                { key: 'profile_context', label: 'Perfil' },
              ];

              const priorityFilterOptions: Array<{
                key: 'critical' | 'high' | 'medium' | 'low' | undefined;
                label: string;
              }> = [
                { key: undefined, label: 'Todas las prioridades' },
                { key: 'critical', label: 'Critical' },
                { key: 'high', label: 'High' },
                { key: 'medium', label: 'Medium' },
                { key: 'low', label: 'Low' },
              ];

              const totalByContext = Object.entries(groupedByContext)
                .filter(([, rels]) => rels.length > 0)
                .reduce<Record<string, number>>((acc, [key, rels]) => {
                  acc[key] = rels.length;
                  return acc;
                }, {});

              const filteredByType = filteredRelationships.reduce<Record<string, number>>((acc, rel) => {
                acc[rel.type] = (acc[rel.type] || 0) + 1;
                return acc;
              }, {});

              return (
                <div className="space-y-6">
                  <div className="glass rounded-xl border border-white/10">
                    <button
                      type="button"
                      onClick={() => setShowRelationshipFilters((prev) => !prev)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-medium text-white">Filtros de relaciones</span>
                      </div>
                      {showRelationshipFilters ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </button>

                    {showRelationshipFilters && (
                      <div className="px-4 pb-4 space-y-4 border-t border-white/10">
                        <div className="flex flex-wrap gap-2 pt-4">
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

                        <div className="flex flex-wrap gap-2">
                          {contextFilterOptions.map((filter) => (
                            <button
                              key={filter.label}
                              onClick={() => setRelContextFilter(filter.key)}
                              className={cn(
                                'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                                relContextFilter === filter.key
                                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                                  : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                              )}
                            >
                              {filter.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {priorityFilterOptions.map((filter) => (
                            <button
                              key={filter.label}
                              onClick={() => setRelPriorityFilter(filter.key)}
                              className={cn(
                                'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                                relPriorityFilter === filter.key
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                              )}
                            >
                              {filter.label}
                            </button>
                          ))}
                        </div>

                        <div className="relative max-w-md">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <input
                            value={relSearch}
                            onChange={(e) => setRelSearch(e.target.value)}
                            placeholder="Buscar relaciones por nombre, tipo, país o fuente"
                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40"
                          />
                        </div>

                        {normalizedRelationshipSearch && (
                          <p className="text-xs text-gray-400">
                            {filteredRelationships.length} coincidencia{filteredRelationships.length === 1 ? '' : 's'} para "{relSearch.trim()}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Summary counts */}
                  <div className="flex flex-wrap gap-2">
                    {contextSections.map((section) => {
                      const count = totalByContext[section.key];
                      if (!count) return null;
                      return (
                        <Badge key={section.key} variant="outline" className={cn('text-xs', section.badgeColor)}>
                          {section.label}: {count}
                        </Badge>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {Object.entries(filteredByType).map(([type, count]) => (
                      <Badge key={type} variant="outline" className="text-xs text-gray-400 border-white/10">
                        {type === 'family' ? 'Familiares' :
                         type === 'associate' ? 'Asociados' :
                         type === 'beneficial_ownership' ? 'Propiedad' :
                         type === 'corporate' ? 'Corporativa' :
                         type === 'directorship' ? 'Directivos' :
                         type === 'membership' ? 'Miembros' :
                         type === 'employment' ? 'Empleados' :
                         type === 'political' ? 'Politico' :
                         type === 'representation' ? 'Representacion' :
                         type === 'sanction' ? 'Sanciones' :
                         type === 'unknown' ? 'Vinculados' :
                         type}: {count as number}
                      </Badge>
                    ))}
                  </div>

                  {filteredRelationships.length === 0 ? (
                    <div className="glass rounded-xl p-8 text-center">
                      <Search className="w-10 h-10 text-gray-500 mx-auto mb-3" />
                      <h3 className="text-lg font-medium text-white mb-2">Sin coincidencias</h3>
                      <p className="text-gray-400">No hay relaciones que coincidan con ese filtro de búsqueda.</p>
                    </div>
                  ) : null}

                  {/* Sections by human-readable relationship type */}
                  {sectionConfig.map((section) => {
                    const rels = groupedByType[section.key];
                    if (!rels || rels.length === 0) return null;
                    const SectionIcon = section.icon;

                    return (
                      <div key={section.key} className="space-y-3">
                        {/* Section header */}
                        <button
                          type="button"
                          onClick={() => setCollapsedRelationshipSections((prev) => ({
                            ...prev,
                            [section.key]: !prev[section.key],
                          }))}
                          className="w-full flex items-center justify-between gap-3 pb-2 border-b border-white/10 text-left"
                        >
                          <div className="flex items-center gap-2">
                            {collapsedRelationshipSections[section.key] ? (
                              <ChevronRight className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            )}
                            <SectionIcon className={cn('w-5 h-5', section.color)} />
                            <h3 className={cn('text-lg font-semibold', section.color)}>
                              {section.label}
                            </h3>
                            <Badge variant="outline" className={cn('text-xs ml-1', section.badgeColor)}>
                              {rels.length}
                            </Badge>
                          </div>
                        </button>

                        {!collapsedRelationshipSections[section.key] && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {rels.map((rel, i) => {
                            const riskColor = rel.related_entity_risk_level === 'critical' ? 'text-red-400'
                              : rel.related_entity_risk_level === 'high' ? 'text-orange-400'
                              : rel.related_entity_risk_level === 'medium' ? 'text-yellow-400'
                              : 'text-gray-400';
                            const riskBg = rel.related_entity_risk_level === 'critical' ? 'bg-red-500/10 border-red-500/20'
                              : rel.related_entity_risk_level === 'high' ? 'bg-orange-500/10 border-orange-500/20'
                              : rel.related_entity_risk_level === 'medium' ? 'bg-yellow-500/10 border-yellow-500/20'
                              : 'bg-gray-500/10 border-gray-500/20';
                            const entityTypeKey = (rel.related_entity_type || '').toLowerCase();
                            const entityTypeLabel = entityTypeLabelExtended[entityTypeKey] || null;
                            const relCountries = (rel.related_entity_countries || []).slice(0, 3);
                            const sourceName = rel.source ? formatSourceName(rel.source) : null;
                            const referenceSummary = referenceLike ? getReferenceRelationshipSummary(rel) : null;
                            // Filtrar descriptions basura del FTM (contienen → o son solo nombres)
                            const cleanDescription = rel.description && !rel.description.includes('→') && !rel.description.includes('—')
                              && !rel.description.toLowerCase().startsWith('wikidata ')
                              ? rel.description : null;

                            return (
                            <motion.div
                              key={`${section.key}-${i}`}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.03 }}
                              className="glass rounded-lg p-4 hover:bg-white/[0.04] transition-colors"
                            >
                              {/* Row 1: Name + badges */}
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="flex-1 min-w-0">
                                  {rel.related_entity_id ? (
                                    <button
                                      onClick={() => navigate(`/entity/${rel.related_entity_id}${sourceLevelParam ? `?source_level=${sourceLevelParam}` : ''}`)}
                                      className="text-white font-medium hover:text-blue-400 transition-colors text-left cursor-pointer truncate block max-w-full"
                                    >
                                      {humanizeEntityName(rel.related_entity_name)}
                                    </button>
                                  ) : (
                                    <p className="text-white font-medium truncate">
                                      {humanizeEntityName(rel.related_entity_name)}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  {rel.aml_priority && (
                                    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium uppercase', priorityBadgeStyles[rel.aml_priority])}>
                                      {rel.aml_priority}
                                    </span>
                                  )}
                                  {rel.related_entity_is_pep && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                                      PEP
                                    </span>
                                  )}
                                  {rel.related_entity_risk_score != null && rel.related_entity_risk_score >= 40 && (
                                    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium border', riskBg, riskColor)}>
                                      {rel.related_entity_risk_level === 'critical' ? 'Crítico' :
                                       rel.related_entity_risk_level === 'high' ? 'Alto' :
                                       'Medio'} {rel.related_entity_risk_score}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Row 2: Subtype translated + context */}
                              <div className="flex items-center gap-1.5 text-sm mb-2">
                                {referenceSummary ? (
                                  <span className={section.color}>
                                    {referenceSummary}
                                  </span>
                                ) : rel.subtype ? (
                                  <span className={section.color}>
                                    {translateSubtype(rel.subtype)}
                                  </span>
                                ) : (
                                  <span className="text-gray-500 text-xs">
                                    {referenceLike ? 'Vínculo contextual' :
                                     section.key === 'family' ? 'Familiar' :
                                     section.key === 'associates' ? 'Asociado' :
                                     section.key === 'corporate' ? 'Relación corporativa' :
                                     section.key === 'political' ? 'Relación política' :
                                     section.key === 'sanctions' ? 'Relación sancionatoria' :
                                     section.key === 'profile' ? 'Contexto de perfil' :
                                     'Relacionado'}
                                  </span>
                                )}
                                {entityTypeLabel && (
                                  <>
                                    <span className="text-gray-600 text-xs">·</span>
                                    <span className="text-xs text-gray-500">{entityTypeLabel}</span>
                                  </>
                                )}
                                {!referenceLike && rel.context_category && (
                                  <>
                                    <span className="text-gray-600 text-xs">·</span>
                                    <span className="text-xs text-gray-500">
                                      {rel.context_category === 'aml_core' ? 'AML Core' :
                                       rel.context_category === 'affiliation' ? 'Afiliación' :
                                       rel.context_category === 'profile_context' ? 'Perfil' :
                                       'Contexto'}
                                    </span>
                                  </>
                                )}
                                {rel.percentage != null && (
                                  <>
                                    <span className="text-gray-600 text-xs">·</span>
                                    <span className="text-xs text-cyan-400 font-medium">{rel.percentage}%</span>
                                  </>
                                )}
                                {relCountries.length > 0 && (
                                  <>
                                    <span className="text-gray-600 text-xs">·</span>
                                    <span className="text-xs text-gray-500">
                                      {relCountries.map(c => countryNames[c] || c).join(', ')}
                                    </span>
                                  </>
                                )}
                              </div>

                              {/* Row 3: Metadata chips — solo lo relevante */}
                              <div className="flex flex-wrap items-center gap-1.5">
                                {/* Dates */}
                                {(rel.start_date || rel.end_date) && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-gray-400">
                                    <Calendar className="w-3 h-3" />
                                    {rel.start_date && rel.end_date
                                      ? `${formatDate(rel.start_date)} — ${formatDate(rel.end_date)}`
                                      : rel.start_date
                                      ? `Desde ${formatDate(rel.start_date)}`
                                      : `Hasta ${formatDate(rel.end_date!)}`}
                                  </span>
                                )}

                                {/* Source — nombre limpio */}
                                {sourceName && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-gray-400">
                                    <Database className="w-3 h-3" />
                                    {referenceLike && sourceName?.toLowerCase() === 'wikidata' ? 'Wikidata' : sourceName}
                                  </span>
                                )}

                                {/* Relationship level */}
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
                                     rel.relationship_level === 'AFFILIATION' ? 'Afiliación' :
                                     'Indirecta'}
                                  </span>
                                )}

                                {/* Unresolved */}
                                {!rel.is_resolved && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px]">
                                    Sin identificar
                                  </span>
                                )}

                                {/* Related entity sources count */}
                                {rel.related_entity_sources && rel.related_entity_sources.length > 1 && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-gray-400">
                                    <FileText className="w-3 h-3" />
                                    {rel.related_entity_sources.length} fuentes
                                  </span>
                                )}
                              </div>

                              {/* Row 4: Description solo si es legible */}
                              {cleanDescription && (
                                <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                                  {cleanDescription}
                                </p>
                              )}
                            </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
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
