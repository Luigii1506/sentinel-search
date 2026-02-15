import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Shield,
  Flag,
  Newspaper,
  User,
  Building2,
  Ship,
  Plane,
  Users,
  ArrowRight,
  AlertCircle,
  FileSearch,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { IntelligentSearch } from '@/components/search/IntelligentSearch';
import { cn, getRiskColor, getEntityTypeLabel } from '@/lib/utils';
import { useScreening } from '@/hooks/useScreening';
import type { EntityType, RiskLevel, DataSource } from '@/types';

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

// Search Result Card
function SearchResultCard({
  result,
  onClick,
}: {
  result: ReturnType<typeof useScreening>['results'][0];
  onClick: () => void;
}) {
  const entity = result;
  const Icon = entityTypeIcons[entity.entity_type as EntityType] || User;
  const riskColor = getRiskColor(entity.risk_level);

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
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 className="text-lg font-medium text-white group-hover:text-blue-400 transition-colors">
              {entity.name}
            </h3>
            <Badge 
              className="capitalize text-xs"
              style={{ 
                backgroundColor: `${riskColor}20`,
                color: riskColor,
                borderColor: `${riskColor}40`
              }}
            >
              {entity.risk_level}
            </Badge>
            <Badge variant="outline" className="text-[10px] bg-white/5">
              {Math.round(entity.match_score)}% coincidencia
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-3">
            <span className="capitalize">{getEntityTypeLabel(entity.entity_type)}</span>
            {entity.nationalities && entity.nationalities.length > 0 && (
              <>
                <span className="text-gray-600">•</span>
                <span>{entity.nationalities.join(', ')}</span>
              </>
            )}
            <span className="text-gray-600">•</span>
            <span className="text-gray-300">{entity.match_type === 'exact' ? 'Coincidencia exacta' : 'Coincidencia aproximada'}</span>
          </div>

          {/* Data Sources */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {entity.sources.slice(0, 4).map((source) => (
              <span
                key={source}
                className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/10"
              >
                {source}
              </span>
            ))}
            {entity.sources.length > 4 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-500">
                +{entity.sources.length - 4}
              </span>
            )}
          </div>

          {/* Risk explanation */}
          {entity.explanation && (
            <p className="text-xs text-gray-500 mb-3 line-clamp-2">
              {entity.explanation}
            </p>
          )}

          {/* Alerts indicators */}
          <div className="flex flex-wrap gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-xs text-red-400">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Sanciones</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Presente en listas de sanciones</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-xs text-pink-400">
                    <Flag className="w-3.5 h-3.5" />
                    <span>PEP</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Persona Políticamente Expuesta</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-xs text-orange-400">
                    <Newspaper className="w-3.5 h-3.5" />
                    <span>Medios</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Adverse Media detectada</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Arrow with animation */}
        <motion.div
          initial={{ x: 0, opacity: 0.5 }}
          whileHover={{ x: 5, opacity: 1 }}
          className="flex-shrink-0"
        >
          <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
        </motion.div>
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
  onFilterChange: (filters: { entityTypes: string[]; riskLevels: string[]; sources: string[] }) => void;
}) {
  const entityTypes: EntityType[] = ['person', 'company', 'vessel', 'aircraft', 'organization'];
  const riskLevels: RiskLevel[] = ['critical', 'high', 'medium', 'low'];
  const sources: DataSource[] = ['OFAC', 'UN', 'HMT', 'EU', 'PEP', 'ADVERSE_MEDIA'];

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

  const hasFilters = filters.entityTypes.length > 0 || filters.riskLevels.length > 0 || filters.sources.length > 0;

  return (
    <div className="glass rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filtros
        </h3>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-gray-400 hover:text-white">
            Limpiar
          </Button>
        )}
      </div>

      {/* Entity Types */}
      <div>
        <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Tipo de Entidad</h4>
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
                <span className="text-sm text-gray-300 capitalize">{getEntityTypeLabel(type)}</span>
              </motion.label>
            );
          })}
        </div>
      </div>

      {/* Risk Levels */}
      <div>
        <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Nivel de Riesgo</h4>
        <div className="space-y-2">
          {riskLevels.map((level) => {
            const colors: Record<string, string> = {
              critical: 'text-red-400',
              high: 'text-orange-400',
              medium: 'text-yellow-400',
              low: 'text-green-400',
              none: 'text-gray-400',
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
                <span className={cn('text-sm capitalize', colors[level])}>
                  {level === 'critical' ? 'Crítico' : 
                   level === 'high' ? 'Alto' : 
                   level === 'medium' ? 'Medio' : 'Bajo'}
                </span>
              </motion.label>
            );
          })}
        </div>
      </div>

      {/* Sources */}
      <div>
        <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Fuente de Datos</h4>
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
  const initialQuery = searchParams.get('q') || '';

  const {
    query,
    results,
    isLoading,
    hasSearched,
    filters,
    setFilters,
    executeSearch,
    clearSearch,
  } = useScreening();

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

  const handleSearch = (searchQuery: string) => {
    setSearchParams({ q: searchQuery });
    executeSearch(searchQuery);
  };

  const handleSelectResult = (entityId: string) => {
    navigate(`/entity/${entityId}`);
  };

  const handleFilterChange = (newFilters: typeof localFilters) => {
    setLocalFilters(newFilters);
    setFilters({ ...newFilters, countries: [] });
  };

  const activeFilterCount = localFilters.entityTypes.length + localFilters.riskLevels.length + localFilters.sources.length;

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold text-white mb-6">Búsqueda de Entidades</h1>
          <IntelligentSearch
            onSearch={handleSearch}
            onSelectResult={handleSelectResult}
            className="max-w-3xl"
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
                      <Badge className="bg-blue-500 text-white ml-2">{activeFilterCount}</Badge>
                    )}
                    {showFilters ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
                  </Button>
                </div>

                <div className={cn('lg:block', showFilters ? 'block' : 'hidden')}>
                  <FilterPanel filters={localFilters} onFilterChange={handleFilterChange} />
                </div>
              </div>

              {/* Results List */}
              <div className="lg:col-span-3">
                {/* Results Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-medium text-white">
                      {isLoading ? 'Buscando...' : `${results.length} resultados`}
                    </h2>
                    {query && (
                      <p className="text-sm text-gray-400">
                        para &quot;{query}&quot;
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

                {/* Results */}
                {!isLoading && results.length > 0 && (
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
                      />
                    ))}
                  </motion.div>
                )}

                {/* Empty State */}
                {!isLoading && hasSearched && results.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass rounded-xl p-12 text-center"
                  >
                    <FileSearch className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-white mb-2">No se encontraron resultados</h3>
                    <p className="text-gray-400 mb-6">
                      Intenta con otros términos de búsqueda o ajusta los filtros
                    </p>
                    <Button onClick={clearSearch} variant="outline" className="border-white/10">
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
            <h2 className="text-lg font-medium text-white mb-6">Búsquedas Sugeridas</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { query: 'OFAC', description: 'Listas de sanciones OFAC', icon: Shield },
                { query: 'PEP', description: 'Personas Políticamente Expuestas', icon: Flag },
                { query: 'empresa', description: 'Empresas en listas de control', icon: Building2 },
                { query: 'buque', description: 'Embarcaciones sancionadas', icon: Ship },
                { query: 'offshore', description: 'Empresas en paraísos fiscales', icon: AlertCircle },
                { query: 'terrorismo', description: 'Vinculados a actividades terroristas', icon: AlertCircle },
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
