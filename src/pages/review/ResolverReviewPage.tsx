/**
 * ResolverReviewPage — Cola de UNSURE pairs para review humano (Fase C).
 */
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, SkipForward, AlertTriangle, Loader2, RefreshCw, ExternalLink, GitBranchPlus, Copy, Fingerprint, ChevronLeft, ChevronRight } from 'lucide-react';
import { resolverService, type UnsurePair, type JudgementPair, type CanonicalGroup } from '@/services/resolver';
import { entityService } from '@/services/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AppPage, EmptyState, MetricCard, PageHeader, PanelSkeleton } from '@/components/foundation';
import { humanizeEntityName, getCountryName } from '@/lib/utils';
import { toast } from 'sonner';

type ResolverTab = 'queue' | 'canonical' | 'positives' | 'negatives';
const PAGE_SIZE = 50;

interface EntitySummary {
  id: string;
  canonical_name?: string;
  overview?: any;
}

export function ResolverReviewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ResolverTab>('queue');

  const { data: statusData } = useQuery({
    queryKey: ['resolver-status'],
    queryFn: () => resolverService.getStatus(),
    refetchOnWindowFocus: false,
  });
  const status = statusData ?? null;

  const statsCards = useMemo(() => {
    if (!status) return null;
    return (
      <>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-2">
          <MetricCard label={t('review.resolver.stats.unsurePending')} value={status.reviewable?.unsure ?? status.judgements.unsure} icon={AlertTriangle} accent="amber" className="bg-foreground/5 border-foreground/10" />
          <MetricCard label={t('review.resolver.stats.positivePending')} value={status.reviewable?.positive ?? status.judgements.positive} icon={CheckCircle} accent="success" className="bg-foreground/5 border-foreground/10" />
          <MetricCard label={t('review.resolver.stats.negative')} value={status.reviewable?.negative ?? status.judgements.negative} icon={XCircle} accent="red" className="bg-foreground/5 border-foreground/10" />
          <MetricCard label={t('review.resolver.stats.canonicalGroups')} value={status.canonical_ids_count} icon={GitBranchPlus} className="bg-foreground/5 border-foreground/10" />
        </div>
        {status.stale && (status.stale.unsure + status.stale.positive + status.stale.negative) > 0 && (
          <p className="text-xs text-muted-foreground mb-6">
            {t('review.resolver.stats.staleNote', {
              unsure: status.stale.unsure,
              positive: status.stale.positive,
              negative: status.stale.negative,
            })}
          </p>
        )}
      </>
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

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ResolverTab)}>
        <TabsList className="mb-6 bg-foreground/5 border border-foreground/10">
          <TabsTrigger value="queue" className="data-[state=active]:bg-foreground/10">
            <AlertTriangle className="w-4 h-4 mr-2" />
            {t('review.resolver.tabs.queue')}
          </TabsTrigger>
          <TabsTrigger value="canonical" className="data-[state=active]:bg-foreground/10">
            <GitBranchPlus className="w-4 h-4 mr-2" />
            {t('review.resolver.tabs.canonical')}
          </TabsTrigger>
          <TabsTrigger value="positives" className="data-[state=active]:bg-foreground/10">
            <CheckCircle className="w-4 h-4 mr-2" />
            {t('review.resolver.tabs.positives')}
          </TabsTrigger>
          <TabsTrigger value="negatives" className="data-[state=active]:bg-foreground/10">
            <XCircle className="w-4 h-4 mr-2" />
            {t('review.resolver.tabs.negatives')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue">
          <QueueTab navigate={navigate} />
        </TabsContent>
        <TabsContent value="canonical">
          <CanonicalGroupsTab navigate={navigate} enabled={activeTab === 'canonical'} />
        </TabsContent>
        <TabsContent value="positives">
          <JudgementsTab judgement="positive" navigate={navigate} enabled={activeTab === 'positives'} />
        </TabsContent>
        <TabsContent value="negatives">
          <JudgementsTab judgement="negative" navigate={navigate} enabled={activeTab === 'negatives'} />
        </TabsContent>
      </Tabs>
    </AppPage>
  );
}

