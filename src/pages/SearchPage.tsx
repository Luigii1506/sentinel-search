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
  ExternalLink,
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
  Calendar,
  MapPin,
  Fingerprint,
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
  US: "\u{1F1FA}\u{1F1F8}",
  MX: "\u{1F1F2}\u{1F1FD}",
  BR: "\u{1F1E7}\u{1F1F7}",
  CO: "\u{1F1E8}\u{1F1F4}",
  INT: "\u{1F30D}",
  EU: "\u{1F1EA}\u{1F1FA}",
  GB: "\u{1F1EC}\u{1F1E7}",
  CA: "\u{1F1E8}\u{1F1E6}",
  UY: "\u{1F1FA}\u{1F1FE}",
  AR: "\u{1F1E6}\u{1F1F7}",
  CL: "\u{1F1E8}\u{1F1F1}",
  PE: "\u{1F1F5}\u{1F1EA}",
  VE: "\u{1F1FB}\u{1F1EA}",
  PA: "\u{1F1F5}\u{1F1E6}",
  CU: "\u{1F1E8}\u{1F1FA}",
  RU: "\u{1F1F7}\u{1F1FA}",
  CN: "\u{1F1E8}\u{1F1F3}",
  IR: "\u{1F1EE}\u{1F1F7}",
  KP: "\u{1F1F0}\u{1F1F5}",
  SY: "\u{1F1F8}\u{1F1FE}",
  AF: "\u{1F1E6}\u{1F1EB}",
  BO: "\u{1F1E7}\u{1F1F4}",
  PY: "\u{1F1F5}\u{1F1FE}",
  EC: "\u{1F1EA}\u{1F1E8}",
  ES: "\u{1F1EA}\u{1F1F8}",
  FR: "\u{1F1EB}\u{1F1F7}",
  DE: "\u{1F1E9}\u{1F1EA}",
  IT: "\u{1F1EE}\u{1F1F9}",
  NL: "\u{1F1F3}\u{1F1F1}",
  TR: "\u{1F1F9}\u{1F1F7}",
  UA: "\u{1F1FA}\u{1F1E6}",
  NG: "\u{1F1F3}\u{1F1EC}",
  ZA: "\u{1F1FF}\u{1F1E6}",
  AU: "\u{1F1E6}\u{1F1FA}",
  JP: "\u{1F1EF}\u{1F1F5}",
  IN: "\u{1F1EE}\u{1F1F3}",
};

