import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Brain,
  CheckCircle,
  Clock,
  ExternalLink,
  Globe,
  Newspaper,
  Shield,
  Tag,
  TrendingUp,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmptyState, PanelSkeleton } from '@/components/foundation';
import { Badge } from '@/components/ui/badge';
import { cn, formatDate } from '@/lib/utils';
import { complianceService } from '@/services/compliance';

const amCategoryColors: Record<string, string> = {
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

interface EntityAdverseMediaTabProps {
  entityId: string;
}

export function EntityAdverseMediaTab({ entityId }: EntityAdverseMediaTabProps) {
  const { t } = useTranslation();
  const amCategoryLabels: Record<string, string> = {
    terrorism: t('entity.adverseMedia.category.terrorism'),
    sanctions_evasion: t('entity.adverseMedia.category.sanctions_evasion'),
    wanted: t('entity.adverseMedia.category.wanted'),
    crime: t('entity.adverseMedia.category.crime'),
    human_rights: t('entity.adverseMedia.category.human_rights'),
    financial_crime: t('entity.adverseMedia.category.financial_crime'),
    corruption: t('entity.adverseMedia.category.corruption'),
    offshore: t('entity.adverseMedia.category.offshore'),
    regulatory: t('entity.adverseMedia.category.regulatory'),
  };
  const { data: profile, isLoading } = useQuery({
    queryKey: ['adverse-media-entity', entityId],
    queryFn: () => complianceService.getAdverseMediaProfile(entityId),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PanelSkeleton className="rounded-xl" lines={2} />
        <PanelSkeleton className="rounded-xl" lines={3} />
        <PanelSkeleton className="rounded-xl" lines={3} />
      </div>
    );
  }

  const articles = profile?.articles?.items || [];
  const riskProfile = profile?.risk_profile;
  const structured = profile?.structured_media;
  const hasContent = articles.length > 0 || structured?.has_adverse_media;

  if (!hasContent) {
    return (
      <EmptyState
        icon={CheckCircle}
        title={t('entity.adverseMedia.empty.title')}
        description={t('entity.adverseMedia.empty.description')}
        tone="success"
      />
    );
  }

  const sevColor = (score: number) =>
    score >= 90 ? 'text-red-600 dark:text-red-400' : score >= 70 ? 'text-orange-700 dark:text-orange-400' : score >= 50 ? 'text-yellow-700 dark:text-yellow-400' : 'text-blue-600 dark:text-blue-400';
  const sevBg = (score: number) =>
    score >= 90 ? 'bg-red-500' : score >= 70 ? 'bg-orange-500' : score >= 50 ? 'bg-yellow-500' : 'bg-blue-500';
  const sevLabel = (score: number) =>
    score >= 90 ? t('entity.adverseMedia.severity.critical') : score >= 70 ? t('entity.adverseMedia.severity.high') : score >= 50 ? t('entity.adverseMedia.severity.medium') : score >= 30 ? t('entity.adverseMedia.severity.low') : t('entity.adverseMedia.severity.minimal');

  const getMethodBadge = (method: string | undefined) => {
    if (method === 'moonshot_ai' || method === 'moonshot') {
      return (
        <Badge variant="outline" className="text-[10px] gap-1 bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30">
          <Brain className="w-3 h-3" />
          Moonshot AI
        </Badge>
      );
    }
    if (method === 'claude_ai') {
      return (
        <Badge variant="outline" className="text-[10px] gap-1 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30">
          <Brain className="w-3 h-3" />
          Claude AI
        </Badge>
      );
    }
    if (method === 'keyword') {
      return (
        <Badge variant="outline" className="text-[10px] gap-1 bg-gray-500/10 text-muted-foreground border-gray-500/30">
          <Tag className="w-3 h-3" />
          {t('entity.adverseMedia.method.keywords')}
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {riskProfile && riskProfile.total_articles > 0 && (
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-6">
            <div className="relative w-20 h-20 shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke={
                    riskProfile.article_risk_score >= 90
                      ? '#ef4444'
                      : riskProfile.article_risk_score >= 70
                        ? '#f97316'
                        : riskProfile.article_risk_score >= 50
                          ? '#eab308'
                          : '#3b82f6'
                  }
                  strokeWidth="3"
                  strokeDasharray={`${(riskProfile.article_risk_score / 100) * 88} 88`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn('text-lg font-bold', sevColor(riskProfile.article_risk_score))}>
                  {Math.round(riskProfile.article_risk_score)}
                </span>
                <span className="text-[8px] text-muted-foreground">{sevLabel(riskProfile.article_risk_score)}</span>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-3 gap-4">
              <div>
                <p className="text-lg font-bold text-foreground">{riskProfile.total_articles}</p>
                <p className="text-xs text-muted-foreground">{t('entity.adverseMedia.articles')}</p>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{riskProfile.recent_30d}</p>
                <p className="text-xs text-muted-foreground">{t('entity.adverseMedia.recent30d')}</p>
              </div>
              <div>
                <p className={cn('text-lg font-bold', sevColor(riskProfile.max_severity))}>
                  {riskProfile.max_severity}
                </p>
                <p className="text-xs text-muted-foreground">{t('entity.adverseMedia.maxSeverity')}</p>
              </div>
            </div>
            {riskProfile.top_categories.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {riskProfile.top_categories.map((category) => (
                  <Badge key={category} variant="outline" className={cn('text-[10px]', amCategoryColors[category] || 'bg-foreground/5')}>
                    {amCategoryLabels[category] || category}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {structured?.has_adverse_media && structured.categories.length > 0 && (
        <div className="glass rounded-xl p-5">
          <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            {t('entity.adverseMedia.structuredCategories')}
          </h4>
          <div className="space-y-2">
            {structured.categories.map((category, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-foreground/[0.02]">
                <span className="text-sm text-foreground">{amCategoryLabels[category.category] || category.category}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-foreground/5 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full', sevBg(category.severity))} style={{ width: `${category.severity}%` }} />
                  </div>
                  <span className={cn('text-xs font-mono', sevColor(category.severity))}>{category.severity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {articles.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Newspaper className="w-4 h-4" />
              {t('entity.adverseMedia.newsArticles', { count: articles.length })}
            </h4>
            <a href="/adverse-media" className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-300 flex items-center gap-1">
              {t('entity.adverseMedia.viewDashboard')} <ArrowRight className="w-3 h-3" />
            </a>
          </div>
          {articles.map((article, index) => {
            let sourceDomain: string | null = null;
            try {
              sourceDomain = new URL(article.source_url).hostname.replace('www.', '');
            } catch {
              sourceDomain = null;
            }

            return (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'glass rounded-xl p-4 mb-3 border-l-4',
                  (article.severity ?? 0) >= 90
                    ? 'border-red-500/70'
                    : (article.severity ?? 0) >= 70
                      ? 'border-orange-500/60'
                      : (article.severity ?? 0) >= 50
                        ? 'border-yellow-500/50'
                        : 'border-blue-500/40'
                )}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h5 className="text-sm font-medium text-foreground flex-1 line-clamp-2">{article.title}</h5>
                  {(article.severity ?? 0) > 0 && (
                    <div className="flex items-center gap-1 shrink-0">
                      <div className="w-12 h-1.5 bg-foreground/5 rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full', sevBg(article.severity))} style={{ width: `${article.severity}%` }} />
                      </div>
                      <span className={cn('text-xs font-mono font-bold', sevColor(article.severity))}>
                        {article.severity}
                      </span>
                    </div>
                  )}
                </div>

                {article.summary && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{article.summary}</p>}

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {article.categories?.map((category) => (
                    <Badge key={category} variant="outline" className={cn('text-[10px]', amCategoryColors[category] || 'bg-foreground/5')}>
                      {amCategoryLabels[category] || category}
                    </Badge>
                  ))}
                  {getMethodBadge(article.classification_method)}
                  <span className="text-muted-foreground flex items-center gap-1 ml-auto">
                    {sourceDomain && (
                      <>
                        <Globe className="w-3 h-3" />
                        <span className="text-muted-foreground">{sourceDomain}</span>
                        <span className="text-muted-foreground mx-1">·</span>
                      </>
                    )}
                    <Clock className="w-3 h-3" />
                    {article.publication_date ? formatDate(article.publication_date) : 'N/A'}
                  </span>
                  {article.link_confidence != null && (
                    <span className="text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {t('entity.adverseMedia.match', { pct: Math.round(article.link_confidence * 100) })}
                    </span>
                  )}
                  {article.is_verified && (
                    <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">
                      {t('entity.adverseMedia.verified')}
                    </Badge>
                  )}
                </div>

                {article.source_url && (
                  <a
                    href={article.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-300"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {t('entity.adverseMedia.readArticle')}
                  </a>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
