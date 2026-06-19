import { Suspense, lazy, useEffect, useRef, useState } from "react";
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
import { fadeUp } from "@/lib/motion";
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
          Filtros
        </h3>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Limpiar
          </Button>
        )}
      </div>

      {/* Entity Types */}
      <div>
        <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
          Tipo de Entidad
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
          Nivel de Riesgo
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
        <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
          Fuente de Datos
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
    clearSearch,
  } = useScreening(sourceLevel, engine);

  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState({
    entityTypes: filters.entityTypes,
    riskLevels: filters.riskLevels,
    sources: filters.sources,
  });

  // Execute search on mount if query param exists.
  // StrictMode en dev re-monta componentes y re-ejecuta effects. Esto causaba
  // 4 requests al mismo /screen/gold (2 mounts × 2 useEffects). Guardamos el
  // último (query, sourceLevel) ejecutado a nivel de módulo para deduplicar
  // dentro de una ventana de 500ms (suficiente para cubrir el StrictMode rerun).
  useEffect(() => {
    if (initialQuery && shouldExecuteSearch(initialQuery, sourceLevel)) {
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
    if (q && shouldExecuteSearch(q, sourceLevel)) {
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
    <AppPage>
        <PageHeader
          title="Búsqueda de Entidades"
          description="Screening contra listas de sanciones, PEPs, debarments y adverse media."
          icon={
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-brand-blue/20 to-brand-electric/20 border border-brand-blue/30">
              <SearchIcon className="w-6 h-6 text-electric-700 dark:text-electric-400" aria-hidden="true" />
            </div>
          }
          actions={<SemanticSearchToggle mode={searchMode} onChange={handleModeChange} />}
        />

        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
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
            <span>Motor:</span>
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
              title="Búsqueda clásica: BM25 fuzzy sobre nombres + fonética"
            >
              Clásico
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
              title="Inteligente (default): scoring ML híbrido + multi-script (Latín↔Cirílico↔Chino↔Árabe) + provenance per-propiedad"
            >
              ✨ Inteligente (ML)
            </button>
            {engine === "v2" && (
              <span
                className="ml-2 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-200 text-[10px] uppercase tracking-wide"
                title="Esta búsqueda usa nomenklatura.DefaultAlgorithm + BM25 hybrid + transliteración ICU"
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
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
              <div className="lg:col-span-3 min-w-0">
                {/* Results Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-medium text-foreground">
                      {isLoading
                        ? "Buscando..."
                        : searchMode === "semantic"
                          ? `${results.length} resultados semánticos`
                          : `${results.length} resultados`}
                    </h2>
                    {query && (
                      <p className="text-sm text-muted-foreground">
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
                      className="text-muted-foreground hover:text-foreground"
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
                        title="No se encontraron resultados"
                        description="Intenta con otros términos de búsqueda o ajusta los filtros."
                        action={
                          <Button
                            onClick={clearSearch}
                            variant="outline"
                            className="border-foreground/10"
                          >
                            Nueva búsqueda
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
                  {...fadeUp}
                  transition={{ delay: index * 0.1 }}
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
    </AppPage>
  );
}

export default SearchPage;
