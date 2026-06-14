/**
 * FederatedSearchPage — busqueda unificada en 3 origins:
 * - LOCAL: tus sources (sanciones, PEPs propios, Tier 1)
 * - LEAKS: ICIJ Offshore (Panama/Paradise/Pandora)
 * - EXTERNAL: OpenSanctions + Wikidata
 *
 * Premium feature: una query, resultados agrupados con scoring unificado.
 * Diferenciador vs Refinitiv/Dow Jones (NO integran leaks data).
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, AlertCircle, Database, FileText, Globe } from 'lucide-react';
import { yenteService, type FederatedSearchResponse, type FederatedMatch } from '@/services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AppPage, PageHeader } from '@/components/foundation';

const ORIGIN_META = {
  local: {
    label: 'LOCAL',
    color: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    icon: Database,
    description: 'Tus sources Tier 1: OFAC, UN, PEPs propios, etc.',
  },
  leaks: {
    label: 'LEAKS',
    color: 'bg-red-500/10 text-red-300 border-red-500/30',
    icon: FileText,
    description: 'ICIJ Offshore Leaks: Panama, Paradise, Pandora Papers',
  },
  external: {
    label: 'EXTERNAL',
    color: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
    icon: Globe,
    description: 'OpenSanctions catalog + Wikidata',
  },
};

export function FederatedSearchPage() {
  const [query, setQuery] = useState('');
  const [data, setData] = useState<FederatedSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(0.5);

  const runSearch = async () => {
    if (!query.trim() || query.trim().length < 2) return;
    setLoading(true);
    setError(null);
    try {
      const res = await yenteService.federatedSearch({
        q: query.trim(),
        threshold,
        limit: 30,
      });
      setData(res);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppPage>
      <PageHeader
        title="Federated Search"
        description="Búsqueda única en 3 origins: tus sources locales, leaks investigativos (ICIJ Panama/Paradise/Pandora) y catálogo externo (OpenSanctions)."
        icon={
          <div className="p-2.5 rounded-lg bg-gradient-to-br from-brand-blue/20 to-brand-electric/20 border border-blue-500/30">
            <Globe className="w-6 h-6 text-blue-400" />
          </div>
        }
      />

        <Card className="bg-white/5 border-white/10 mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                placeholder="Buscar persona, empresa, organización..."
                className="bg-white/5 border-white/10 text-white"
              />
              <Button onClick={runSearch} disabled={loading || !query.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
              <span>Threshold:</span>
              <input
                type="range"
                min="0.3"
                max="1"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="flex-1 max-w-xs"
              />
              <span className="font-mono text-gray-200">{threshold.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {data && (
          <>
            <div className="mb-4 text-sm text-gray-400">
              Query: <span className="text-white">{data.query}</span> ·
              Candidates evaluated: {data.candidates_evaluated} ·
              Threshold: {data.threshold}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {(['local', 'leaks', 'external'] as const).map((origin) => {
                const meta = ORIGIN_META[origin];
                const Icon = meta.icon;
                const rows = data.results_by_origin[origin] || [];
                return (
                  <OriginColumn
                    key={origin}
                    title={meta.label}
                    description={meta.description}
                    color={meta.color}
                    Icon={Icon}
                    count={rows.length}
                    matches={rows}
                  />
                );
              })}
            </div>
          </>
        )}
    </AppPage>
  );
}

function OriginColumn({
  title,
  description,
  color,
  Icon,
  count,
  matches,
}: {
  title: string;
  description: string;
  color: string;
  Icon: React.ComponentType<{ className?: string }>;
  count: number;
  matches: FederatedMatch[];
}) {
  const navigate = useNavigate();
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className={`px-2 py-1 rounded border text-xs flex items-center gap-1 ${color}`}>
            <Icon className="h-3 w-3" />
            {title}
          </span>
          <Badge variant="outline" className="text-xs">
            {count} matches
          </Badge>
        </CardTitle>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </CardHeader>
      <CardContent>
        {matches.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No matches</p>
        ) : (
          <div className="space-y-2">
            {matches.map((m) => (
              <button
                key={m.id}
                onClick={() => navigate(`/entity/${m.id}`)}
                className="w-full text-left p-2 rounded hover:bg-white/5 border border-transparent hover:border-white/10 transition"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-white truncate" title={m.caption}>
                    {m.caption}
                  </span>
                  <Badge variant="outline" className="text-xs tabular-nums shrink-0">
                    {m.score.toFixed(2)}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="secondary" className="text-[10px]">
                    {m.schema}
                  </Badge>
                  {m.is_pep && (
                    <Badge className="text-[10px] bg-amber-500/20 text-amber-300">PEP</Badge>
                  )}
                  {m.is_sanctioned && (
                    <Badge className="text-[10px] bg-red-500/20 text-red-300">SANCTION</Badge>
                  )}
                  {m.datasets.slice(0, 2).map((d) => (
                    <span key={d} className="text-[10px] text-gray-500">
                      {d}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default FederatedSearchPage;
