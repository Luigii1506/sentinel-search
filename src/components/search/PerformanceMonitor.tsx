import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Clock, 
  Database, 
  Zap, 
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { screeningService } from '@/services/screening';

interface PerformanceStats {
  avgTime: number;
  minTime: number;
  maxTime: number;
  totalQueries: number;
  cacheSize: number;
  cacheHitRate: number;
}

export function PerformanceMonitor() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<PerformanceStats>({
    avgTime: 0,
    minTime: 0,
    maxTime: 0,
    totalQueries: 0,
    cacheSize: 0,
    cacheHitRate: 0,
  });
  
  const [recentQueries, _setRecentQueries] = useState<Array<{
    query: string;
    time: number;
    fromCache: boolean;
    timestamp: number;
  }>>([]);

  // Update stats periodically
  useEffect(() => {
    const updateStats = () => {
      const cacheStats = screeningService.getCacheStats();
      
      setStats(prev => ({
        ...prev,
        cacheSize: cacheStats.size,
        cacheHitRate: prev.totalQueries > 0 
          ? (recentQueries.filter(q => q.fromCache).length / recentQueries.length) * 100 
          : 0,
      }));
    };

    updateStats();
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, [recentQueries]);

  const getPerformanceColor = (time: number) => {
    if (time < 100) return 'text-green-700 dark:text-green-400';
    if (time < 300) return 'text-yellow-700 dark:text-yellow-400';
    return 'text-orange-700 dark:text-orange-400';
  };

  
  return (
    <Card className="bg-foreground/5 border-foreground/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('components.search.performance.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Average Time */}
          <div className="p-3 rounded-lg bg-foreground/5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Clock className="w-3 h-3" />
              {t('components.search.performance.avgTime')}
            </div>
            <div className={`text-2xl font-bold ${getPerformanceColor(stats.avgTime)}`}>
              {stats.avgTime.toFixed(0)}ms
            </div>
          </div>

          {/* Cache Hit Rate */}
          <div className="p-3 rounded-lg bg-foreground/5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Database className="w-3 h-3" />
              {t('components.search.performance.cacheHitRate')}
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.cacheHitRate.toFixed(0)}%
            </div>
            <Progress 
              value={stats.cacheHitRate} 
              className="h-1 mt-2 bg-foreground/10"
            />
          </div>

          {/* Cache Size */}
          <div className="p-3 rounded-lg bg-foreground/5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Zap className="w-3 h-3" />
              {t('components.search.performance.cacheSize')}
            </div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.cacheSize}
            </div>
            <div className="text-xs text-muted-foreground">
              {t('components.search.performance.maxSuffix', { value: screeningService.getCacheStats().maxSize })}
            </div>
          </div>

          {/* Total Queries */}
          <div className="p-3 rounded-lg bg-foreground/5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <TrendingUp className="w-3 h-3" />
              {t('components.search.performance.queries')}
            </div>
            <div className="text-2xl font-bold text-gray-200">
              {stats.totalQueries}
            </div>
          </div>
        </div>

        {/* Recent Queries */}
        {recentQueries.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground font-medium">
              {t('components.search.performance.recentSearches')}
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {recentQueries.slice(-5).reverse().map((query, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-2 rounded 
                           bg-foreground/5 text-sm"
                >
                  <span className="truncate text-muted-foreground max-w-[150px]">
                    {query.query}
                  </span>
                  <div className="flex items-center gap-2">
                    {query.fromCache && (
                      <Badge variant="outline" className="text-xs border-purple-500/30 
                                                          text-purple-600 dark:text-purple-400">
                        {t('components.search.performance.cache')}
                      </Badge>
                    )}
                    <span className={`text-xs ${getPerformanceColor(query.time)}`}>
                      {query.time}ms
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 
                      border-t border-foreground/10">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>&lt;100ms</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>100-300ms</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            <span>&gt;300ms</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default PerformanceMonitor;
