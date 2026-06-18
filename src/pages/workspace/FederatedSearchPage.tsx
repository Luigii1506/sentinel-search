import { useMemo, useState } from 'react';
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
    label: string;
    shortLabel: string;
    icon: typeof Database;
    badgeClassName: string;
    description: string;
    summary: string;
    emptyMessage: string;
  }
> = {
  local: {
    label: 'Fuentes internas y regulatorias',
    shortLabel: 'Local',
    icon: Database,
    badgeClassName: 'border-blue-500/30 bg-blue-500/10 text-blue-200',
    description: 'Listas regulatorias, sanciones, PEPs y fuentes prioritarias ya integradas en la plataforma.',
    summary: 'Valida exposición inmediata dentro de tus fuentes más críticas.',
    emptyMessage: 'No hubo coincidencias en fuentes regulatorias o internas.',
  },
  leaks: {
    label: 'Leaks e investigación periodística',
    shortLabel: 'Leaks',
    icon: FileText,
    badgeClassName: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
    description: 'Consorcios periodísticos y bases tipo Panama, Paradise y Pandora Papers.',
    summary: 'Útil para detectar exposición reputacional o estructuras offshore.',
    emptyMessage: 'No hubo coincidencias en leaks investigativos.',
  },
  external: {
    label: 'Cobertura externa ampliada',
    shortLabel: 'Externo',
    icon: Globe,
    badgeClassName: 'border-violet-500/30 bg-violet-500/10 text-violet-200',
    description: 'Catálogos externos como OpenSanctions y Wikidata para ampliar el contexto.',
    summary: 'Ayuda a validar cobertura adicional fuera de tus fuentes base.',
    emptyMessage: 'No hubo coincidencias en catálogos externos.',
  },
};

