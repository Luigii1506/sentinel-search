import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, 
  Sparkles,
  ArrowRight,
  History
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OptimizedSearch } from '@/components/search/OptimizedSearch';
import { PerformanceMonitor } from '@/components/search/PerformanceMonitor';
import { SearchModeToggle } from '@/components/search/SearchModeToggle';
import { useOptimizedSearch } from '@/hooks/useOptimizedSearch';
import type { OptimizedSearchResult } from '@/services/screening';

export function OptimizedSearchPage() {
  const {
    setQuery,
    results,
    searchMode,
    setSearchMode,
    hasSearched,
    executeSearch,
    searchHistory,
  } = useOptimizedSearch();

  const [, setSelectedResult] = useState<OptimizedSearchResult | null>(null);

  const handleResultSelect = (result: OptimizedSearchResult) => {
    setSelectedResult(result);
    // Navigate to entity profile or show modal
    console.log('Selected:', result);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Búsqueda Optimizada
              </h1>
              <p className="text-gray-400">
                Smart Search v3 con cache de embeddings y búsqueda paralela
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Search Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search Card */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-400" />
                    Búsqueda Inteligente
                  </CardTitle>
                  <SearchModeToggle 
                    mode={searchMode} 
                    onChange={setSearchMode} 
                  />
                </div>
              </CardHeader>
              <CardContent>
                <OptimizedSearch
                  onResultSelect={handleResultSelect}
                  placeholder="Ej: Garcia, terrorismo financiero, sancionado..."
                  showMetrics={true}
                />
              </CardContent>
            </Card>

            {/* Results Section */}
            {hasSearched && results.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">
                      Resultados ({results.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {results.map((result, index) => (
                        <motion.div
                          key={result.entity_id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => handleResultSelect(result)}
                          className="p-4 rounded-lg bg-white/5 hover:bg-white/10 
                                   border border-white/10 hover:border-blue-500/50
                                   cursor-pointer transition-all duration-200
                                   group"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-white font-medium group-hover:text-blue-400 
                                           transition-colors">
                                {result.name}
                              </h3>
                              <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                                <span className="capitalize">{result.entity_type}</span>
                                <span>•</span>
                                <span className={
                                  result.risk_level === 'critical' ? 'text-red-400' :
                                  result.risk_level === 'high' ? 'text-orange-400' :
                                  result.risk_level === 'medium' ? 'text-yellow-400' :
                                  'text-green-400'
                                }>
                                  {result.risk_level}
                                </span>
                                <span>•</span>
                                <span>{(result.confidence * 100).toFixed(1)}% match</span>
                              </div>
                              <div className="flex items-center gap-1 mt-2">
                                {result.match_sources?.map((source) => (
                                  <span 
                                    key={source}
                                    className="text-xs px-2 py-0.5 rounded bg-white/10 text-gray-300"
                                  >
                                    {source.replace('_', ' ')}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-gray-600 
                                                 group-hover:text-blue-400 
                                                 group-hover:translate-x-1
                                                 transition-all" />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Performance Monitor */}
            <PerformanceMonitor />

            {/* Search History */}
            {searchHistory.length > 0 && (
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300 
                                       flex items-center gap-2">
                    <History className="w-4 h-4 text-purple-400" />
                    Historial de Búsquedas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {searchHistory.slice(-10).reverse().map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setQuery(item.query);
                          executeSearch(item.query);
                        }}
                        className="flex items-center justify-between p-2 rounded 
                                 bg-white/5 hover:bg-white/10 cursor-pointer
                                 transition-colors text-sm"
                      >
                        <span className="text-gray-300 truncate max-w-[150px]">
                          {item.query}
                        </span>
                        <div className="flex items-center gap-2">
                          {item.fromCache && (
                            <span className="text-xs text-purple-400">cache</span>
                          )}
                          <span className={
                            item.time < 100 ? 'text-green-400' :
                            item.time < 300 ? 'text-yellow-400' :
                            'text-orange-400'
                          }>
                            {item.time}ms
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tips Card */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">
                  💡 Consejos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    <span>Usa el modo <strong>Auto</strong> para mejor performance</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">•</span>
                    <span>Para nombres exactos: modo <strong>Nombres</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400">•</span>
                    <span>Para conceptos: modo <strong>Conceptos</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400">•</span>
                    <span>El cache mejora velocidad en queries repetidas</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OptimizedSearchPage;
