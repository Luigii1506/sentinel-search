import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ExternalLink,
  AlertCircle,
  Shield,
  Flag,
  User,
  Building2,
  Ship,
  Plane,
  Users,
  Sparkles,
  Ban,
  Landmark,
  FileText,
  Globe,
  Siren,
  Newspaper,
  Clock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ProvenanceTooltip } from "@/components/search/ProvenanceTooltip";
import { RiskBadges } from "@/components/search/RiskBadges";
import { MatchExplanation } from "@/components/search/MatchExplanation";
import { cn, getRiskColor, getEntityTypeLabel, humanizeEntityName } from "@/lib/utils";
import type { EntityType } from "@/types";
import type { ScreeningMatch } from "@/types/api";

const entityTypeIcons = {
  person: User,
  company: Building2,
  vessel: Ship,
  aircraft: Plane,
  organization: Users,
};

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
    .replace(/\b(us|mx|br|co|ca|gb|eu|pep|ofac|sat)\b/gi, (m) => m.toUpperCase());
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
  ) return "sanctions";
  if (
    s.startsWith("PEP_") ||
    s.includes("CONGRESS") ||
    s.includes("PLUM") ||
    s.includes("CIA_WORLD") ||
    s.includes("LEGISLAT") ||
    s === "BR_PEP" ||
    s.includes("FUNCION_PUBLICA")
  ) return "pep";
  if (
    s.includes("SAM_EXCLUSION") ||
    s.includes("HHS_EXCLUSION") ||
    s.includes("MED_EXCLUSION") ||
    s === "BR_CEIS"
  ) return "debarment";
  if (
    s.includes("FINRA") ||
    s.includes("OCC") ||
    s.includes("FED_ENFORCE") ||
    s.includes("SEC_") ||
    s.includes("CFTC") ||
    s.includes("FDIC")
  ) return "regulatory";
  if (
    s.includes("FBI") ||
    s.includes("DEA") ||
    s.includes("ICE") ||
    s.includes("INTERPOL") ||
    s.includes("EUROPOL")
  ) return "law_enforcement";
  if (s.startsWith("SAT_") || s.includes("INCUMPLIDO")) return "tax";
  return "other";
}

