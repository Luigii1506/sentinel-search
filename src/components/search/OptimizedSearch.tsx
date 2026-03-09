import { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Zap, 
  Clock, 
  Database, 
  Sparkles, 
  BarChart3,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { screeningService, type OptimizedSearchResult } from '@/services/screening';

export interface OptimizedSearchProps {
  onResultSelect?: (result: OptimizedSearchResult) => void;
  className?: string;
  placeholder?: string;
  showMetrics?: boolean;
}

interface SearchMetrics {
  executionTimeMs: number;
  fromCache: boolean;
  strategy: string;
  sourcesUsed: string[];
  totalMatches: number;
}

export function OptimizedSearch({
  onResultSelect,
  className,
  placeholder = "Buscar persona, empresa o concepto...",
  showMetrics = true,
}: OptimizedSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OptimizedSearchResult[]>([]);
  const [metrics, setMetrics] = useState<SearchMetrics | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [sourceLevel, setSourceLevel] = useState<1 | 2 | 3>(2);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mutation para búsqueda optimizada
  const searchMutation = useMutation({
    mutationFn: async (searchQuery: string) => {
      return screeningService.optimizedSearch({
        query: searchQuery,
        max_results: 20,
        min_confidence: 0.6,
        source_level: sourceLevel,
        use_cache: true,
        timeout_ms: 2000,
      });
    },
    onSuccess: (data) => {
      setResults(data.matches);
      setMetrics({
        executionTimeMs: data.execution_time_ms,
        fromCache: data.from_cache,
        strategy: data.strategy,
        sourcesUsed: data.sources_used,
        totalMatches: data.total_matches,
      });
      setIsExpanded(true);
    },
  });

  const handleSearch = useCallback(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    searchMutation.mutate(trimmed);
  }, [query, searchMutation]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setMetrics(null);
    setIsExpanded(false);
    inputRef.current?.focus();
  }, []);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const getStrategyIcon = (strategy: string) => {
    switch (strategy) {
      case 'name':
        return <Database className="w-3 h-3" />;
      case 'concept':
        return <Sparkles className="w-3 h-3" />;
      case 'hybrid':
        return <Zap className="w-3 h-3" />;
      default:
        return <Search className="w-3 h-3" />;
    }
  };

  const getStrategyLabel = (strategy: string) => {
    switch (strategy) {
      case 'name':
        return 'OpenSearch';
      case 'concept':
        return 'Smart Search';
      case 'hybrid':
        return 'Híbrido';
      default:
        return strategy;
    }
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-12 pr-24 py-6 text-lg bg-white/5 border-white/10 
                     text-white placeholder:text-gray-500 rounded-xl
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     transition-all duration-200"
        />
        
        <div className="absolute inset-y-0 right-2 flex items-center gap-2">
          {query && (
            <button
              onClick={clearSearch}
              className="p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              <XCircle className="w-5 h-5 text-gray-400" />
            </button>
          )}
          <Button
            onClick={handleSearch}
            disabled={searchMutation.isPending || query.trim().length < 2}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200"
          >
            {searchMutation.isPending ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Zap className="w-4 h-4" />
              </motion.div>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Buscar
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Source Level Selector */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-gray-500 mr-1">Nivel:</span>
        {([
          { level: 1 as const, label: 'Core AML', desc: 'Sanciones, Terrorismo, Law Enforcement' },
          { level: 2 as const, label: 'Extendido', desc: '+ PEP, Inhabilitaciones, Regulatorio' },
          { level: 3 as const, label: 'Completo', desc: 'Todas las fuentes' },
        ]).map(({ level, label, desc }) => (
          <TooltipProvider key={level}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setSourceLevel(level)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200",
                    sourceLevel === level
                      ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                      : "bg-white/5 text-gray-400 border-white/10 hover:border-white/20 hover:text-gray-300"
                  )}
                >
                  {label}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{desc}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>

      {/* Performance Metrics */}
      <AnimatePresence>
        {showMetrics && metrics && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 flex flex-wrap items-center gap-3"
          >
            {/* Tiempo de respuesta */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "gap-1.5 cursor-help",
                      metrics.executionTimeMs < 100 ? "border-green-500/30 text-green-400" :
                      metrics.executionTimeMs < 300 ? "border-yellow-500/30 text-yellow-400" :
                      "border-orange-500/30 text-orange-400"
                    )}
                  >
                    <Clock className="w-3 h-3" />
                    {metrics.executionTimeMs}ms
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Tiempo de respuesta</p>
                  <p className="text-xs text-gray-400">
                    {metrics.executionTimeMs < 100 ? '⚡ Ultra-rápido' :
                     metrics.executionTimeMs < 300 ? '✅ Rápido' :
                     '⏱ Normal'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Estrategia usada */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className="gap-1.5 border-blue-500/30 text-blue-400 cursor-help"
                  >
                    {getStrategyIcon(metrics.strategy)}
                    {getStrategyLabel(metrics.strategy)}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Estrategia de búsqueda</p>
                  <p className="text-xs text-gray-400">
                    {metrics.strategy === 'name' && 'Búsqueda por nombre (OpenSearch)'}
                    {metrics.strategy === 'concept' && 'Búsqueda semántica (Embeddings)'}
                    {metrics.strategy === 'hybrid' && 'Combinación de múltiples fuentes'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Cache hit */}
            {metrics.fromCache && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="outline" 
                      className="gap-1.5 border-purple-500/30 text-purple-400 cursor-help"
                    >
                      <Database className="w-3 h-3" />
                      Cache
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Resultado desde caché</p>
                    <p className="text-xs text-gray-400">Consulta previa encontrada</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Total de resultados */}
            <Badge 
              variant="outline" 
              className="gap-1.5 border-gray-500/30 text-gray-400"
            >
              <BarChart3 className="w-3 h-3" />
              {metrics.totalMatches} resultados
            </Badge>

            {/* Fuentes usadas */}
            <div className="flex items-center gap-1">
              {metrics.sourcesUsed.map((source) => (
                <TooltipProvider key={source}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className="w-2 h-2 rounded-full mx-0.5 cursor-help"
                        style={{
                          backgroundColor: 
                            source === 'opensearch' ? '#3b82f6' :
                            source === 'smart_search' ? '#8b5cf6' :
                            source === 'phonetic' ? '#10b981' :
                            '#6b7280'
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="capitalize">{source.replace('_', ' ')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results List */}
      <AnimatePresence>
        {isExpanded && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 space-y-2"
          >
            {results.map((result, index) => (
              <motion.div
                key={result.entity_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onResultSelect?.(result)}
                className="p-4 rounded-lg bg-white/5 hover:bg-white/10 
                           border border-white/10 hover:border-white/20
                           cursor-pointer transition-all duration-200
                           flex items-center justify-between group"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium group-hover:text-blue-400 
                                   transition-colors">
                      {result.name}
                    </span>
                    <Badge 
                      variant="outline" 
                      className="text-xs capitalize"
                      style={{
                        borderColor: 
                          result.risk_level === 'critical' ? '#ef4444' :
                          result.risk_level === 'high' ? '#f97316' :
                          result.risk_level === 'medium' ? '#eab308' :
                          '#22c55e',
                        color: 
                          result.risk_level === 'critical' ? '#ef4444' :
                          result.risk_level === 'high' ? '#f97316' :
                          result.risk_level === 'medium' ? '#eab308' :
                          '#22c55e',
                      }}
                    >
                      {result.risk_level}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <span className="capitalize">{result.entity_type}</span>
                    <span>•</span>
                    <span>Score: {(result.confidence * 100).toFixed(1)}%</span>
                    <span>•</span>
                    <span className="text-xs">
                      via {result.match_sources?.join(', ') || 'unknown'}
                    </span>
                  </div>

                  {result.sources && result.sources.length > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      {result.sources.slice(0, 3).map((source) => (
                        <Badge 
                          key={source}
                          variant="secondary" 
                          className="text-xs bg-white/5"
                        >
                          {source}
                        </Badge>
                      ))}
                      {result.sources.length > 3 && (
                        <Badge variant="secondary" className="text-xs bg-white/5">
                          +{result.sources.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-5 h-5 text-blue-400" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      <AnimatePresence>
        {isExpanded && results.length === 0 && !searchMutation.isPending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-8 text-center py-12"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 
                          flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-400">No se encontraron resultados</p>
            <p className="text-sm text-gray-500 mt-1">
              Intenta con términos diferentes o revisa la ortografía
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ArrowRight icon component
function ArrowRight({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export default OptimizedSearch;
