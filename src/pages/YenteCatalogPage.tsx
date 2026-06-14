/**
 * YenteCatalogPage — vista del catalogo de datasets (Yente spec).
 *
 * Lista los 317+ datasets disponibles con sus entity counts, ordenados.
 * Permite filtrar por nombre y exportar como JSON (Yente-compatible).
 */
import { useEffect, useMemo, useState } from 'react';
import { Database, Download, Globe, Loader2, Search } from 'lucide-react';
import { yenteService, type YenteCatalog, type YenteDataset } from '@/services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
  const [catalog, setCatalog] = useState<YenteCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    yenteService
      .getCatalog()
      .then(setCatalog)
      .catch((e) => setError(e?.message || 'Error'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!catalog) return [];
    const q = search.trim().toLowerCase();
    if (!q) return catalog.datasets;
    return catalog.datasets.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.title || '').toLowerCase().includes(q),
    );
  }, [catalog, search]);

  const totalEntities = useMemo(() => {
    return catalog?.datasets.reduce((sum, d) => sum + (d.entity_count || 0), 0) ?? 0;
  }, [catalog]);

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

  return (
    <div className="min-h-screen bg-brand-carbon pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-white mb-2 flex items-center gap-2">
              <Globe className="h-7 w-7 text-purple-400" />
              Yente Catalog
            </h1>
            <p className="text-gray-400">
              Catálogo de datasets en formato Yente/OpenSanctions. Consumible por Aleph/ICIJ/OCCRP via
              <code className="text-purple-300 mx-1">GET /api/v2/yente/catalog</code>
            </p>
          </div>
          <Button onClick={handleExport} disabled={!catalog} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>

        {catalog && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="pt-6">
                <div className="text-xs text-gray-500 uppercase">Datasets</div>
                <div className="text-3xl font-semibold text-white">{catalog.datasets.length}</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="pt-6">
                <div className="text-xs text-gray-500 uppercase">Entities indexadas</div>
                <div className="text-3xl font-semibold text-white">
                  {totalEntities.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="pt-6">
                <div className="text-xs text-gray-500 uppercase">Updated at</div>
                <div className="text-sm font-mono text-white">
                  {new Date(catalog.updated_at).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Datasets disponibles</span>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter..."
                  className="pl-8 bg-white/5 border-white/10 text-sm"
                />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              </div>
            ) : error ? (
              <div className="text-red-400 text-sm">{error}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {filtered.map((ds) => (
                  <DatasetCard key={ds.name} ds={ds} />
                ))}
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <p className="text-center text-gray-500 py-8">No datasets match "{search}"</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DatasetCard({ ds }: { ds: YenteDataset }) {
  const tier = tierFor(ds.entity_count);
  return (
    <div className="bg-black/30 border border-white/10 rounded-lg p-3 hover:border-white/20 transition">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-white font-mono truncate" title={ds.name}>
            {ds.name}
          </div>
          {ds.title && ds.title !== ds.name && (
            <div className="text-xs text-gray-500 truncate" title={ds.title}>
              {ds.title}
            </div>
          )}
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded border ${tier.color} shrink-0`}>
          {tier.label}
        </span>
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
