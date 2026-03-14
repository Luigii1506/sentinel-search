import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Shield,
  Flag,
  User,
  Building2,
  Ship,
  Plane,
  Users,
  ArrowRight,
  AlertCircle,
  FileSearch,
  Sparkles,
  Ban,
  Landmark,
  FileText,
  Globe,
  Siren,
  Newspaper,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { IntelligentSearch } from "@/components/search/IntelligentSearch";
import { SourceLevelSelector } from "@/components/SourceLevelSelector";
import { SemanticSearchToggle } from "@/components/search/SemanticSearchToggle";
import { SemanticResults } from "@/components/search/SemanticResults";
import { cn, getRiskColor, getEntityTypeLabel } from "@/lib/utils";
import { useScreening } from "@/hooks/useScreening";
import { complianceService } from "@/services/compliance";
import type { EntityType, RiskLevel, DataSource } from "@/types";

const entityTypeIcons = {
  person: User,
  company: Building2,
  vessel: Ship,
  aircraft: Plane,
  organization: Users,
};

// Stagger animation for list items
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

// --- Source intelligence helpers ---

const SOURCE_DISPLAY: Record<string, string> = {
  OFAC_SDN: "OFAC SDN",
  OFAC_NON_SDN: "OFAC Non-SDN",
  us_sam_exclusions: "SAM.gov Exclusions",
  US_SAM_EXCLUSIONS: "SAM.gov Exclusions",
  us_hhs_exclusions: "HHS OIG (LEIE)",
  US_HHS_EXCLUSIONS: "HHS OIG (LEIE)",
  us_cia_world_leaders: "CIA World Leaders",
  US_CIA_WORLD_LEADERS: "CIA World Leaders",
  us_congress: "US Congress",
  US_CONGRESS: "US Congress",
  us_plum_book: "PLUM Book",
  US_PLUM_BOOK: "PLUM Book",
  us_finra_actions: "FINRA",
  US_FINRA_ACTIONS: "FINRA",
  us_occ_enfact: "OCC Enforcement",
  US_OCC_ENFACT: "OCC Enforcement",
  us_fed_enforcements: "Federal Reserve",
  US_FED_ENFORCEMENTS: "Federal Reserve",
  FBI_MOST_WANTED: "FBI Most Wanted",
  DEA_FUGITIVE: "DEA Fugitivos",
  BIS_CSL: "BIS CSL",
  SAT_INCUMPLIDOS: "SAT Art. 69-B",
  SAT_69B: "SAT Art. 69-B",
  PEP_GABINETE: "Gabinete Federal",
  PEP_SENADORES: "Senadores MX",
  PEP_DIPUTADOS: "Diputados MX",
  PEP_GOBERNADORES: "Gobernadores MX",
  PEP_SCJN: "SCJN",
  PEP_AUTONOMOS: "Org. Autónomos MX",
  PEP_REGULADORES_FINANCIEROS: "Reguladores Fin. MX",
  PEP_EMPRESAS_ESTADO: "Empresas Estado MX",
  BR_PEP: "PEP Brasil",
  BR_CEIS: "CEIS Brasil",
  co_funcion_publica: "Función Pública CO",
  ONU: "ONU Sanciones",
  UN_CONSOLIDATED: "ONU Sanciones",
  INTERPOL: "Interpol Red Notices",
  INTERPOL_RED_NOTICES: "Interpol",
  DEA: "DEA Fugitivos",
  ransomwhere: "Ransomwhere",
  CA_SANCTIONS: "Sanciones Canadá",
  CA_TERRORISTS: "Terroristas Canadá",
  GB_OFSI: "OFSI UK",
  EU_CFSP: "EU CFSP",
  EU_EUROPOL: "Europol",
};

function formatSourceName(source: string): string {
  if (SOURCE_DISPLAY[source]) return SOURCE_DISPLAY[source];
  return source
    .replace(/_/g, " ")
    .replace(/\b(us|mx|br|co|ca|gb|eu|pep|ofac|sat)\b/gi, (m) =>
      m.toUpperCase(),
    );
}

type SourceCat =
  | "sanctions"
  | "pep"
  | "debarment"
  | "regulatory"
  | "law_enforcement"
  | "tax"
  | "other";

