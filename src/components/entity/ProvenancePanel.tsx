/**
 * ProvenancePanel — visualiza provenance per-property de una entidad.
 *
 * Para cada propiedad muestra:
 * - Valor merged final
 * - Política aplicada (union/source_priority/first_seen)
 * - Conflict flag si 2+ fuentes alta autoridad disagree
 * - Tabla expandible con statements crudos (dataset, authority, fechas, origin)
 *
 * Soporta time-travel via prop `asOf`.
 */
import { useEffect, useState } from 'react';
import { AlertTriangle, Calendar, ChevronDown, ChevronRight, Database, Loader2 } from 'lucide-react';
import {
  provenanceService,
  type EntityProvenanceResponse,
  type PropertyProvenance,
} from '@/services';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Props {
  entityId: string;
}

const POLICY_LABELS: Record<string, { label: string; color: string }> = {
  union: { label: 'Union (multi-value)', color: 'bg-blue-100 text-blue-800' },
  source_priority: { label: 'Source priority', color: 'bg-purple-100 text-purple-800' },
  first_seen: { label: 'First seen', color: 'bg-amber-100 text-amber-800' },
  union_default: { label: 'Union (default)', color: 'bg-slate-100 text-slate-700' },
  empty: { label: 'Empty', color: 'bg-slate-100 text-slate-500' },
};

export function ProvenancePanel({ entityId }: Props) {
  const [data, setData] = useState<EntityProvenanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asOf, setAsOf] = useState<string>('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetch = async (when?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await provenanceService.getEntityProvenance(entityId, when);
      setData(res);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Error fetching provenance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId]);

  const toggle = (prop: string) => {
    setExpanded((cur) => {
      const next = new Set(cur);
      if (next.has(prop)) next.delete(prop);
      else next.add(prop);
      return next;
    });
  };

  const handleTimeTravel = () => {
    if (asOf) fetch(asOf + 'T23:59:59Z');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) return null;

  const sortedProps = Object.values(data.properties).sort((a, b) => {
    if (a.conflict && !b.conflict) return -1;
    if (!a.conflict && b.conflict) return 1;
    return a.prop.localeCompare(b.prop);
  });

  return (
    <div className="space-y-4">
      {/* Time-travel controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4" />
            Time-travel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="as_of">Estado a la fecha</Label>
              <Input
                id="as_of"
                type="date"
                value={asOf}
                onChange={(e) => setAsOf(e.target.value)}
              />
            </div>
            <Button onClick={handleTimeTravel} disabled={!asOf}>
              Ver estado
            </Button>
            {data.as_of && (
              <Button variant="outline" onClick={() => fetch()}>
                Volver al actual
              </Button>
            )}
          </div>
          {data.as_of && (
            <Badge className="mt-2" variant="secondary">
              Mostrando estado a {data.as_of.slice(0, 10)}
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Resumen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground">Schema</div>
              <div className="font-medium">{data.schema}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Statements</div>
              <div className="font-medium">{data.statement_count}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Datasets</div>
              <div className="font-medium">{data.datasets.length}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Conflicts</div>
              <div className="font-medium">
                {data.has_conflicts ? (
                  <Badge variant="destructive">Sí</Badge>
                ) : (
                  <Badge variant="secondary">No</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            {data.datasets.map((d) => (
              <Badge key={d} variant="outline" className="text-xs">
                <Database className="h-3 w-3 mr-1" />
                {d}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Per-property cards */}
      {sortedProps.map((prop) => (
        <PropertyCard
          key={prop.prop}
          prop={prop}
          expanded={expanded.has(prop.prop)}
          onToggle={() => toggle(prop.prop)}
        />
      ))}
    </div>
  );
}

function PropertyCard({
  prop,
  expanded,
  onToggle,
}: {
  prop: PropertyProvenance;
  expanded: boolean;
  onToggle: () => void;
}) {
  const policyInfo = POLICY_LABELS[prop.policy] || POLICY_LABELS.empty;

  return (
    <Card className={prop.conflict ? 'border-red-300 bg-red-50/30' : ''}>
      <CardHeader>
        <button
          onClick={onToggle}
          className="flex items-start justify-between w-full text-left"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <CardTitle className="text-base">{prop.prop}</CardTitle>
              <Badge variant="outline" className="text-xs">
                {prop.prop_type}
              </Badge>
              <Badge className={`text-xs ${policyInfo.color}`}>{policyInfo.label}</Badge>
              {prop.conflict && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  CONFLICT
                </Badge>
              )}
            </div>
            <div className="text-sm font-medium text-foreground mt-2">
              {prop.merged_values.slice(0, 3).map((v, i) => (
                <span key={i} className="inline-block bg-slate-100 px-2 py-1 rounded mr-1 mb-1">
                  {v}
                </span>
              ))}
              {prop.merged_values.length > 3 && (
                <span className="text-muted-foreground text-xs ml-1">
                  +{prop.merged_values.length - 3} more
                </span>
              )}
            </div>
            {prop.conflict && prop.conflict_values && (
              <div className="mt-2 text-xs text-red-700">
                <strong>Valores en conflicto:</strong> {prop.conflict_values.join(' vs ')}
              </div>
            )}
            <div className="text-xs text-muted-foreground mt-1">
              {prop.statements.length} statement{prop.statements.length !== 1 ? 's' : ''}
              {prop.winning_dataset && ` · winner: ${prop.winning_dataset}`}
            </div>
          </div>
        </button>
      </CardHeader>
      {expanded && (
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Value</TableHead>
                <TableHead>Dataset</TableHead>
                <TableHead className="text-right">Authority</TableHead>
                <TableHead>External</TableHead>
                <TableHead>First seen</TableHead>
                <TableHead>Origin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prop.statements.map((s, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs">{s.value.slice(0, 50)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{s.dataset}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{s.authority}</TableCell>
                  <TableCell>
                    {s.external ? <Badge variant="secondary" className="text-xs">ext</Badge> : '—'}
                  </TableCell>
                  <TableCell className="text-xs">{s.first_seen?.slice(0, 10)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {s.origin || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      )}
    </Card>
  );
}
