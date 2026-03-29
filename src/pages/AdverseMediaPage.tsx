import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Newspaper,
  AlertTriangle,
  Activity,
  Database,
  ExternalLink,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Zap,
  TrendingUp,
  Globe,
  User,
  Building2,
  Link2,
  ShieldAlert,
  FileText,
  Eye,
  Brain,
  Cpu,
  Tag,
  BarChart3,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { complianceService } from '@/services/compliance';
import type {
  AdverseMediaArticle,
  AdverseMediaStats,
  AdverseMediaSource,
} from '@/services/compliance';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const categoryColors: Record<string, string> = {
  terrorism: 'bg-red-500/10 text-red-400 border-red-500/30',
  sanctions_evasion: 'bg-red-500/10 text-red-300 border-red-500/30',
  wanted: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  crime: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
  human_rights: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
  financial_crime: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  corruption: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  offshore: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  regulatory: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
};

const categoryLabels: Record<string, string> = {
  terrorism: 'Terrorismo',
  sanctions_evasion: 'Evasion Sanciones',
  wanted: 'Buscados',
  crime: 'Crimen',
  human_rights: 'DDHH',
  financial_crime: 'Crimen Financiero',
  corruption: 'Corrupcion',
  offshore: 'Offshore',
  regulatory: 'Regulatorio',
};

