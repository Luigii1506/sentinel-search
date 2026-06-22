import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
  AlertCircle,
  FileSearch,
  Search as SearchIcon,
} from "lucide-react";
import { AppPage, EmptyState, PageHeader, PanelSkeleton } from "@/components/foundation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IntelligentSearch } from "@/components/search/IntelligentSearch";
import { SourceLevelSelector } from "@/components/SourceLevelSelector";
import { SemanticSearchToggle } from "@/components/search/SemanticSearchToggle";
import { SemanticResults } from "@/components/search/SemanticResults";
import { cn, getEntityTypeLabel } from "@/lib/utils";
import { fadeUp, easeWater, springExpand } from "@/lib/motion";
import { useScreening } from "@/hooks/useScreening";
import { useSearchHistory } from "@/contexts/SearchHistoryContext";
import { complianceService } from "@/services/compliance";
import type { EntityType, RiskLevel, DataSource } from "@/types";

const entityTypeIcons = {
  person: User,
  company: Building2,
  vessel: Ship,
  aircraft: Plane,
  organization: Users,
};

const TraditionalResultsList = lazy(() => import("@/components/search/TraditionalResultsList"));

// Dedup global de executeSearch para evitar requests duplicados causados por:
//   - React StrictMode (re-monta y re-ejecuta effects en dev)
//   - Effects que disparan en distintos ticks pero con misma (query, sourceLevel)
// Almacena el último signature ejecutado y su timestamp. Una nueva ejecución
// del mismo signature dentro de 500ms se ignora silenciosamente.
let _lastSearchSig: string = "";
let _lastSearchTime: number = 0;
const SEARCH_DEDUP_WINDOW_MS = 500;

