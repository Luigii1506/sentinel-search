/**
 * ResolverReviewPage — Cola de UNSURE pairs para review humano (Fase C).
 */
import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, SkipForward, AlertTriangle, Loader2, RefreshCw, ExternalLink, GitBranchPlus } from 'lucide-react';
import { resolverService, type UnsurePair } from '@/services/resolver';
import { entityService } from '@/services/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AppPage, EmptyState, MetricCard, PageHeader, PanelSkeleton } from '@/components/foundation';
import { humanizeEntityName, getCountryName } from '@/lib/utils';
import { toast } from 'sonner';

interface EntitySummary {
  id: string;
  canonical_name?: string;
  overview?: any;
}

export function ResolverReviewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['resolver-review'],
    queryFn: async () => {
      const [status, pairsRes] = await Promise.all([
        resolverService.getStatus(),
        resolverService.listUnsure(1, 0),
      ]);
      return {
        status,
        pair: pairsRes.pairs[0] ?? null,
      };
    },
    refetchOnWindowFocus: false,
  });

  const pair = data?.pair ?? null;
  const status = data?.status ?? null;

  const [leftQuery, rightQuery] = useQueries({
    queries: [
      {
        queryKey: ['resolver-entity', pair?.source],
        queryFn: async () => {
          const result = await entityService.getById(pair!.source);
          return (result ? { ...result, id: pair!.source } : { id: pair!.source }) as EntitySummary;
        },
        enabled: Boolean(pair?.source),
        retry: false,
      },
      {
        queryKey: ['resolver-entity', pair?.target],
        queryFn: async () => {
          const result = await entityService.getById(pair!.target);
          return (result ? { ...result, id: pair!.target } : { id: pair!.target }) as EntitySummary;
        },
        enabled: Boolean(pair?.target),
        retry: false,
      },
    ],
  });

  const decideMutation = useMutation({
    mutationFn: ({ judgement, currentPair }: { judgement: 'positive' | 'negative'; currentPair: UnsurePair }) =>
      resolverService.decide(currentPair.source, currentPair.target, judgement, 'review-ui'),
    onSuccess: async (_data, variables) => {
      toast.success(
        variables.judgement === 'positive'
          ? t('review.resolver.toast.mergeMarked')
          : t('review.resolver.toast.markedDistinct'),
      );
      await queryClient.invalidateQueries({ queryKey: ['resolver-review'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || t('review.resolver.toast.decideError'));
    },
  });

  const errorMessage = error instanceof Error ? error.message : t('review.resolver.loadError');
  const deciding = decideMutation.isPending;
  const entityLoading = pair && (leftQuery.isLoading || rightQuery.isLoading);
  const leftEnt = leftQuery.data ?? (pair ? { id: pair.source } : null);
  const rightEnt = rightQuery.data ?? (pair ? { id: pair.target } : null);

  const statsCards = useMemo(() => {
    if (!status) return null;
    return (
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <MetricCard label={t('review.resolver.stats.unsurePending')} value={status.judgements.unsure} icon={AlertTriangle} accent="amber" className="bg-foreground/5 border-foreground/10" />
        <MetricCard label={t('review.resolver.stats.positivePending')} value={status.judgements.positive} icon={CheckCircle} accent="success" className="bg-foreground/5 border-foreground/10" />
        <MetricCard label={t('review.resolver.stats.negative')} value={status.judgements.negative} icon={XCircle} accent="red" className="bg-foreground/5 border-foreground/10" />
        <MetricCard label={t('review.resolver.stats.canonicalGroups')} value={status.canonical_ids_count} icon={GitBranchPlus} className="bg-foreground/5 border-foreground/10" />
      </div>
    );
  }, [status, t]);

  return (
    <AppPage>
      <PageHeader
        title={t('review.resolver.title')}
        description={t('review.resolver.description')}
        icon={
          <div className="p-2.5 rounded-lg bg-gradient-to-br from-brand-blue/20 to-brand-electric/20 border border-blue-500/30">
            <GitBranchPlus className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
        }
      />

      {statsCards}

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <PanelSkeleton className="rounded-xl border border-foreground/5 bg-foreground/[0.02] p-6" lines={6} />
      ) : !pair ? (
        <EmptyState
          icon={CheckCircle}
          title={t('review.resolver.emptyTitle')}
          description={t('review.resolver.emptyDescription')}
          tone="success"
          action={
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('common.actions.refresh')}
            </Button>
          }
        />
      ) : (
        <>
          <Card className="bg-foreground/5 border-foreground/10 mb-4">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>{t('review.resolver.sameEntityQuestion')}</span>
                {pair.score !== null && <Badge variant="outline">{t('review.resolver.score')}: {pair.score.toFixed(3)}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {entityLoading ? (
                <PanelSkeleton className="rounded-xl border border-foreground/5 bg-foreground/[0.02] p-6" lines={4} />
              ) : (
                <EntityComparison
                  left={leftEnt}
                  right={rightEnt}
                  leftId={pair.source}
                  rightId={pair.target}
                  navigate={navigate}
                />
              )}
            </CardContent>
          </Card>

          <div className="flex justify-center gap-3">
            <Button size="lg" variant="default" className="bg-green-600 hover:bg-green-700" disabled={deciding} onClick={() => decideMutation.mutate({ judgement: 'positive', currentPair: pair })}>
              <CheckCircle className="h-4 w-4 mr-2" />
              {t('review.resolver.sameEntity')}
            </Button>
            <Button size="lg" variant="destructive" disabled={deciding} onClick={() => decideMutation.mutate({ judgement: 'negative', currentPair: pair })}>
              <XCircle className="h-4 w-4 mr-2" />
              {t('review.resolver.distinctEntities')}
            </Button>
            <Button size="lg" variant="outline" disabled={deciding || isFetching} onClick={() => refetch()}>
              {isFetching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <SkipForward className="h-4 w-4 mr-2" />}
              {t('review.resolver.skip')}
            </Button>
          </div>
        </>
      )}
    </AppPage>
  );
}