const methodLabels: Record<string, { label: string; color: string; icon: typeof Zap }> = {
  moonshot_ai: { label: 'Moonshot AI', color: 'bg-violet-500/10 text-violet-400 border-violet-500/30', icon: Brain },
  claude_ai: { label: 'Claude AI', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30', icon: Brain },
  keyword: { label: 'Keywords', color: 'bg-gray-500/10 text-gray-400 border-gray-500/30', icon: Tag },
  unknown: { label: 'Sin clasificar', color: 'bg-gray-500/10 text-gray-500 border-gray-500/30', icon: Cpu },
};

const sourceTypeColors: Record<string, string> = {
  rss: 'bg-green-500/10 text-green-400 border-green-500/30',
  api: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  gdelt: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
};

function getSeverityColor(severity: number): string {
  if (severity >= 90) return 'text-red-400 bg-red-500/10 border-red-500/30';
  if (severity >= 70) return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
  if (severity >= 50) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
  if (severity >= 30) return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
  return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
}

function getSeverityBarColor(severity: number): string {
  if (severity >= 90) return 'bg-red-500';
  if (severity >= 70) return 'bg-orange-500';
  if (severity >= 50) return 'bg-yellow-500';
  if (severity >= 30) return 'bg-blue-500';
  return 'bg-gray-500';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return 'Hace menos de 1h';
  if (diffHours < 24) return `Hace ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `Hace ${diffDays}d`;
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getMethodBadge(method: string | null | undefined) {
  const key = method || 'unknown';
  const meta = methodLabels[key] || methodLabels.unknown;
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={cn('text-[10px] gap-1', meta.color)}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </Badge>
  );
}

// ── Stat Card ──

function StatCard({
  label,
  value,
  subValue,
  icon: Icon,
  color = 'text-blue-400',
  bgColor = 'bg-blue-500/10',
}: {
  label: string;
  value: string | number;
  subValue?: string;
  icon: typeof Newspaper;
  color?: string;
  bgColor?: string;
}) {
  return (
    <motion.div variants={itemVariants} className="glass rounded-xl p-5">
      <div className="flex items-center gap-4">
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', bgColor)}>
          <Icon className={cn('w-6 h-6', color)} />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-sm text-gray-400">{label}</p>
          {subValue && <p className="text-xs text-gray-500">{subValue}</p>}
        </div>
      </div>
    </motion.div>
  );
}

// ── Articles Tab ──

function ArticlesTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDays, setSelectedDays] = useState<string>('30');
  const [minSeverity, setMinSeverity] = useState<number>(0);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['adverse-media-articles', searchQuery, selectedCategory, selectedDays, minSeverity],
    queryFn: () =>
      complianceService.searchAdverseMedia({
        query: searchQuery || undefined,
        categories: selectedCategory !== 'all' ? [selectedCategory] : undefined,
        min_severity: minSeverity > 0 ? minSeverity : undefined,
        days: parseInt(selectedDays),
        limit: 100,
      }),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  const articles = data?.items || [];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="glass rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 items-stretch sm:items-end">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar en titulos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white/5 border-white/10"
              />
            </div>
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[180px] bg-white/5 border-white/10">
              <Filter className="w-4 h-4 mr-2 text-gray-400" />
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedDays} onValueChange={setSelectedDays}>
            <SelectTrigger className="w-full sm:w-[140px] bg-white/5 border-white/10">
              <Clock className="w-4 h-4 mr-2 text-gray-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Hoy</SelectItem>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
              <SelectItem value="365">1 ano</SelectItem>
            </SelectContent>
          </Select>
          <div className="w-full sm:w-[180px]">
            <p className="text-[10px] text-gray-500 mb-1">
              Severity min: <span className="text-white font-mono">{minSeverity}</span>
            </p>
            <Slider
              value={[minSeverity]}
              onValueChange={(v) => setMinSeverity(v[0])}
              max={100}
              step={10}
              className="w-full"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="w-full sm:w-auto border-white/10">
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-400">
        {data?.total ?? 0} articulos encontrados
      </p>

      {/* Article list */}
      {articles.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Sin resultados</h3>
          <p className="text-gray-400">No se encontraron articulos con los filtros aplicados.</p>
        </div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-3">
          {articles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              onClick={() => setSelectedArticleId(article.id)}
            />
          ))}
        </motion.div>
      )}

      {/* Article Detail Modal */}
      <ArticleDetailModal
        articleId={selectedArticleId}
        open={!!selectedArticleId}
        onClose={() => setSelectedArticleId(null)}
      />
    </div>
  );
}

function ArticleCard({ article, onClick }: { article: AdverseMediaArticle; onClick?: () => void }) {
  const sourceDomain = useMemo(() => {
    try {
      return new URL(article.source_url).hostname.replace('www.', '');
    } catch {
      return null;
    }
  }, [article.source_url]);

  return (
    <motion.div
      variants={itemVariants}
      className="glass rounded-xl p-5 hover:bg-white/[0.04] transition-colors cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {article.severity > 0 && (
              <Badge variant="outline" className={cn('text-xs', getSeverityColor(article.severity))}>
                {article.severity}
              </Badge>
            )}
            {article.categories?.map((cat) => (
              <Badge
                key={cat}
                variant="outline"
                className={cn('text-xs', categoryColors[cat] || 'bg-gray-500/10 text-gray-400')}
              >
                {categoryLabels[cat] || cat}
              </Badge>
            ))}
            {getMethodBadge(article.classification_method)}
          </div>

          <h4 className="text-sm font-medium text-white mb-1 line-clamp-2 group-hover:text-blue-300 transition-colors">
            {article.title}
          </h4>

          {article.summary && (
            <p className="text-xs text-gray-400 line-clamp-2 mb-2">{article.summary}</p>
          )}

          <div className="flex items-center gap-3 text-xs text-gray-500">
            {sourceDomain && (
              <span className="flex items-center gap-1 text-gray-400">
                <Globe className="w-3 h-3" />
                {sourceDomain}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(article.publication_date)}
            </span>
            {article.language && (
              <span className="uppercase text-gray-600">{article.language}</span>
            )}
            {article.classification_confidence != null && article.classification_confidence > 0 && (
              <span className="text-gray-600">
                {Math.round(article.classification_confidence * 100)}% conf
              </span>
            )}
          </div>
        </div>

        {/* Severity bar */}
        {article.severity > 0 && (
          <div className="w-full sm:w-20 flex sm:flex-col items-start sm:items-center gap-2 sm:gap-1 shrink-0">
            <span className={cn('text-xs font-mono font-bold',
              article.severity >= 90 ? 'text-red-400' :
              article.severity >= 70 ? 'text-orange-400' :
              article.severity >= 50 ? 'text-yellow-400' : 'text-blue-400'
            )}>
              {article.severity}
            </span>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', getSeverityBarColor(article.severity))}
                style={{ width: `${article.severity}%` }}
              />
            </div>
          </div>
        )}

        <a
          href={article.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start text-blue-400 hover:text-blue-300 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </motion.div>
  );
}

// ── Sources Tab ──

function SourcesTab() {
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['adverse-media-sources'],
    queryFn: () => complianceService.getAdverseMediaSources(),
  });

  const crawlMutation = useMutation({
    mutationFn: (sourceKey: string) => complianceService.triggerCrawl(sourceKey),
    onSuccess: (_, sourceKey) => {
      toast.success(`Crawl iniciado para ${sourceKey}`);
      queryClient.invalidateQueries({ queryKey: ['adverse-media-sources'] });
    },
    onError: () => toast.error('Error al iniciar crawl'),
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    );
  }

  const sources = data?.sources || [];
  const activeSources = sources.filter((s) => s.is_active);
  const inactiveSources = sources.filter((s) => !s.is_active);

  const filteredActive = filterType === 'all'
    ? activeSources
    : activeSources.filter((s) => s.source_type === filterType);

  const totalArticles = activeSources.reduce((sum, s) => sum + s.total_articles, 0);
  const totalErrors = sources.reduce((sum, s) => sum + s.error_count, 0);

  return (
    <div className="space-y-6">
      {/* Sources summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="glass rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-green-400">{activeSources.length}</p>
          <p className="text-xs text-gray-400">Activas</p>
        </div>
        <div className="glass rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-red-400">{inactiveSources.length}</p>
          <p className="text-xs text-gray-400">Inactivas</p>
        </div>
        <div className="glass rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-white">{totalArticles.toLocaleString()}</p>
          <p className="text-xs text-gray-400">Total Articulos</p>
        </div>
        <div className="glass rounded-lg p-3 text-center">
          <p className={cn('text-xl font-bold', totalErrors > 0 ? 'text-orange-400' : 'text-gray-600')}>{totalErrors}</p>
          <p className="text-xs text-gray-400">Errores Acumulados</p>
        </div>
      </div>

      {/* Filter by type */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <span className="text-xs text-gray-500">Filtrar:</span>
        {['all', 'rss', 'api', 'gdelt'].map((type) => (
          <Button
            key={type}
            variant="outline"
            size="sm"
            className={cn(
              'text-xs border-white/10',
              filterType === type && 'bg-white/10 text-white'
            )}
            onClick={() => setFilterType(type)}
          >
            {type === 'all' ? 'Todas' : type.toUpperCase()}
          </Button>
        ))}
      </div>

      {/* Active sources */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-3">
          Fuentes Activas ({filteredActive.length})
        </h3>
        <div className="space-y-3 md:hidden">
          {filteredActive
            .sort((a, b) => b.total_articles - a.total_articles)
            .map((source) => (
              <div key={source.id} className="glass rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-2 h-2 rounded-full', source.error_count > 5 ? 'bg-red-500' : 'bg-green-500')} />
                      <span className="text-white font-medium break-words">{source.display_name}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1 break-all">{source.source_key}</p>
                  </div>
                  <Badge variant="outline" className={cn('text-[10px]', sourceTypeColors[source.source_type] || '')}>
                    {source.source_type.toUpperCase()}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Articulos</p>
                    <p className="text-white font-mono">{source.total_articles}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Calidad</p>
                    <p className="text-gray-300">{source.quality_score}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Errores</p>
                    <p className={cn(source.error_count > 5 ? 'text-red-400' : source.error_count > 0 ? 'text-orange-400' : 'text-gray-500')}>
                      {source.error_count}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Ultimo Crawl</p>
                    <p className="text-gray-300">{formatDate(source.last_crawled_at)}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => crawlMutation.mutate(source.source_key)}
                  disabled={crawlMutation.isPending}
                  className="w-full border-white/10 text-gray-300"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5 mr-2', crawlMutation.isPending && 'animate-spin')} />
                  Ejecutar Crawl
                </Button>
              </div>
            ))}
        </div>
        <div className="hidden md:block glass rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left p-3 text-gray-400 font-medium">Fuente</th>
                <th className="text-left p-3 text-gray-400 font-medium">Tipo</th>
                <th className="text-right p-3 text-gray-400 font-medium">Articulos</th>
                <th className="text-right p-3 text-gray-400 font-medium">Calidad</th>
                <th className="text-right p-3 text-gray-400 font-medium">Errores</th>
                <th className="text-right p-3 text-gray-400 font-medium">Ultimo Crawl</th>
                <th className="text-right p-3 text-gray-400 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filteredActive
                .sort((a, b) => b.total_articles - a.total_articles)
                .map((source) => (
                  <SourceRow
                    key={source.id}
                    source={source}
                    onCrawl={() => crawlMutation.mutate(source.source_key)}
                    isCrawling={crawlMutation.isPending}
                  />
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inactive sources */}
      {inactiveSources.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-3">
            Fuentes Inactivas ({inactiveSources.length})
          </h3>
          <div className="space-y-3 md:hidden opacity-60">
            {inactiveSources.map((source) => (
              <div key={source.id} className="glass rounded-xl p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-gray-400 break-words">{source.display_name}</p>
                    <p className="text-[11px] text-gray-600 mt-1 break-all">{source.source_key}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-gray-500/10 text-gray-500">
                    {source.source_type}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-600 mb-1">Articulos</p>
                    <p className="text-gray-500">{source.total_articles}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-600 mb-1">Errores</p>
                    <p className="text-red-400/60">{source.error_count}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden md:block glass rounded-xl overflow-hidden opacity-60">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left p-3 text-gray-500 font-medium">Fuente</th>
                  <th className="text-left p-3 text-gray-500 font-medium">Tipo</th>
                  <th className="text-right p-3 text-gray-500 font-medium">Articulos</th>
                  <th className="text-right p-3 text-gray-500 font-medium">Errores</th>
                </tr>
              </thead>
              <tbody>
                {inactiveSources.map((source) => (
                  <tr key={source.id} className="border-b border-white/5 last:border-0">
                    <td className="p-3 text-gray-500">{source.display_name}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px] bg-gray-500/10 text-gray-500">
                        {source.source_type}
                      </Badge>
                    </td>
                    <td className="p-3 text-right text-gray-500">{source.total_articles}</td>
                    <td className="p-3 text-right text-red-400/60">{source.error_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SourceRow({
  source,
  onCrawl,
  isCrawling,
}: {
  source: AdverseMediaSource;
  onCrawl: () => void;
  isCrawling: boolean;
}) {
  return (
    <tr className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
      <td className="p-3">
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full', source.error_count > 5 ? 'bg-red-500' : 'bg-green-500')} />
          <span className="text-white font-medium">{source.display_name}</span>
          <span className="text-[10px] text-gray-500">{source.source_key}</span>
        </div>
      </td>
      <td className="p-3">
        <Badge variant="outline" className={cn('text-[10px]', sourceTypeColors[source.source_type] || '')}>
          {source.source_type.toUpperCase()}
        </Badge>
      </td>
      <td className="p-3 text-right text-white font-mono">{source.total_articles}</td>
      <td className="p-3 text-right">
        <span className="text-gray-400">{source.quality_score}</span>
      </td>
      <td className="p-3 text-right">
        {source.error_count > 0 ? (
          <span className={cn(source.error_count > 5 ? 'text-red-400' : 'text-orange-400')}>
            {source.error_count}
          </span>
        ) : (
          <span className="text-gray-600">0</span>
        )}
      </td>
      <td className="p-3 text-right text-gray-400 text-xs">
        {formatDate(source.last_crawled_at)}
      </td>
      <td className="p-3 text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCrawl}
          disabled={isCrawling}
          className="text-xs text-gray-400 hover:text-white"
        >
          <RefreshCw className={cn('w-3 h-3', isCrawling && 'animate-spin')} />
        </Button>
      </td>
    </tr>
  );
}

// ── Analytics Tab ──

function AnalyticsTab({ stats }: { stats: AdverseMediaStats | undefined }) {
  if (!stats) return null;

  const categories = Object.entries(stats.by_category)
    .sort(([, a], [, b]) => b - a);
  const maxCount = Math.max(...categories.map(([, count]) => count), 1);

  const methods = Object.entries(stats.by_method || {})
    .sort(([, a], [, b]) => b - a);
  const totalClassified = methods.reduce((sum, [, count]) => sum + count, 0);

  const chartData = (stats.by_day || []).map((d) => ({
    date: d.date ? new Date(d.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '',
    count: d.count,
  }));

  return (
    <div className="space-y-6">
      {/* Time Series Chart */}
      {chartData.length > 0 && (
        <div className="glass rounded-xl p-5">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-orange-400" />
            Articulos Adverse por Dia (30d)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorAdverse" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  stroke="rgba(255,255,255,0.3)"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="rgba(255,255,255,0.3)"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a2e',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#f97316"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorAdverse)"
                  name="Articulos"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-base font-medium text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            Distribucion por Categoria
          </h3>
          <div className="space-y-3">
            {categories.map(([category, count]) => (
              <div key={category} className="flex items-center gap-3">
                <span className="text-sm text-gray-400 w-32 shrink-0 truncate">
                  {categoryLabels[category] || category}
                </span>
                <div className="flex-1 h-5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(count / maxCount) * 100}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={cn('h-full rounded-full', getSeverityBarColor(
                      category === 'terrorism' ? 100 :
                      category === 'sanctions_evasion' ? 95 :
                      category === 'crime' ? 85 :
                      category === 'financial_crime' ? 80 :
                      category === 'corruption' ? 80 :
                      50
                    ))}
                  />
                </div>
                <span className="text-sm font-mono text-white w-8 text-right">{count}</span>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">Sin datos de categorias</p>
            )}
          </div>
        </div>

        {/* Classification Method Distribution */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-base font-medium text-white mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-violet-400" />
            Metodo de Clasificacion
          </h3>
          <div className="space-y-3">
            {methods.map(([method, count]) => {
              const meta = methodLabels[method] || methodLabels.unknown;
              const Icon = meta.icon;
              const pct = totalClassified > 0 ? Math.round((count / totalClassified) * 100) : 0;
              return (
                <div key={method} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-32 shrink-0">
                    <Icon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-400 truncate">{meta.label}</span>
                  </div>
                  <div className="flex-1 h-5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={cn('h-full rounded-full',
                        method === 'moonshot_ai' ? 'bg-violet-500' :
                        method === 'claude_ai' ? 'bg-cyan-500' :
                        method === 'keyword' ? 'bg-gray-500' : 'bg-gray-600'
                      )}
                    />
                  </div>
                  <div className="text-right w-20 shrink-0">
                    <span className="text-sm font-mono text-white">{count}</span>
                    <span className="text-xs text-gray-500 ml-1">({pct}%)</span>
                  </div>
                </div>
              );
            })}
            {methods.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">Sin datos de metodos</p>
            )}
          </div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass rounded-xl p-5">
          <p className="text-sm text-gray-400 mb-1">Tasa Adverse Media</p>
          <p className="text-3xl font-bold text-white">{stats.adverse_rate_pct}%</p>
          <p className="text-xs text-gray-500 mt-1">
            {stats.adverse} de {stats.total_articles} articulos
          </p>
        </div>
        <div className="glass rounded-xl p-5">
          <p className="text-sm text-gray-400 mb-1">Entity Links</p>
          <p className="text-3xl font-bold text-white">{stats.total_entity_links}</p>
          <p className="text-xs text-gray-500 mt-1">
            {stats.entities_with_articles} entidades vinculadas
          </p>
        </div>
        <div className="glass rounded-xl p-5">
          <p className="text-sm text-gray-400 mb-1">Sin Clasificar</p>
          <p className="text-3xl font-bold text-white">{stats.unclassified}</p>
          <p className="text-xs text-gray-500 mt-1">
            {stats.classified} clasificados
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Article Detail Modal ──

function ArticleDetailModal({
  articleId,
  open,
  onClose,
}: {
  articleId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const { data: article, isLoading } = useQuery({
    queryKey: ['article-detail', articleId],
    queryFn: () => complianceService.getArticleDetail(articleId!),
    enabled: !!articleId && open,
  });

  const createCaseMutation = useMutation({
    mutationFn: (entityLink: { entity_id: string; entity_name: string }) =>
      complianceService.createAlertFromArticle({
        article_id: articleId!,
        entity_id: entityLink.entity_id,
        entity_name: entityLink.entity_name,
        article_title: article?.title || '',
        severity: article?.severity || 50,
        categories: article?.categories || [],
      }),
    onSuccess: (data) => {
      toast.success(`Caso ${data.case_number} creado`);
      queryClient.invalidateQueries({ queryKey: ['compliance'] });
    },
    onError: () => toast.error('Error al crear caso'),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-[#111] border-white/10 text-white">
        {isLoading ? (
          <div className="space-y-4 p-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : article ? (
          <>
            <DialogHeader>
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <DialogTitle className="text-lg text-white leading-snug">
                    {article.title}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Detalle del articulo de adverse media
                  </DialogDescription>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {article.severity > 0 && (
                      <Badge variant="outline" className={cn('text-xs', getSeverityColor(article.severity))}>
                        Severity: {article.severity}
                      </Badge>
                    )}
                    {article.categories?.map((cat) => (
                      <Badge
                        key={cat}
                        variant="outline"
                        className={cn('text-xs', categoryColors[cat] || 'bg-gray-500/10 text-gray-400')}
                      >
                        {categoryLabels[cat] || cat}
                      </Badge>
                    ))}
                    {getMethodBadge(article.classification_method)}
                  </div>
                </div>
              </div>
            </DialogHeader>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 border-b border-white/5 pb-3">
              {article.source_display_name && (
                <span className="flex items-center gap-1">
                  <Newspaper className="w-3 h-3" />
                  {article.source_display_name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(article.publication_date)}
              </span>
              {article.language && (
                <span className="uppercase">{article.language}</span>
              )}
              {article.classification_confidence != null && (
                <span className="text-gray-500">
                  Confianza: {Math.round(article.classification_confidence * 100)}%
                </span>
              )}
              <a
                href={article.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 ml-auto"
              >
                <ExternalLink className="w-3 h-3" />
                Ver fuente
              </a>
            </div>

            {/* Content snippet */}
            {article.content_snippet && (
              <div className="bg-white/5 rounded-lg p-4 text-sm text-gray-300 leading-relaxed">
                <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Extracto
                </p>
                {article.content_snippet}
              </div>
            )}

            {/* Summary */}
            {article.summary && article.summary !== article.content_snippet && (
              <div className="text-sm text-gray-400">
                <p className="font-medium text-gray-300 mb-1">Resumen</p>
                {article.summary}
              </div>
            )}

            {/* Extracted Entities */}
            {article.extracted_entities && article.extracted_entities.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Entidades Extraidas ({article.extracted_entities.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {article.extracted_entities.map((entity, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className={cn(
                        'text-xs',
                        entity.type === 'person'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                      )}
                    >
                      {entity.type === 'person' ? (
                        <User className="w-3 h-3 mr-1" />
                      ) : (
                        <Building2 className="w-3 h-3 mr-1" />
                      )}
                      {entity.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Entity Links (matched to Gold) */}
            {article.entity_links && article.entity_links.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                  <Link2 className="w-3 h-3" />
                  Entidades Vinculadas ({article.entity_links.length})
                </p>
                <div className="space-y-2">
                  {article.entity_links.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between bg-white/5 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-2 h-2 rounded-full',
                          link.verified ? 'bg-green-500' : 'bg-yellow-500'
                        )} />
                        <div>
                          <p className="text-sm text-white font-medium">{link.mentioned_name}</p>
                          <p className="text-xs text-gray-500">
                            Confianza: {Math.round(link.match_confidence * 100)}%
                            {link.match_method && ` · ${link.match_method}`}
                            {link.is_primary_subject && ' · Sujeto principal'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`/entity/${link.unified_entity_id}`}
                          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          Ver perfil
                        </a>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                          onClick={() => createCaseMutation.mutate({
                            entity_id: link.unified_entity_id,
                            entity_name: link.mentioned_name,
                          })}
                          disabled={createCaseMutation.isPending}
                        >
                          <ShieldAlert className="w-3 h-3 mr-1" />
                          Crear Caso
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No entity links — show extracted entities with create case option */}
            {(!article.entity_links || article.entity_links.length === 0) &&
              article.extracted_entities &&
              article.extracted_entities.length > 0 && (
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
                <p className="text-xs text-yellow-400 mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Entidades detectadas sin vincular a Gold
                </p>
                <p className="text-xs text-gray-500">
                  Las entidades extraidas aun no estan vinculadas a entidades del sistema.
                  Usa la busqueda para vincularlas manualmente.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="p-8 text-center text-gray-400">
            Articulo no encontrado
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──

export function AdverseMediaPage() {
  const [activeTab, setActiveTab] = useState('articles');
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['adverse-media-stats'],
    queryFn: () => complianceService.getAdverseMediaStats(),
    refetchInterval: 60000,
  });

  const reclassifyMutation = useMutation({
    mutationFn: () => complianceService.reclassifyArticles(),
    onSuccess: (data) => {
      toast.success(`Reclasificados: ${data.reclassified} articulos (${data.adverse} adverse)`);
      queryClient.invalidateQueries({ queryKey: ['adverse-media'] });
    },
    onError: () => toast.error('Error al reclasificar'),
  });

  // Compute AI vs keyword ratio for stat card
  const aiArticles = (stats?.by_method?.moonshot_ai || 0) + (stats?.by_method?.claude_ai || 0);
  const keywordArticles = stats?.by_method?.keyword || 0;

  return (
    <div className="min-h-screen p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Newspaper className="w-8 h-8 text-orange-400" />
              Adverse Media
            </h1>
            <p className="text-gray-400 mt-1">
              Monitoreo continuo de noticias AML/CFT
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => reclassifyMutation.mutate()}
            disabled={reclassifyMutation.isPending}
            className="border-white/10"
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', reclassifyMutation.isPending && 'animate-spin')} />
            Reclasificar
          </Button>
        </div>
      </motion.div>

      {/* Stats Row */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8"
      >
        {statsLoading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
        ) : (
          <>
            <StatCard
              label="Total Articulos"
              value={stats?.total_articles?.toLocaleString() ?? 0}
              icon={Newspaper}
              color="text-blue-400"
              bgColor="bg-blue-500/10"
            />
            <StatCard
              label="Adverse Media"
              value={stats?.adverse ?? 0}
              subValue={`${stats?.adverse_rate_pct ?? 0}% tasa`}
              icon={AlertTriangle}
              color="text-orange-400"
              bgColor="bg-orange-500/10"
            />
            <StatCard
              label="Fuentes Activas"
              value={stats?.active_sources ?? 0}
              icon={Globe}
              color="text-green-400"
              bgColor="bg-green-500/10"
            />
            <StatCard
              label="Entity Links"
              value={stats?.total_entity_links ?? 0}
              subValue={`${stats?.entities_with_articles ?? 0} entidades`}
              icon={Activity}
              color="text-purple-400"
              bgColor="bg-purple-500/10"
            />
            <StatCard
              label="Clasificacion AI"
              value={aiArticles}
              subValue={`${keywordArticles} por keywords`}
              icon={Brain}
              color="text-violet-400"
              bgColor="bg-violet-500/10"
            />
          </>
        )}
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 bg-white/5 border border-white/10">
          <TabsTrigger value="articles" className="data-[state=active]:bg-white/10">
            <Newspaper className="w-4 h-4 mr-2" />
            Articulos
          </TabsTrigger>
          <TabsTrigger value="sources" className="data-[state=active]:bg-white/10">
            <Database className="w-4 h-4 mr-2" />
            Fuentes
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-white/10">
            <TrendingUp className="w-4 h-4 mr-2" />
            Analisis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="articles">
          <ArticlesTab />
        </TabsContent>
        <TabsContent value="sources">
          <SourcesTab />
        </TabsContent>
        <TabsContent value="analytics">
          <AnalyticsTab stats={stats} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
