import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Database, Download, Globe, Search } from 'lucide-react';
import { yenteService, type YenteDataset } from '@/services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AppPage, EmptyState, ListPageSkeleton, MetricCard, PageHeader } from '@/components/foundation';

const TIER_COLORS = [
  { min: 100000, color: 'bg-red-500/10 text-red-300 border-red-500/30', label: 'XL' },
  { min: 10000, color: 'bg-amber-500/10 text-amber-300 border-amber-500/30', label: 'L' },
  { min: 1000, color: 'bg-blue-500/10 text-blue-300 border-blue-500/30', label: 'M' },
  { min: 0, color: 'bg-slate-500/10 text-slate-300 border-slate-500/30', label: 'S' },
];

function tierFor(count: number) {
  return TIER_COLORS.find((t) => count >= t.min)!;
}

export function YenteCatalogPage() {
  const [search, setSearch] = useState('');
  const { data: catalog, isLoading, error } = useQuery({
    queryKey: ['yente-catalog'],
    queryFn: () => yenteService.getCatalog(),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const filtered = useMemo(() => {
    if (!catalog) return [];
    const q = search.trim().toLowerCase();
    if (!q) return catalog.datasets;
    return catalog.datasets.filter((d) => d.name.toLowerCase().includes(q) || (d.title || '').toLowerCase().includes(q));
  }, [catalog, search]);

  const totalEntities = useMemo(
    () => catalog?.datasets.reduce((sum, d) => sum + (d.entity_count || 0), 0) ?? 0,
    [catalog],
  );

  const handleExport = () => {
    if (!catalog) return;
    const blob = new Blob([JSON.stringify(catalog, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yente-catalog-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const errorMessage = error instanceof Error ? error.message : 'Error cargando catálogo';

  return (
    <AppPage>
      {isLoading && !catalog ? (
        <ListPageSkeleton showFilters={false} metricCards={3} rowCount={6} rowHeightClassName="h-24" />
      ) : (
        <>
          <PageHeader
            title="Catalogo Yente"
            description="Catálogo de datasets en formato Yente/OpenSanctions. Consumible por Aleph/ICIJ/OCCRP."
            icon={<div className="p-2.5 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30"><Globe className="w-6 h-6 text-purple-400" /></div>}
            actions={<Button onClick={handleExport} disabled={!catalog} variant="outline"><Download className="h-4 w-4 mr-2" />Export JSON</Button>}
          />

          {catalog && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <MetricCard label="Datasets" value={catalog.datasets.length} icon={Database} className="bg-foreground/5 border-foreground/10" />
              <MetricCard label="Entities indexadas" value={totalEntities.toLocaleString()} icon={Globe} className="bg-foreground/5 border-foreground/10" />
              <MetricCard label="Actualizado" value={new Date(catalog.updated_at).toLocaleString()} className="bg-foreground/5 border-foreground/10" />
            </div>
          )}

          <Card className="bg-foreground/5 border-foreground/10">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Datasets disponibles</span>
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filtrar..." className="pl-8 bg-foreground/5 border-foreground/10 text-sm" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {error ? (
                <Alert variant="destructive"><AlertDescription>{errorMessage}</AlertDescription></Alert>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {filtered.map((ds) => <DatasetCard key={ds.name} ds={ds} />)}
                </div>
              )}
              {!isLoading && !error && filtered.length === 0 && (
                <EmptyState icon={Search} title="Sin datasets" description={`No hay datasets que coincidan con "${search}".`} />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </AppPage>
  );
}

function DatasetCard({ ds }: { ds: YenteDataset }) {
  const tier = tierFor(ds.entity_count);
  return (
    <div className="bg-black/30 border border-foreground/10 rounded-lg p-3 hover:border-foreground/20 transition">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-foreground font-mono truncate" title={ds.name}>{ds.name}</div>
          {ds.title && ds.title !== ds.name && <div className="text-xs text-gray-500 truncate" title={ds.title}>{ds.title}</div>}
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded border ${tier.color} shrink-0`}>{tier.label}</span>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
        <Database className="h-3 w-3" />
        <span className="tabular-nums">{ds.entity_count.toLocaleString()}</span>
        <span className="text-gray-600">entities</span>
      </div>
    </div>
  );
}

export default YenteCatalogPage;
