import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ScrollText,
  Plus,
  Upload,
  FileText,
  Download,
  Eye,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { AppPage, PageHeader, EmptyState } from '@/components/foundation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { regulatoryService } from '@/services/regulatory';
import type {
  RegulatoryOperation,
  ReportType,
  CreateOperationBody,
  GenerateReportResponse,
} from '@/services/regulatory';

const REPORT_TYPES: ReportType[] = ['relevante', 'inusual', 'preocupante'];
const PAGE_SIZE = 25;

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const reportTypeColors: Record<string, string> = {
  relevante: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
  inusual: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  preocupante: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
};

// ─────────────────────────────── Operations tab ───────────────────────────────

function OperationsTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState('');
  const [reportType, setReportType] = useState('all');
  const [page, setPage] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['regulatory-operations', period, reportType, page],
    queryFn: () =>
      regulatoryService.listOperations({
        period: period || undefined,
        report_type: reportType === 'all' ? undefined : reportType,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
  });

  const operations: RegulatoryOperation[] = data?.operations ?? data?.items ?? [];
  const total = data?.total ?? operations.length;
  const hasNext = (page + 1) * PAGE_SIZE < total;

  const refetchList = () =>
    queryClient.invalidateQueries({ queryKey: ['regulatory-operations'] });

  return (
    <div className="space-y-4">
      {/* Filters + actions */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div>
            <Label className="text-muted-foreground text-xs">
              {t('compliance.regulatory.filters.period')}
            </Label>
            <Input
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value);
                setPage(0);
              }}
              placeholder="2026-06"
              className="bg-foreground/5 border-foreground/10 text-foreground mt-1 w-40"
            />
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">
              {t('compliance.regulatory.filters.reportType')}
            </Label>
            <Select
              value={reportType}
              onValueChange={(v) => {
                setReportType(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="bg-foreground/5 border-foreground/10 text-foreground mt-1 w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-foreground/10">
                <SelectItem value="all">{t('compliance.regulatory.filters.allTypes')}</SelectItem>
                {REPORT_TYPES.map((rt) => (
                  <SelectItem key={rt} value={rt}>
                    {t(`compliance.regulatory.reportTypes.${rt}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowImport(true)}
            className="gap-1 text-muted-foreground border-foreground/10 hover:bg-foreground/5"
          >
            <Upload className="w-4 h-4" />
            {t('compliance.regulatory.operations.importCsv')}
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1">
            <Plus className="w-4 h-4" />
            {t('compliance.regulatory.operations.register')}
          </Button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : operations.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t('compliance.regulatory.operations.empty.title')}
          description={t('compliance.regulatory.operations.empty.description')}
        />
      ) : (
        <>
          <div className="glass rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('compliance.regulatory.columns.reference')}</TableHead>
                  <TableHead>{t('compliance.regulatory.columns.date')}</TableHead>
                  <TableHead>{t('compliance.regulatory.columns.reportType')}</TableHead>
                  <TableHead>{t('compliance.regulatory.columns.operation')}</TableHead>
                  <TableHead>{t('compliance.regulatory.columns.instrument')}</TableHead>
                  <TableHead className="text-right">{t('compliance.regulatory.columns.amount')}</TableHead>
                  <TableHead>{t('compliance.regulatory.columns.client')}</TableHead>
                  <TableHead>{t('compliance.regulatory.columns.rfc')}</TableHead>
                  <TableHead>{t('compliance.regulatory.columns.reported')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operations.map((op) => (
                  <TableRow key={op.id}>
                    <TableCell className="font-mono text-xs">{op.reference}</TableCell>
                    <TableCell className="text-muted-foreground">{op.operation_date || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-[10px]', reportTypeColors[op.report_type])}>
                        {t(`compliance.regulatory.reportTypes.${op.report_type}`, { defaultValue: op.report_type })}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{op.operation_type || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{op.instrument || '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {op.amount != null
                        ? `${op.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} ${op.currency || ''}`.trim()
                        : '—'}
                    </TableCell>
                    <TableCell className="text-foreground">{op.subject_name || '—'}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{op.subject_rfc || '—'}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px]',
                          op.reported
                            ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30'
                            : 'bg-gray-500/10 text-muted-foreground border-gray-500/30',
                        )}
                      >
                        {op.reported ? t('compliance.regulatory.yes') : t('compliance.regulatory.no')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {t('compliance.regulatory.pagination.summary', {
                from: page * PAGE_SIZE + 1,
                to: page * PAGE_SIZE + operations.length,
                total,
              })}
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="gap-1 text-muted-foreground border-foreground/10"
              >
                <ChevronLeft className="w-4 h-4" />
                {t('common.actions.previous')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!hasNext}
                onClick={() => setPage((p) => p + 1)}
                className="gap-1 text-muted-foreground border-foreground/10"
              >
                {t('common.actions.next')}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      <RegisterOperationDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={refetchList}
      />
      <ImportCsvDialog
        open={showImport}
        onClose={() => setShowImport(false)}
        onSuccess={refetchList}
      />
    </div>
  );
}

// ─────────────────────────────── Register dialog ───────────────────────────────

function RegisterOperationDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<CreateOperationBody>(() => ({
    reference: '',
    report_type: 'relevante',
    subject_person_type: 'fisica',
    period: currentPeriod(),
  }));

  const set = <K extends keyof CreateOperationBody>(key: K, value: CreateOperationBody[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const needsReason = form.report_type === 'inusual' || form.report_type === 'preocupante';

  const mutation = useMutation({
    mutationFn: () => {
      const body: CreateOperationBody = {
        ...form,
        amount: form.amount != null ? Number(form.amount) : undefined,
        amount_mxn: form.amount_mxn != null ? Number(form.amount_mxn) : undefined,
      };
      return regulatoryService.createOperation(body);
    },
    onSuccess: () => {
      toast.success(t('compliance.regulatory.register.toast.created'));
      onSuccess();
      onClose();
      setForm({
        reference: '',
        report_type: 'relevante',
        subject_person_type: 'fisica',
        period: currentPeriod(),
      });
    },
    onError: () => toast.error(t('compliance.regulatory.register.toast.error')),
  });

  const canSubmit =
    form.reference.trim().length > 0 &&
    (!needsReason || (form.unusual_reason ?? '').trim().length > 0) &&
    !mutation.isPending;

  const inputClass = 'bg-foreground/5 border-foreground/10 text-foreground mt-1';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-foreground/10 text-foreground max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('compliance.regulatory.register.title')}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-muted-foreground">{t('compliance.regulatory.fields.reference')} *</Label>
            <Input value={form.reference} onChange={(e) => set('reference', e.target.value)} className={inputClass} />
          </div>
          <div>
            <Label className="text-muted-foreground">{t('compliance.regulatory.fields.reportType')}</Label>
            <Select value={form.report_type} onValueChange={(v) => set('report_type', v as ReportType)}>
              <SelectTrigger className={inputClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-foreground/10">
                {REPORT_TYPES.map((rt) => (
                  <SelectItem key={rt} value={rt}>
                    {t(`compliance.regulatory.reportTypes.${rt}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-muted-foreground">{t('compliance.regulatory.fields.operationDate')}</Label>
            <Input type="date" value={form.operation_date ?? ''} onChange={(e) => set('operation_date', e.target.value)} className={inputClass} />
          </div>
          <div>
            <Label className="text-muted-foreground">{t('compliance.regulatory.fields.period')}</Label>
            <Input value={form.period ?? ''} onChange={(e) => set('period', e.target.value)} placeholder="2026-06" className={inputClass} />
          </div>
          <div>
            <Label className="text-muted-foreground">{t('compliance.regulatory.fields.operationType')}</Label>
            <Input value={form.operation_type ?? ''} onChange={(e) => set('operation_type', e.target.value)} className={inputClass} />
          </div>
          <div>
            <Label className="text-muted-foreground">{t('compliance.regulatory.fields.instrument')}</Label>
            <Input value={form.instrument ?? ''} onChange={(e) => set('instrument', e.target.value)} className={inputClass} />
          </div>
          <div>
            <Label className="text-muted-foreground">{t('compliance.regulatory.fields.amount')}</Label>
            <Input
              type="number"
              step="0.01"
              value={form.amount ?? ''}
              onChange={(e) => set('amount', e.target.value === '' ? undefined : Number(e.target.value))}
              className={inputClass}
            />
          </div>
          <div>
            <Label className="text-muted-foreground">{t('compliance.regulatory.fields.currency')}</Label>
            <Input value={form.currency ?? ''} onChange={(e) => set('currency', e.target.value)} placeholder="MXN" className={inputClass} />
          </div>
          <div>
            <Label className="text-muted-foreground">{t('compliance.regulatory.fields.amountMxn')}</Label>
            <Input
              type="number"
              step="0.01"
              value={form.amount_mxn ?? ''}
              onChange={(e) => set('amount_mxn', e.target.value === '' ? undefined : Number(e.target.value))}
              className={inputClass}
            />
          </div>
          <div>
            <Label className="text-muted-foreground">{t('compliance.regulatory.fields.branch')}</Label>
            <Input value={form.branch ?? ''} onChange={(e) => set('branch', e.target.value)} className={inputClass} />
          </div>
          <div>
            <Label className="text-muted-foreground">{t('compliance.regulatory.fields.personType')}</Label>
            <Select value={form.subject_person_type} onValueChange={(v) => set('subject_person_type', v as CreateOperationBody['subject_person_type'])}>
              <SelectTrigger className={inputClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-foreground/10">
                <SelectItem value="fisica">{t('compliance.regulatory.personType.fisica')}</SelectItem>
                <SelectItem value="moral">{t('compliance.regulatory.personType.moral')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-muted-foreground">{t('compliance.regulatory.fields.subjectName')}</Label>
            <Input value={form.subject_name ?? ''} onChange={(e) => set('subject_name', e.target.value)} className={inputClass} />
          </div>
          <div>
            <Label className="text-muted-foreground">{t('compliance.regulatory.fields.rfc')}</Label>
            <Input value={form.subject_rfc ?? ''} onChange={(e) => set('subject_rfc', e.target.value)} className={inputClass} />
          </div>
          <div>
            <Label className="text-muted-foreground">{t('compliance.regulatory.fields.curp')}</Label>
            <Input value={form.subject_curp ?? ''} onChange={(e) => set('subject_curp', e.target.value)} className={inputClass} />
          </div>
          <div>
            <Label className="text-muted-foreground">{t('compliance.regulatory.fields.birthDate')}</Label>
            <Input type="date" value={form.subject_birth_date ?? ''} onChange={(e) => set('subject_birth_date', e.target.value)} className={inputClass} />
          </div>
          <div>
            <Label className="text-muted-foreground">{t('compliance.regulatory.fields.nationality')}</Label>
            <Input value={form.subject_nationality ?? ''} onChange={(e) => set('subject_nationality', e.target.value)} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-muted-foreground">{t('compliance.regulatory.fields.address')}</Label>
            <Input value={form.subject_address ?? ''} onChange={(e) => set('subject_address', e.target.value)} className={inputClass} />
          </div>
          <div>
            <Label className="text-muted-foreground">{t('compliance.regulatory.fields.clientId')}</Label>
            <Input value={form.client_id ?? ''} onChange={(e) => set('client_id', e.target.value)} className={inputClass} />
          </div>
          {needsReason && (
            <div className="sm:col-span-2">
              <Label className="text-muted-foreground">{t('compliance.regulatory.fields.unusualReason')} *</Label>
              <Textarea
                value={form.unusual_reason ?? ''}
                onChange={(e) => set('unusual_reason', e.target.value)}
                rows={3}
                className={inputClass}
              />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} className="text-muted-foreground">
            {t('common.actions.cancel')}
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!canSubmit}>
            {mutation.isPending ? t('compliance.regulatory.register.saving') : t('compliance.regulatory.register.submit')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────── Import CSV dialog ───────────────────────────────

function ImportCsvDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [reportType, setReportType] = useState<ReportType>('relevante');
  const [period, setPeriod] = useState(currentPeriod());

  const columns = ['fecha', 'tipo', 'instrumento', 'moneda', 'monto', 'nombre', 'rfc', 'curp', 'fecha_nacimiento', 'nacionalidad', 'domicilio', 'motivo'];

  const mutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('no file');
      return regulatoryService.importOperations(file, reportType, period);
    },
    onSuccess: (res) => {
      toast.success(
        t('compliance.regulatory.import.toast.success', { count: res.imported ?? res.total ?? 0 }),
      );
      onSuccess();
      onClose();
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    },
    onError: () => toast.error(t('compliance.regulatory.import.toast.error')),
  });

  const inputClass = 'bg-foreground/5 border-foreground/10 text-foreground mt-1';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-foreground/10 text-foreground max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('compliance.regulatory.import.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">{t('compliance.regulatory.fields.reportType')}</Label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                <SelectTrigger className={inputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-foreground/10">
                  {REPORT_TYPES.map((rt) => (
                    <SelectItem key={rt} value={rt}>
                      {t(`compliance.regulatory.reportTypes.${rt}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('compliance.regulatory.fields.period')}</Label>
              <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-06" className={inputClass} />
            </div>
          </div>
          <div>
            <Label className="text-muted-foreground">{t('compliance.regulatory.import.file')}</Label>
            <Input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className={inputClass}
            />
          </div>
          <div className="rounded-lg bg-foreground/5 border border-foreground/10 p-3">
            <p className="text-xs text-muted-foreground mb-2">{t('compliance.regulatory.import.expectedColumns')}</p>
            <div className="flex flex-wrap gap-1.5">
              {columns.map((c) => (
                <span key={c} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-foreground/10 text-muted-foreground">
                  {c}
                </span>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose} className="text-muted-foreground">
              {t('common.actions.cancel')}
            </Button>
            <Button onClick={() => mutation.mutate()} disabled={!file || mutation.isPending} className="gap-1">
              <Upload className="w-4 h-4" />
              {mutation.isPending ? t('compliance.regulatory.import.importing') : t('compliance.regulatory.import.submit')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────── Generate tab ───────────────────────────────

function GenerateTab() {
  const { t } = useTranslation();
  const [regime, setRegime] = useState('siti_cc');
  const [reportType, setReportType] = useState('');
  const [period, setPeriod] = useState(currentPeriod());
  const [claveRcc, setClaveRcc] = useState('');
  const [rfc, setRfc] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [preview, setPreview] = useState<GenerateReportResponse | null>(null);

  const { data: regimesData } = useQuery({
    queryKey: ['regulatory-regimes'],
    queryFn: () => regulatoryService.getRegimes(),
  });

  const regimes = regimesData?.regimes ?? [];
  const activeRegime = useMemo(
    () => regimes.find((r) => r.regime === regime) ?? regimes[0],
    [regimes, regime],
  );
  const availableReportTypes = activeRegime?.report_types ?? REPORT_TYPES;

  // Default the report type once regimes load.
  const effectiveReportType = reportType || availableReportTypes[0] || '';

  const generateMutation = useMutation({
    mutationFn: () =>
      regulatoryService.generateReport({
        regime,
        report_type: effectiveReportType,
        period,
        entity_config: { clave_rcc: claveRcc, rfc, razon_social: razonSocial },
      }),
    onSuccess: (res) => {
      setPreview(res);
      toast.success(t('compliance.regulatory.generate.toast.previewed', { count: res.operation_count }));
    },
    onError: () => toast.error(t('compliance.regulatory.generate.toast.error')),
  });

  const downloadMutation = useMutation({
    mutationFn: () =>
      regulatoryService.downloadReport({
        regime,
        report_type: effectiveReportType,
        period,
        clave_rcc: claveRcc,
        rfc,
        razon_social: razonSocial,
      }),
    onSuccess: () => toast.success(t('compliance.regulatory.generate.toast.downloaded')),
    onError: () => toast.error(t('compliance.regulatory.generate.toast.downloadError')),
  });

  const inputClass = 'bg-foreground/5 border-foreground/10 text-foreground mt-1';
  const canRun = effectiveReportType.length > 0 && period.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="glass rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label className="text-muted-foreground">{t('compliance.regulatory.generate.fields.regime')}</Label>
            <Select value={regime} onValueChange={(v) => { setRegime(v); setReportType(''); }}>
              <SelectTrigger className={inputClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-foreground/10">
                {(regimes.length ? regimes.map((r) => r.regime) : ['siti_cc']).map((rg) => (
                  <SelectItem key={rg} value={rg}>{rg}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-muted-foreground">{t('compliance.regulatory.generate.fields.reportType')}</Label>
            <Select value={effectiveReportType} onValueChange={setReportType}>
              <SelectTrigger className={inputClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-foreground/10">
                {availableReportTypes.map((rt) => (
                  <SelectItem key={rt} value={rt}>
                    {t(`compliance.regulatory.reportTypes.${rt}`, { defaultValue: rt })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-muted-foreground">{t('compliance.regulatory.generate.fields.period')}</Label>
            <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-06" className={inputClass} />
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">{t('compliance.regulatory.generate.entitySection')}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-muted-foreground">{t('compliance.regulatory.generate.fields.claveRcc')}</Label>
              <Input value={claveRcc} onChange={(e) => setClaveRcc(e.target.value)} className={inputClass} />
            </div>
            <div>
              <Label className="text-muted-foreground">{t('compliance.regulatory.generate.fields.rfc')}</Label>
              <Input value={rfc} onChange={(e) => setRfc(e.target.value)} className={inputClass} />
            </div>
            <div>
              <Label className="text-muted-foreground">{t('compliance.regulatory.generate.fields.razonSocial')}</Label>
              <Input value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button onClick={() => generateMutation.mutate()} disabled={!canRun || generateMutation.isPending} className="gap-1">
            <Eye className="w-4 h-4" />
            {generateMutation.isPending ? t('compliance.regulatory.generate.previewing') : t('compliance.regulatory.generate.preview')}
          </Button>
          <Button
            variant="outline"
            onClick={() => downloadMutation.mutate()}
            disabled={!canRun || downloadMutation.isPending}
            className="gap-1 text-muted-foreground border-foreground/10 hover:bg-foreground/5"
          >
            <Download className="w-4 h-4" />
            {downloadMutation.isPending ? t('compliance.regulatory.generate.downloading') : t('compliance.regulatory.generate.download')}
          </Button>
        </div>
      </div>

      {/* Preview result */}
      {preview && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
              {t('compliance.regulatory.generate.operationCount', { count: preview.operation_count })}
            </Badge>
          </div>

          {preview.operation_count === 0 && (
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertTitle>{t('compliance.regulatory.generate.noOps.title')}</AlertTitle>
              <AlertDescription>{t('compliance.regulatory.generate.noOps.description')}</AlertDescription>
            </Alert>
          )}

          {preview.warnings && preview.warnings.length > 0 && (
            <Alert className="border-amber-500/30 bg-amber-500/5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-amber-700 dark:text-amber-400">
                {t('compliance.regulatory.generate.warnings', { count: preview.warnings.length })}
              </AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-0.5">
                  {preview.warnings.map((w, i) => (
                    <li key={i} className="text-amber-700 dark:text-amber-400/90">{w}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div>
            <Label className="text-muted-foreground text-xs">{t('compliance.regulatory.generate.xmlPreview')}</Label>
            <pre className="mt-1 max-h-[480px] overflow-auto rounded-xl bg-foreground/5 border border-foreground/10 p-4 text-xs font-mono text-foreground whitespace-pre">
              {preview.xml}
            </pre>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─────────────────────────────── Page ───────────────────────────────

export function RegulatoryReportsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('operations');

  return (
    <AppPage>
      <PageHeader
        title={t('compliance.regulatory.title')}
        description={t('compliance.regulatory.description')}
        icon={
          <div className="p-2.5 rounded-lg bg-gradient-to-br from-brand-blue/20 to-brand-electric/20 border border-brand-blue/30">
            <ScrollText className="w-6 h-6 text-electric-700 dark:text-electric-400" aria-hidden="true" />
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 mt-6">
        <TabsList className="bg-foreground/5 border border-foreground/10 p-1">
          <TabsTrigger value="operations" className="data-[state=active]:bg-foreground/10">
            <FileText className="w-4 h-4 mr-2" />
            {t('compliance.regulatory.tabs.operations')}
          </TabsTrigger>
          <TabsTrigger value="generate" className="data-[state=active]:bg-foreground/10">
            <ScrollText className="w-4 h-4 mr-2" />
            {t('compliance.regulatory.tabs.generate')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="operations">
          <OperationsTab />
        </TabsContent>
        <TabsContent value="generate">
          <GenerateTab />
        </TabsContent>
      </Tabs>
    </AppPage>
  );
}

export default RegulatoryReportsPage;
