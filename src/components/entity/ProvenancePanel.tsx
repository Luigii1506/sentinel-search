import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Calendar, ChevronDown, ChevronRight, Database } from 'lucide-react';
import { provenanceService, type PropertyProvenance } from '@/services';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PanelSkeleton } from '@/components/foundation';

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
  const [asOfInput, setAsOfInput] = useState('');
  const [asOfApplied, setAsOfApplied] = useState<string | undefined>();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isLoading, error } = useQuery({
    queryKey: ['entity-provenance', entityId, asOfApplied],
    queryFn: () => provenanceService.getEntityProvenance(entityId, asOfApplied),
    enabled: Boolean(entityId),
    refetchOnWindowFocus: false,
  });

  const toggle = (prop: string) => {
    setExpanded((cur) => {
      const next = new Set(cur);
      if (next.has(prop)) next.delete(prop);
      else next.add(prop);
      return next;
    });
  };

  if (isLoading) {
    return <PanelSkeleton className="rounded-xl border border-foreground/5 bg-foreground/[0.02] p-6" lines={8} />;
  }

  if (error) {
    return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{error instanceof Error ? error.message : 'Error fetching provenance'}</AlertDescription></Alert>;
  }

  if (!data) return null;

  const sortedProps = Object.values(data.properties).sort((a, b) => {
    if (a.conflict && !b.conflict) return -1;
    if (!a.conflict && b.conflict) return 1;
    return a.prop.localeCompare(b.prop);
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4" />Time-travel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="as_of">Estado a la fecha</Label>
              <Input id="as_of" type="date" value={asOfInput} onChange={(e) => setAsOfInput(e.target.value)} />
            </div>
            <Button onClick={() => asOfInput && setAsOfApplied(`${asOfInput}T23:59:59Z`)} disabled={!asOfInput}>Ver estado</Button>
            {data.as_of && <Button variant="outline" onClick={() => { setAsOfApplied(undefined); setAsOfInput(''); }}>Volver al actual</Button>}
          </div>
          {data.as_of && <Badge className="mt-2" variant="secondary">Mostrando estado a {data.as_of.slice(0, 10)}</Badge>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Resumen</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><div className="text-muted-foreground">Schema</div><div className="font-medium">{data.schema}</div></div>
            <div><div className="text-muted-foreground">Statements</div><div className="font-medium">{data.statement_count}</div></div>
            <div><div className="text-muted-foreground">Datasets</div><div className="font-medium">{data.datasets.length}</div></div>
            <div><div className="text-muted-foreground">Conflicts</div><div className="font-medium">{data.has_conflicts ? <Badge variant="destructive">Sí</Badge> : <Badge variant="secondary">No</Badge>}</div></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            {data.datasets.map((d) => <Badge key={d} variant="outline" className="text-xs"><Database className="h-3 w-3 mr-1" />{d}</Badge>)}
          </div>
        </CardContent>
      </Card>

      {sortedProps.map((prop) => <PropertyCard key={prop.prop} prop={prop} expanded={expanded.has(prop.prop)} onToggle={() => toggle(prop.prop)} />)}
    </div>
  );
}

function PropertyCard({ prop, expanded, onToggle }: { prop: PropertyProvenance; expanded: boolean; onToggle: () => void; }) {
  const policyInfo = POLICY_LABELS[prop.policy] || POLICY_LABELS.empty;
  return (
    <Card className={prop.conflict ? 'border-red-300 bg-red-50/30' : ''}>
      <CardHeader>
        <button onClick={onToggle} className="flex items-start justify-between w-full text-left">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <code className="font-semibold text-sm">{prop.prop}</code>
              <Badge className={policyInfo.color} variant="secondary">{policyInfo.label}</Badge>
              {prop.conflict && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Conflict</Badge>}
            </div>
            <div className="text-sm text-muted-foreground">{prop.merged_values.length > 0 ? prop.merged_values.join(' · ') : '(sin valor)'}</div>
          </div>
          <div className="text-xs text-muted-foreground shrink-0">{prop.statements.length} statements</div>
        </button>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0 space-y-4">
          {prop.conflict_values && prop.conflict_values.length > 0 && (
            <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>Conflict values: {prop.conflict_values.join(' · ')}</AlertDescription></Alert>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Value</TableHead>
                <TableHead>Dataset</TableHead>
                <TableHead>Authority</TableHead>
                <TableHead>First seen</TableHead>
                <TableHead>Last seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prop.statements.map((statement, index) => (
                <TableRow key={`${prop.prop}-${statement.dataset}-${index}`}>
                  <TableCell className="max-w-[260px] break-words">{statement.value || '—'}</TableCell>
                  <TableCell>{statement.dataset}</TableCell>
                  <TableCell>{statement.authority}</TableCell>
                  <TableCell>{statement.first_seen?.slice(0, 10) || '—'}</TableCell>
                  <TableCell>{statement.last_seen?.slice(0, 10) || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      )}
    </Card>
  );
}

export default ProvenancePanel;