/** Cola UNSURE: par a par para decisión humana (comportamiento original). */
function QueueTab({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const { t } = useTranslation();
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
      const pairsRes = await resolverService.listUnsure(1, 0);
      return {
        pair: pairsRes.pairs[0] ?? null,
      };
    },
    refetchOnWindowFocus: false,
  });

  const pair = data?.pair ?? null;

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

  return (
    <>
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
                {pair.score !== null
                  ? <Badge variant="outline">{t('review.resolver.score')}: {(pair.score * 100).toFixed(0)}%</Badge>
                  : <Badge variant="outline" className="text-amber-600 dark:text-amber-400">{t('review.resolver.ruleMatch', { defaultValue: 'Regla de identificador' })}</Badge>}
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
                  matchUser={pair.user}
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
    </>
  );
}

/** Paginador reutilizable Prev/Next con etiqueta "X–Y de TOTAL". */
function Paginator({ offset, limit, total, count, onPrev, onNext, disabled }: {
  offset: number; limit: number; total: number; count: number;
  onPrev: () => void; onNext: () => void; disabled?: boolean;
}) {
  const { t } = useTranslation();
  if (total === 0) return null;
  const from = offset + 1;
  const to = offset + count;
  return (
    <div className="flex items-center justify-between mt-4">
      <span className="text-xs text-muted-foreground">
        {t('review.resolver.pagination', { from, to, total })}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={disabled || offset <= 0} onClick={onPrev}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          {t('review.resolver.prev')}
        </Button>
        <Button variant="outline" size="sm" disabled={disabled || offset + limit >= total} onClick={onNext}>
          {t('review.resolver.next')}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

/** Tab de grupos canónicos (clusters fusionados). */
function CanonicalGroupsTab({ navigate, enabled }: {
  navigate: ReturnType<typeof useNavigate>; enabled: boolean;
}) {
  const { t } = useTranslation();
  const [offset, setOffset] = useState(0);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['resolver-canonical-groups', offset],
    queryFn: () => resolverService.getCanonicalGroups(PAGE_SIZE, offset),
    enabled,
    refetchOnWindowFocus: false,
  });

  const errorMessage = error instanceof Error ? error.message : t('review.resolver.loadError');
  const groups = data?.groups ?? [];

  const groupTitle = (g: CanonicalGroup) =>
    g.canonical_name
      ? humanizeEntityName(g.canonical_name)
      : (g.members[0]?.name ? humanizeEntityName(g.members[0].name) : g.canonical_id);

  return (
    <>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      {isLoading ? (
        <PanelSkeleton className="rounded-xl border border-foreground/5 bg-foreground/[0.02] p-6" lines={8} />
      ) : groups.length === 0 ? (
        <EmptyState icon={GitBranchPlus} title={t('review.resolver.tabs.canonical')} description={t('review.resolver.noData')} />
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <Card key={g.canonical_id} className="bg-foreground/5 border-foreground/10">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  <span className="font-semibold leading-tight">{groupTitle(g)}</span>
                  <Badge variant="outline" className="shrink-0">{t('review.resolver.size')}: {g.size}</Badge>
                </CardTitle>
                <div className="text-[10px] text-muted-foreground font-mono mt-0.5 flex items-center">
                  {g.canonical_id.slice(0, 24)}…<CopyButton value={g.canonical_id} label="ID" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">{t('review.resolver.members')}</div>
                <div className="flex flex-wrap gap-1.5">
                  {g.members.map((m) => {
                    const label = m.name ? humanizeEntityName(m.name) : m.id.slice(0, 12) + '…';
                    return m.is_gold ? (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => navigate(`/entity/${m.id}`)}
                        className="inline-flex items-center gap-1 rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-xs text-blue-700 dark:text-blue-300 hover:bg-blue-500/20 transition-colors"
                      >
                        {label}
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    ) : (
                      <span key={m.id} className="inline-flex items-center rounded-md border border-foreground/10 bg-foreground/5 px-2 py-0.5 text-xs text-muted-foreground">
                        {label}
                      </span>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {data && (
        <Paginator
          offset={offset}
          limit={PAGE_SIZE}
          total={data.total}
          count={groups.length}
          disabled={isFetching}
          onPrev={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
          onNext={() => setOffset((o) => o + PAGE_SIZE)}
        />
      )}
    </>
  );
}

/** Tab de decisiones positivas/negativas (tabla de pares). */
function JudgementsTab({ judgement, navigate, enabled }: {
  judgement: 'positive' | 'negative'; navigate: ReturnType<typeof useNavigate>; enabled: boolean;
}) {
  const { t } = useTranslation();
  const [offset, setOffset] = useState(0);
  const [reviewableOnly, setReviewableOnly] = useState(true);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['resolver-judgements', judgement, reviewableOnly, offset],
    queryFn: () => resolverService.getJudgements(judgement, reviewableOnly, PAGE_SIZE, offset),
    enabled,
    refetchOnWindowFocus: false,
  });

  const errorMessage = error instanceof Error ? error.message : t('review.resolver.loadError');
  const pairs = data?.pairs ?? [];

  const nameButton = (id: string, name: string | null) => (
    <button
      type="button"
      onClick={() => navigate(`/entity/${id}`)}
      className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-left"
    >
      {name ? humanizeEntityName(name) : <span className="font-mono text-xs text-muted-foreground">{id.slice(0, 12)}…</span>}
      <ExternalLink className="h-3 w-3 shrink-0" />
    </button>
  );

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Switch id={`reviewable-${judgement}`} checked={reviewableOnly} onCheckedChange={(v) => { setReviewableOnly(v); setOffset(0); }} />
        <label htmlFor={`reviewable-${judgement}`} className="text-sm text-muted-foreground cursor-pointer">
          {t('review.resolver.reviewableOnly')}
        </label>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      {isLoading ? (
        <PanelSkeleton className="rounded-xl border border-foreground/5 bg-foreground/[0.02] p-6" lines={8} />
      ) : pairs.length === 0 ? (
        <EmptyState
          icon={judgement === 'positive' ? CheckCircle : XCircle}
          title={judgement === 'positive' ? t('review.resolver.tabs.positives') : t('review.resolver.tabs.negatives')}
          description={t('review.resolver.noData')}
        />
      ) : (
        <Card className="bg-foreground/5 border-foreground/10">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('review.resolver.colLeft')}</TableHead>
                  <TableHead>{t('review.resolver.colRight')}</TableHead>
                  <TableHead>{t('review.resolver.colUser')}</TableHead>
                  <TableHead>{t('review.resolver.colScore')}</TableHead>
                  <TableHead>{t('review.resolver.colDate')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pairs.map((p: JudgementPair, i) => (
                  <TableRow key={`${p.left_id}-${p.right_id}-${i}`}>
                    <TableCell>{nameButton(p.left_id, p.left_name)}</TableCell>
                    <TableCell>{nameButton(p.right_id, p.right_name)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.user || '—'}</TableCell>
                    <TableCell className="text-xs">{p.score != null ? `${(p.score * 100).toFixed(0)}%` : '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {data && (
        <Paginator
          offset={offset}
          limit={PAGE_SIZE}
          total={data.total}
          count={pairs.length}
          disabled={isFetching}
          onPrev={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
          onNext={() => setOffset((o) => o + PAGE_SIZE)}
        />
      )}
    </>
  );
}

/** Normaliza identifiers (scalar o lista) a {clave: string[]}. */
function idValues(identifiers: Record<string, any> | undefined | null): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (!identifiers || typeof identifiers !== 'object') return out;
  for (const [k, v] of Object.entries(identifiers)) {
    if (v == null || v === '') continue;
    const arr = (Array.isArray(v) ? v : [v]).map((x) => String(x).trim()).filter(Boolean);
    if (arr.length) out[k] = arr;
  }
  return out;
}

/** Extrae la clave de identificador del "user" del judgement (xref-gt-<key>). */
function parseMatchKey(user?: string): string | null {
  const m = (user || '').match(/^xref-gt-(.+)$/);
  return m ? m[1] : null;
}

/** Copia texto al portapapeles con feedback. */
async function copyText(value: string, label?: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`Copiado: ${label ?? value}`);
  } catch {
    toast.error('No se pudo copiar');
  }
}

/** Botón pequeño para copiar un valor al portapapeles. */
function CopyButton({ value, label }: { value: string; label?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); void copyText(value, label); }}
      className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors align-middle ml-1"
      title="Copiar al portapapeles"
    >
      <Copy className="h-3 w-3" />
    </button>
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
    identifiers: idValues(e?.identifiers),
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

function EntityComparison({ left, right, leftId, rightId, matchUser, navigate }: {
  left: EntitySummary | null; right: EntitySummary | null;
  leftId: string; rightId: string; matchUser?: string; navigate: ReturnType<typeof useNavigate>;
}) {
  const { t } = useTranslation();
  const a = extractEntity(left);
  const b = extractEntity(right);
  const sharedSources = a.sources.filter((s) => b.sources.includes(s));

  // ¿Por qué hacen match? El judgement viene de xref-gt-<clave>: comparten ese id.
  const matchKey = parseMatchKey(matchUser);
  const sharedIdVals = matchKey
    ? (a.identifiers[matchKey] || []).filter((v) => (b.identifiers[matchKey] || []).includes(v))
    : [];
  const namesDiffer = norm(a.name) && norm(b.name) && norm(a.name) !== norm(b.name);

  const idsCell = (ids: Record<string, string[]>) => {
    const keys = Object.keys(ids);
    if (!keys.length) return <span className="text-muted-foreground">—</span>;
    return (
      <div className="space-y-0.5">
        {keys.map((k) => (
          <div key={k} className="text-xs flex items-center gap-1 flex-wrap">
            <span className="text-muted-foreground">{k}:</span>
            {ids[k].map((v, i) => {
              const shared = matchKey === k && sharedIdVals.includes(v);
              return (
                <span key={i} className={`font-mono inline-flex items-center ${shared ? 'bg-green-500/20 text-green-700 dark:text-green-300 px-1 rounded' : ''}`}>
                  {v}<CopyButton value={v} label={k} />
                </span>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  const HeaderCell = ({ side, name, id }: { side: string; name: string; id: string }) => (
    <div className="px-3 py-2 border-l border-foreground/5">
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className="text-[10px]">{side}</Badge>
        <button onClick={() => navigate(`/entity/${id}`)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1">
          {t('review.resolver.viewProfile')} <ExternalLink className="h-3 w-3" />
        </button>
      </div>
      <div className="text-foreground font-semibold mt-1 leading-tight flex items-center gap-1">
        <span>{humanizeEntityName(name) || <span className="font-mono text-xs text-muted-foreground">{id.slice(0, 12)}…</span>}</span>
        {name && <CopyButton value={humanizeEntityName(name)} label="nombre" />}
      </div>
      <div className="text-[10px] text-muted-foreground font-mono mt-0.5 flex items-center">{id.slice(0, 18)}…<CopyButton value={id} label="ID" /></div>
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
    <div className="space-y-3">
      {/* ¿Por qué hacen match? */}
      {matchKey && (
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2.5 text-sm">
          <div className="flex items-center gap-2 font-medium text-blue-700 dark:text-blue-300">
            <Fingerprint className="h-4 w-4" />
            {t('review.resolver.whyMatch', { defaultValue: '¿Por qué se proponen?' })}
          </div>
          <div className="mt-1 text-muted-foreground">
            {sharedIdVals.length > 0 ? (
              <>
                {t('review.resolver.matchByIdentifier', { defaultValue: 'Comparten el identificador' })}{' '}
                <span className="font-mono font-semibold text-foreground">{matchKey}</span>{' = '}
                {sharedIdVals.map((v, i) => (
                  <span key={i} className="font-mono bg-green-500/20 text-green-700 dark:text-green-300 px-1 rounded mr-1">
                    {v}<CopyButton value={v} label={matchKey} />
                  </span>
                ))}
                <span className="block mt-1 text-xs">
                  {t('review.resolver.ruleNotName', { defaultValue: 'Es una coincidencia por REGLA de identificador, no por similitud de nombre.' })}
                  {namesDiffer && ' ' + t('review.resolver.namesDifferWarn', { defaultValue: 'Los nombres son distintos — si el identificador es de baja calidad (p. ej. un número corto que no es un ID válido), probablemente NO sean la misma entidad.' })}
                </span>
              </>
            ) : (
              t('review.resolver.matchStaleId', { defaultValue: `Se propusieron por compartir un identificador (${matchKey}), pero ya no comparten ese valor.` })
            )}
          </div>
        </div>
      )}

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
      <CompareRow label={t('review.resolver.fieldIdentifiers', { defaultValue: 'Identificadores' })} a={idsCell(a.identifiers)} b={idsCell(b.identifiers)} />
      {sharedSources.length > 0 && (
        <div className="px-3 py-2 border-t border-foreground/5 bg-green-500/5 text-xs text-green-700 dark:text-green-400">
          {t('review.resolver.sharedSources', { defaultValue: 'Fuentes en común' })}: {sharedSources.slice(0, 6).join(', ')}
        </div>
      )}
    </div>
    </div>
  );
}

export default ResolverReviewPage;
