/**
 * ResolverReviewPage — Cola de UNSURE pairs para review humano (Fase C).
 */
import { useMemo } from 'react';
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
import { toast } from 'sonner';

interface EntitySummary {
  id: string;
  canonical_name?: string;
  overview?: any;
}

export function ResolverReviewPage() {
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
          ? 'Merge marcado — se aplicará en próximo ciclo'
          : 'Marcado como entidades distintas',
      );
      await queryClient.invalidateQueries({ queryKey: ['resolver-review'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Error al decidir');
    },
  });

  const errorMessage = error instanceof Error ? error.message : 'Error cargando cola de revisión';
  const deciding = decideMutation.isPending;
  const entityLoading = pair && (leftQuery.isLoading || rightQuery.isLoading);
  const leftEnt = leftQuery.data ?? (pair ? { id: pair.source } : null);
  const rightEnt = rightQuery.data ?? (pair ? { id: pair.target } : null);

  const statsCards = useMemo(() => {
    if (!status) return null;
    return (
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <MetricCard label="UNSURE pendientes" value={status.judgements.unsure} icon={AlertTriangle} accent="amber" className="bg-foreground/5 border-foreground/10" />
        <MetricCard label="Positive pendientes" value={status.judgements.positive} icon={CheckCircle} accent="success" className="bg-foreground/5 border-foreground/10" />
        <MetricCard label="Negative" value={status.judgements.negative} icon={XCircle} accent="red" className="bg-foreground/5 border-foreground/10" />
        <MetricCard label="Canonical groups" value={status.canonical_ids_count} icon={GitBranchPlus} className="bg-foreground/5 border-foreground/10" />
      </div>
    );
  }, [status]);

  return (
    <AppPage>
      <PageHeader
        title="Revisión de resolución"
        description="Pares UNSURE generados por nomenklatura xref. Decide si son la misma entidad o entidades distintas."
        icon={
          <div className="p-2.5 rounded-lg bg-gradient-to-br from-brand-blue/20 to-brand-electric/20 border border-blue-500/30">
            <GitBranchPlus className="w-6 h-6 text-blue-400" />
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
          title="Cola vacía"
          description="No hay pares UNSURE pendientes de review."
          tone="success"
          action={
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          }
        />
      ) : (
        <>
          <Card className="bg-foreground/5 border-foreground/10 mb-4">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>¿Son la misma entidad?</span>
                {pair.score !== null && <Badge variant="outline">Score: {pair.score.toFixed(3)}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {entityLoading ? (
                <PanelSkeleton className="rounded-xl border border-foreground/5 bg-foreground/[0.02] p-6" lines={4} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EntityCard entity={leftEnt} id={pair.source} side="A" navigate={navigate} />
                  <EntityCard entity={rightEnt} id={pair.target} side="B" navigate={navigate} />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-center gap-3">
            <Button size="lg" variant="default" className="bg-green-600 hover:bg-green-700" disabled={deciding} onClick={() => decideMutation.mutate({ judgement: 'positive', currentPair: pair })}>
              <CheckCircle className="h-4 w-4 mr-2" />
              MISMA entidad (merge)
            </Button>
            <Button size="lg" variant="destructive" disabled={deciding} onClick={() => decideMutation.mutate({ judgement: 'negative', currentPair: pair })}>
              <XCircle className="h-4 w-4 mr-2" />
              DISTINTAS entidades
            </Button>
            <Button size="lg" variant="outline" disabled={deciding || isFetching} onClick={() => refetch()}>
              {isFetching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <SkipForward className="h-4 w-4 mr-2" />}
              Saltar
            </Button>
          </div>
        </>
      )}
    </AppPage>
  );
}

function EntityCard({ entity, id, side, navigate }: { entity: EntitySummary | null; id: string; side: string; navigate: ReturnType<typeof useNavigate>; }) {
  const data: any = entity || { id };
  const name = data.canonical_name || data?.overview?.canonical_name || `${id.slice(0, 12)}...`;
  const datasets: string[] = data?.overview?.sources || data?.sources || [];
  const isPep = data?.overview?.is_current_pep || data?.is_current_pep;
  const isSanctioned = (data?.overview?.sanctions || data?.sanctions || []).length > 0;

  return (
    <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-4">
      <div className="flex items-start justify-between mb-2">
        <Badge variant="outline" className="text-xs">{side}</Badge>
        <button onClick={() => navigate(`/entity/${id}`)} className="text-xs text-blue-400 hover:underline inline-flex items-center gap-1">
          Ver perfil <ExternalLink className="h-3 w-3" />
        </button>
      </div>
      <div className="text-foreground font-medium mb-2">{name}</div>
      <div className="text-xs text-gray-500 mb-2 font-mono">{id.slice(0, 16)}...</div>
      <div className="flex flex-wrap gap-1 mb-2">
        {isPep && <Badge className="text-xs bg-amber-500/20 text-amber-300">PEP</Badge>}
        {isSanctioned && <Badge className="text-xs bg-red-500/20 text-red-300">SANCION</Badge>}
      </div>
      {datasets.length > 0 && (
        <div className="text-xs text-gray-400">
          <span className="text-gray-500">Fuentes:</span> {datasets.slice(0, 5).join(', ')}
          {datasets.length > 5 && ` +${datasets.length - 5}`}
        </div>
      )}
    </div>
  );
}

export default ResolverReviewPage;
