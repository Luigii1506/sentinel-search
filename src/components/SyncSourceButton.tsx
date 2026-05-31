/**
 * SyncSourceButton — Botón con confirmación inline para disparar sync
 * manual de una fuente. Incluye loading state + toast feedback.
 */
import { useState } from 'react';
import { Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { adminService } from '@/services/admin';

interface SyncSourceButtonProps {
  sourceId: string;
  size?: 'sm' | 'default';
  variant?: 'ghost' | 'outline' | 'default';
  label?: string;
  /** Lista de queryKey prefixes a invalidar después del trigger. */
  invalidateKeys?: string[][];
  /** Compact mode: no muestra texto, solo icono. */
  iconOnly?: boolean;
  /** Callback cuando el dispatch fue exitoso (para activar refetch agresivo, etc.). */
  onDispatched?: () => void;
}

export function SyncSourceButton({
  sourceId,
  size = 'sm',
  variant = 'ghost',
  label,
  invalidateKeys = [['operations'], ['admin', 'sources']],
  iconOnly = false,
  onDispatched,
}: SyncSourceButtonProps) {
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const mut = useMutation({
    mutationFn: () => adminService.triggerSourceSync(sourceId, { force: true }),
    onSuccess: (data) => {
      toast.success(`Sync dispatched: ${sourceId}`, {
        description: `Queue: ${data.queue || 'default'} · task: ${(data.task_id || '').slice(0, 12)}…`,
      });
      // Triple invalidación para minimizar latencia visual:
      //   - inmediata: el endpoint de activity puede ya verlo
      //   - 1.5s: el worker ya creó el ingestion_job
      //   - 5s: el pipeline_step_state ya registró el stage
      const invalidate = () => {
        invalidateKeys.forEach((key) => qc.invalidateQueries({ queryKey: key }));
      };
      invalidate();
      setTimeout(invalidate, 1500);
      setTimeout(invalidate, 5000);
      onDispatched?.();
      setConfirming(false);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || err?.message || 'Error desconocido';
      toast.error(`No se pudo sincronizar ${sourceId}`, { description: msg });
      setConfirming(false);
    },
  });

  if (mut.isPending) {
    return (
      <Button size={size} variant={variant} disabled className="h-7 gap-1 text-xs">
        <Loader2 className="w-3 h-3 animate-spin" />
        {!iconOnly && 'Encolando…'}
      </Button>
    );
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <Button
          size={size}
          variant="default"
          className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
          onClick={() => mut.mutate()}
        >
          <Play className="w-3 h-3 mr-1" />
          {iconOnly ? '' : 'Confirmar'}
        </Button>
        <Button
          size={size}
          variant="ghost"
          className="h-7 text-xs text-gray-400"
          onClick={() => setConfirming(false)}
        >
          ✕
        </Button>
      </div>
    );
  }

  return (
    <Button
      size={size}
      variant={variant}
      className="h-7 text-xs"
      onClick={(e) => {
        e.stopPropagation();
        setConfirming(true);
      }}
      title={`Disparar sync manual de ${sourceId}`}
    >
      <Play className="w-3 h-3 mr-1" />
      {iconOnly ? '' : (label || 'Sync')}
    </Button>
  );
}

export default SyncSourceButton;
