import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Database,
  ExternalLink,
  FileSearch,
  FileText,
  Globe,
  Loader2,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { yenteService, type FederatedMatch, type FederatedSearchResponse } from '@/services';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  AppPage,
  EmptyState,
  MetricCard,
  PageHeader,
  Section,
  SectionCard,
} from '@/components/foundation';
import { cn } from '@/lib/utils';

type SearchOrigin = 'local' | 'leaks' | 'external';

type MatchWithOrigin = FederatedMatch & {
  origin: SearchOrigin;
};

const ORIGIN_META: Record<
  SearchOrigin,
  {
    icon: typeof Database;
    badgeClassName: string;
  }
> = {
  local: {
    icon: Database,
    badgeClassName: 'border-blue-500/30 bg-blue-500/10 text-blue-200',
  },
  leaks: {
    icon: FileText,
    badgeClassName: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
  },
  external: {
    icon: Globe,
    badgeClassName: 'border-violet-500/30 bg-violet-500/10 text-violet-200',
  },
};

const THRESHOLD_PRESETS = [
  { value: 0.4, key: 'broad' },
  { value: 0.5, key: 'balanced' },
  { value: 0.7, key: 'strict' },
] as const;

function flattenResults(data: FederatedSearchResponse | null): MatchWithOrigin[] {
  if (!data) return [];

  return (Object.entries(data.results_by_origin) as [SearchOrigin, FederatedMatch[]][]).flatMap(
    ([origin, matches]) => matches.map((match) => ({ ...match, origin })),
  );
}

function scoreTone(score: number): 'red' | 'amber' | 'success' | undefined {
  if (score >= 0.85) return 'red';
  if (score >= 0.7) return 'amber';
  if (score >= 0.55) return 'success';
  return undefined;
}

function formatScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}

function formatDatasets(datasets: string[], t: TFunction): string {
  if (datasets.length === 0) return t('workspace.federated.noDataset');
  if (datasets.length === 1) return datasets[0];
  return `${datasets[0]} +${datasets.length - 1}`;
}

function buildExecutiveSummary(matches: MatchWithOrigin[], t: TFunction): string {
  if (matches.length === 0) {
    return t('workspace.federated.summary.none');
  }

  const hasSanctions = matches.some((match) => match.is_sanctioned);
  const hasPep = matches.some((match) => match.is_pep);
  const hasLeaks = matches.some((match) => match.origin === 'leaks');

  if (hasSanctions) {
    return t('workspace.federated.summary.sanctions');
  }

  if (hasPep && hasLeaks) {
    return t('workspace.federated.summary.pepAndLeaks');
  }

  if (hasPep) {
    return t('workspace.federated.summary.pep');
  }

  if (hasLeaks) {
    return t('workspace.federated.summary.leaks');
  }

  return t('workspace.federated.summary.generic');
}

function buildCoverageLabel(data: FederatedSearchResponse, t: TFunction): string {
  const activeOrigins = (Object.entries(data.totals) as [SearchOrigin, number][]).filter(([, total]) => total > 0);

  if (activeOrigins.length === 0) return t('workspace.federated.coverage.none');
  if (activeOrigins.length === 3) return t('workspace.federated.coverage.full');

  return t('workspace.federated.coverage.partial', { count: activeOrigins.length });
}

function normalizeThreshold(value: string | null): number {
  const parsed = value ? Number.parseFloat(value) : Number.NaN;
  if (!Number.isFinite(parsed)) return 0.5;
  return Math.min(1, Math.max(0.3, parsed));
}

