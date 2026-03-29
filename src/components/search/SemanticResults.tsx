import { motion } from 'framer-motion';
import { Brain, ArrowRight, AlertTriangle, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
// import type { SemanticSearchResult } from '@/services/screening';
import { getRiskBgColor, cn } from '@/lib/utils';

interface SemanticResultsProps {
  results: any[];
  query: string;
  executionTime?: number;
  onSelectEntity?: (entityId: string) => void;
}

export function SemanticResults({ results, executionTime, onSelectEntity }: SemanticResultsProps) {
  if (results.length === 0) {
    return (
      <Card className="p-8 text-center bg-white/5 border-white/10">
        <Brain className="w-12 h-12 mx-auto text-gray-600 mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">Sin resultados semánticos</h3>
        <p className="text-gray-400">
          Intenta con otra consulta o reduce el umbral de similitud.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30">
            <Brain className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">Smart Search v5.0</span>
          </div>
          <span className="text-gray-500">•</span>
          <span className="text-sm text-gray-400">
            {results.length} resultados semánticos
          </span>
          {executionTime && (
            <>
              <span className="text-gray-500">•</span>
              <span className="text-sm text-gray-500">{executionTime}ms</span>
            </>
          )}
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-3">
        {results.map((result, index) => (
          <motion.div
            key={result.entity_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card
              className={cn(
                'p-4 bg-white/5 border-white/10 hover:bg-white/10 transition-all cursor-pointer group',
                'hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/5'
              )}
              onClick={() => onSelectEntity?.(result.entity_id)}
            >
              <div className="flex flex-col sm:flex-row items-start gap-4">
                {/* Similarity Score */}
                <div className="flex-shrink-0">
                  <div className={cn(
                    'w-16 h-16 rounded-2xl flex flex-col items-center justify-center',
                    'bg-gradient-to-br from-purple-500/20 to-blue-500/20',
                    'border border-purple-500/30'
                  )}>
                    <span className="text-lg font-bold text-white">
                      {Math.round((result.similarity ?? result.confidence ?? result.match_score ?? 0) * 100)}%
                    </span>
                    <span className="text-[10px] text-gray-400 uppercase">Match</span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
                    <h3 className="text-base sm:text-lg font-semibold text-white break-words group-hover:text-purple-300 transition-colors">
                      {result.canonical_name ?? result.name}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="self-start sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    >
                      Ver detalles
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>

                  {/* Meta */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {/* Risk Badge */}
                    <Badge
                      className={cn(
                        'capitalize',
                        getRiskBgColor(result.risk_level)
                      )}
                    >
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {result.risk_level} Risk
                    </Badge>

                    {/* Risk Score */}
                    <Badge variant="outline" className="text-gray-400 border-white/10">
                      Score: {result.risk_score ?? result.match_score ?? 'N/A'}
                    </Badge>

                    {/* PEP Badge */}
                    {(result.is_pep || result.is_current_pep) && (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                        <User className="w-3 h-3 mr-1" />
                        PEP
                      </Badge>
                    )}

                    {/* Sources */}
                    {result.sources?.slice(0, 3).map((source: string) => (
                      <Badge
                        key={source}
                        variant="outline"
                        className="text-xs bg-white/5 border-white/10 text-gray-400"
                      >
                        {source}
                      </Badge>
                    ))}
                  </div>

                  {/* Similarity Bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(result.similarity ?? result.confidence ?? result.match_score ?? 0) * 100}%` }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className={cn(
                          'h-full rounded-full',
                          (result.similarity ?? result.confidence ?? result.match_score ?? 0) > 0.7
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                            : (result.similarity ?? result.confidence ?? result.match_score ?? 0) > 0.5
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500'
                            : 'bg-gradient-to-r from-orange-500 to-yellow-500'
                        )}
                      />
                    </div>
                    <span className="text-xs text-gray-500">
                      Similitud semántica
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mt-4">
        <Brain className="w-3 h-3" />
        <span>
          Resultados basados en embeddings de 526K entidades usando all-MiniLM-L6-v2
        </span>
      </div>
    </div>
  );
}

export default SemanticResults;