function getSourceCategory(source: string): SourceCat {
  const s = source.toUpperCase();
  if (
    [
      "OFAC_SDN",
      "OFAC_NON_SDN",
      "BIS_CSL",
      "ONU",
      "UN_CONSOLIDATED",
      "CA_SANCTIONS",
      "CA_TERRORISTS",
      "GB_OFSI",
      "EU_CFSP",
    ].includes(s) ||
    s.includes("SANCTIONS") ||
    s.includes("OFAC")
  )
    return "sanctions";
  if (
    s.startsWith("PEP_") ||
    s.includes("CONGRESS") ||
    s.includes("PLUM") ||
    s.includes("CIA_WORLD") ||
    s.includes("LEGISLAT") ||
    s === "BR_PEP" ||
    s.includes("FUNCION_PUBLICA")
  )
    return "pep";
  if (
    s.includes("SAM_EXCLUSION") ||
    s.includes("HHS_EXCLUSION") ||
    s.includes("MED_EXCLUSION") ||
    s === "BR_CEIS"
  )
    return "debarment";
  if (
    s.includes("FINRA") ||
    s.includes("OCC") ||
    s.includes("FED_ENFORCE") ||
    s.includes("SEC_") ||
    s.includes("CFTC") ||
    s.includes("FDIC")
  )
    return "regulatory";
  if (
    s.includes("FBI") ||
    s.includes("DEA") ||
    s.includes("ICE") ||
    s.includes("INTERPOL") ||
    s.includes("EUROPOL")
  )
    return "law_enforcement";
  if (s.startsWith("SAT_") || s.includes("INCUMPLIDO")) return "tax";
  return "other";
}

function getCountryFromSources(sources: string[]): string | null {
  for (const src of sources) {
    const s = src.toUpperCase();
    if (
      s.startsWith("US_") ||
      [
        "OFAC_SDN",
        "OFAC_NON_SDN",
        "FBI_MOST_WANTED",
        "DEA_FUGITIVE",
        "BIS_CSL",
      ].includes(s)
    )
      return "US";
    if (s.startsWith("PEP_") || s.startsWith("SAT_")) return "MX";
    if (s.startsWith("BR_")) return "BR";
    if (s.startsWith("CO_") || s === "CO_FUNCION_PUBLICA") return "CO";
    if (s === "ONU" || s === "UN_CONSOLIDATED") return "INT";
    if (s.startsWith("EU_") || s === "EU_CFSP") return "EU";
    if (s.startsWith("GB_") || s === "GB_OFSI") return "GB";
    if (s.startsWith("CA_")) return "CA";
  }
  return null;
}

const COUNTRY_FLAGS: Record<string, string> = {
  US: "\u{1F1FA}\u{1F1F8}", MX: "\u{1F1F2}\u{1F1FD}", BR: "\u{1F1E7}\u{1F1F7}",
  CO: "\u{1F1E8}\u{1F1F4}", INT: "\u{1F30D}", EU: "\u{1F1EA}\u{1F1FA}",
  GB: "\u{1F1EC}\u{1F1E7}", CA: "\u{1F1E8}\u{1F1E6}", UY: "\u{1F1FA}\u{1F1FE}",
  AR: "\u{1F1E6}\u{1F1F7}", CL: "\u{1F1E8}\u{1F1F1}", PE: "\u{1F1F5}\u{1F1EA}",
  VE: "\u{1F1FB}\u{1F1EA}", PA: "\u{1F1F5}\u{1F1E6}", CU: "\u{1F1E8}\u{1F1FA}",
  RU: "\u{1F1F7}\u{1F1FA}", CN: "\u{1F1E8}\u{1F1F3}", IR: "\u{1F1EE}\u{1F1F7}",
  KP: "\u{1F1F0}\u{1F1F5}", SY: "\u{1F1F8}\u{1F1FE}", AF: "\u{1F1E6}\u{1F1EB}",
  BO: "\u{1F1E7}\u{1F1F4}", PY: "\u{1F1F5}\u{1F1FE}", EC: "\u{1F1EA}\u{1F1E8}",
  ES: "\u{1F1EA}\u{1F1F8}", FR: "\u{1F1EB}\u{1F1F7}", DE: "\u{1F1E9}\u{1F1EA}",
  IT: "\u{1F1EE}\u{1F1F9}", NL: "\u{1F1F3}\u{1F1F1}", TR: "\u{1F1F9}\u{1F1F7}",
  UA: "\u{1F1FA}\u{1F1E6}", NG: "\u{1F1F3}\u{1F1EC}", ZA: "\u{1F1FF}\u{1F1E6}",
  AU: "\u{1F1E6}\u{1F1FA}", JP: "\u{1F1EF}\u{1F1F5}", IN: "\u{1F1EE}\u{1F1F3}",
};