function getCountryFromSources(sources: string[]): string | null {
  for (const src of sources) {
    const s = src.toUpperCase();
    if (s.startsWith("US_") || ["OFAC_SDN", "OFAC_NON_SDN", "FBI_MOST_WANTED", "DEA_FUGITIVE", "BIS_CSL"].includes(s)) return "US";
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

const SOURCE_COLOR_MAP: Record<SourceCat, string> = {
  sanctions: "border-red-500/20 text-red-600 dark:text-red-400/80",
  pep: "border-purple-500/20 text-purple-600 dark:text-purple-400/80",
  debarment: "border-amber-500/20 text-amber-700 dark:text-amber-400/80",
  regulatory: "border-blue-500/20 text-blue-600 dark:text-blue-400/80",
  law_enforcement: "border-indigo-500/20 text-indigo-600 dark:text-indigo-400/80",
  tax: "border-orange-500/20 text-orange-700 dark:text-orange-400/80",
  other: "border-foreground/10 text-muted-foreground",
};

function getConfidenceTone(t: TFunction, confidence?: number) {
  if (confidence == null) {
    return { label: t("components.search.match.confidenceUnavailable"), className: "bg-foreground/5 text-muted-foreground border-foreground/10" };
  }
  if (confidence >= 0.9) {
    return { label: t("components.search.match.confidenceHigh", { value: Math.round(confidence * 100) }), className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" };
  }
  if (confidence >= 0.75) {
    return { label: t("components.search.match.confidenceMedium", { value: Math.round(confidence * 100) }), className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" };
  }
  return { label: t("components.search.match.confidenceLow", { value: Math.round(confidence * 100) }), className: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30" };
}

function getEvidenceSummary(t: TFunction, entity: ScreeningMatch, categories: Set<SourceCat>): string {
  const sanctionsCount = entity.sanctions_details?.length || 0;
  const sourceCount = entity.sources?.length || 0;
  const primaryPepPosition = entity.pep_positions?.[0] as { cargo?: string } | undefined;

  if (sanctionsCount > 0 && entity.is_current_pep) {
    return t("components.search.evidence.sanctionsAndPep", { count: sourceCount });
  }
  if (sanctionsCount > 0) {
    const authorities = [...new Set(entity.sanctions_details?.map((item) => item.authority).filter(Boolean))];
    const topAuthorities = authorities.slice(0, 2).join(", ");
    return topAuthorities
      ? (authorities.length > 2
          ? t("components.search.evidence.sanctionsAuthoritiesMore", { authorities: topAuthorities })
          : t("components.search.evidence.sanctionsAuthorities", { authorities: topAuthorities }))
      : t("components.search.evidence.sanctionsCount", { count: sanctionsCount });
  }
  if (entity.is_current_pep || categories.has("pep")) {
    const role = entity.pep_category || primaryPepPosition?.cargo;
    const active = entity.is_current_pep ? t("components.search.evidence.pepActiveSuffix") : "";
    return role
      ? t("components.search.evidence.pepRole", { active, role })
      : t("components.search.evidence.pepNoRole", { active, count: sourceCount });
  }
  if (entity.has_adverse_media) {
    return entity.adverse_media_severity != null
      ? t("components.search.evidence.adverseMediaSeverity", { severity: entity.adverse_media_severity })
      : t("components.search.evidence.adverseMedia");
  }
  if (categories.has("law_enforcement")) {
    return t("components.search.evidence.lawEnforcement");
  }
  return t("components.search.evidence.default", { count: sourceCount });
}

function getMatchSignalLabel(t: TFunction, entity: ScreeningMatch): string {
  const matchedFields = entity.matched_fields || [];
  if (matchedFields.includes("alias")) return t("components.search.match.alias");
  if (entity.match_type === "phonetic") return t("components.search.match.phonetic");
  if (entity.match_type === "semantic") return t("components.search.match.semantic");
  if ((entity.match_score || 0) >= 99) return t("components.search.match.exact");
  if ((entity.match_score || 0) >= 90) return t("components.search.match.high");
  return t("components.search.match.approximate");
}

function getCoverageSummary(t: TFunction, entity: ScreeningMatch): string {
  const sourceCount = entity.sources?.length || 0;
  if (sourceCount === 0) return t("components.search.match.coverageUnavailable");
  if (sourceCount === 1) return t("components.search.match.coverageOne");
  return t("components.search.match.coverageOther", { count: sourceCount });
}

function getMatchNarrative(t: TFunction, entity: ScreeningMatch): string {
  if (entity.explanation) return entity.explanation;
  const matchedFields = entity.matched_fields || [];
  if (matchedFields.includes("alias")) return t("components.search.narrative.alias");
  if (entity.match_type === "phonetic") return t("components.search.narrative.phonetic");
  if (entity.match_type === "semantic") return t("components.search.narrative.semantic");
  if (entity.match_score >= 99) return t("components.search.narrative.exact");
  if (entity.match_score >= 90) return t("components.search.narrative.high");
  return t("components.search.narrative.approximate");
}

function getTopSourceLabels(sources: string[]): string[] {
  return [...sources].slice(0, 3).map(formatSourceName);
}

const CATEGORY_BADGE_CONFIG: Record<
  SourceCat,
  { labelKey: string; icon: typeof Shield; bg: string; text: string; border: string }
> = {
  sanctions: { labelKey: "components.search.category.sanctions", icon: Shield, bg: "bg-red-500/15", text: "text-red-600 dark:text-red-400", border: "border-red-500/30" },
  pep: { labelKey: "components.search.category.pep", icon: Flag, bg: "bg-purple-500/15", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/30" },
  debarment: { labelKey: "components.search.category.debarment", icon: Ban, bg: "bg-amber-500/15", text: "text-amber-700 dark:text-amber-400", border: "border-amber-500/30" },
  regulatory: { labelKey: "components.search.category.regulatory", icon: Landmark, bg: "bg-blue-500/15", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30" },
  law_enforcement: { labelKey: "components.search.category.lawEnforcement", icon: Siren, bg: "bg-indigo-500/15", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-500/30" },
  tax: { labelKey: "components.search.category.tax", icon: FileText, bg: "bg-orange-500/15", text: "text-orange-700 dark:text-orange-400", border: "border-orange-500/30" },
  other: { labelKey: "components.search.category.other", icon: Globe, bg: "bg-gray-500/15", text: "text-muted-foreground", border: "border-gray-500/30" },
};

function SearchResultCard({
  result,
  onViewEntity,
  onCreateAlert,
}: {
  result: ScreeningMatch;
  onViewEntity: () => void;
  onCreateAlert?: (result: ScreeningMatch) => void;
}) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const entity = result;
  const TypeIcon = entityTypeIcons[entity.entity_type as EntityType] || User;
  const riskColor = getRiskColor(entity.risk_level);
  const sources = entity.sources || [];
  const categories = new Set(sources.map(getSourceCategory));
  const country = entity.countries?.[0] || entity.nationalities?.[0] || getCountryFromSources(sources);
  const countryFlag = country ? COUNTRY_FLAGS[country] : null;
  const isPep = entity.is_current_pep || !!entity.pep_category || categories.has("pep");
  const pepPosition = entity.pep_positions?.[0] as { cargo?: string; dependencia?: string; start_date?: string; end_date?: string; is_current?: boolean } | undefined;
  const confidenceTone = getConfidenceTone(t, entity.confidence);
  const evidenceSummary = getEvidenceSummary(t, entity, categories);
  const matchNarrative = getMatchNarrative(t, entity);
  const matchSignalLabel = getMatchSignalLabel(t, entity);
  const coverageSummary = getCoverageSummary(t, entity);
  const topSources = getTopSourceLabels(sources);
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
    entity.gender === "male" ? t("components.search.card.genderMale") : entity.gender === "female" ? t("components.search.card.genderFemale") : entity.gender;

  return (
    <motion.div variants={itemVariants} className="glass rounded-xl relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: riskColor }} />
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 sm:px-5 py-3.5 sm:pl-6 cursor-pointer hover:bg-foreground/[0.02] transition-colors select-none"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: `${riskColor}12` }}>
            <TypeIcon className="w-5 h-5" style={{ color: riskColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-semibold text-foreground leading-tight">
              {humanizeEntityName(entity.display_name || entity.name)}
            </h3>
            {entity.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{entity.description}</p>}
            {entity.aliases && entity.aliases.length > 0 && !entity.description && (
              <p className="text-xs text-muted-foreground mt-0.5">
                aka: {entity.aliases.slice(0, 2).map((alias) => humanizeEntityName(alias)).join(", ")}
                {entity.aliases.length > 2 && ` +${entity.aliases.length - 2}`}
              </p>
            )}
            <div className="mt-2 rounded-lg border border-foreground/8 bg-foreground/[0.02] px-3 py-2">
              <p className="text-[12px] font-medium text-gray-200 leading-relaxed">{evidenceSummary}</p>
              <RiskBadges
                isSanctioned={entity.is_sanctioned ?? (entity.sanctions?.length || 0) > 0}
                sanctionLinked={entity.sanction_linked}
                isPep={entity.is_current_pep}
                isRca={entity.is_rca}
                pepCategory={entity.pep_category}
                className="mt-2"
              />
              {entity.match_explanation && entity.match_explanation.length > 0 && (
                <MatchExplanation reasons={entity.match_explanation} riskScore={entity.risk_score} networkRisk={entity.network_risk} />
              )}
              <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-muted-foreground">
                <span>{matchNarrative}</span>
                {entity.matched_name && entity.matched_name !== entity.name && (
                  <span className="text-muted-foreground">{t("components.search.match.matchedAs", { name: humanizeEntityName(entity.matched_name) })}</span>
                )}
                {topSources.length > 0 && (
                  <span className="text-muted-foreground">
                    {t("components.search.match.keySources", { sources: topSources.join(", ") })}
                    {sources.length > topSources.length && ` +${sources.length - topSources.length}`}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge className="text-[10px] px-2 py-0.5 gap-1 font-medium uppercase" style={{ backgroundColor: `${riskColor}20`, color: riskColor, borderColor: `${riskColor}40` }}>
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: riskColor }} />
                {t("components.search.match.riskBadge", { level: entity.risk_level || "unknown" })}
                {entity.risk_score != null && ` · ${t("components.search.match.scoreSuffix", { score: Math.round(entity.risk_score) })}`}
              </Badge>
              <Badge className={cn("text-[10px] px-2 py-0.5 font-medium border", confidenceTone.className)}>
                {confidenceTone.label}
              </Badge>
              <Badge className="text-[10px] px-2 py-0.5 gap-1 font-medium bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                {t("components.search.match.coincidence", { label: matchSignalLabel, score: Math.round(entity.match_score || 0) })}
              </Badge>
              <Badge className="text-[10px] px-2 py-0.5 bg-foreground/5 text-muted-foreground border-foreground/10">{coverageSummary}</Badge>
              {entity.has_adverse_media && (
                <Badge className="text-[10px] px-2 py-0.5 gap-1 bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30">
                  <Newspaper className="w-3 h-3" />
                  {t("components.search.card.adverseMedia")}
                </Badge>
              )}
              {entity.freshness_factor != null && entity.freshness_factor < 0.5 && (
                <Badge className="text-[10px] px-2 py-0.5 gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">
                  <Clock className="w-3 h-3" />
                  {t("components.search.card.freshness", { value: Math.round(entity.freshness_factor * 100) })}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {Array.from(categories).map((cat) => {
                const cfg = CATEGORY_BADGE_CONFIG[cat];
                const CatIcon = cfg.icon;
                return (
                  <span key={cat} className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                    <CatIcon className="w-3 h-3" />
                    {t(cfg.labelKey)}
                  </span>
                );
              })}
              {isPep && entity.is_current_pep && !categories.has("pep") && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30">
                  <Flag className="w-3 h-3" />
                  {t("components.search.card.pepActive")}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-end sm:justify-start gap-1.5 flex-shrink-0 mt-1">
            {onCreateAlert && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateAlert(result);
                      }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                    >
                      <AlertCircle className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent><p>{t("components.search.actions.createAlert")}</p></TooltipContent>
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
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 hover:text-blue-300 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent><p>{t("components.search.actions.viewProfile")}</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {hasExpandableContent && (
              <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-muted-foreground">
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-6 pb-5 pt-1 border-t border-foreground/5 space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                {(entity.match_type as string) === "v2_ml" ? (
                  <Badge className="text-[10px] px-2 py-0.5 bg-purple-500/15 text-purple-200 border-purple-400/40" title={t("components.search.card.v2MlTitle")}>
                    {t("components.search.card.v2MlScored")}
                  </Badge>
                ) : (
                  <Badge className="text-[10px] px-2 py-0.5 bg-foreground/5 text-muted-foreground border-foreground/10">
                    {t("components.search.card.engine", { engine: entity.match_type || t("components.search.card.engineDefault") })}
                  </Badge>
                )}
                {entity.opensearch_score != null && <span>{t("components.search.card.openSearchScore", { score: Math.round(entity.opensearch_score) })}</span>}
                {entity.source_count != null && entity.source_count > 0 && <span>{t("components.search.card.declaredCoverage", { count: entity.source_count })}</span>}
                <div className="ml-auto">
                  <ProvenanceTooltip entityId={entity.entity_id} canonicalName={entity.name} />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-foreground/5 rounded-lg overflow-hidden border border-foreground/5">
                <div className="bg-card px-3 py-2.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("components.search.card.type")}</p>
                  <p className="text-sm text-foreground font-medium mt-0.5 capitalize">{getEntityTypeLabel(entity.entity_type)}</p>
                </div>
                <div className="bg-card px-3 py-2.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("components.search.card.gender")}</p>
                  <p className="text-sm text-foreground font-medium mt-0.5">{genderLabel || "—"}</p>
                </div>
                <div className="bg-card px-3 py-2.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("components.search.card.birthDate")}</p>
                  <p className="text-sm text-foreground font-medium mt-0.5">{entity.birth_date || entity.date_of_birth || "—"}</p>
                </div>
                <div className="bg-card px-3 py-2.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("components.search.card.birthPlace")}</p>
                  <p className="text-sm text-foreground font-medium mt-0.5">{entity.place_of_birth || "—"}</p>
                </div>
                <div className="bg-card px-3 py-2.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("components.search.card.nationality")}</p>
                  <p className="text-sm text-foreground font-medium mt-0.5">
                    {entity.nationalities_display && entity.nationalities_display.length > 0 ? (
                      <>{countryFlag} {entity.nationalities_display.join(", ")}</>
                    ) : country ? (
                      <>{countryFlag} {COUNTRY_NAMES[country] || country}</>
                    ) : "—"}
                  </p>
                </div>
                {entity.addresses && entity.addresses.length > 0 && (
                  <div className="bg-card px-3 py-2.5 col-span-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("components.search.card.location")}</p>
                    <p className="text-sm text-foreground font-medium mt-0.5 break-words">
                      {(() => {
                        const a = entity.addresses[0];
                        if (typeof a === "string") return a;
                        if ("address" in a) return a.address;
                        return a.full || [a.street, a.city, a.country].filter(Boolean).join(", ");
                      })()}
                      {entity.addresses.length > 1 && <span className="text-muted-foreground text-xs"> +{entity.addresses.length - 1}</span>}
                    </p>
                  </div>
                )}
                {entity.nationalities &&
                  entity.nationalities.length > 0 &&
                  !(entity.nationalities.length === 1 && entity.nationalities[0] === country) && (
                    <div className="bg-card px-3 py-2.5 col-span-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("components.search.card.nationalities")}</p>
                      <p className="text-sm text-foreground font-medium mt-0.5">
                        {entity.nationalities.map((n: string) => `${COUNTRY_FLAGS[n] || ""} ${COUNTRY_NAMES[n] || n}`).join("  ·  ")}
                      </p>
                    </div>
                  )}
              </div>

              {isPep && pepPosition && (
                <div>
                  <h4 className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2">{t("components.search.card.position")}</h4>
                  <div className="rounded-lg bg-purple-500/5 border border-purple-500/15 px-4 py-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <Flag className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{pepPosition.cargo || entity.pep_category}</p>
                          {pepPosition.dependencia && <p className="text-xs text-muted-foreground mt-0.5">{pepPosition.dependencia}</p>}
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        {(pepPosition.start_date || pepPosition.end_date) && (
                          <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                            {pepPosition.start_date?.slice(0, 4)}{pepPosition.end_date ? ` – ${pepPosition.end_date.slice(0, 4)}` : ` – ${t("components.search.card.present")}`}
                          </p>
                        )}
                        {(pepPosition.start_date || pepPosition.end_date) && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {pepPosition.is_current !== false && !pepPosition.end_date ? t("components.search.card.present") : pepPosition.end_date?.slice(0, 4)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {(entity.education?.length || entity.political?.length || entity.positions?.length) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {entity.positions && entity.positions.length > 0 && (
                    <div className="rounded-lg bg-purple-500/5 border border-purple-500/15 px-3 py-2.5">
                      <p className="text-[10px] text-purple-600 dark:text-purple-400 uppercase tracking-wider font-semibold mb-1.5">{t("components.search.card.positions", { count: entity.positions.length })}</p>
                      <div className="space-y-1">
                        {entity.positions.filter(Boolean).slice(0, 5).map((p, i) => <p key={i} className="text-xs text-muted-foreground leading-snug">{p}</p>)}
                        {entity.positions.filter(Boolean).length > 5 && <p className="text-[10px] text-muted-foreground">{t("components.search.card.more", { count: entity.positions.filter(Boolean).length - 5 })}</p>}
                      </div>
                    </div>
                  )}
                  {entity.education && entity.education.length > 0 && (
                    <div className="rounded-lg bg-blue-500/5 border border-blue-500/15 px-3 py-2.5">
                      <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-wider font-semibold mb-1.5">{t("components.search.card.education", { count: entity.education.length })}</p>
                      <div className="space-y-1">
                        {entity.education.filter(Boolean).slice(0, 4).map((e, i) => <p key={i} className="text-xs text-muted-foreground leading-snug">{e}</p>)}
                        {entity.education.filter(Boolean).length > 4 && <p className="text-[10px] text-muted-foreground">{t("components.search.card.more", { count: entity.education.filter(Boolean).length - 4 })}</p>}
                      </div>
                    </div>
                  )}
                  {entity.political && entity.political.length > 0 && (
                    <div className="rounded-lg bg-orange-500/5 border border-orange-500/15 px-3 py-2.5">
                      <p className="text-[10px] text-orange-700 dark:text-orange-400 uppercase tracking-wider font-semibold mb-1.5">{t("components.search.card.political", { count: entity.political.length })}</p>
                      <div className="space-y-1">
                        {entity.political.filter(Boolean).map((p, i) => <p key={i} className="text-xs text-muted-foreground leading-snug">{p}</p>)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {entity.sanctions_details && entity.sanctions_details.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-2">{t("components.search.card.sanctionRecords", { count: entity.sanctions_details.length })}</h4>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">{t("components.search.card.authorities")}</span>
                    {[...new Set(entity.sanctions_details.map((s) => s.authority))].map((auth) => (
                      <span key={auth} className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-medium">{auth}</span>
                    ))}
                  </div>
                  <div className="rounded-lg border border-red-500/15 overflow-hidden divide-y divide-red-500/10">
                    {entity.sanctions_details.slice(0, 4).map((s, i) => (
                      <div key={i} className="px-4 py-2.5 bg-red-500/[0.03]">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground"><span className="text-muted-foreground">{t("components.search.card.authority")}</span> <span className="font-medium">{s.authority}</span></p>
                            {s.program && <p className="text-xs text-muted-foreground mt-0.5"><span className="text-muted-foreground">{t("components.search.card.program")}</span> {s.program}</p>}
                            {s.reason && <p className="text-xs text-muted-foreground mt-0.5"><span className="text-muted-foreground">{t("components.search.card.reason")}</span> {s.reason}</p>}
                          </div>
                          <span className="flex items-center gap-1 text-[10px] text-green-700 dark:text-green-400 font-medium flex-shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                            {t("components.search.card.active")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {entity.sanctions_details.length > 4 && <p className="text-[10px] text-muted-foreground mt-1">{t("components.search.card.moreRecords", { count: entity.sanctions_details.length - 4 })}</p>}
                </div>
              )}

              {entity.adverse_media_details && entity.adverse_media_details.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wider mb-2">
                    {t("components.search.card.adverseMediaSeverity", { severity: entity.adverse_media_severity })}
                  </h4>
                  <div className="rounded-lg border border-orange-500/15 overflow-hidden divide-y divide-orange-500/10">
                    {entity.adverse_media_details.map((am, i) => (
                      <div key={i} className="px-4 py-2.5 bg-orange-500/[0.03]">
                        <div className="flex items-center gap-2">
                          <Newspaper className="w-3.5 h-3.5 text-orange-700 dark:text-orange-400 flex-shrink-0" />
                          <span className="text-xs text-muted-foreground font-medium capitalize">{am.category}</span>
                          <span className="text-[10px] text-muted-foreground">{t("components.search.card.severityShort", { value: am.severity })}</span>
                        </div>
                        {am.details && <p className="text-[11px] text-muted-foreground mt-1 ml-5">{am.details}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {entity.identifiers && Object.keys(entity.identifiers).length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">{t("components.search.card.identifiers")}</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(entity.identifiers)
                      .filter(([key, value]) => key !== "additional_documents" && value !== null && value !== undefined && typeof value !== "object")
                      .slice(0, 6)
                      .map(([key, value]) => (
                        <span key={key} className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          {key}: {Array.isArray(value) ? value.join(", ") : String(value)}
                        </span>
                      ))}
                    {Object.keys(entity.identifiers).length > 6 && <span className="text-[10px] text-muted-foreground">+{Object.keys(entity.identifiers).length - 6}</span>}
                  </div>
                </div>
              )}

              {entity.explainability && (
                <div className="pt-3 border-t border-foreground/5">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-[10px] text-muted-foreground mb-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                      <span>{t("components.search.card.algorithmAnalysis")}</span>
                    </div>
                    {entity.ml_probability !== undefined && <span className="text-purple-600 dark:text-purple-400 font-medium">ML: {Math.round(entity.ml_probability * 100)}%</span>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-[10px]">
                    {entity.explainability.structural_analysis && (
                      <>
                        <span className="text-muted-foreground">{t("components.search.card.tokens")}</span>
                        <span className="text-muted-foreground">{entity.explainability.structural_analysis.tokens_matched}</span>
                      </>
                    )}
                    {entity.explainability.structural_analysis?.surnames_matched !== undefined && (
                      <>
                        <span className="text-muted-foreground">{t("components.search.card.surnames")}</span>
                        <span className={entity.explainability.structural_analysis.surnames_matched ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                          {entity.explainability.structural_analysis.surnames_matched ? t("components.search.card.surnamesMatch") : t("components.search.card.surnamesNoMatch")}
                        </span>
                      </>
                    )}
                    {entity.explainability.text_score_components && (
                      <>
                        <span className="text-muted-foreground">{t("components.search.card.similarity")}</span>
                        <span className="text-muted-foreground">{Math.round((entity.explainability.text_score_components.avg_jaro_similarity || 0) * 100)}%</span>
                      </>
                    )}
                    {entity.context_breakdown && (
                      <>
                        <span className="text-muted-foreground">{t("components.search.card.context")}</span>
                        <span className="text-blue-600 dark:text-blue-400">+{Math.round((entity.context_breakdown.country_boost || 0) * 100)}%</span>
                      </>
                    )}
                  </div>
                  {entity.explainability.boosts_applied && Object.keys(entity.explainability.boosts_applied).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {Object.entries(entity.explainability.boosts_applied).map(([key, value]) => (
                        <span key={key} className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20">
                          {key}: {value}
                        </span>
                      ))}
                    </div>
                  )}
                  {entity.explainability.penalties_applied && Object.keys(entity.explainability.penalties_applied).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(entity.explainability.penalties_applied).map(([key, value]) => (
                        <span key={key} className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                          {key}: {value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 pt-3 border-t border-foreground/5">
                <div className="flex-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{t("components.search.card.sources", { count: sources.length })}</p>
                  <div className="flex flex-wrap gap-1">
                    {sources.map((source) => (
                      <span key={source} className={`text-[10px] px-2 py-0.5 rounded-full bg-foreground/5 border ${SOURCE_COLOR_MAP[getSourceCategory(source)]}`}>
                        {formatSourceName(source)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex-shrink-0 text-left sm:text-right">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{t("components.search.card.entityId")}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{entity.entity_id?.slice(0, 12)}...</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function TraditionalResultsList({
  results,
  onSelectEntity,
  onCreateAlert,
}: {
  results: ScreeningMatch[];
  onSelectEntity: (entityId: string) => void;
  onCreateAlert?: (result: ScreeningMatch) => void;
}) {
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-2">
      {results.map((result) => (
        <SearchResultCard
          key={result.entity_id}
          result={result}
          onViewEntity={() => onSelectEntity(result.entity_id)}
          onCreateAlert={onCreateAlert}
        />
      ))}
    </motion.div>
  );
}

export default TraditionalResultsList;