export function FederatedSearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialQuery = searchParams.get('q') ?? '';
  const initialThreshold = normalizeThreshold(searchParams.get('threshold'));

  const [query, setQuery] = useState(initialQuery);
  const [threshold, setThreshold] = useState(initialThreshold);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery.trim());
  const [submittedThreshold, setSubmittedThreshold] = useState(initialThreshold);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['federated-search', submittedQuery, submittedThreshold],
    queryFn: () =>
      yenteService.federatedSearch({
        q: submittedQuery,
        threshold: submittedThreshold,
        limit: 30,
      }),
    enabled: submittedQuery.length >= 2,
    staleTime: 2 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const allMatches = useMemo(() => flattenResults(data ?? null), [data]);
  const sortedMatches = useMemo(
    () => [...allMatches].sort((left, right) => right.score - left.score),
    [allMatches],
  );
  const bestMatch = sortedMatches[0] ?? null;
  const sanctionedCount = allMatches.filter((match) => match.is_sanctioned).length;
  const pepCount = allMatches.filter((match) => match.is_pep).length;
  const activeOrigins = data
    ? (Object.entries(data.totals) as [SearchOrigin, number][]).filter(([, total]) => total > 0).length
    : 0;
  const hasResults = Boolean(data);
  const hasMatches = allMatches.length > 0;
  const errorMessage = error instanceof Error ? error.message : t('workspace.federated.error');

  const syncSearchParams = (nextQuery: string, nextThreshold: number) => {
    const params = new URLSearchParams(searchParams);
    if (nextQuery) params.set('q', nextQuery);
    else params.delete('q');
    params.set('threshold', nextThreshold.toFixed(2));
    setSearchParams(params, { replace: true });
  };

  const runSearch = () => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) return;

    setSubmittedQuery(trimmedQuery);
    setSubmittedThreshold(threshold);
    syncSearchParams(trimmedQuery, threshold);

    if (trimmedQuery === submittedQuery && Math.abs(threshold - submittedThreshold) < 0.001) {
      void refetch();
    }
  };

  return (
    <AppPage>
      <PageHeader
        title={t('workspace.federated.title')}
        description={t('workspace.federated.description')}
        icon={
          <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/15 via-blue-500/10 to-transparent p-3">
            <FileSearch className="h-6 w-6 text-cyan-700 dark:text-cyan-300" />
          </div>
        }
      />

      <Section unstyled>
        <Card className="border-foreground/10 bg-foreground/5">
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="flex-1">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && runSearch()}
                  placeholder={t('workspace.federated.searchPlaceholder')}
                  className="border-foreground/10 bg-background/60 text-foreground"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAdvanced((current) => !current)}
                  className="border-foreground/10 bg-transparent"
                >
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  {t('workspace.federated.settings')}
                </Button>
                <Button type="button" onClick={runSearch} disabled={isFetching || query.trim().length < 2}>
                  {isFetching ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  {t('workspace.federated.search')}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {THRESHOLD_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setThreshold(preset.value)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-left transition',
                    Math.abs(threshold - preset.value) < 0.001
                      ? 'border-cyan-500/40 bg-cyan-500/10 text-white'
                      : 'border-foreground/10 bg-background/40 text-muted-foreground hover:border-foreground/20 hover:text-foreground',
                  )}
                >
                  <div className="text-sm font-medium">{t(`workspace.federated.thresholdPresets.${preset.key}.label`)}</div>
                  <div className="text-xs text-muted-foreground">{t(`workspace.federated.thresholdPresets.${preset.key}.hint`)}</div>
                </button>
              ))}
            </div>

            {showAdvanced && (
              <div className="grid gap-4 rounded-xl border border-foreground/10 bg-background/40 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                    <span>{t('workspace.federated.matchSensitivity')}</span>
                    <span className="font-mono text-foreground">{threshold.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.3"
                    max="1"
                    step="0.05"
                    value={threshold}
                    onChange={(event) => setThreshold(Number.parseFloat(event.target.value))}
                    className="w-full"
                  />
                </div>
                <div className="rounded-lg border border-foreground/10 bg-foreground/5 px-3 py-2 text-xs text-muted-foreground">
                  {t('workspace.federated.currentThreshold')} <span className="font-medium text-foreground">{threshold >= 0.7 ? t('workspace.federated.thresholdLevel.strict') : threshold <= 0.45 ? t('workspace.federated.thresholdLevel.broad') : t('workspace.federated.thresholdLevel.balanced')}</span>
                </div>
              </div>
            )}

            <div className="grid gap-3 text-sm text-muted-foreground lg:grid-cols-3">
              <div className="rounded-xl border border-foreground/10 bg-background/30 p-3">
                <div className="mb-1 font-medium text-foreground">{t('workspace.federated.info.whenTitle')}</div>
                <p>{t('workspace.federated.info.whenBody')}</p>
              </div>
              <div className="rounded-xl border border-foreground/10 bg-background/30 p-3">
                <div className="mb-1 font-medium text-foreground">{t('workspace.federated.info.returnsTitle')}</div>
                <p>{t('workspace.federated.info.returnsBody')}</p>
              </div>
              <div className="rounded-xl border border-foreground/10 bg-background/30 p-3">
                <div className="mb-1 font-medium text-foreground">{t('workspace.federated.info.decisionTitle')}</div>
                <p>{t('workspace.federated.info.decisionBody')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {isLoading && !data && (
        <EmptyState
          icon={Loader2}
          title={t('workspace.federated.loading.title')}
          description={t('workspace.federated.loading.description')}
          className="py-14"
        />
      )}

      {hasResults && (
        <>
          <Section
            title={t('workspace.federated.execSummary.title')}
            description={t('workspace.federated.execSummary.description')}
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label={t('workspace.federated.metrics.totalMatches')} value={allMatches.length} icon={Search} />
              <MetricCard label={t('workspace.federated.metrics.sourcesWithFindings')} value={activeOrigins} unit="/3" icon={Globe} />
              <MetricCard
                label={t('workspace.federated.metrics.sanctionSignals')}
                value={sanctionedCount}
                icon={ShieldAlert}
                accent={sanctionedCount > 0 ? 'red' : 'success'}
              />
              <MetricCard
                label={t('workspace.federated.metrics.pepSignals')}
                value={pepCount}
                icon={UserCheck}
                accent={pepCount > 0 ? 'amber' : 'success'}
              />
            </div>
          </Section>

          <Section
            title={t('workspace.federated.reading.title')}
            description={t('workspace.federated.reading.description')}
          >
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
              <SectionCard title={t('workspace.federated.operationalConclusion')} icon={Sparkles}>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="border-cyan-500/30 bg-cyan-500/10 text-cyan-200">
                      {data ? buildCoverageLabel(data, t) : t('workspace.federated.noData')}
                    </Badge>
                    <Badge variant="outline" className="border-foreground/10 bg-foreground/5 text-muted-foreground">
                      {t('workspace.federated.candidatesEvaluated', { count: data?.candidates_evaluated ?? 0 })}
                    </Badge>
                    <Badge variant="outline" className="border-foreground/10 bg-foreground/5 text-muted-foreground">
                      {t('workspace.federated.thresholdBadge', { value: data?.threshold.toFixed(2) ?? submittedThreshold.toFixed(2) })}
                    </Badge>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">{buildExecutiveSummary(allMatches, t)}</p>
                  {bestMatch ? (
                    <div className="rounded-xl border border-foreground/10 bg-background/40 p-4">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">{t('workspace.federated.mainFinding')}</div>
                          <div className="mt-1 text-base font-semibold text-foreground">{bestMatch.caption}</div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs font-medium',
                            ORIGIN_META[bestMatch.origin].badgeClassName,
                          )}
                        >
                          {t(`workspace.federated.origin.${bestMatch.origin}.shortLabel`)}
                        </Badge>
                      </div>
                      <div className="mb-3 flex flex-wrap gap-2">
                        <Badge variant="secondary">{bestMatch.schema}</Badge>
                        <Badge variant="outline" className="border-foreground/10 bg-foreground/5 text-foreground">
                          {t('workspace.federated.scoreBadge', { value: formatScore(bestMatch.score) })}
                        </Badge>
                        {bestMatch.is_sanctioned && <Badge className="bg-red-500/15 text-red-200">{t('workspace.federated.sanction')}</Badge>}
                        {bestMatch.is_pep && <Badge className="bg-amber-500/15 text-amber-200">PEP</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t('workspace.federated.featuredDataset')} <span className="text-foreground">{formatDatasets(bestMatch.datasets, t)}</span>
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button type="button" onClick={() => navigate(`/entity/${bestMatch.id}`)}>
                          {t('workspace.federated.openProfile')}
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </Button>
                        <Button type="button" variant="outline" onClick={() => navigate('/search')} className="border-foreground/10 bg-transparent">
                          {t('workspace.federated.goToMainSearch')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-foreground/10 bg-background/30 p-4 text-sm text-muted-foreground">
                      {t('workspace.federated.noMainFinding')}
                    </div>
                  )}
                </div>
              </SectionCard>

              <SectionCard title={t('workspace.federated.howToRead.title')} icon={ShieldCheck}>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>{t('workspace.federated.howToRead.p1')}</p>
                  <p>{t('workspace.federated.howToRead.p2')}</p>
                  <p>{t('workspace.federated.howToRead.p3')}</p>
                </div>
              </SectionCard>
            </div>
          </Section>

          {hasMatches ? (
            <Section
              title={t('workspace.federated.coverageBySource.title')}
              description={t('workspace.federated.coverageBySource.description')}
            >
              <div className="grid gap-4 xl:grid-cols-3">
                {(['local', 'leaks', 'external'] as const).map((origin) => (
                  <OriginPanel
                    key={origin}
                    origin={origin}
                    matches={data?.results_by_origin[origin] ?? []}
                    onOpenEntity={(entityId) => navigate(`/entity/${entityId}`)}
                  />
                ))}
              </div>
            </Section>
          ) : (
            <EmptyState
              icon={Search}
              title={t('workspace.federated.noMatches.title')}
              description={t('workspace.federated.noMatches.description')}
              tone="success"
              action={
                <Button type="button" variant="outline" onClick={() => setThreshold(0.4)} className="border-foreground/10 bg-transparent">
                  {t('workspace.federated.tryBroadMode')}
                </Button>
              }
            />
          )}
        </>
      )}
    </AppPage>
  );
}