/** Normaliza un APIEntity (campos reales del backend) a una vista comparable. */
function extractEntity(e: any) {
  const sources: string[] = e?.data_sources || e?.sources || e?.overview?.sources || [];
  return {
    name: e?.primary_name || e?.display_name || e?.canonical_name || e?.overview?.canonical_name || '',
    type: (e?.entity_type as string) || '',
    riskScore: (e?.overall_risk_score ?? e?.risk_score) as number | undefined,
    riskLevel: (e?.risk_level as string) || '',
    country: e?.country || (Array.isArray(e?.countries) ? e.countries[0] : '') || '',
    dob: e?.date_of_birth || e?.birth_date || '',
    isPep: Boolean(e?.is_current_pep ?? e?.overview?.is_current_pep),
    isSanctioned: Boolean(e?.is_sanctioned ?? ((e?.sanctions || e?.overview?.sanctions || []).length > 0)),
    sources,
  };
}

const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();

/** Una fila de comparación A vs B con resaltado de coincidencia/conflicto. */
function CompareRow({ label, a, b }: { label: string; a: ReactNode; b: ReactNode }) {
  const aKey = norm(typeof a === 'string' ? a : '');
  const bKey = norm(typeof b === 'string' ? b : '');
  const both = aKey && bKey;
  const match = both && aKey === bKey;
  const conflict = both && aKey !== bKey;
  const tone = match
    ? 'bg-green-500/10'
    : conflict
      ? 'bg-amber-500/10'
      : '';
  const cell = 'px-3 py-2 text-sm';
  return (
    <div className={`grid grid-cols-[120px_1fr_1fr] items-stretch border-t border-foreground/5 ${tone}`}>
      <div className={`${cell} text-xs uppercase tracking-wide text-muted-foreground self-center`}>{label}</div>
      <div className={`${cell} border-l border-foreground/5`}>{a || <span className="text-muted-foreground">—</span>}</div>
      <div className={`${cell} border-l border-foreground/5`}>{b || <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}

function RiskCell({ score, level }: { score?: number; level?: string }) {
  if (score == null && !level) return <span className="text-muted-foreground">—</span>;
  const cls = level === 'critical' ? 'text-red-600 dark:text-red-400'
    : level === 'high' ? 'text-orange-600 dark:text-orange-400'
    : level === 'medium' ? 'text-yellow-600 dark:text-yellow-500'
    : 'text-muted-foreground';
  return <span className={`font-medium ${cls}`}>{score ?? '—'}{level ? ` · ${level}` : ''}</span>;
}

function EntityComparison({ left, right, leftId, rightId, navigate }: {
  left: EntitySummary | null; right: EntitySummary | null;
  leftId: string; rightId: string; navigate: ReturnType<typeof useNavigate>;
}) {
  const { t } = useTranslation();
  const a = extractEntity(left);
  const b = extractEntity(right);
  const sharedSources = a.sources.filter((s) => b.sources.includes(s));

  const HeaderCell = ({ side, name, id }: { side: string; name: string; id: string }) => (
    <div className="px-3 py-2 border-l border-foreground/5">
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className="text-[10px]">{side}</Badge>
        <button onClick={() => navigate(`/entity/${id}`)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1">
          {t('review.resolver.viewProfile')} <ExternalLink className="h-3 w-3" />
        </button>
      </div>
      <div className="text-foreground font-semibold mt-1 leading-tight">{humanizeEntityName(name) || <span className="font-mono text-xs text-muted-foreground">{id.slice(0, 12)}…</span>}</div>
      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{id.slice(0, 18)}…</div>
    </div>
  );

  const flags = (e: ReturnType<typeof extractEntity>) => (
    <div className="flex flex-wrap gap-1">
      {e.isPep && <Badge className="text-xs bg-amber-500/20 text-amber-700 dark:text-amber-300">PEP</Badge>}
      {e.isSanctioned && <Badge className="text-xs bg-red-500/20 text-red-600 dark:text-red-300">{t('review.resolver.sanction')}</Badge>}
      {!e.isPep && !e.isSanctioned && <span className="text-muted-foreground">—</span>}
    </div>
  );

  const sourcesCell = (e: ReturnType<typeof extractEntity>) => (
    e.sources.length ? (
      <span className="text-xs">{e.sources.slice(0, 4).join(', ')}{e.sources.length > 4 && ` +${e.sources.length - 4}`}</span>
    ) : <span className="text-muted-foreground">—</span>
  );

  return (
    <div className="rounded-xl border border-foreground/10 overflow-hidden">
      <div className="grid grid-cols-[120px_1fr_1fr]">
        <div className="px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground self-center">{t('review.resolver.fieldLabel', { defaultValue: 'Campo' })}</div>
        <HeaderCell side="A" name={a.name} id={leftId} />
        <HeaderCell side="B" name={b.name} id={rightId} />
      </div>
      <CompareRow label={t('review.resolver.fieldName', { defaultValue: 'Nombre' })} a={humanizeEntityName(a.name)} b={humanizeEntityName(b.name)} />
      <CompareRow label={t('review.resolver.fieldType', { defaultValue: 'Tipo' })} a={a.type} b={b.type} />
      <CompareRow label={t('review.resolver.fieldRisk', { defaultValue: 'Riesgo' })} a={<RiskCell score={a.riskScore} level={a.riskLevel} />} b={<RiskCell score={b.riskScore} level={b.riskLevel} />} />
      <CompareRow label={t('review.resolver.fieldCountry', { defaultValue: 'País' })} a={getCountryName(a.country)} b={getCountryName(b.country)} />
      <CompareRow label={t('review.resolver.fieldBirth', { defaultValue: 'Nacimiento' })} a={a.dob} b={b.dob} />
      <CompareRow label={t('review.resolver.fieldFlags', { defaultValue: 'Señales' })} a={flags(a)} b={flags(b)} />
      <CompareRow label={t('review.resolver.sources')} a={sourcesCell(a)} b={sourcesCell(b)} />
      {sharedSources.length > 0 && (
        <div className="px-3 py-2 border-t border-foreground/5 bg-green-500/5 text-xs text-green-700 dark:text-green-400">
          {t('review.resolver.sharedSources', { defaultValue: 'Fuentes en común' })}: {sharedSources.slice(0, 6).join(', ')}
        </div>
      )}
    </div>
  );
}

export default ResolverReviewPage;
