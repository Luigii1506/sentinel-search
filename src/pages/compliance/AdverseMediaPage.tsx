import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppPage, PageHeader, MetricCard, EmptyState, PanelSkeleton } from '@/components/foundation';
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
  Trash2,
  ClipboardCheck,
} from 'lucide-react';
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
  ReviewLink,
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
  terrorism: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
  sanctions_evasion: 'bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/30',
  wanted: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30',
  crime: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30',
  human_rights: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/30',
  financial_crime: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  corruption: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
  offshore: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
  regulatory: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
};

const CATEGORY_KEYS = [
  'terrorism',
  'sanctions_evasion',
  'wanted',
  'crime',
  'human_rights',
  'financial_crime',
  'corruption',
  'offshore',
  'regulatory',
] as const;

// i18n key per category: `compliance.adverseMedia.category.<key>`
function categoryLabel(t: TFunction, cat: string): string {
  return t(`compliance.adverseMedia.category.${cat}`, { defaultValue: cat });
}

// Method labels are localized via `compliance.adverseMedia.method.<key>`; brand
// names (Moonshot AI, Claude AI) are not translated.
const methodMeta: Record<string, { color: string; icon: typeof Zap }> = {
  moonshot_ai: { color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30', icon: Brain },
  claude_ai: { color: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30', icon: Brain },
  keyword: { color: 'bg-gray-500/10 text-muted-foreground border-gray-500/30', icon: Tag },
  unknown: { color: 'bg-gray-500/10 text-muted-foreground border-gray-500/30', icon: Cpu },
};

const sourceTypeColors: Record<string, string> = {
  rss: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30',
  api: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
  gdelt: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
};

function getSeverityColor(severity: number): string {
  if (severity >= 90) return 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/30';
  if (severity >= 70) return 'text-orange-700 dark:text-orange-400 bg-orange-500/10 border-orange-500/30';
  if (severity >= 50) return 'text-yellow-700 dark:text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
  if (severity >= 30) return 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30';
  return 'text-muted-foreground bg-gray-500/10 border-gray-500/30';
}

function getSeverityBarColor(severity: number): string {
  if (severity >= 90) return 'bg-red-500';
  if (severity >= 70) return 'bg-orange-500';
  if (severity >= 50) return 'bg-yellow-500';
  if (severity >= 30) return 'bg-blue-500';
  return 'bg-gray-500';
}

function formatDate(dateStr: string | null, t: TFunction): string {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return t('compliance.adverseMedia.time.lessThanHour');
  if (diffHours < 24) return t('compliance.adverseMedia.time.hoursAgo', { count: diffHours });
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return t('compliance.adverseMedia.time.daysAgo', { count: diffDays });
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getMethodBadge(method: string | null | undefined, t: TFunction) {
  const key = method || 'unknown';
  const meta = methodMeta[key] || methodMeta.unknown;
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={cn('text-[10px] gap-1', meta.color)}>
      <Icon className="w-3 h-3" />
      {t(`compliance.adverseMedia.method.${key}`, { defaultValue: key })}
    </Badge>
  );
}

// ── Articles Tab ──

function ArticlesTab() {
  const { t } = useTranslation();
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
          <PanelSkeleton key={i} className="rounded-xl" lines={3} />
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('compliance.adverseMedia.articles.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-foreground/5 border-foreground/10"
              />
            </div>
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[180px] bg-foreground/5 border-foreground/10">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder={t('compliance.adverseMedia.articles.categoryPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.states.all')}</SelectItem>
              {CATEGORY_KEYS.map((key) => (
                <SelectItem key={key} value={key}>{categoryLabel(t, key)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedDays} onValueChange={setSelectedDays}>
            <SelectTrigger className="w-full sm:w-[140px] bg-foreground/5 border-foreground/10">
              <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">{t('compliance.adverseMedia.articles.range.today')}</SelectItem>
              <SelectItem value="7">{t('compliance.adverseMedia.articles.range.days7')}</SelectItem>
              <SelectItem value="30">{t('compliance.adverseMedia.articles.range.days30')}</SelectItem>
              <SelectItem value="90">{t('compliance.adverseMedia.articles.range.days90')}</SelectItem>
              <SelectItem value="365">{t('compliance.adverseMedia.articles.range.year1')}</SelectItem>
            </SelectContent>
          </Select>
          <div className="w-full sm:w-[180px]">
            <p className="text-[10px] text-muted-foreground mb-1">
              {t('compliance.adverseMedia.articles.minSeverity')}: <span className="text-foreground font-mono">{minSeverity}</span>
            </p>
            <Slider
              value={[minSeverity]}
              onValueChange={(v) => setMinSeverity(v[0])}
              max={100}
              step={10}
              className="w-full"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="w-full sm:w-auto border-foreground/10">
            <RefreshCw className="w-4 h-4 mr-1" />
            {t('common.actions.refresh')}
          </Button>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {t('compliance.adverseMedia.articles.resultsCount', { count: data?.total ?? 0 })}
      </p>

      {/* Article list */}
      {articles.length === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title={t('common.states.noResults')}
          description={t('compliance.adverseMedia.articles.empty')}
          tone="success"
        />
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
  const { t } = useTranslation();
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
      className="glass rounded-xl p-5 hover:bg-foreground/[0.04] transition-colors cursor-pointer group"
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
                className={cn('text-xs', categoryColors[cat] || 'bg-gray-500/10 text-muted-foreground')}
              >
                {categoryLabel(t, cat)}
              </Badge>
            ))}
            {getMethodBadge(article.classification_method, t)}
          </div>

          <h4 className="text-sm font-medium text-foreground mb-1 line-clamp-2 group-hover:text-blue-300 transition-colors">
            {article.title}
          </h4>

          {article.summary && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{article.summary}</p>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {sourceDomain && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Globe className="w-3 h-3" />
                {sourceDomain}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(article.publication_date, t)}
            </span>
            {article.language && (
              <span className="uppercase text-muted-foreground">{article.language}</span>
            )}
            {article.classification_confidence != null && article.classification_confidence > 0 && (
              <span className="text-muted-foreground">
                {t('compliance.adverseMedia.articles.confShort', { count: Math.round(article.classification_confidence * 100) })}
              </span>
            )}
          </div>
        </div>

        {/* Severity bar */}
        {article.severity > 0 && (
          <div className="w-full sm:w-20 flex sm:flex-col items-start sm:items-center gap-2 sm:gap-1 shrink-0">
            <span className={cn('text-xs font-mono font-bold',
              article.severity >= 90 ? 'text-red-600 dark:text-red-400' :
              article.severity >= 70 ? 'text-orange-700 dark:text-orange-400' :
              article.severity >= 50 ? 'text-yellow-700 dark:text-yellow-400' : 'text-blue-600 dark:text-blue-400'
            )}>
              {article.severity}
            </span>
            <div className="w-full h-1.5 bg-foreground/5 rounded-full overflow-hidden">
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
          className="self-start text-blue-600 dark:text-blue-400 hover:text-blue-300 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"
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
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['adverse-media-sources'],
    queryFn: () => complianceService.getAdverseMediaSources(),
  });

  const crawlMutation = useMutation({
    mutationFn: (sourceKey: string) => complianceService.triggerCrawl(sourceKey),
    onSuccess: (_, sourceKey) => {
      toast.success(t('compliance.adverseMedia.sources.toast.crawlStarted', { name: sourceKey }));
      queryClient.invalidateQueries({ queryKey: ['adverse-media-sources'] });
    },
    onError: () => toast.error(t('compliance.adverseMedia.sources.toast.crawlError')),
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg bg-foreground/10" />
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
          <p className="text-xl font-bold text-green-700 dark:text-green-400">{activeSources.length}</p>
          <p className="text-xs text-muted-foreground">{t('compliance.adverseMedia.sources.active')}</p>
        </div>
        <div className="glass rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-red-600 dark:text-red-400">{inactiveSources.length}</p>
          <p className="text-xs text-muted-foreground">{t('compliance.adverseMedia.sources.inactive')}</p>
        </div>
        <div className="glass rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-foreground">{totalArticles.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{t('compliance.adverseMedia.sources.totalArticles')}</p>
        </div>
        <div className="glass rounded-lg p-3 text-center">
          <p className={cn('text-xl font-bold', totalErrors > 0 ? 'text-orange-700 dark:text-orange-400' : 'text-muted-foreground')}>{totalErrors}</p>
          <p className="text-xs text-muted-foreground">{t('compliance.adverseMedia.sources.accumulatedErrors')}</p>
        </div>
      </div>

      {/* Filter by type */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <span className="text-xs text-muted-foreground">{t('common.actions.filter')}:</span>
        {['all', 'rss', 'api', 'gdelt'].map((type) => (
          <Button
            key={type}
            variant="outline"
            size="sm"
            className={cn(
              'text-xs border-foreground/10',
              filterType === type && 'bg-foreground/10 text-foreground'
            )}
            onClick={() => setFilterType(type)}
          >
            {type === 'all' ? t('common.states.all') : type.toUpperCase()}
          </Button>
        ))}
      </div>

      {/* Active sources */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          {t('compliance.adverseMedia.sources.activeSources', { count: filteredActive.length })}
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
                      <span className="text-foreground font-medium break-words">{source.display_name}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 break-all">{source.source_key}</p>
                  </div>
                  <Badge variant="outline" className={cn('text-[10px]', sourceTypeColors[source.source_type] || '')}>
                    {source.source_type.toUpperCase()}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{t('compliance.adverseMedia.sources.columns.articles')}</p>
                    <p className="text-foreground font-mono">{source.total_articles}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{t('compliance.adverseMedia.sources.columns.quality')}</p>
                    <p className="text-muted-foreground">{source.quality_score}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{t('compliance.adverseMedia.sources.columns.errors')}</p>
                    <p className={cn(source.error_count > 5 ? 'text-red-600 dark:text-red-400' : source.error_count > 0 ? 'text-orange-700 dark:text-orange-400' : 'text-muted-foreground')}>
                      {source.error_count}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{t('compliance.adverseMedia.sources.columns.lastCrawl')}</p>
                    <p className="text-muted-foreground">{formatDate(source.last_crawled_at, t)}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => crawlMutation.mutate(source.source_key)}
                  disabled={crawlMutation.isPending}
                  className="w-full border-foreground/10 text-muted-foreground"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5 mr-2', crawlMutation.isPending && 'animate-spin')} />
                  {t('compliance.adverseMedia.sources.runCrawl')}
                </Button>
              </div>
            ))}
        </div>
        <div className="hidden md:block glass rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-foreground/5">
                <th className="text-left p-3 text-muted-foreground font-medium">{t('compliance.adverseMedia.sources.columns.source')}</th>
                <th className="text-left p-3 text-muted-foreground font-medium">{t('compliance.adverseMedia.sources.columns.type')}</th>
                <th className="text-right p-3 text-muted-foreground font-medium">{t('compliance.adverseMedia.sources.columns.articles')}</th>
                <th className="text-right p-3 text-muted-foreground font-medium">{t('compliance.adverseMedia.sources.columns.quality')}</th>
                <th className="text-right p-3 text-muted-foreground font-medium">{t('compliance.adverseMedia.sources.columns.errors')}</th>
                <th className="text-right p-3 text-muted-foreground font-medium">{t('compliance.adverseMedia.sources.columns.lastCrawl')}</th>
                <th className="text-right p-3 text-muted-foreground font-medium"></th>
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
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            {t('compliance.adverseMedia.sources.inactiveSources', { count: inactiveSources.length })}
          </h3>
          <div className="space-y-3 md:hidden opacity-60">
            {inactiveSources.map((source) => (
              <div key={source.id} className="glass rounded-xl p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-muted-foreground break-words">{source.display_name}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 break-all">{source.source_key}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-gray-500/10 text-muted-foreground">
                    {source.source_type}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{t('compliance.adverseMedia.sources.columns.articles')}</p>
                    <p className="text-muted-foreground">{source.total_articles}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{t('compliance.adverseMedia.sources.columns.errors')}</p>
                    <p className="text-red-600 dark:text-red-400/60">{source.error_count}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden md:block glass rounded-xl overflow-hidden opacity-60">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-foreground/5">
                  <th className="text-left p-3 text-muted-foreground font-medium">{t('compliance.adverseMedia.sources.columns.source')}</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">{t('compliance.adverseMedia.sources.columns.type')}</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">{t('compliance.adverseMedia.sources.columns.articles')}</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">{t('compliance.adverseMedia.sources.columns.errors')}</th>
                </tr>
              </thead>
              <tbody>
                {inactiveSources.map((source) => (
                  <tr key={source.id} className="border-b border-foreground/5 last:border-0">
                    <td className="p-3 text-muted-foreground">{source.display_name}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px] bg-gray-500/10 text-muted-foreground">
                        {source.source_type}
                      </Badge>
                    </td>
                    <td className="p-3 text-right text-muted-foreground">{source.total_articles}</td>
                    <td className="p-3 text-right text-red-600 dark:text-red-400/60">{source.error_count}</td>
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
  const { t } = useTranslation();
  return (
    <tr className="border-b border-foreground/5 last:border-0 hover:bg-foreground/[0.02]">
      <td className="p-3">
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full', source.error_count > 5 ? 'bg-red-500' : 'bg-green-500')} />
          <span className="text-foreground font-medium">{source.display_name}</span>
          <span className="text-[10px] text-muted-foreground">{source.source_key}</span>
        </div>
      </td>
      <td className="p-3">
        <Badge variant="outline" className={cn('text-[10px]', sourceTypeColors[source.source_type] || '')}>
          {source.source_type.toUpperCase()}
        </Badge>
      </td>
      <td className="p-3 text-right text-foreground font-mono">{source.total_articles}</td>
      <td className="p-3 text-right">
        <span className="text-muted-foreground">{source.quality_score}</span>
      </td>
      <td className="p-3 text-right">
        {source.error_count > 0 ? (
          <span className={cn(source.error_count > 5 ? 'text-red-600 dark:text-red-400' : 'text-orange-700 dark:text-orange-400')}>
            {source.error_count}
          </span>
        ) : (
          <span className="text-muted-foreground">0</span>
        )}
      </td>
      <td className="p-3 text-right text-muted-foreground text-xs">
        {formatDate(source.last_crawled_at, t)}
      </td>
      <td className="p-3 text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCrawl}
          disabled={isCrawling}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={cn('w-3 h-3', isCrawling && 'animate-spin')} />
        </Button>
      </td>
    </tr>
  );
}

// ── Analytics Tab ──

function AnalyticsTab({ stats }: { stats: AdverseMediaStats | undefined }) {
  const { t } = useTranslation();
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
  const maxDailyCount = Math.max(...chartData.map((item) => item.count), 1);
  const recentTrend = chartData.slice(-7);

  return (
    <div className="space-y-6">
      {chartData.length > 0 && (
        <div className="glass rounded-xl p-5">
          <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-orange-700 dark:text-orange-400" />
            {t('compliance.adverseMedia.analytics.recentActivity')}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {recentTrend.map((item) => (
              <div key={item.date} className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">{item.date}</span>
                  <span className="text-sm font-mono text-foreground">{item.count}</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-foreground/5 overflow-hidden">
                  <div className="h-full rounded-full bg-orange-400" style={{ width: `${Math.max((item.count / maxDailyCount) * 100, item.count > 0 ? 8 : 0)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-base font-medium text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            {t('compliance.adverseMedia.analytics.categoryDistribution')}
          </h3>
          <div className="space-y-3">
            {categories.map(([category, count]) => (
              <div key={category} className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-32 shrink-0 truncate">
                  {categoryLabel(t, category)}
                </span>
                <div className="flex-1 h-5 bg-foreground/5 rounded-full overflow-hidden">
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
                <span className="text-sm font-mono text-foreground w-8 text-right">{count}</span>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">{t('compliance.adverseMedia.analytics.noCategoryData')}</p>
            )}
          </div>
        </div>

        {/* Classification Method Distribution */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-base font-medium text-foreground mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            {t('compliance.adverseMedia.analytics.classificationMethod')}
          </h3>
          <div className="space-y-3">
            {methods.map(([method, count]) => {
              const meta = methodMeta[method] || methodMeta.unknown;
              const Icon = meta.icon;
              const pct = totalClassified > 0 ? Math.round((count / totalClassified) * 100) : 0;
              return (
                <div key={method} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-32 shrink-0">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground truncate">{t(`compliance.adverseMedia.method.${method}`, { defaultValue: method })}</span>
                  </div>
                  <div className="flex-1 h-5 bg-foreground/5 rounded-full overflow-hidden">
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
                    <span className="text-sm font-mono text-foreground">{count}</span>
                    <span className="text-xs text-muted-foreground ml-1">({pct}%)</span>
                  </div>
                </div>
              );
            })}
            {methods.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">{t('compliance.adverseMedia.analytics.noMethodData')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass rounded-xl p-5">
          <p className="text-sm text-muted-foreground mb-1">{t('compliance.adverseMedia.analytics.adverseRate')}</p>
          <p className="text-3xl font-bold text-foreground">{stats.adverse_rate_pct}%</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t('compliance.adverseMedia.analytics.adverseOfTotal', { adverse: stats.adverse, total: stats.total_articles })}
          </p>
        </div>
        <div className="glass rounded-xl p-5">
          <p className="text-sm text-muted-foreground mb-1">{t('compliance.adverseMedia.metrics.entityLinks')}</p>
          <p className="text-3xl font-bold text-foreground">{stats.total_entity_links}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t('compliance.adverseMedia.analytics.linkedEntities', { count: stats.entities_with_articles })}
          </p>
        </div>
        <div className="glass rounded-xl p-5">
          <p className="text-sm text-muted-foreground mb-1">{t('compliance.adverseMedia.analytics.unclassified')}</p>
          <p className="text-3xl font-bold text-foreground">{stats.unclassified}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t('compliance.adverseMedia.analytics.classifiedCount', { count: stats.classified })}
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
  const { t } = useTranslation();
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
      toast.success(t('compliance.adverseMedia.detail.toast.caseCreated', { name: data.case_number }));
      queryClient.invalidateQueries({ queryKey: ['compliance'] });
    },
    onError: () => toast.error(t('compliance.adverseMedia.detail.toast.caseError')),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-card border-foreground/10 text-foreground">
        {isLoading ? (
          <div className="space-y-4 p-4">
            <PanelSkeleton lines={3} className="rounded-xl" />
            <PanelSkeleton lines={2} className="rounded-xl" />
          </div>
        ) : article ? (
          <>
            <DialogHeader>
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <DialogTitle className="text-lg text-foreground leading-snug">
                    {article.title}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    {t('compliance.adverseMedia.detail.srDescription')}
                  </DialogDescription>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {article.severity > 0 && (
                      <Badge variant="outline" className={cn('text-xs', getSeverityColor(article.severity))}>
                        {t('compliance.adverseMedia.detail.severity')}: {article.severity}
                      </Badge>
                    )}
                    {article.categories?.map((cat) => (
                      <Badge
                        key={cat}
                        variant="outline"
                        className={cn('text-xs', categoryColors[cat] || 'bg-gray-500/10 text-muted-foreground')}
                      >
                        {categoryLabel(t, cat)}
                      </Badge>
                    ))}
                    {getMethodBadge(article.classification_method, t)}
                  </div>
                </div>
              </div>
            </DialogHeader>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground border-b border-foreground/5 pb-3">
              {article.source_display_name && (
                <span className="flex items-center gap-1">
                  <Newspaper className="w-3 h-3" />
                  {article.source_display_name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(article.publication_date, t)}
              </span>
              {article.language && (
                <span className="uppercase">{article.language}</span>
              )}
              {article.classification_confidence != null && (
                <span className="text-muted-foreground">
                  {t('compliance.adverseMedia.detail.confidence')}: {Math.round(article.classification_confidence * 100)}%
                </span>
              )}
              <a
                href={article.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-300 flex items-center gap-1 ml-auto"
              >
                <ExternalLink className="w-3 h-3" />
                {t('compliance.adverseMedia.detail.viewSource')}
              </a>
            </div>

            {/* Content snippet */}
            {article.content_snippet && (
              <div className="bg-foreground/5 rounded-lg p-4 text-sm text-muted-foreground leading-relaxed">
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {t('compliance.adverseMedia.detail.excerpt')}
                </p>
                {article.content_snippet}
              </div>
            )}

            {/* Summary */}
            {article.summary && article.summary !== article.content_snippet && (
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-muted-foreground mb-1">{t('compliance.adverseMedia.detail.summary')}</p>
                {article.summary}
              </div>
            )}

            {/* Extracted Entities */}
            {article.extracted_entities && article.extracted_entities.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {t('compliance.adverseMedia.detail.extractedEntities', { count: article.extracted_entities.length })}
                </p>
                <div className="flex flex-wrap gap-2">
                  {article.extracted_entities.map((entity, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className={cn(
                        'text-xs',
                        entity.type === 'person'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                          : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
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
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Link2 className="w-3 h-3" />
                  {t('compliance.adverseMedia.detail.linkedEntities', { count: article.entity_links.length })}
                </p>
                <div className="space-y-2">
                  {article.entity_links.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between bg-foreground/5 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-2 h-2 rounded-full',
                          link.verified ? 'bg-green-500' : 'bg-yellow-500'
                        )} />
                        <div>
                          <p className="text-sm text-foreground font-medium">{link.mentioned_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('compliance.adverseMedia.detail.confidence')}: {Math.round(link.match_confidence * 100)}%
                            {link.match_method && ` · ${link.match_method}`}
                            {link.is_primary_subject && ` · ${t('compliance.adverseMedia.detail.primarySubject')}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`/entity/${link.unified_entity_id}`}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          {t('compliance.adverseMedia.detail.viewProfile')}
                        </a>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs border-orange-500/30 text-orange-700 dark:text-orange-400 hover:bg-orange-500/10"
                          onClick={() => createCaseMutation.mutate({
                            entity_id: link.unified_entity_id,
                            entity_name: link.mentioned_name,
                          })}
                          disabled={createCaseMutation.isPending}
                        >
                          <ShieldAlert className="w-3 h-3 mr-1" />
                          {t('compliance.adverseMedia.detail.createCase')}
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
                <p className="text-xs text-yellow-700 dark:text-yellow-400 mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {t('compliance.adverseMedia.detail.unlinkedTitle')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('compliance.adverseMedia.detail.unlinkedDescription')}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            {t('compliance.adverseMedia.detail.notFound')}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Review Queue Tab (Linking 2.0) ──

const REVIEW_PAGE_SIZE = 25;

function confidenceColor(confidence: number): string {
  return confidence >= 0.7
    ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30'
    : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30';
}

function getRiskColor(risk: number): string {
  if (risk >= 90) return 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/30';
  if (risk >= 70) return 'text-orange-700 dark:text-orange-400 bg-orange-500/10 border-orange-500/30';
  if (risk >= 40) return 'text-yellow-700 dark:text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
  return 'text-muted-foreground bg-gray-500/10 border-gray-500/30';
}

function ReviewQueueTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(0);

  const queryKey = ['adverse-media-review-links', offset];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => complianceService.listReviewLinks({ limit: REVIEW_PAGE_SIZE, offset }),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['adverse-media-review-links'] });

  const verifyMutation = useMutation({
    mutationFn: (linkId: string) => complianceService.verifyLink(linkId),
    onSuccess: () => {
      toast.success(t('compliance.adverseMedia.review.toast.confirmed'));
      invalidate();
    },
    onError: () => toast.error(t('compliance.adverseMedia.review.toast.confirmError')),
  });

  const rejectMutation = useMutation({
    mutationFn: (linkId: string) => complianceService.rejectLink(linkId),
    onSuccess: () => {
      toast.success(t('compliance.adverseMedia.review.toast.rejected'));
      invalidate();
    },
    onError: () => toast.error(t('compliance.adverseMedia.review.toast.rejectError')),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <PanelSkeleton key={i} className="rounded-xl" lines={4} />
        ))}
      </div>
    );
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pendingLinkId = verifyMutation.isPending
    ? verifyMutation.variables
    : rejectMutation.isPending
      ? rejectMutation.variables
      : null;

  return (
    <div className="space-y-4">
      {/* Header / purpose */}
      <div className="glass rounded-xl p-4 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 shrink-0">
          <ShieldAlert className="w-4 h-4 text-amber-700 dark:text-amber-400" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-foreground">{t('compliance.adverseMedia.review.title')}</h3>
          <p className="text-xs text-muted-foreground">{t('compliance.adverseMedia.review.subtitle')}</p>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {t('compliance.adverseMedia.review.resultsCount', { count: total })}
      </p>

      {items.length === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title={t('compliance.adverseMedia.review.empty')}
          description={t('compliance.adverseMedia.review.emptyDescription')}
          tone="success"
        />
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-3">
          {items.map((link) => (
            <ReviewLinkCard
              key={link.link_id}
              link={link}
              onConfirm={() => verifyMutation.mutate(link.link_id)}
              onReject={() => rejectMutation.mutate(link.link_id)}
              isPending={pendingLinkId === link.link_id}
            />
          ))}
        </motion.div>
      )}

      {/* Pagination */}
      {total > REVIEW_PAGE_SIZE && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            {t('compliance.adverseMedia.review.pagination.showing', {
              from: total === 0 ? 0 : offset + 1,
              to: Math.min(offset + REVIEW_PAGE_SIZE, total),
              total,
            })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-foreground/10"
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - REVIEW_PAGE_SIZE))}
            >
              {t('compliance.adverseMedia.review.pagination.previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-foreground/10"
              disabled={offset + REVIEW_PAGE_SIZE >= total}
              onClick={() => setOffset((o) => o + REVIEW_PAGE_SIZE)}
            >
              {t('compliance.adverseMedia.review.pagination.next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewLinkCard({
  link,
  onConfirm,
  onReject,
  isPending,
}: {
  link: ReviewLink;
  onConfirm: () => void;
  onReject: () => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const { article } = link;
  const confidencePct = Math.round(link.match_confidence * 100);

  return (
    <motion.div variants={itemVariants} className="glass rounded-xl p-5">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT: article context */}
        <div className="lg:col-span-5 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {article.severity_score > 0 && (
              <Badge variant="outline" className={cn('text-xs', getSeverityColor(article.severity_score))}>
                {article.severity_score}
              </Badge>
            )}
            {article.primary_category && (
              <Badge
                variant="outline"
                className={cn('text-xs', categoryColors[article.primary_category] || 'bg-gray-500/10 text-muted-foreground')}
              >
                {categoryLabel(t, article.primary_category)}
              </Badge>
            )}
          </div>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-foreground hover:text-blue-300 transition-colors flex items-start gap-1 group"
          >
            <span className="line-clamp-2">{article.title}</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-50 group-hover:opacity-100" />
          </a>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(article.publication_date, t)}
            </span>
          </div>
          {article.summary && (
            <div className="mt-2">
              <p className={cn('text-xs text-muted-foreground', !expanded && 'line-clamp-2')}>
                {article.summary}
              </p>
              {article.summary.length > 140 && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline mt-1"
                >
                  {expanded
                    ? t('compliance.adverseMedia.review.showLess')
                    : t('compliance.adverseMedia.review.showMore')}
                </button>
              )}
            </div>
          )}
          {/* Severity bar */}
          {article.severity_score > 0 && (
            <div className="mt-3 h-1.5 bg-foreground/5 rounded-full overflow-hidden max-w-[200px]">
              <div
                className={cn('h-full rounded-full transition-all', getSeverityBarColor(article.severity_score))}
                style={{ width: `${article.severity_score}%` }}
              />
            </div>
          )}
        </div>

        {/* MIDDLE: the match */}
        <div className="lg:col-span-4 min-w-0 flex flex-col justify-center gap-2 lg:border-x lg:border-foreground/5 lg:px-4">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
              {t('compliance.adverseMedia.review.mentionedAs')}
            </p>
            <p className="text-sm text-foreground font-medium break-words">{link.mentioned_name}</p>
          </div>
          <div className="flex items-center text-muted-foreground">
            <Link2 className="w-4 h-4" />
            <span className="mx-1">→</span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
              {t('compliance.adverseMedia.review.matchedTo')}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={`/entity/${link.entity_id}`}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 break-words"
              >
                {link.entity_type === 'organization' || link.entity_type === 'company' ? (
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <User className="w-3.5 h-3.5 shrink-0" />
                )}
                {link.entity_name}
              </a>
              {link.entity_risk > 0 && (
                <Badge variant="outline" className={cn('text-[10px]', getRiskColor(link.entity_risk))}>
                  {t('compliance.adverseMedia.review.risk')}: {link.entity_risk}
                </Badge>
              )}
            </div>
            {link.entity_type && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{link.entity_type}</p>
            )}
          </div>
        </div>

        {/* RIGHT: confidence + actions */}
        <div className="lg:col-span-3 flex flex-col gap-3 lg:items-end justify-center">
          <div className="flex flex-col lg:items-end gap-1">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {t('compliance.adverseMedia.review.confidence')}
            </span>
            <Badge variant="outline" className={cn('text-sm font-mono', confidenceColor(link.match_confidence))}>
              {confidencePct}%
            </Badge>
          </div>
          <div className="flex gap-2 w-full lg:w-auto">
            <Button
              size="sm"
              className="flex-1 lg:flex-none bg-green-600 hover:bg-green-700 text-white"
              onClick={onConfirm}
              disabled={isPending}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              {t('compliance.adverseMedia.review.confirm')}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1 lg:flex-none"
              onClick={onReject}
              disabled={isPending}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              {t('compliance.adverseMedia.review.reject')}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Page ──

export function AdverseMediaPage() {
  const { t } = useTranslation();
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
      toast.success(t('compliance.adverseMedia.toast.reclassified', { reclassified: data.reclassified, adverse: data.adverse }));
      queryClient.invalidateQueries({ queryKey: ['adverse-media'] });
    },
    onError: () => toast.error(t('compliance.adverseMedia.toast.reclassifyError')),
  });

  // Compute AI vs keyword ratio for stat card
  const aiArticles = (stats?.by_method?.moonshot_ai || 0) + (stats?.by_method?.claude_ai || 0);
  return (
    <AppPage>
        <PageHeader
          title={t('compliance.adverseMedia.title')}
          description={t('compliance.adverseMedia.description')}
          icon={
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/30">
              <Newspaper className="w-6 h-6 text-orange-700 dark:text-orange-400" aria-hidden="true" />
            </div>
          }
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => reclassifyMutation.mutate()}
              disabled={reclassifyMutation.isPending}
              className="gap-2"
              aria-label={t('compliance.adverseMedia.reclassifyAria')}
            >
              <RefreshCw className={cn('w-4 h-4', reclassifyMutation.isPending && 'animate-spin')} />
              {t('compliance.adverseMedia.reclassify')}
            </Button>
          }
        />

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
            <MetricCard
              label={t('compliance.adverseMedia.metrics.totalArticles')}
              value={stats?.total_articles?.toLocaleString() ?? 0}
              icon={Newspaper}
              className="glass rounded-xl"
            />
            <MetricCard
              label={t('compliance.adverseMedia.metrics.adverseMedia')}
              value={stats?.adverse ?? 0}
              icon={AlertTriangle}
              accent="amber"
              className="glass rounded-xl"
            />
            <MetricCard
              label={t('compliance.adverseMedia.metrics.activeSources')}
              value={stats?.active_sources ?? 0}
              icon={Globe}
              accent="success"
              className="glass rounded-xl"
            />
            <MetricCard
              label={t('compliance.adverseMedia.metrics.entityLinks')}
              value={stats?.total_entity_links ?? 0}
              icon={Activity}
              className="glass rounded-xl"
            />
            <MetricCard
              label={t('compliance.adverseMedia.metrics.aiClassification')}
              value={aiArticles}
              icon={Brain}
              className="glass rounded-xl"
            />
          </>
        )}
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 bg-foreground/5 border border-foreground/10">
          <TabsTrigger value="articles" className="data-[state=active]:bg-foreground/10">
            <Newspaper className="w-4 h-4 mr-2" />
            {t('compliance.adverseMedia.tabs.articles')}
          </TabsTrigger>
          <TabsTrigger value="sources" className="data-[state=active]:bg-foreground/10">
            <Database className="w-4 h-4 mr-2" />
            {t('compliance.adverseMedia.tabs.sources')}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-foreground/10">
            <TrendingUp className="w-4 h-4 mr-2" />
            {t('compliance.adverseMedia.tabs.analytics')}
          </TabsTrigger>
          <TabsTrigger value="review" className="data-[state=active]:bg-foreground/10">
            <ClipboardCheck className="w-4 h-4 mr-2" />
            {t('compliance.adverseMedia.tabs.review')}
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
        <TabsContent value="review">
          <ReviewQueueTab />
        </TabsContent>
      </Tabs>
    </AppPage>
  );
}