function shouldExecuteSearch(query: string, sourceLevel: number): boolean {
  const sig = `${query}::${sourceLevel}`;
  const now = Date.now();
  if (_lastSearchSig === sig && now - _lastSearchTime < SEARCH_DEDUP_WINDOW_MS) {
    return false;
  }
  _lastSearchSig = sig;
  _lastSearchTime = now;
  return true;
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
  const { t } = useTranslation();
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
    <div className="glass rounded-xl p-4 sm:p-5 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Filter className="w-4 h-4" />
          {t("workspace.search.filtersTitle")}
        </h3>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {t("common.actions.clear")}
          </Button>
        )}
      </div>

      {/* Entity Types */}
      <div>
        <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
          {t("workspace.search.entityTypeLabel")}
        </h4>
        <div className="grid grid-cols-2 gap-2 sm:space-y-2 sm:block">
          {entityTypes.map((type) => {
            const EIcon = entityTypeIcons[type];
            return (
              <motion.label
                key={type}
                whileHover={{ x: 2 }}
                className="flex items-center gap-2 sm:gap-3 p-2 rounded-lg hover:bg-foreground/5 cursor-pointer transition-colors border border-foreground/5 sm:border-transparent"
              >
                <input
                  type="checkbox"
                  checked={filters.entityTypes.includes(type)}
                  onChange={() => toggleEntityType(type)}
                  className="w-4 h-4 rounded border-foreground/20 bg-foreground/5 text-blue-600 dark:text-blue-500 focus:ring-blue-500/20"
                />
                <EIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs sm:text-sm text-muted-foreground capitalize">
                  {getEntityTypeLabel(type)}
                </span>
              </motion.label>
            );
          })}
        </div>
      </div>

      {/* Risk Levels */}
      <div>
        <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
          {t("workspace.search.riskLevelLabel")}
        </h4>
        <div className="grid grid-cols-2 gap-2 sm:space-y-2 sm:block">
          {riskLevels.map((level) => {
            const colors: Record<string, string> = {
              critical: "text-red-600 dark:text-red-400",
              high: "text-orange-700 dark:text-orange-400",
              medium: "text-yellow-700 dark:text-yellow-400",
              low: "text-green-700 dark:text-green-400",
              none: "text-muted-foreground",
            };
            return (
              <motion.label
                key={level}
                whileHover={{ x: 2 }}
                className="flex items-center gap-2 sm:gap-3 p-2 rounded-lg hover:bg-foreground/5 cursor-pointer transition-colors border border-foreground/5 sm:border-transparent"
              >
                <input
                  type="checkbox"
                  checked={filters.riskLevels.includes(level)}
                  onChange={() => toggleRiskLevel(level)}
                  className="w-4 h-4 rounded border-foreground/20 bg-foreground/5 text-blue-600 dark:text-blue-500 focus:ring-blue-500/20"
                />
                <span className={cn("text-xs sm:text-sm capitalize", colors[level])}>
                  {t(`common.risk.${level}`)}
                </span>
              </motion.label>
            );
          })}
        </div>
      </div>

      {/* Sources */}
      <div>
        <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
          {t("workspace.search.dataSourceLabel")}
        </h4>
        <div className="grid grid-cols-2 gap-2 sm:space-y-2 sm:block">
          {sources.map((source) => (
            <motion.label
              key={source}
              whileHover={{ x: 2 }}
              className="flex items-center gap-2 sm:gap-3 p-2 rounded-lg hover:bg-foreground/5 cursor-pointer transition-colors border border-foreground/5 sm:border-transparent"
            >
              <input
                type="checkbox"
                checked={filters.sources.includes(source)}
                onChange={() => toggleSource(source)}
                className="w-4 h-4 rounded border-foreground/20 bg-foreground/5 text-blue-600 dark:text-blue-500 focus:ring-blue-500/20"
              />
              <span className="text-xs sm:text-sm text-muted-foreground">{source}</span>
            </motion.label>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SearchPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get("q") || "";
  const initialSourceLevel = parseInt(
    searchParams.get("source_level") || "2",
  ) as 1 | 2 | 3 | 4 | 5;
  const [sourceLevel, setSourceLevel] = useState<1 | 2 | 3 | 4 | 5>(
    initialSourceLevel,
  );
  // Engine: v1 (legacy hybrid) o v2 (nomenklatura ML-scored, multi-script).
  // Default v2 — mejor recall, BM25 hybrid scoring, cross-script (cirílico/chino),
  // dedup agresivo, provenance per-property.
  const initialEngine = (searchParams.get("engine") === "v1" ? "v1" : "v2") as "v1" | "v2";
  const [engine, setEngine] = useState<"v1" | "v2">(initialEngine);

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
    restoreSnapshot,
    clearSearch,
  } = useScreening(sourceLevel, engine);

  const { addSearch, getEntry } = useSearchHistory();
  // Cuando un cambio de sourceLevel proviene de restaurar un snapshot, NO
  // queremos que el efecto de sourceLevel dispare una búsqueda en vivo que
  // pisaría el snapshot. Esta bandera suprime ese disparo una vez.
  const suppressSourceLevelSearch = useRef(false);
  // Firma de la última búsqueda guardada en historial (evita duplicados).
  const lastRecordedSig = useRef("");

  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState({
    entityTypes: filters.entityTypes,
    riskLevels: filters.riskLevels,
    sources: filters.sources,
  });

  // Reacciona a los parámetros de URL — el SearchSidebar (historial) y la
  // home navegan aquí con distintos modos:
  //   ?restore=<id> → hidrata el SNAPSHOT exacto sin red (historial)
  //   ?fresh=<ts>   → limpia la vista (botón "Nueva búsqueda")
  //   ?q=<query>    → ejecuta búsqueda en vivo (home / recarga)
  // StrictMode re-ejecuta effects en dev; shouldExecuteSearch deduplica
  // dentro de 500ms para no golpear el backend múltiples veces.
  useEffect(() => {
    const restoreId = searchParams.get("restore");
    const fresh = searchParams.get("fresh");

    if (restoreId) {
      const entry = getEntry(restoreId);
      if (entry) {
        // Suprime el disparo del efecto de sourceLevel/engine al restaurar.
        suppressSourceLevelSearch.current = true;
        lastRecordedSig.current = `${entry.query}::${entry.sourceLevel}::${entry.engine}::${entry.searchMode}`;
        setSourceLevel(entry.sourceLevel);
        setEngine(entry.engine);
        restoreSnapshot({
          query: entry.query,
          results: entry.results,
          resultCount: entry.resultCount,
          searchMode: entry.searchMode,
          executionTimeMs: entry.executionTimeMs,
        });
      }
      return;
    }

    if (fresh) {
      clearSearch();
      return;
    }

    if (initialQuery && shouldExecuteSearch(initialQuery, sourceLevel)) {
      executeSearch(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Re-execute search when sourceLevel changes (salvo que venga de un restore).
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (suppressSourceLevelSearch.current) {
      suppressSourceLevelSearch.current = false;
      return;
    }
    const q = query || initialQuery;
    if (q && shouldExecuteSearch(q, sourceLevel)) {
      executeSearch(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceLevel]);

  // Graba cada búsqueda EN VIVO en el historial (snapshot exacto). No graba
  // restauraciones (estás viendo una foto, no una búsqueda nueva).
  useEffect(() => {
    if (!hasSearched || isLoading || !query) return;
    if (searchParams.get("restore")) return;
    const sig = `${query}::${sourceLevel}::${engine}::${searchMode}`;
    if (lastRecordedSig.current === sig) return;
    lastRecordedSig.current = sig;
    addSearch({
      query,
      sourceLevel,
      engine,
      searchMode,
      resultCount: results.length,
      results,
      executionTimeMs: performance?.executionTimeMs,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSearched, isLoading, query, results, sourceLevel, engine, searchMode]);

  const handleSearch = (searchQuery: string, advanced?: import("@/types/api").AdvancedScreeningFields) => {
    setSearchParams({ q: searchQuery, source_level: String(sourceLevel) });
    if (searchMode === "semantic") {
      executeSemanticSearch(searchQuery);
    } else {
      executeSearch(searchQuery, advanced);
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
      alert(t("workspace.search.alertCreated", { caseNumber: resp.case_number }));
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response
              ?.data?.detail || t("workspace.search.alertError")
          : t("workspace.search.alertError");
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
    <AppPage width="wide">
      {/* El centro "crece" de ancho al entrar al modo búsqueda: pasa de un
          contenedor acotado (64rem) a ocupar todo el ancho disponible. */}
      <motion.div
        initial={{ maxWidth: "64rem" }}
        animate={{ maxWidth: "120rem" }}
        transition={springExpand}
        className="mx-auto w-full space-y-6"
      >
        <PageHeader
          title={t("workspace.search.title")}
          description={t("workspace.search.description")}
          icon={
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-brand-blue/20 to-brand-electric/20 border border-brand-blue/30">
              <SearchIcon className="w-6 h-6 text-electric-700 dark:text-electric-400" aria-hidden="true" />
            </div>
          }
          actions={<SemanticSearchToggle mode={searchMode} onChange={handleModeChange} />}
        />

        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: easeWater, delay: 0.15 }}
          className="space-y-4"
        >
          <IntelligentSearch
            onSearch={handleSearch}
            onSelectResult={handleSelectResult}
            initialQuery={initialQuery}
            className="w-full max-w-4xl"
            sourceLevel={sourceLevel}
          />
          <SourceLevelSelector
            value={sourceLevel}
            onChange={(level) => {
              setSourceLevel(level);
              setSearchParams({
                q: query || initialQuery,
                source_level: String(level),
                ...(engine === "v2" ? { engine } : {}),
              });
            }}
            className="mt-3"
          />
          {/* Engine toggle: v1 legacy hybrid vs v2 nomenklatura ML multi-script */}
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span>{t("workspace.search.engineLabel")}</span>
            <button
              type="button"
              onClick={() => {
                setEngine("v1");
                setSearchParams({
                  q: query || initialQuery,
                  source_level: String(sourceLevel),
                  engine: "v1",
                });
              }}
              className={cn(
                "px-3 py-1 rounded-full border transition",
                engine === "v1"
                  ? "bg-blue-500/20 border-blue-400 text-blue-200"
                  : "border-foreground/10 text-muted-foreground hover:bg-foreground/5",
              )}
              title={t("workspace.search.engineClassicTooltip")}
            >
              {t("workspace.search.engineClassic")}
            </button>
            <button
              type="button"
              onClick={() => {
                setEngine("v2");
                setSearchParams({
                  q: query || initialQuery,
                  source_level: String(sourceLevel),
                });
              }}
              className={cn(
                "px-3 py-1 rounded-full border transition flex items-center gap-1",
                engine === "v2"
                  ? "bg-purple-500/20 border-purple-400 text-purple-200"
                  : "border-foreground/10 text-muted-foreground hover:bg-foreground/5",
              )}
              title={t("workspace.search.engineIntelligentTooltip")}
            >
              {t("workspace.search.engineIntelligent")}
            </button>
            {engine === "v2" && (
              <span
                className="ml-2 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-200 text-[10px] uppercase tracking-wide"
                title={t("workspace.search.engineMlBadgeTooltip")}
              >
                ML
              </span>
            )}
          </div>
        </motion.div>

        {/* Results Section */}
        <AnimatePresence mode="wait">
          {hasSearched && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: easeWater }}
              className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6"
            >
              {/* Filters Sidebar */}
              <div className="lg:col-span-1">
                <div className="lg:hidden mb-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="w-full gap-2 border-foreground/10"
                  >
                    <Filter className="w-4 h-4" />
                    {t("workspace.search.filtersTitle")}
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
              <div className="lg:col-span-3 min-w-0">
                {/* Results Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-medium text-foreground">
                      {isLoading
                        ? t("workspace.search.searching")
                        : searchMode === "semantic"
                          ? t("workspace.search.semanticResultsCount", {
                              count: results.length,
                            })
                          : t("workspace.search.resultsCount", {
                              count: results.length,
                            })}
                    </h2>
                    {query && (
                      <p className="text-sm text-muted-foreground">
                        {t("workspace.search.queryContext", {
                          query,
                          mode:
                            searchMode === "semantic"
                              ? t("workspace.search.modeSemantic")
                              : t("workspace.search.modeTraditional"),
                        })}
                      </p>
                    )}
                  </div>

                  {hasSearched && !isLoading && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSearch}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4 mr-1" />
                      {t("common.actions.clear")}
                    </Button>
                  )}
                </div>

                {/* Loading State */}
                {isLoading && (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <PanelSkeleton
                        key={i}
                        className="rounded-xl"
                        lines={3}
                        titleWidthClassName="w-64"
                        lineWidthClassNames={["w-48", "w-32", "w-40"]}
                      />
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
                    <Suspense
                      fallback={
                        <div className="space-y-4">
                          {[1, 2, 3].map((i) => (
                            <PanelSkeleton
                              key={i}
                              className="rounded-xl"
                              lines={4}
                              titleWidthClassName="w-72"
                              lineWidthClassNames={["w-56", "w-40", "w-64", "w-32"]}
                            />
                          ))}
                        </div>
                      }
                    >
                      <TraditionalResultsList
                        results={results}
                        onSelectEntity={handleSelectResult}
                        onCreateAlert={handleCreateAlert}
                      />
                    </Suspense>
                  )}

                {/* Empty State */}
                {!isLoading &&
                  hasSearched &&
                  ((searchMode === "traditional" && results.length === 0) ||
                    (searchMode === "semantic" && results.length === 0)) && (
                    <motion.div {...fadeUp}>
                      <EmptyState
                        icon={FileSearch}
                        title={t("workspace.search.emptyTitle")}
                        description={t("workspace.search.emptyDescription")}
                        action={
                          <Button
                            onClick={clearSearch}
                            variant="outline"
                            className="border-foreground/10"
                          >
                            {t("workspace.search.newSearch")}
                          </Button>
                        }
                      />
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
            <h2 className="text-lg font-medium text-foreground mb-6">
              {t("workspace.search.suggestedTitle")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  query: "OFAC",
                  description: t("workspace.search.suggestions.ofac"),
                  icon: Shield,
                },
                {
                  query: "PEP",
                  description: t("workspace.search.suggestions.pep"),
                  icon: Flag,
                },
                {
                  query: "empresa",
                  description: t("workspace.search.suggestions.company"),
                  icon: Building2,
                },
                {
                  query: "buque",
                  description: t("workspace.search.suggestions.vessel"),
                  icon: Ship,
                },
                {
                  query: "offshore",
                  description: t("workspace.search.suggestions.offshore"),
                  icon: AlertCircle,
                },
                {
                  query: "terrorismo",
                  description: t("workspace.search.suggestions.terrorism"),
                  icon: AlertCircle,
                },
              ].map((item, index) => (
                <motion.button
                  key={item.query}
                  {...fadeUp}
                  transition={{ delay: index * 0.09, duration: 0.7, ease: easeWater }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  onClick={() => handleSearch(item.query)}
                  className="glass rounded-xl p-4 text-left hover:bg-foreground/[0.03] transition-all group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                      <item.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="font-medium text-foreground">{item.query}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </AppPage>
  );
}

export default SearchPage;