const THRESHOLD_PRESETS = [
  {
    value: 0.4,
    label: 'Amplio',
    hint: 'Mayor cobertura, más ruido.',
  },
  {
    value: 0.5,
    label: 'Balanceado',
    hint: 'Buen punto de partida para analistas.',
  },
  {
    value: 0.7,
    label: 'Estricto',
    hint: 'Menos ruido, prioriza precisión.',
  },
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

function formatDatasets(datasets: string[]): string {
  if (datasets.length === 0) return 'Sin dataset visible';
  if (datasets.length === 1) return datasets[0];
  return `${datasets[0]} +${datasets.length - 1}`;
}

function buildExecutiveSummary(matches: MatchWithOrigin[]): string {
  if (matches.length === 0) {
    return 'No se detectaron coincidencias en las fuentes consultadas para esta búsqueda.';
  }

  const hasSanctions = matches.some((match) => match.is_sanctioned);
  const hasPep = matches.some((match) => match.is_pep);
  const hasLeaks = matches.some((match) => match.origin === 'leaks');

  if (hasSanctions) {
    return 'Se detectaron coincidencias con exposición sensible. Prioriza revisión de sanciones y valida identidad antes de cerrar el caso.';
  }

  if (hasPep && hasLeaks) {
    return 'La búsqueda combina exposición política y señales reputacionales. Conviene revisar contexto, beneficiarios y vínculos relacionados.';
  }

  if (hasPep) {
    return 'Se identificaron coincidencias con perfil políticamente expuesto. Revisa relación, jurisdicción y vigencia del contexto.';
  }

  if (hasLeaks) {
    return 'Se detectó exposición en fuentes investigativas. Evalúa si el hallazgo cambia el riesgo reputacional o el nivel de debida diligencia.';
  }

  return 'Hay coincidencias útiles para investigación, pero sin señales críticas inmediatas. Valida identidad y cobertura antes de descartar.';
}

function buildCoverageLabel(data: FederatedSearchResponse): string {
  const activeOrigins = (Object.entries(data.totals) as [SearchOrigin, number][]).filter(([, total]) => total > 0);

  if (activeOrigins.length === 0) return 'Sin cobertura positiva';
  if (activeOrigins.length === 3) return 'Cobertura en 3/3 fuentes';

  return `Cobertura en ${activeOrigins.length}/3 fuentes`;
}

function normalizeThreshold(value: string | null): number {
  const parsed = value ? Number.parseFloat(value) : Number.NaN;
  if (!Number.isFinite(parsed)) return 0.5;
  return Math.min(1, Math.max(0.3, parsed));
}

export function FederatedSearchPage() {
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
  const errorMessage = error instanceof Error ? error.message : 'No fue posible ejecutar la búsqueda.';

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
        title="Búsqueda ampliada"
        description="Consulta una persona o empresa una sola vez y revisa cobertura interna, leaks e inteligencia externa con una lectura más accionable."
        icon={
          <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/15 via-blue-500/10 to-transparent p-3">
            <FileSearch className="h-6 w-6 text-cyan-300" />
          </div>
        }
      />

      <Section unstyled>
        <Card className="border-white/10 bg-white/5">
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="flex-1">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && runSearch()}
                  placeholder="Busca una persona, empresa o beneficiario final"
                  className="border-white/10 bg-background/60 text-white"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAdvanced((current) => !current)}
                  className="border-white/10 bg-transparent"
                >
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Ajustes
                </Button>
                <Button type="button" onClick={runSearch} disabled={isFetching || query.trim().length < 2}>
                  {isFetching ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  Buscar
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
                      : 'border-white/10 bg-background/40 text-navy-100 hover:border-white/20 hover:text-white',
                  )}
                >
                  <div className="text-sm font-medium">{preset.label}</div>
                  <div className="text-xs text-navy-200">{preset.hint}</div>
                </button>
              ))}
            </div>

            {showAdvanced && (
              <div className="grid gap-4 rounded-xl border border-white/10 bg-background/40 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm text-navy-100">
                    <span>Sensibilidad de coincidencia</span>
                    <span className="font-mono text-white">{threshold.toFixed(2)}</span>
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
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-navy-100">
                  Umbral actual: <span className="font-medium text-white">{threshold >= 0.7 ? 'estricto' : threshold <= 0.45 ? 'amplio' : 'balanceado'}</span>
                </div>
              </div>
            )}

            <div className="grid gap-3 text-sm text-navy-100 lg:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-background/30 p-3">
                <div className="mb-1 font-medium text-white">Cuándo usar esta vista</div>
                <p>Cuando necesitas confirmar cobertura ampliada y no solo una coincidencia local.</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-background/30 p-3">
                <div className="mb-1 font-medium text-white">Qué devuelve</div>
                <p>Resultados agrupados por tipo de fuente, con score unificado y señales críticas visibles.</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-background/30 p-3">
                <div className="mb-1 font-medium text-white">Qué decisión habilita</div>
                <p>Priorizar revisión manual, abrir expediente o descartar con mayor confianza.</p>
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
          title="Consultando cobertura ampliada"
          description="La plataforma está comparando la búsqueda contra fuentes internas, leaks y catálogos externos."
          className="py-14"
        />
      )}

      {hasResults && (
        <>
          <Section
            title="Resumen ejecutivo"
            description="Lectura rápida de la búsqueda para decidir si vale la pena profundizar de inmediato."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Coincidencias totales" value={allMatches.length} icon={Search} />
              <MetricCard label="Fuentes con hallazgos" value={activeOrigins} unit="/3" icon={Globe} />
              <MetricCard
                label="Señales de sanción"
                value={sanctionedCount}
                icon={ShieldAlert}
                accent={sanctionedCount > 0 ? 'red' : 'success'}
              />
              <MetricCard
                label="Señales PEP"
                value={pepCount}
                icon={UserCheck}
                accent={pepCount > 0 ? 'amber' : 'success'}
              />
            </div>
          </Section>

          <Section
            title="Lectura del resultado"
            description="Esta vista sintetiza la cobertura detectada y resalta el hallazgo más relevante."
          >
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
              <SectionCard title="Conclusión operativa" icon={Sparkles}>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="border-cyan-500/30 bg-cyan-500/10 text-cyan-200">
                      {data ? buildCoverageLabel(data) : 'Sin datos'}
                    </Badge>
                    <Badge variant="outline" className="border-white/10 bg-white/5 text-navy-100">
                      {data?.candidates_evaluated ?? 0} candidatos evaluados
                    </Badge>
                    <Badge variant="outline" className="border-white/10 bg-white/5 text-navy-100">
                      Umbral {data?.threshold.toFixed(2) ?? submittedThreshold.toFixed(2)}
                    </Badge>
                  </div>
                  <p className="text-sm leading-6 text-navy-100">{buildExecutiveSummary(allMatches)}</p>
                  {bestMatch ? (
                    <div className="rounded-xl border border-white/10 bg-background/40 p-4">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs uppercase tracking-wide text-navy-200">Hallazgo principal</div>
                          <div className="mt-1 text-base font-semibold text-white">{bestMatch.caption}</div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs font-medium',
                            ORIGIN_META[bestMatch.origin].badgeClassName,
                          )}
                        >
                          {ORIGIN_META[bestMatch.origin].shortLabel}
                        </Badge>
                      </div>
                      <div className="mb-3 flex flex-wrap gap-2">
                        <Badge variant="secondary">{bestMatch.schema}</Badge>
                        <Badge variant="outline" className="border-white/10 bg-white/5 text-white">
                          Score {formatScore(bestMatch.score)}
                        </Badge>
                        {bestMatch.is_sanctioned && <Badge className="bg-red-500/15 text-red-200">Sanción</Badge>}
                        {bestMatch.is_pep && <Badge className="bg-amber-500/15 text-amber-200">PEP</Badge>}
                      </div>
                      <p className="text-sm text-navy-100">
                        Dataset destacado: <span className="text-white">{formatDatasets(bestMatch.datasets)}</span>
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button type="button" onClick={() => navigate(`/entity/${bestMatch.id}`)}>
                          Abrir perfil
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </Button>
                        <Button type="button" variant="outline" onClick={() => navigate('/search')} className="border-white/10 bg-transparent">
                          Ir a búsqueda principal
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-white/10 bg-background/30 p-4 text-sm text-navy-100">
                      No hubo un hallazgo principal porque ninguna fuente devolvió coincidencias por encima del umbral actual.
                    </div>
                  )}
                </div>
              </SectionCard>

              <SectionCard title="Cómo leer esta consulta" icon={ShieldCheck}>
                <div className="space-y-3 text-sm text-navy-100">
                  <p>La vista no sustituye la validación de identidad. Sirve para concentrar cobertura y señalar dónde revisar primero.</p>
                  <p>Prioriza coincidencias con sanción o score alto. Después revisa leaks y contexto externo para riesgo reputacional.</p>
                  <p>Si hay demasiados resultados, sube el umbral. Si falta cobertura, baja el umbral o complementa con la búsqueda principal.</p>
                </div>
              </SectionCard>
            </div>
          </Section>

          {hasMatches ? (
            <Section
              title="Cobertura por fuente"
              description="Cada bloque explica qué tipo de inteligencia se consultó y qué coincidencias devolvió."
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
              title="Sin coincidencias por encima del umbral"
              description="La consulta se ejecutó correctamente, pero ninguna fuente devolvió resultados suficientes con la sensibilidad actual."
              tone="success"
              action={
                <Button type="button" variant="outline" onClick={() => setThreshold(0.4)} className="border-white/10 bg-transparent">
                  Probar modo amplio
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
  const meta = ORIGIN_META[origin];
  const Icon = meta.icon;

  return (
    <SectionCard title={meta.label} icon={Icon}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant="outline" className={meta.badgeClassName}>
            {matches.length} coincidencias
          </Badge>
          <span className="text-xs text-navy-200">{meta.shortLabel}</span>
        </div>

        <div className="space-y-1">
          <p className="text-sm text-navy-100">{meta.description}</p>
          <p className="text-xs text-navy-200">{meta.summary}</p>
        </div>

        {matches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-background/30 p-4 text-sm text-navy-100">
            {meta.emptyMessage}
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => (
              <button
                key={match.id}
                type="button"
                onClick={() => onOpenEntity(match.id)}
                className="w-full rounded-xl border border-white/10 bg-background/35 p-4 text-left transition hover:border-white/20 hover:bg-background/55"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-white" title={match.caption}>
                      {match.caption}
                    </div>
                    <div className="mt-1 text-xs text-navy-200">{formatDatasets(match.datasets)}</div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'shrink-0 border-white/10 bg-white/5 text-xs',
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
                  {match.is_sanctioned && <Badge className="bg-red-500/15 text-red-200">Sanción</Badge>}
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
