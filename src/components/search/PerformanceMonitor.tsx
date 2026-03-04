import { useEffect, useState } from 'react';
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
    if (time < 100) return 'text-green-400';
    if (time < 300) return 'text-yellow-400';
    return 'text-orange-400';
  };

  
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          Performance Monitor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Average Time */}
          <div className="p-3 rounded-lg bg-white/5">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
              <Clock className="w-3 h-3" />
              Tiempo Medio
            </div>
            <div className={`text-2xl font-bold ${getPerformanceColor(stats.avgTime)}`}>
              {stats.avgTime.toFixed(0)}ms
            </div>
          </div>

          {/* Cache Hit Rate */}
          <div className="p-3 rounded-lg bg-white/5">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
              <Database className="w-3 h-3" />
              Cache Hit Rate
            </div>
            <div className="text-2xl font-bold text-blue-400">
              {stats.cacheHitRate.toFixed(0)}%
            </div>
            <Progress 
              value={stats.cacheHitRate} 
              className="h-1 mt-2 bg-white/10"
            />
          </div>

          {/* Cache Size */}
          <div className="p-3 rounded-lg bg-white/5">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
              <Zap className="w-3 h-3" />
              Cache Size
            </div>
            <div className="text-2xl font-bold text-purple-400">
              {stats.cacheSize}
            </div>
            <div className="text-xs text-gray-500">
              / {screeningService.getCacheStats().maxSize} max
            </div>
          </div>

          {/* Total Queries */}
          <div className="p-3 rounded-lg bg-white/5">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
              <TrendingUp className="w-3 h-3" />
              Queries
            </div>
            <div className="text-2xl font-bold text-gray-200">
              {stats.totalQueries}
            </div>
          </div>
        </div>

        {/* Recent Queries */}
        {recentQueries.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-gray-400 font-medium">
              Últimas búsquedas
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {recentQueries.slice(-5).reverse().map((query, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-2 rounded 
                           bg-white/5 text-sm"
                >
                  <span className="truncate text-gray-300 max-w-[150px]">
                    {query.query}
                  </span>
                  <div className="flex items-center gap-2">
                    {query.fromCache && (
                      <Badge variant="outline" className="text-xs border-purple-500/30 
                                                          text-purple-400">
                        cache
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
        <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 
                      border-t border-white/10">
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