const COUNTRY_NAMES: Record<string, string> = {
  MX: 'México', US: 'EE.UU.', BR: 'Brasil', CO: 'Colombia', UY: 'Uruguay',
  AR: 'Argentina', CL: 'Chile', PE: 'Perú', VE: 'Venezuela', PA: 'Panamá',
  GB: 'Reino Unido', ES: 'España', FR: 'Francia', DE: 'Alemania', IT: 'Italia',
  RU: 'Rusia', CN: 'China', JP: 'Japón', IN: 'India', CA: 'Canadá',
  AU: 'Australia', CU: 'Cuba', BO: 'Bolivia', PY: 'Paraguay', EC: 'Ecuador',
  IR: 'Irán', KP: 'Corea del Norte', SY: 'Siria', AF: 'Afganistán',
  TR: 'Turquía', UA: 'Ucrania', NG: 'Nigeria', ZA: 'Sudáfrica',
  NL: 'Países Bajos', EU: 'Unión Europea',
};

const CATEGORY_CONFIG: Record<
  SourceCat,
  { label: string; color: string; Icon: typeof Shield }
> = {
  sanctions: { label: "Sanciones", color: "text-red-400", Icon: Shield },
  pep: { label: "PEP", color: "text-purple-400", Icon: Flag },
  debarment: { label: "Inhabilitación", color: "text-amber-400", Icon: Ban },
  regulatory: { label: "Regulatorio", color: "text-blue-400", Icon: Landmark },
  law_enforcement: { label: "Ley", color: "text-indigo-400", Icon: Siren },
  tax: { label: "Fiscal", color: "text-orange-400", Icon: FileText },
  other: { label: "Otro", color: "text-gray-400", Icon: Globe },
};

function getMatchTypeLabel(matchType: string, score: number): string {
  if (score >= 99) return "Coincidencia exacta";
  if (matchType === "phonetic") return "Coincidencia fonética";
  if (score >= 90) return "Coincidencia alta";
  return "Coincidencia aproximada";
}

