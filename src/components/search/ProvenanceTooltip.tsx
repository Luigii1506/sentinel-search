import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Database, Loader2, AlertTriangle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { provenanceService } from '@/services';

interface Props {
  entityId: string;
  canonicalName?: string;
}

export function ProvenanceTooltip({ entityId, canonicalName }: Props) {
  const [opened, setOpened] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ['provenance-tooltip', entityId],
    queryFn: () => provenanceService.getEntityProvenance(entityId),
    enabled: opened,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return (
    <Popover open={opened} onOpenChange={setOpened}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-purple-600 dark:text-purple-300 hover:bg-purple-500/10 hover:text-purple-200" onClick={(e) => e.stopPropagation()} title="Ver provenance per-property">
          <ChevronRight className="h-3 w-3 mr-1" />Provenance
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 max-h-96 overflow-y-auto bg-card border-foreground/10 text-gray-100" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-start justify-between gap-2 sticky top-0 bg-card pb-2 border-b border-foreground/5">
          <div>
            <div className="text-sm font-medium text-foreground">{canonicalName || `${entityId.slice(0, 12)}...`}</div>
            <div className="text-xs text-muted-foreground">Provenance per-property</div>
          </div>
          <Link to={`/entity/${entityId}?tab=provenance`} className="text-xs text-purple-600 dark:text-purple-300 hover:underline inline-flex items-center gap-1">Completo <ExternalLink className="h-3 w-3" /></Link>
        </div>

        {isLoading && <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
        {error && <div className="text-xs text-red-600 dark:text-red-400 py-2 flex items-start gap-1"><AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />{error instanceof Error ? error.message : 'Error'}</div>}

        {data && (
          <div className="space-y-2 mt-2">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <Stat label="Statements" value={data.statement_count} />
              <Stat label="Datasets" value={data.datasets.length} />
              <Stat label="Conflicts" value={data.has_conflicts ? 'YES' : 'no'} accent={data.has_conflicts ? 'red' : 'gray'} />
            </div>
            <div className="text-xs space-y-1.5 max-h-60 overflow-y-auto">
              {Object.values(data.properties).sort((a, b) => (b.conflict ? 1 : 0) - (a.conflict ? 1 : 0)).slice(0, 6).map((prop) => (
                <div key={prop.prop} className={`px-2 py-1 rounded border ${prop.conflict ? 'bg-red-500/10 border-red-500/30' : 'bg-foreground/5 border-foreground/10'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-purple-600 dark:text-purple-300">{prop.prop}</span>
                    <div className="flex items-center gap-1">
                      {prop.conflict && <Badge variant="destructive" className="text-[9px] py-0">CONFLICT</Badge>}
                      <span className="text-muted-foreground">{prop.statements.length} <Database className="inline h-2.5 w-2.5" /></span>
                    </div>
                  </div>
                  <div className="text-muted-foreground truncate" title={prop.merged_values.join(' | ')}>
                    {prop.merged_values.slice(0, 2).join(' · ')}
                    {prop.merged_values.length > 2 && ` +${prop.merged_values.length - 2}`}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    via {[...new Set(prop.statements.map((s) => s.dataset))].slice(0, 3).join(', ')}
                    {prop.policy && <span className="ml-1 text-purple-600 dark:text-purple-400">[{prop.policy}]</span>}
                  </div>
                </div>
              ))}
              {Object.keys(data.properties).length > 6 && <div className="text-center text-muted-foreground text-[10px] pt-1">+{Object.keys(data.properties).length - 6} mas — abre "Completo" para ver todas</div>}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function Stat({ label, value, accent = 'gray' }: { label: string; value: number | string; accent?: 'gray' | 'red'; }) {
  const valueColor = accent === 'red' ? 'text-red-600 dark:text-red-400' : 'text-foreground';
  return <div className="bg-foreground/5 rounded px-2 py-1 text-center"><div className={`font-semibold ${valueColor}`}>{value}</div><div className="text-[9px] text-muted-foreground uppercase">{label}</div></div>;
}

export default ProvenanceTooltip;