function OriginPanel({
  origin,
  matches,
  onOpenEntity,
}: {
  origin: SearchOrigin;
  matches: FederatedMatch[];
  onOpenEntity: (entityId: string) => void;
}) {
  const { t } = useTranslation();
  const meta = ORIGIN_META[origin];
  const Icon = meta.icon;

  return (
    <SectionCard title={t(`workspace.federated.origin.${origin}.label`)} icon={Icon}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant="outline" className={meta.badgeClassName}>
            {t('workspace.federated.matchesCount', { count: matches.length })}
          </Badge>
          <span className="text-xs text-muted-foreground">{t(`workspace.federated.origin.${origin}.shortLabel`)}</span>
        </div>

        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{t(`workspace.federated.origin.${origin}.description`)}</p>
          <p className="text-xs text-muted-foreground">{t(`workspace.federated.origin.${origin}.summary`)}</p>
        </div>

        {matches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-foreground/10 bg-background/30 p-4 text-sm text-muted-foreground">
            {t(`workspace.federated.origin.${origin}.emptyMessage`)}
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => (
              <button
                key={match.id}
                type="button"
                onClick={() => onOpenEntity(match.id)}
                className="w-full rounded-xl border border-foreground/10 bg-background/35 p-4 text-left transition hover:border-foreground/20 hover:bg-background/55"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground" title={match.caption}>
                      {match.caption}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{formatDatasets(match.datasets, t)}</div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'shrink-0 border-foreground/10 bg-foreground/5 text-xs',
                      scoreTone(match.score) === 'red' && 'text-red-200',
                      scoreTone(match.score) === 'amber' && 'text-amber-200',
                      scoreTone(match.score) === 'success' && 'text-emerald-200',
                    )}
                  >
                    {formatScore(match.score)}
                  </Badge>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="secondary">{match.schema}</Badge>
                  {match.is_sanctioned && <Badge className="bg-red-500/15 text-red-200">{t('workspace.federated.sanction')}</Badge>}
                  {match.is_pep && <Badge className="bg-amber-500/15 text-amber-200">PEP</Badge>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

export default FederatedSearchPage;
