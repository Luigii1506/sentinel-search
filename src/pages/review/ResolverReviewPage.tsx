/**
 * ResolverReviewPage — Cola de UNSURE pairs para review humano (Fase C).
 *
 * El xref auto del backend genera judgements POSITIVE/NEGATIVE/UNSURE.
 * Los UNSURE son cases edge donde el algoritmo no esta seguro y necesitan
 * decision humana antes de propagarse a statements/entities.
 *
 * Flow: muestra par left vs right, operador decide:
 *  - SAME PERSON (POSITIVE) → se aplica merge en next apply
 *  - DIFFERENT (NEGATIVE) → no se merge
 *  - SKIP (queda UNSURE para otro review)
 */
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, SkipForward, AlertTriangle, Loader2, RefreshCw, ExternalLink } from 'lucide-react';
import { resolverService, type UnsurePair, type ResolverStatus } from '@/services/resolver';
import { entityService } from '@/services/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface EntitySummary {
  id: string;
  canonical_name?: string;
  overview?: any;
}

export function ResolverReviewPage() {
  const [pair, setPair] = useState<UnsurePair | null>(null);
  const [leftEnt, setLeftEnt] = useState<EntitySummary | null>(null);
  const [rightEnt, setRightEnt] = useState<EntitySummary | null>(null);
  const [status, setStatus] = useState<ResolverStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchNext = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, pairsRes] = await Promise.all([
        resolverService.getStatus(),
        resolverService.listUnsure(1, 0),
      ]);
      setStatus(statusRes);
      const p = pairsRes.pairs[0];
      if (!p) {
        setPair(null);
        return;
      }
      setPair(p);
      // Load both entity summaries in parallel
      const [l, r] = await Promise.all([
        entityService.getById(p.source).catch(() => null),
        entityService.getById(p.target).catch(() => null),
      ]);
      setLeftEnt(l ? { ...l, id: p.source } : { id: p.source });
      setRightEnt(r ? { ...r, id: p.target } : { id: p.target });
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNext();
  }, [fetchNext]);

  const handleDecide = async (judgement: 'positive' | 'negative') => {
    if (!pair || deciding) return;
    setDeciding(true);
    try {
      await resolverService.decide(pair.source, pair.target, judgement, 'review-ui');
      toast.success(
        judgement === 'positive' ? 'Merge marcado — se aplicará en próximo ciclo' : 'Marcado como entidades distintas',
      );
      await fetchNext();
    } catch (e: any) {
      toast.error(e?.message || 'Error al decidir');
    } finally {
      setDeciding(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-carbon pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-white mb-2">Resolver Review</h1>
          <p className="text-gray-400">
            Pares UNSURE generados por nomenklatura xref. Decide si son la misma
            entidad (merge) o entidades distintas.
          </p>
        </div>

        {status && (
          <Card className="bg-white/5 border-white/10 mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">UNSURE pendientes</div>
                  <div className="text-2xl font-semibold text-amber-400">{status.judgements.unsure}</div>
                </div>
                <div>
                  <div className="text-gray-500">POSITIVE (pendientes apply)</div>
                  <div className="text-2xl font-semibold text-green-400">{status.judgements.positive}</div>
                </div>
                <div>
                  <div className="text-gray-500">NEGATIVE</div>
                  <div className="text-2xl font-semibold text-red-400">{status.judgements.negative}</div>
                </div>
                <div>
                  <div className="text-gray-500">Canonical groups</div>
                  <div className="text-2xl font-semibold text-purple-400">{status.canonical_ids_count}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : !pair ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
              <h3 className="text-xl text-white mb-2">¡Cola vacía!</h3>
              <p className="text-gray-400">No hay pares UNSURE pendientes de review.</p>
              <Button className="mt-4" variant="outline" onClick={fetchNext}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="bg-white/5 border-white/10 mb-4">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span>¿Son la misma entidad?</span>
                  {pair.score !== null && (
                    <Badge variant="outline">Score: {pair.score.toFixed(3)}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EntityCard entity={leftEnt} id={pair.source} side="A" navigate={navigate} />
                  <EntityCard entity={rightEnt} id={pair.target} side="B" navigate={navigate} />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center gap-3">
              <Button
                size="lg"
                variant="default"
                className="bg-green-600 hover:bg-green-700"
                disabled={deciding}
                onClick={() => handleDecide('positive')}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                MISMA entidad (merge)
              </Button>
              <Button
                size="lg"
                variant="destructive"
                disabled={deciding}
                onClick={() => handleDecide('negative')}
              >
                <XCircle className="h-4 w-4 mr-2" />
                DISTINTAS entidades
              </Button>
              <Button size="lg" variant="outline" disabled={deciding} onClick={fetchNext}>
                <SkipForward className="h-4 w-4 mr-2" />
                Saltar
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EntityCard({
  entity,
  id,
  side,
  navigate,
}: {
  entity: EntitySummary | null;
  id: string;
  side: string;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const data: any = entity || { id };
  const name = data.canonical_name || data?.overview?.canonical_name || id.slice(0, 12) + '...';
  const datasets: string[] = data?.overview?.sources || data?.sources || [];
  const isPep = data?.overview?.is_current_pep || data?.is_current_pep;
  const isSanctioned = (data?.overview?.sanctions || data?.sanctions || []).length > 0;

  return (
    <div className="bg-black/30 border border-white/10 rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <Badge variant="outline" className="text-xs">{side}</Badge>
        <button
          onClick={() => navigate(`/entity/${id}`)}
          className="text-xs text-blue-400 hover:underline inline-flex items-center gap-1"
        >
          Ver perfil <ExternalLink className="h-3 w-3" />
        </button>
      </div>
      <div className="text-white font-medium mb-2">{name}</div>
      <div className="text-xs text-gray-500 mb-2 font-mono">{id.slice(0, 16)}...</div>
      <div className="flex flex-wrap gap-1 mb-2">
        {isPep && <Badge className="text-xs bg-amber-500/20 text-amber-300">PEP</Badge>}
        {isSanctioned && <Badge className="text-xs bg-red-500/20 text-red-300">SANCTION</Badge>}
      </div>
      {datasets.length > 0 && (
        <div className="text-xs text-gray-400">
          <span className="text-gray-500">Sources:</span>{' '}
          {datasets.slice(0, 5).join(', ')}
          {datasets.length > 5 && ` +${datasets.length - 5}`}
        </div>
      )}
    </div>
  );
}

export default ResolverReviewPage;