// Search Result Card
function SearchResultCard({
  result,
  onClick,
  queryName,
  onCreateAlert,
}: {
  result: ReturnType<typeof useScreening>["results"][0];
  onClick: () => void;
  queryName?: string;
  onCreateAlert?: (
    result: ReturnType<typeof useScreening>["results"][0],
  ) => void;
}) {
  const entity = result;
  const Icon = entityTypeIcons[entity.entity_type as EntityType] || User;
  const riskColor = getRiskColor(entity.risk_level);

  // Derive intelligence from data
  const sources = entity.sources || [];
  const categories = new Set(sources.map(getSourceCategory));
  const country = entity.countries?.[0] || entity.nationalities?.[0] || getCountryFromSources(sources);
  const countryFlag = country ? COUNTRY_FLAGS[country] : null;
  const isPep =
    entity.is_current_pep || !!entity.pep_category || categories.has("pep");

  // Get first PEP position for display
  const pepPosition = entity.pep_positions?.[0] as
    | {
        cargo?: string;
        dependencia?: string;
        start_date?: string;
        end_date?: string;
        is_current?: boolean;
      }
    | undefined;

  return (
    <motion.div
      variants={itemVariants}
      onClick={onClick}
      whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
      className="glass rounded-xl p-5 cursor-pointer card-hover group relative overflow-hidden"
    >
      {/* Risk indicator line */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: riskColor }}
      />

      <div className="flex items-start gap-4 pl-3">
        {/* Icon with risk-colored background */}
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
          style={{ backgroundColor: `${riskColor}15` }}
        >
          <Icon className="w-6 h-6" style={{ color: riskColor }} />
        </motion.div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Row 1: Name + badges */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 className="text-lg font-medium text-white group-hover:text-blue-400 transition-colors">
              {entity.name}
            </h3>
            <Badge
              className="capitalize text-xs"
              style={{
                backgroundColor: `${riskColor}20`,
                color: riskColor,
                borderColor: `${riskColor}40`,
              }}
            >
              {entity.risk_level || "unknown"}
              {entity.risk_score != null &&
                ` · ${Math.round(entity.risk_score)}`}
            </Badge>
            <Badge variant="outline" className="text-[10px] bg-white/5">
              {Math.round(entity.match_score || 0)}% coincidencia
            </Badge>
            {/* Topics badges */}
            {entity.topics?.map((topic) => {
              const topicColors: Record<string, string> = {
                sanction: "bg-red-500/10 text-red-400 border-red-500/20",
                pep: "bg-purple-500/10 text-purple-400 border-purple-500/20",
                crime: "bg-orange-500/10 text-orange-400 border-orange-500/20",
                debarment: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                poi: "bg-blue-500/10 text-blue-400 border-blue-500/20",
              };
              return (
                <Badge
                  key={topic}
                  variant="outline"
                  className={`text-[10px] capitalize ${topicColors[topic] || "bg-gray-500/10 text-gray-400 border-gray-500/20"}`}
                >
                  {topic}
                </Badge>
              );
            })}
            {/* Adverse Media badge */}
            {entity.has_adverse_media && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-red-500/10 text-red-400 border-red-500/20 gap-1"
                    >
                      <Newspaper className="w-3 h-3" />
                      AM {entity.adverse_media_severity || 0}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Adverse Media:{" "}
                      {entity.adverse_media_categories?.join(", ")}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {/* Freshness warning */}
            {entity.freshness_factor != null &&
              entity.freshness_factor < 0.8 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className={`text-[10px] gap-1 ${
                          entity.freshness_factor < 0.3
                            ? "bg-red-500/10 text-red-400 border-red-500/20"
                            : entity.freshness_factor < 0.5
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        {Math.round(entity.freshness_factor * 100)}%
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Freshness: {Math.round(entity.freshness_factor * 100)}%
                        {entity.days_since_update != null &&
                          ` — ${entity.days_since_update} dias sin actualizar`}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
          </div>

          {/* Row 2: Type + country + birth_date + gender + match type */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-3">
            <span className="capitalize">
              {getEntityTypeLabel(entity.entity_type)}
            </span>
            {entity.entity_subtype && (
              <>
                <span className="text-gray-600">·</span>
                <span className="capitalize text-gray-500">
                  {entity.entity_subtype}
                </span>
              </>
            )}
            {country && (
              <>
                <span className="text-gray-600">·</span>
                <span>
                  {countryFlag || '🌍'} {COUNTRY_NAMES[country] || country}
                </span>
              </>
            )}
            {entity.nationalities && entity.nationalities.length > 0 &&
             !(entity.nationalities.length === 1 && entity.nationalities[0] === country) && (
              <>
                <span className="text-gray-600">·</span>
                <span>Nac: {entity.nationalities.map((n: string) => COUNTRY_NAMES[n] || n).join(", ")}</span>
              </>
            )}
            {(entity.birth_date || entity.date_of_birth) && (
              <>
                <span className="text-gray-600">·</span>
                <span className="flex items-center gap-1">
                  Nac. {entity.birth_date || entity.date_of_birth}
                </span>
              </>
            )}
            {entity.gender && (
              <>
                <span className="text-gray-600">·</span>
                <span>{entity.gender === 'male' ? 'Masculino' : entity.gender === 'female' ? 'Femenino' : entity.gender}</span>
              </>
            )}
            <span className="text-gray-600">·</span>
            <span className="text-gray-300">
              {getMatchTypeLabel(entity.match_type, entity.match_score || 0)}
            </span>
          </div>

          {/* Row 3: Category badges (data-driven) */}
          <div className="flex flex-wrap gap-3 mb-3">
            {Array.from(categories).map((cat) => {
              const cfg = CATEGORY_CONFIG[cat];
              return (
                <TooltipProvider key={cat}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`flex items-center gap-1 text-xs ${cfg.color}`}
                      >
                        <cfg.Icon className="w-3.5 h-3.5" />
                        <span>{cfg.label}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {sources
                          .filter((s) => getSourceCategory(s) === cat)
                          .map(formatSourceName)
                          .join(", ")}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
            {isPep && entity.is_current_pep && !categories.has("pep") && (
              <div className="flex items-center gap-1 text-xs text-purple-400">
                <Flag className="w-3.5 h-3.5" />
                <span>PEP Activo</span>
              </div>
            )}
          </div>

          {/* Row 4: PEP position detail (if available) */}
          {isPep && pepPosition && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-purple-500/5 border border-purple-500/10">
              <div className="flex items-center gap-2 text-xs text-purple-300">
                <Flag className="w-3 h-3 flex-shrink-0" />
                <span className="font-medium">
                  {pepPosition.cargo || entity.pep_category}
                </span>
                {pepPosition.dependencia && (
                  <>
                    <span className="text-purple-500">·</span>
                    <span className="text-purple-400">
                      {pepPosition.dependencia}
                    </span>
                  </>
                )}
              </div>
              {(pepPosition.start_date || pepPosition.end_date) && (
                <p className="text-[10px] text-purple-500 mt-1 ml-5">
                  {pepPosition.start_date?.slice(0, 4)}
                  {pepPosition.end_date
                    ? ` — ${pepPosition.end_date.slice(0, 4)}`
                    : " — presente"}
                  {pepPosition.is_current === false && " (histórico)"}
                </p>
              )}
            </div>
          )}

          {/* Row 5: Data Sources (formatted names) */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {sources.slice(0, 4).map((source) => {
              const cat = getSourceCategory(source);
              const colorMap: Record<SourceCat, string> = {
                sanctions: "border-red-500/20 text-red-400/80",
                pep: "border-purple-500/20 text-purple-400/80",
                debarment: "border-amber-500/20 text-amber-400/80",
                regulatory: "border-blue-500/20 text-blue-400/80",
                law_enforcement: "border-indigo-500/20 text-indigo-400/80",
                tax: "border-orange-500/20 text-orange-400/80",
                other: "border-white/10 text-gray-400",
              };
              return (
                <span
                  key={source}
                  className={`text-[10px] px-2 py-0.5 rounded-full bg-white/5 border ${colorMap[cat]}`}
                >
                  {formatSourceName(source)}
                </span>
              );
            })}
            {sources.length > 4 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-500">
                +{sources.length - 4}
              </span>
            )}
          </div>

          {/* Addresses */}
          {entity.addresses && entity.addresses.length > 0 && (
            <div className="mb-3 text-sm text-gray-400">
              <span className="text-gray-500">📍</span>{" "}
              {entity.addresses.slice(0, 2).map((addr, i) => (
                <span key={i}>
                  {typeof addr === "string" ? addr : addr.address}
                  {i < Math.min(entity.addresses!.length, 2) - 1 && " | "}
                </span>
              ))}
              {entity.addresses.length > 2 && (
                <span className="text-gray-500">
                  {" "}
                  +{entity.addresses.length - 2} más
                </span>
              )}
            </div>
          )}

          {/* Identifiers */}
          {entity.identifiers && Object.keys(entity.identifiers).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {Object.entries(entity.identifiers)
                .slice(0, 3)
                .map(([key, value]) => (
                  <span
                    key={key}
                    className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  >
                    {key}: {value}
                  </span>
                ))}
              {Object.keys(entity.identifiers).length > 3 && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-500">
                  +{Object.keys(entity.identifiers).length - 3} más
                </span>
              )}
            </div>
          )}

          {/* Sanctions Details */}
          {entity.sanctions_details && entity.sanctions_details.length > 0 && (
            <div className="mb-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-red-400" />
                <span className="text-sm font-medium text-red-400">
                  {entity.sanctions_details.length} sanción(es)
                </span>
              </div>
              <div className="space-y-1.5">
                {entity.sanctions_details.slice(0, 2).map((sanction, i) => (
                  <div key={i} className="text-xs">
                    <span className="text-gray-300 font-medium">
                      {sanction.authority}
                    </span>
                    {sanction.program && (
                      <span className="text-gray-400">
                        {" "}
                        — {sanction.program}
                      </span>
                    )}
                    {sanction.reason && (
                      <p className="text-gray-500 text-[10px] mt-0.5">
                        {sanction.reason}
                      </p>
                    )}
                  </div>
                ))}
                {entity.sanctions_details.length > 2 && (
                  <p className="text-[10px] text-gray-500">
                    +{entity.sanctions_details.length - 2} sanciones más...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Adverse Media Details */}
          {entity.adverse_media_details &&
            entity.adverse_media_details.length > 0 && (
              <div className="mb-3 p-3 rounded-lg bg-orange-500/5 border border-orange-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <Newspaper className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-medium text-orange-400">
                    Adverse Media — Severidad {entity.adverse_media_severity}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {entity.adverse_media_details.map((am, i) => (
                    <div key={i} className="text-xs">
                      <span className="text-gray-300 font-medium capitalize">
                        {am.category}
                      </span>
                      <span className="text-gray-500">
                        {" "}
                        — sev. {am.severity}
                      </span>
                      <p className="text-gray-500 text-[10px] mt-0.5">
                        {am.details}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Row 6: Explanation }}
          {entity.explanation && (
            <p className="text-xs text-gray-500 line-clamp-2">
              {entity.explanation}
            </p>
          )}

          {/* Explainability Section (Level 5) */}
          {entity.explainability && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between text-[10px] text-gray-500 mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span>Análisis del Algoritmo v3.1</span>
                </div>
                {entity.ml_probability !== undefined && (
                  <span className="text-purple-400 font-medium">
                    ML: {Math.round(entity.ml_probability * 100)}%
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] mb-2">
                {entity.explainability.structural_analysis && (
                  <>
                    <span className="text-gray-600">Tokens:</span>
                    <span className="text-gray-400">
                      {entity.explainability.structural_analysis.tokens_matched}
                    </span>
                  </>
                )}
                {entity.explainability.structural_analysis?.surnames_matched !==
                  undefined && (
                  <>
                    <span className="text-gray-600">Apellidos:</span>
                    <span
                      className={
                        entity.explainability.structural_analysis
                          .surnames_matched
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    >
                      {entity.explainability.structural_analysis
                        .surnames_matched
                        ? "\u2713 Coinciden"
                        : "\u2717 No coinciden"}
                    </span>
                  </>
                )}
                {entity.explainability.text_score_components && (
                  <>
                    <span className="text-gray-600">Similitud:</span>
                    <span className="text-gray-400">
                      {Math.round(
                        (entity.explainability.text_score_components
                          .avg_jaro_similarity || 0) * 100,
                      )}
                      %
                    </span>
                  </>
                )}
                {entity.context_breakdown && (
                  <>
                    <span className="text-gray-600">Contexto:</span>
                    <span className="text-blue-400">
                      +
                      {Math.round(
                        (entity.context_breakdown.country_boost || 0) * 100,
                      )}
                      %
                    </span>
                  </>
                )}
              </div>

              {/* Boosts y Penalizaciones */}
              {entity.explainability.boosts_applied &&
                Object.keys(entity.explainability.boosts_applied).length >
                  0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {Object.entries(entity.explainability.boosts_applied).map(
                      ([key, value]) => (
                        <span
                          key={key}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20"
                        >
                          {key}: {value}
                        </span>
                      ),
                    )}
                  </div>
                )}
              {entity.explainability.penalties_applied &&
                Object.keys(entity.explainability.penalties_applied).length >
                  0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(
                      entity.explainability.penalties_applied,
                    ).map(([key, value]) => (
                      <span
                        key={key}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20"
                      >
                        {key}: {value}
                      </span>
                    ))}
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          {onCreateAlert && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateAlert(result);
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:text-red-300 transition-colors"
              title="Crear alerta de compliance"
            >
              <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
              Alertar
            </button>
          )}
          <motion.div
            initial={{ x: 0, opacity: 0.5 }}
            whileHover={{ x: 5, opacity: 1 }}
          >
            <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

// Filter Panel
function FilterPanel({
  filters,
  onFilterChange,
}: {
  filters: { entityTypes: string[]; riskLevels: string[]; sources: string[] };
  onFilterChange: (filters: {
    entityTypes: string[];
    riskLevels: string[];
    sources: string[];
  }) => void;
}) {
  const entityTypes: EntityType[] = [
    "person",
    "company",
    "vessel",
    "aircraft",
    "organization",
  ];
  const riskLevels: RiskLevel[] = ["critical", "high", "medium", "low"];
  const sources: DataSource[] = [
    "OFAC",
    "UN",
    "HMT",
    "EU",
    "PEP",
    "ADVERSE_MEDIA",
  ];

  const toggleEntityType = (type: string) => {
    const newTypes = filters.entityTypes.includes(type)
      ? filters.entityTypes.filter((t) => t !== type)
      : [...filters.entityTypes, type];
    onFilterChange({ ...filters, entityTypes: newTypes });
  };

  const toggleRiskLevel = (level: string) => {
    const newLevels = filters.riskLevels.includes(level)
      ? filters.riskLevels.filter((l) => l !== level)
      : [...filters.riskLevels, level];
    onFilterChange({ ...filters, riskLevels: newLevels });
  };

  const toggleSource = (source: string) => {
    const newSources = filters.sources.includes(source)
      ? filters.sources.filter((s) => s !== source)
      : [...filters.sources, source];
    onFilterChange({ ...filters, sources: newSources });
  };

  const clearFilters = () => {
    onFilterChange({ entityTypes: [], riskLevels: [], sources: [] });
  };

  const hasFilters =
    filters.entityTypes.length > 0 ||
    filters.riskLevels.length > 0 ||
    filters.sources.length > 0;

  return (
    <div className="glass rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filtros
        </h3>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-xs text-gray-400 hover:text-white"
          >
            Limpiar
          </Button>
        )}
      </div>

      {/* Entity Types */}
      <div>
        <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3">
          Tipo de Entidad
        </h4>
        <div className="space-y-2">
          {entityTypes.map((type) => {
            const Icon = entityTypeIcons[type];
            return (
              <motion.label
                key={type}
                whileHover={{ x: 2 }}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={filters.entityTypes.includes(type)}
                  onChange={() => toggleEntityType(type)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500/20"
                />
                <Icon className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-300 capitalize">
                  {getEntityTypeLabel(type)}
                </span>
              </motion.label>
            );
          })}
        </div>
      </div>

      {/* Risk Levels */}
      <div>
        <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3">
          Nivel de Riesgo
        </h4>
        <div className="space-y-2">
          {riskLevels.map((level) => {
            const colors: Record<string, string> = {
              critical: "text-red-400",
              high: "text-orange-400",
              medium: "text-yellow-400",
              low: "text-green-400",
              none: "text-gray-400",
            };
            return (
              <motion.label
                key={level}
                whileHover={{ x: 2 }}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={filters.riskLevels.includes(level)}
                  onChange={() => toggleRiskLevel(level)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500/20"
                />
                <span className={cn("text-sm capitalize", colors[level])}>
                  {level === "critical"
                    ? "Crítico"
                    : level === "high"
                      ? "Alto"
                      : level === "medium"
                        ? "Medio"
                        : "Bajo"}
                </span>
              </motion.label>
            );
          })}
        </div>
      </div>

      {/* Sources */}
      <div>
        <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3">
          Fuente de Datos
        </h4>
        <div className="space-y-2">
          {sources.map((source) => (
            <motion.label
              key={source}
              whileHover={{ x: 2 }}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={filters.sources.includes(source)}
                onChange={() => toggleSource(source)}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500/20"
              />
              <span className="text-sm text-gray-300">{source}</span>
            </motion.label>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get("q") || "";
  const initialSourceLevel = parseInt(
    searchParams.get("source_level") || "2",
  ) as 1 | 2 | 3 | 4;
  const [sourceLevel, setSourceLevel] = useState<1 | 2 | 3 | 4>(
    initialSourceLevel,
  );

  const {
    query,
    results,
    isLoading,
    hasSearched,
    filters,
    searchMode,
    performance,
    setFilters,
    setSearchMode,
    executeSearch,
    executeSemanticSearch,
    clearSearch,
  } = useScreening(sourceLevel);

  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState({
    entityTypes: filters.entityTypes,
    riskLevels: filters.riskLevels,
    sources: filters.sources,
  });

  // Execute search on mount if query param exists
  useEffect(() => {
    if (initialQuery) {
      executeSearch(initialQuery);
    }
  }, []);

  // Re-execute search when sourceLevel changes
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const q = query || initialQuery;
    if (q) {
      executeSearch(q);
    }
  }, [sourceLevel]);

  const handleSearch = (searchQuery: string) => {
    setSearchParams({ q: searchQuery, source_level: String(sourceLevel) });
    if (searchMode === "semantic") {
      executeSemanticSearch(searchQuery);
    } else {
      executeSearch(searchQuery);
    }
  };

  const handleModeChange = (mode: "traditional" | "semantic" | "auto") => {
    setSearchMode(mode);
    if (query.trim().length >= 2) {
      // Re-execute search with new mode
      if (mode === "semantic") {
        executeSemanticSearch(query);
      } else {
        executeSearch(query);
      }
    }
  };

  const handleSelectResult = (entityId: string) => {
    navigate(`/entity/${entityId}?source_level=${sourceLevel}`);
  };

  const [alertCreating, setAlertCreating] = useState<string | null>(null);

  const handleCreateAlert = async (result: (typeof results)[0]) => {
    if (alertCreating) return;
    setAlertCreating(result.entity_id);
    try {
      const resp = await complianceService.createAlertFromMatch({
        query_name: query,
        entity_id: result.entity_id,
        entity_name: result.name,
        match_confidence: result.confidence,
        match_type: result.match_type || "opensearch",
        risk_score: result.risk_score ?? 50,
        sources: result.sources || [],
      });
      alert(`Alerta creada: ${resp.case_number}`);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response
              ?.data?.detail || "Error al crear alerta"
          : "Error al crear alerta";
      alert(msg);
    } finally {
      setAlertCreating(null);
    }
  };

  const handleFilterChange = (newFilters: typeof localFilters) => {
    setLocalFilters(newFilters);
    setFilters({ ...newFilters, countries: [] });
  };

  const activeFilterCount =
    localFilters.entityTypes.length +
    localFilters.riskLevels.length +
    localFilters.sources.length;

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-white">
              Búsqueda de Entidades
            </h1>
            <SemanticSearchToggle
              mode={searchMode}
              onChange={handleModeChange}
            />
          </div>
          <IntelligentSearch
            onSearch={handleSearch}
            onSelectResult={handleSelectResult}
            initialQuery={initialQuery}
            className="max-w-3xl"
            sourceLevel={sourceLevel}
          />
          <SourceLevelSelector
            value={sourceLevel}
            onChange={(level) => {
              setSourceLevel(level);
              setSearchParams({
                q: query || initialQuery,
                source_level: String(level),
              });
            }}
            className="mt-3"
          />
        </motion.div>

        {/* Results Section */}
        <AnimatePresence mode="wait">
          {hasSearched && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-4 gap-6"
            >
              {/* Filters Sidebar */}
              <div className="lg:col-span-1">
                <div className="lg:hidden mb-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="w-full gap-2 border-white/10"
                  >
                    <Filter className="w-4 h-4" />
                    Filtros
                    {activeFilterCount > 0 && (
                      <Badge className="bg-blue-500 text-white ml-2">
                        {activeFilterCount}
                      </Badge>
                    )}
                    {showFilters ? (
                      <ChevronUp className="w-4 h-4 ml-auto" />
                    ) : (
                      <ChevronDown className="w-4 h-4 ml-auto" />
                    )}
                  </Button>
                </div>

                <div
                  className={cn("lg:block", showFilters ? "block" : "hidden")}
                >
                  <FilterPanel
                    filters={localFilters}
                    onFilterChange={handleFilterChange}
                  />
                </div>
              </div>

              {/* Results List */}
              <div className="lg:col-span-3">
                {/* Results Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-medium text-white">
                      {isLoading
                        ? "Buscando..."
                        : searchMode === "semantic"
                          ? `${results.length} resultados semánticos`
                          : `${results.length} resultados`}
                    </h2>
                    {query && (
                      <p className="text-sm text-gray-400">
                        para &quot;{query}&quot; • modo{" "}
                        {searchMode === "semantic"
                          ? "semántico"
                          : "tradicional"}
                      </p>
                    )}
                  </div>

                  {hasSearched && !isLoading && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSearch}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Limpiar
                    </Button>
                  )}
                </div>

                {/* Loading State */}
                {isLoading && (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="glass rounded-xl p-5">
                        <div className="flex items-start gap-4">
                          <Skeleton className="w-1 h-16 rounded-full" />
                          <Skeleton className="w-12 h-12 rounded-xl" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-6 w-64" />
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Semantic Results */}
                {!isLoading &&
                  searchMode === "semantic" &&
                  results.length > 0 && (
                    <SemanticResults
                      results={results}
                      query={query}
                      executionTime={performance?.executionTimeMs}
                      onSelectEntity={handleSelectResult}
                    />
                  )}

                {/* Traditional Results */}
                {!isLoading &&
                  searchMode === "traditional" &&
                  results.length > 0 && (
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="show"
                      className="space-y-3"
                    >
                      {results.map((result) => (
                        <SearchResultCard
                          key={result.entity_id}
                          result={result}
                          onClick={() => handleSelectResult(result.entity_id)}
                          queryName={query}
                          onCreateAlert={handleCreateAlert}
                        />
                      ))}
                    </motion.div>
                  )}

                {/* Empty State */}
                {!isLoading &&
                  hasSearched &&
                  ((searchMode === "traditional" && results.length === 0) ||
                    (searchMode === "semantic" && results.length === 0)) && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="glass rounded-xl p-12 text-center"
                    >
                      <FileSearch className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-xl font-medium text-white mb-2">
                        No se encontraron resultados
                      </h3>
                      <p className="text-gray-400 mb-6">
                        Intenta con otros términos de búsqueda o ajusta los
                        filtros
                      </p>
                      <Button
                        onClick={clearSearch}
                        variant="outline"
                        className="border-white/10"
                      >
                        Nueva Búsqueda
                      </Button>
                    </motion.div>
                  )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Initial State - No Search Yet */}
        {!hasSearched && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-12"
          >
            <h2 className="text-lg font-medium text-white mb-6">
              Búsquedas Sugeridas
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  query: "OFAC",
                  description: "Listas de sanciones OFAC",
                  icon: Shield,
                },
                {
                  query: "PEP",
                  description: "Personas Políticamente Expuestas",
                  icon: Flag,
                },
                {
                  query: "empresa",
                  description: "Empresas en listas de control",
                  icon: Building2,
                },
                {
                  query: "buque",
                  description: "Embarcaciones sancionadas",
                  icon: Ship,
                },
                {
                  query: "offshore",
                  description: "Empresas en paraísos fiscales",
                  icon: AlertCircle,
                },
                {
                  query: "terrorismo",
                  description: "Vinculados a actividades terroristas",
                  icon: AlertCircle,
                },
              ].map((item, index) => (
                <motion.button
                  key={item.query}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  onClick={() => handleSearch(item.query)}
                  className="glass rounded-xl p-4 text-left hover:bg-white/[0.03] transition-all group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                      <item.icon className="w-5 h-5 text-blue-400" />
                    </div>
                    <span className="font-medium text-white">{item.query}</span>
                  </div>
                  <p className="text-sm text-gray-400">{item.description}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default SearchPage;