const COUNTRY_NAMES: Record<string, string> = {
  MX: "México",
  US: "EE.UU.",
  BR: "Brasil",
  CO: "Colombia",
  UY: "Uruguay",
  AR: "Argentina",
  CL: "Chile",
  PE: "Perú",
  VE: "Venezuela",
  PA: "Panamá",
  GB: "Reino Unido",
  ES: "España",
  FR: "Francia",
  DE: "Alemania",
  IT: "Italia",
  RU: "Rusia",
  CN: "China",
  JP: "Japón",
  IN: "India",
  CA: "Canadá",
  AU: "Australia",
  CU: "Cuba",
  BO: "Bolivia",
  PY: "Paraguay",
  EC: "Ecuador",
  IR: "Irán",
  KP: "Corea del Norte",
  SY: "Siria",
  AF: "Afganistán",
  TR: "Turquía",
  UA: "Ucrania",
  NG: "Nigeria",
  ZA: "Sudáfrica",
  NL: "Países Bajos",
  EU: "Unión Europea",
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

const SOURCE_COLOR_MAP: Record<SourceCat, string> = {
  sanctions: "border-red-500/20 text-red-400/80",
  pep: "border-purple-500/20 text-purple-400/80",
  debarment: "border-amber-500/20 text-amber-400/80",
  regulatory: "border-blue-500/20 text-blue-400/80",
  law_enforcement: "border-indigo-500/20 text-indigo-400/80",
  tax: "border-orange-500/20 text-orange-400/80",
  other: "border-white/10 text-gray-400",
};

function getMatchTypeLabel(matchType: string, score: number): string {
  if (score >= 99) return "Exacta";
  if (matchType === "phonetic") return "Fonética";
  if (score >= 90) return "Alta";
  return "Aproximada";
}

// ═══════════════════════════════════════════════════
// Search Result Card — Collapsible (OpenSanctions-inspired)
// ═══════════════════════════════════════════════════

const CATEGORY_BADGE_CONFIG: Record<
  SourceCat,
  {
    label: string;
    icon: typeof Shield;
    bg: string;
    text: string;
    border: string;
  }
> = {
  sanctions: {
    label: "Sanciones",
    icon: Shield,
    bg: "bg-red-500/15",
    text: "text-red-400",
    border: "border-red-500/30",
  },
  pep: {
    label: "PEP",
    icon: Flag,
    bg: "bg-purple-500/15",
    text: "text-purple-400",
    border: "border-purple-500/30",
  },
  debarment: {
    label: "Inhabilitación",
    icon: Ban,
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  regulatory: {
    label: "Regulatorio",
    icon: Landmark,
    bg: "bg-blue-500/15",
    text: "text-blue-400",
    border: "border-blue-500/30",
  },
  law_enforcement: {
    label: "Ley",
    icon: Siren,
    bg: "bg-indigo-500/15",
    text: "text-indigo-400",
    border: "border-indigo-500/30",
  },
  tax: {
    label: "Fiscal",
    icon: FileText,
    bg: "bg-orange-500/15",
    text: "text-orange-400",
    border: "border-orange-500/30",
  },
  other: {
    label: "Otro",
    icon: Globe,
    bg: "bg-gray-500/15",
    text: "text-gray-400",
    border: "border-gray-500/30",
  },
};

function SearchResultCard({
  result,
  onViewEntity,
  onCreateAlert,
}: {
  result: ReturnType<typeof useScreening>["results"][0];
  onViewEntity: () => void;
  onCreateAlert?: (
    result: ReturnType<typeof useScreening>["results"][0],
  ) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const entity = result;
  const TypeIcon = entityTypeIcons[entity.entity_type as EntityType] || User;
  const riskColor = getRiskColor(entity.risk_level);

  const sources = entity.sources || [];
  const categories = new Set(sources.map(getSourceCategory));
  const country =
    entity.countries?.[0] ||
    entity.nationalities?.[0] ||
    getCountryFromSources(sources);
  const countryFlag = country ? COUNTRY_FLAGS[country] : null;
  const isPep =
    entity.is_current_pep || !!entity.pep_category || categories.has("pep");

  const pepPosition = entity.pep_positions?.[0] as
    | {
        cargo?: string;
        dependencia?: string;
        start_date?: string;
        end_date?: string;
        is_current?: boolean;
      }
    | undefined;

  const hasExpandableContent =
    sources.length > 0 ||
    (entity.sanctions_details && entity.sanctions_details.length > 0) ||
    (entity.addresses && entity.addresses.length > 0) ||
    (entity.identifiers && Object.keys(entity.identifiers).length > 0) ||
    (entity.aliases && entity.aliases.length > 0) ||
    (isPep && pepPosition) ||
    (entity.adverse_media_details && entity.adverse_media_details.length > 0) ||
    entity.explainability;

  const genderLabel =
    entity.gender === "male"
      ? "Masculino"
      : entity.gender === "female"
        ? "Femenino"
        : entity.gender;

  return (
    <motion.div
      variants={itemVariants}
      className="glass rounded-xl relative overflow-hidden"
    >
      {/* Risk indicator stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: riskColor }}
      />

      {/* ── HEADER (always visible) ── */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-5 py-3.5 pl-6 cursor-pointer hover:bg-white/[0.02] transition-colors select-none"
      >
        <div className="flex items-start gap-3">
          {/* Entity type icon */}
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ backgroundColor: `${riskColor}12` }}
          >
            <TypeIcon className="w-5 h-5" style={{ color: riskColor }} />
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Name + description + aliases */}
            <h3 className="text-[15px] font-semibold text-white leading-tight">
              {entity.display_name || entity.name}
            </h3>
            {entity.description && (
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                {entity.description}
              </p>
            )}
            {entity.aliases && entity.aliases.length > 0 && !entity.description && (
              <p className="text-xs text-gray-500 mt-0.5">
                aka: {entity.aliases.slice(0, 2).join(", ")}
                {entity.aliases.length > 2 && ` +${entity.aliases.length - 2}`}
              </p>
            )}

            {/* Badges row: Risk + Match + Freshness */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge
                className="text-[10px] px-2 py-0.5 gap-1 font-medium uppercase"
                style={{
                  backgroundColor: `${riskColor}20`,
                  color: riskColor,
                  borderColor: `${riskColor}40`,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full inline-block"
                  style={{ backgroundColor: riskColor }}
                />
                {entity.risk_level || "unknown"} Risk
                {entity.risk_score != null &&
                  ` · Score ${Math.round(entity.risk_score)}`}
              </Badge>
              <Badge className="text-[10px] px-2 py-0.5 gap-1 font-medium bg-green-500/15 text-green-400 border-green-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                {getMatchTypeLabel(entity.match_type, entity.match_score || 0)}{" "}
                · {Math.round(entity.match_score || 0)}%
              </Badge>
              {entity.has_adverse_media && (
                <Badge className="text-[10px] px-2 py-0.5 gap-1 bg-red-500/15 text-red-400 border-red-500/30">
                  <Newspaper className="w-3 h-3" />
                  Adverse Media
                </Badge>
              )}
              {entity.freshness_factor != null &&
                entity.freshness_factor < 0.5 && (
                  <Badge className="text-[10px] px-2 py-0.5 gap-1 bg-amber-500/15 text-amber-400 border-amber-500/30">
                    <Clock className="w-3 h-3" />
                    Freshness {Math.round(entity.freshness_factor * 100)}%
                  </Badge>
                )}
            </div>

            {/* Category badges row (like OpenSanctions: Sanctions, PEP, Debarment...) */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {Array.from(categories).map((cat) => {
                const cfg = CATEGORY_BADGE_CONFIG[cat];
                const CatIcon = cfg.icon;
                return (
                  <span
                    key={cat}
                    className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                  >
                    <CatIcon className="w-3 h-3" />
                    {cfg.label}
                  </span>
                );
              })}
              {isPep && entity.is_current_pep && !categories.has("pep") && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border bg-purple-500/15 text-purple-400 border-purple-500/30">
                  <Flag className="w-3 h-3" />
                  PEP Activo
                </span>
              )}
            </div>
          </div>

          {/* Actions + chevron */}
          <div className="flex items-center gap-1.5 flex-shrink-0 mt-1">
            {onCreateAlert && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateAlert(result);
                      }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                    >
                      <AlertCircle className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Crear alerta</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewEntity();
                    }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 hover:text-blue-300 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Ver perfil completo</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {hasExpandableContent && (
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-300"
              >
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* ── EXPANDED DETAIL ── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-5 pt-1 border-t border-white/5 space-y-4">
              {/* ─ Personal Info Grid (like OpenSanctions) ─ */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/5 rounded-lg overflow-hidden border border-white/5">
                <div className="bg-[#0d0d0d] px-3 py-2.5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                    Tipo
                  </p>
                  <p className="text-sm text-white font-medium mt-0.5 capitalize">
                    {getEntityTypeLabel(entity.entity_type)}
                  </p>
                </div>
                <div className="bg-[#0d0d0d] px-3 py-2.5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                    Género
                  </p>
                  <p className="text-sm text-white font-medium mt-0.5">
                    {genderLabel || "—"}
                  </p>
                </div>
                <div className="bg-[#0d0d0d] px-3 py-2.5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                    Fecha Nacimiento
                  </p>
                  <p className="text-sm text-white font-medium mt-0.5">
                    {entity.birth_date || entity.date_of_birth || "—"}
                  </p>
                </div>
                <div className="bg-[#0d0d0d] px-3 py-2.5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                    Lugar Nacimiento
                  </p>
                  <p className="text-sm text-white font-medium mt-0.5">
                    {entity.place_of_birth || "—"}
                  </p>
                </div>
                <div className="bg-[#0d0d0d] px-3 py-2.5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                    Nacionalidad
                  </p>
                  <p className="text-sm text-white font-medium mt-0.5">
                    {entity.nationalities_display && entity.nationalities_display.length > 0 ? (
                      <>
                        {countryFlag} {entity.nationalities_display.join(", ")}
                      </>
                    ) : country ? (
                      <>
                        {countryFlag} {COUNTRY_NAMES[country] || country}
                      </>
                    ) : (
                      "—"
                    )}
                  </p>
                </div>
                {entity.addresses && entity.addresses.length > 0 && (
                  <div className="bg-[#0d0d0d] px-3 py-2.5 col-span-2">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                      Ubicación
                    </p>
                    <p className="text-sm text-white font-medium mt-0.5 truncate">
                      {typeof entity.addresses[0] === "string"
                        ? entity.addresses[0]
                        : entity.addresses[0].address}
                      {entity.addresses.length > 1 && (
                        <span className="text-gray-500 text-xs">
                          {" "}
                          +{entity.addresses.length - 1}
                        </span>
                      )}
                    </p>
                  </div>
                )}
                {entity.nationalities &&
                  entity.nationalities.length > 0 &&
                  !(
                    entity.nationalities.length === 1 &&
                    entity.nationalities[0] === country
                  ) && (
                    <div className="bg-[#0d0d0d] px-3 py-2.5 col-span-2">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                        Nacionalidades
                      </p>
                      <p className="text-sm text-white font-medium mt-0.5">
                        {entity.nationalities
                          .map(
                            (n: string) =>
                              `${COUNTRY_FLAGS[n] || ""} ${COUNTRY_NAMES[n] || n}`,
                          )
                          .join("  ·  ")}
                      </p>
                    </div>
                  )}
              </div>

              {/* ─ POSITION section ─ */}
              {isPep && pepPosition && (
                <div>
                  <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">
                    Posición
                  </h4>
                  <div className="rounded-lg bg-purple-500/5 border border-purple-500/15 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Flag className="w-4 h-4 text-purple-400 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-white">
                            {pepPosition.cargo || entity.pep_category}
                          </p>
                          {pepPosition.dependencia && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {pepPosition.dependencia}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {(pepPosition.start_date || pepPosition.end_date) && (
                          <p className="text-xs text-purple-400 font-medium">
                            {pepPosition.start_date?.slice(0, 4)}
                            {pepPosition.end_date
                              ? ` – ${pepPosition.end_date.slice(0, 4)}`
                              : " – Presente"}
                          </p>
                        )}
                        {(pepPosition.start_date || pepPosition.end_date) && (
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {pepPosition.is_current !== false &&
                            !pepPosition.end_date
                              ? "Presente"
                              : pepPosition.end_date?.slice(0, 4)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─ Wikidata Enriched: Education, Political, Positions ─ */}
              {(entity.education?.length || entity.political?.length || entity.positions?.length) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {entity.positions && entity.positions.length > 0 && (
                    <div className="rounded-lg bg-purple-500/5 border border-purple-500/15 px-3 py-2.5">
                      <p className="text-[10px] text-purple-400 uppercase tracking-wider font-semibold mb-1.5">
                        Cargos ({entity.positions.length})
                      </p>
                      <div className="space-y-1">
                        {entity.positions.filter(Boolean).slice(0, 5).map((p, i) => (
                          <p key={i} className="text-xs text-gray-300 leading-snug">
                            {p}
                          </p>
                        ))}
                        {entity.positions.filter(Boolean).length > 5 && (
                          <p className="text-[10px] text-gray-500">
                            +{entity.positions.filter(Boolean).length - 5} más
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {entity.education && entity.education.length > 0 && (
                    <div className="rounded-lg bg-blue-500/5 border border-blue-500/15 px-3 py-2.5">
                      <p className="text-[10px] text-blue-400 uppercase tracking-wider font-semibold mb-1.5">
                        Educación ({entity.education.length})
                      </p>
                      <div className="space-y-1">
                        {entity.education.filter(Boolean).slice(0, 4).map((e, i) => (
                          <p key={i} className="text-xs text-gray-300 leading-snug">
                            {e}
                          </p>
                        ))}
                        {entity.education.filter(Boolean).length > 4 && (
                          <p className="text-[10px] text-gray-500">
                            +{entity.education.filter(Boolean).length - 4} más
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {entity.political && entity.political.length > 0 && (
                    <div className="rounded-lg bg-orange-500/5 border border-orange-500/15 px-3 py-2.5">
                      <p className="text-[10px] text-orange-400 uppercase tracking-wider font-semibold mb-1.5">
                        Afiliación Política ({entity.political.length})
                      </p>
                      <div className="space-y-1">
                        {entity.political.filter(Boolean).map((p, i) => (
                          <p key={i} className="text-xs text-gray-300 leading-snug">
                            {p}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─ Sanctioning Authorities + Records ─ */}
              {entity.sanctions_details &&
                entity.sanctions_details.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">
                      Sanction Records ({entity.sanctions_details.length})
                    </h4>

                    {/* Authority badges */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs text-gray-400">
                        Autoridades:
                      </span>
                      {[
                        ...new Set(
                          entity.sanctions_details.map((s) => s.authority),
                        ),
                      ].map((auth) => (
                        <span
                          key={auth}
                          className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-medium"
                        >
                          {auth}
                        </span>
                      ))}
                    </div>

                    {/* Records */}
                    <div className="rounded-lg border border-red-500/15 overflow-hidden divide-y divide-red-500/10">
                      {entity.sanctions_details.slice(0, 4).map((s, i) => (
                        <div key={i} className="px-4 py-2.5 bg-red-500/[0.03]">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs text-gray-300">
                                <span className="text-gray-500">
                                  Autoridad:
                                </span>{" "}
                                <span className="font-medium">
                                  {s.authority}
                                </span>
                              </p>
                              {s.program && (
                                <p className="text-xs text-gray-300 mt-0.5">
                                  <span className="text-gray-500">
                                    Programa:
                                  </span>{" "}
                                  {s.program}
                                </p>
                              )}
                              {s.reason && (
                                <p className="text-xs text-gray-300 mt-0.5">
                                  <span className="text-gray-500">Razón:</span>{" "}
                                  {s.reason}
                                </p>
                              )}
                            </div>
                            <span className="flex items-center gap-1 text-[10px] text-green-400 font-medium flex-shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                              Activo
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {entity.sanctions_details.length > 4 && (
                      <p className="text-[10px] text-gray-500 mt-1">
                        +{entity.sanctions_details.length - 4} registros más...
                      </p>
                    )}
                  </div>
                )}

              {/* ─ Adverse Media ─ */}
              {entity.adverse_media_details &&
                entity.adverse_media_details.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-2">
                      Adverse Media — Severidad {entity.adverse_media_severity}
                    </h4>
                    <div className="rounded-lg border border-orange-500/15 overflow-hidden divide-y divide-orange-500/10">
                      {entity.adverse_media_details.map((am, i) => (
                        <div
                          key={i}
                          className="px-4 py-2.5 bg-orange-500/[0.03]"
                        >
                          <div className="flex items-center gap-2">
                            <Newspaper className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                            <span className="text-xs text-gray-300 font-medium capitalize">
                              {am.category}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              sev. {am.severity}
                            </span>
                          </div>
                          {am.details && (
                            <p className="text-[11px] text-gray-500 mt-1 ml-5">
                              {am.details}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* ─ Identifiers ─ */}
              {entity.identifiers &&
                Object.keys(entity.identifiers).length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">
                      Identificadores
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(entity.identifiers)
                        .slice(0, 6)
                        .map(([key, value]) => (
                          <span
                            key={key}
                            className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          >
                            {key}: {value}
                          </span>
                        ))}
                      {Object.keys(entity.identifiers).length > 6 && (
                        <span className="text-[10px] text-gray-500">
                          +{Object.keys(entity.identifiers).length - 6}
                        </span>
                      )}
                    </div>
                  </div>
                )}

              {/* ─ Explainability ─ */}
              {entity.explainability && (
                <div className="pt-3 border-t border-white/5">
                  <div className="flex items-center justify-between text-[10px] text-gray-500 mb-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      <span>Análisis del Algoritmo</span>
                    </div>
                    {entity.ml_probability !== undefined && (
                      <span className="text-purple-400 font-medium">
                        ML: {Math.round(entity.ml_probability * 100)}%
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-[10px]">
                    {entity.explainability.structural_analysis && (
                      <>
                        <span className="text-gray-600">Tokens:</span>
                        <span className="text-gray-400">
                          {
                            entity.explainability.structural_analysis
                              .tokens_matched
                          }
                        </span>
                      </>
                    )}
                    {entity.explainability.structural_analysis
                      ?.surnames_matched !== undefined && (
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
                  {entity.explainability.boosts_applied &&
                    Object.keys(entity.explainability.boosts_applied).length >
                      0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {Object.entries(
                          entity.explainability.boosts_applied,
                        ).map(([key, value]) => (
                          <span
                            key={key}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20"
                          >
                            {key}: {value}
                          </span>
                        ))}
                      </div>
                    )}
                  {entity.explainability.penalties_applied &&
                    Object.keys(entity.explainability.penalties_applied)
                      .length > 0 && (
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

              {/* ─ Source + Entity ID footer ─ */}
              <div className="flex items-center gap-4 pt-3 border-t border-white/5">
                <div className="flex-1">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                    Fuentes ({sources.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {sources.map((source) => (
                      <span
                        key={source}
                        className={`text-[10px] px-2 py-0.5 rounded-full bg-white/5 border ${SOURCE_COLOR_MAP[getSourceCategory(source)]}`}
                      >
                        {formatSourceName(source)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                    Entity ID
                  </p>
                  <p className="text-[11px] text-gray-400 font-mono">
                    {entity.entity_id?.slice(0, 12)}...
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════
// Filter Panel
// ═══════════════════════════════════════════════════
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
            const EIcon = entityTypeIcons[type];
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
                <EIcon className="w-4 h-4 text-gray-500" />
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
  ) as 1 | 2 | 3 | 4 | 5;
  const [sourceLevel, setSourceLevel] = useState<1 | 2 | 3 | 4 | 5>(
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
                      className="space-y-2"
                    >
                      {results.map((result) => (
                        <SearchResultCard
                          key={result.entity_id}
                          result={result}
                          onViewEntity={() =>
                            handleSelectResult(result.entity_id)
                          }
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
