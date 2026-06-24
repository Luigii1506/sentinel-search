import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  X,
  Play,
  Download,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileSpreadsheet,
  Plus,
  ShieldAlert,
  Rows3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { api } from '@/services/api';
import { AppPage, PageHeader } from '@/components/foundation';

type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | string;

interface BatchMatch {
  entity_id?: string;
  name?: string;
  matched_name?: string;
  score?: number;
  risk_score?: number;
  risk_level?: RiskLevel;
  is_pep?: boolean;
  sanctioned?: boolean;
  sources?: string[];
  topics?: string[];
  countries?: string[];
}

interface BatchResult {
  query?: string;
  query_name?: string;
  status: 'found' | 'not_found' | 'error';
  match_count: number;
  top_score?: number;
  matches?: BatchMatch[];
  error?: string;
}

interface BatchJob {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'partial' | 'failed';
  total: number;
  processed: number;
  completed: number;
  failed: number;
  matches?: number;
  results?: BatchResult[];
  download_url?: string;
  error_message?: string;
}

interface StructuredRow {
  name: string;
  birth_date?: string;
  rfc?: string;
  country?: string;
}

const MAX_ITEMS = 5000;

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

// Helpers operating on the new result shape ------------------------------------

const resultQuery = (r: BatchResult): string => r.query ?? r.query_name ?? '';
const topMatch = (r: BatchResult): BatchMatch | undefined => r.matches?.[0];
const bestMatchName = (r: BatchResult): string => {
  const m = topMatch(r);
  return m?.matched_name || m?.name || '';
};
const bestScore = (r: BatchResult): number | undefined => {
  if (typeof r.top_score === 'number') return r.top_score;
  return topMatch(r)?.score;
};
const isCriticalResult = (r: BatchResult): boolean => {
  const m = topMatch(r);
  if (!m) return false;
  return !!m.sanctioned || m.risk_level === 'critical';
};

export function BulkScreeningPage() {
  const { t } = useTranslation();
  const [step, setStep] = useState<'upload' | 'processing' | 'results'>('upload');
  const [inputMethod, setInputMethod] = useState<'file' | 'text' | 'rows'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [namesText, setNamesText] = useState('');
  const [rows, setRows] = useState<StructuredRow[]>([]);
  const [draftRow, setDraftRow] = useState<StructuredRow>({ name: '', birth_date: '', rfc: '', country: '' });
  const [minScore, setMinScore] = useState(0.7);
  const [job, setJob] = useState<BatchJob | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv'))) {
      setFile(droppedFile);
    } else {
      toast.error(t('workspace.bulk.toast.invalidFile'));
    }
  }, [t]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const parseNamesFromText = (): string[] => {
    return namesText
      .split('\n')
      .map(n => n.trim())
      .filter(n => n.length > 0);
  };

  const addRow = () => {
    const name = draftRow.name.trim();
    if (!name) {
      toast.error(t('workspace.bulk.nameRequired'));
      return;
    }
    const row: StructuredRow = { name };
    if (draftRow.birth_date?.trim()) row.birth_date = draftRow.birth_date.trim();
    if (draftRow.rfc?.trim()) row.rfc = draftRow.rfc.trim();
    if (draftRow.country?.trim()) row.country = draftRow.country.trim();
    setRows(prev => [...prev, row]);
    setDraftRow({ name: '', birth_date: '', rfc: '', country: '' });
  };

  const removeRow = (index: number) => {
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  const initJob = (jobId: string, total: number) => {
    const newJob: BatchJob = {
      job_id: jobId,
      status: 'queued',
      total,
      processed: 0,
      completed: 0,
      failed: 0,
    };
    setJob(newJob);
    startPolling(jobId);
  };

  const startScreening = async () => {
    setStep('processing');
    try {
      if (inputMethod === 'file' && file) {
        // Send the raw file: backend does flexible column mapping server-side.
        const fd = new FormData();
        fd.append('file', file);
        const response = await api.post('/api/v2/screen/gold/batch/upload', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
          params: { min_score: minScore },
        });
        const total = response.data.total ?? 0;
        initJob(response.data.job_id, total);
        toast.success(t('workspace.bulk.toast.jobCreated', { count: total }));
        return;
      }

      if (inputMethod === 'rows') {
        if (rows.length === 0) {
          toast.error(t('workspace.bulk.noRows'));
          setStep('upload');
          return;
        }
        if (rows.length > MAX_ITEMS) {
          toast.error(t('workspace.bulk.toast.tooManyNames'));
          setStep('upload');
          return;
        }
        const response = await api.post('/api/v2/screen/gold/batch', {
          rows,
          min_score: minScore,
        });
        initJob(response.data.job_id, rows.length);
        toast.success(t('workspace.bulk.toast.jobCreated', { count: rows.length }));
        return;
      }

      // text / paste mode -> legacy names[] path
      const names = parseNamesFromText();
      if (names.length === 0) {
        toast.error(t('workspace.bulk.toast.noNames'));
        setStep('upload');
        return;
      }
      if (names.length > MAX_ITEMS) {
        toast.error(t('workspace.bulk.toast.tooManyNames'));
        setStep('upload');
        return;
      }
      const response = await api.post('/api/v2/screen/gold/batch', {
        names,
        min_score: minScore,
      });
      initJob(response.data.job_id, names.length);
      toast.success(t('workspace.bulk.toast.jobCreated', { count: names.length }));
    } catch (error) {
      toast.error(t('workspace.bulk.toast.jobError'));
      setStep('upload');
    }
  };

  const startPolling = (jobId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const response = await api.get(`/api/v2/screen/gold/batch/${jobId}`);
        const data = response.data;

        setJob(prev => ({
          ...prev!,
          job_id: data.job_id ?? prev!.job_id,
          status: data.status,
          total: data.total ?? prev!.total,
          processed: data.processed ?? 0,
          completed: data.completed ?? 0,
          failed: data.failed ?? 0,
          matches: data.matches,
          results: data.results,
          download_url: data.download_url,
          error_message: data.error_message,
        }));

        if (data.status === 'completed' || data.status === 'partial' || data.status === 'failed') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setStep('results');
          if (data.status === 'failed') {
            toast.error(data.error_message || t('workspace.bulk.toast.jobError'));
          } else {
            toast.success(t('workspace.bulk.toast.completed'));
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000);
  };

  const downloadResults = async (format: 'csv' | 'json') => {
    if (!job?.job_id) return;

    try {
      const response = await api.get(`/api/v2/screen/gold/batch/${job.job_id}/download?format=${format}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], {
        type: format === 'csv' ? 'text/csv' : 'application/json',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `screening-results-${job.job_id}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(t('workspace.bulk.toast.downloaded', { format: format.toUpperCase() }));
    } catch (error) {
      toast.error(t('workspace.bulk.toast.downloadError'));
    }
  };

  const reset = () => {
    setStep('upload');
    setFile(null);
    setNamesText('');
    setRows([]);
    setDraftRow({ name: '', birth_date: '', rfc: '', country: '' });
    setJob(null);
    if (pollingRef.current) clearInterval(pollingRef.current);
  };

  const riskBadgeClass = (level?: RiskLevel) =>
    level === 'critical'
      ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
      : level === 'high'
      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
      : level === 'medium'
      ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20'
      : 'bg-gray-500/10 text-muted-foreground border-gray-500/20';

  const riskLabel = (level?: RiskLevel) => {
    if (!level) return '-';
    const known = ['critical', 'high', 'medium', 'low'];
    return known.includes(level) ? t(`workspace.bulk.risk.${level}`) : level;
  };

  const scoreBadgeClass = (score?: number) =>
    typeof score === 'number'
      ? score >= 90
        ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
        : score >= 70
        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
        : 'bg-gray-500/10 text-muted-foreground border-gray-500/20'
      : '';

  const statusBadge = (status: BatchResult['status']) =>
    status === 'found' ? (
      <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
        {t('workspace.bulk.status.found')}
      </Badge>
    ) : status === 'not_found' ? (
      <Badge className="bg-gray-500/10 text-muted-foreground border-gray-500/20">
        {t('workspace.bulk.status.notFound')}
      </Badge>
    ) : (
      <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
        {t('workspace.bulk.status.error')}
      </Badge>
    );

  const sanctionBadge = (m?: BatchMatch) => {
    if (!m) return <span className="text-muted-foreground">-</span>;
    if (m.sanctioned) {
      return (
        <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
          {t('workspace.bulk.badge.sanctioned')}
        </Badge>
      );
    }
    if (m.is_pep) {
      return (
        <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20">
          {t('workspace.bulk.badge.pep')}
        </Badge>
      );
    }
    return <span className="text-muted-foreground">-</span>;
  };

  const matchedCount = job?.results?.filter(r => r.status === 'found').length ?? 0;

  const startDisabled =
    (inputMethod === 'file' && !file) ||
    (inputMethod === 'text' && parseNamesFromText().length === 0) ||
    (inputMethod === 'rows' && rows.length === 0);

  return (
    <AppPage width="default">
        <PageHeader
          title={t('workspace.bulk.title')}
          description={t('workspace.bulk.description')}
          icon={
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-brand-blue/20 to-brand-electric/20 border border-brand-blue/30">
              <FileSpreadsheet className="w-6 h-6 text-electric-700 dark:text-electric-400" aria-hidden="true" />
            </div>
          }
        />

        <AnimatePresence mode="wait">
          {step === 'upload' && (
            <motion.div
              key="upload"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Input Method Toggle */}
              <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button
                  variant={inputMethod === 'file' ? 'default' : 'outline'}
                  onClick={() => setInputMethod('file')}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {t('workspace.bulk.uploadCsv')}
                </Button>
                <Button
                  variant={inputMethod === 'text' ? 'default' : 'outline'}
                  onClick={() => setInputMethod('text')}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {t('workspace.bulk.pasteNames')}
                </Button>
                <Button
                  variant={inputMethod === 'rows' ? 'default' : 'outline'}
                  onClick={() => setInputMethod('rows')}
                >
                  <Rows3 className="w-4 h-4 mr-2" />
                  {t('workspace.bulk.structuredRow')}
                </Button>
              </motion.div>

              {/* File Upload */}
              {inputMethod === 'file' && (
                <motion.div variants={itemVariants} className="space-y-3">
                  <Card
                    className={cn(
                      'border-2 border-dashed transition-colors',
                      isDragging ? 'border-blue-500 bg-blue-500/5' : 'border-foreground/10',
                      file ? 'bg-green-500/5 border-green-500/30' : 'bg-card'
                    )}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleFileDrop}
                  >
                    <CardContent className="p-8 text-center">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileSelect}
                        className="hidden"
                      />

                      {file ? (
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-4">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-8 h-8 text-green-700 dark:text-green-400" />
                            <div className="text-left min-w-0">
                              <p className="text-foreground font-medium break-all">{file.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {(file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFile(null)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="cursor-pointer"
                        >
                          <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-foreground font-medium mb-2">
                            {t('workspace.bulk.dropzone.title')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t('workspace.bulk.dropzone.hint')}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t('workspace.bulk.supportedColumns')}
                  </p>
                </motion.div>
              )}

              {/* Text Input */}
              {inputMethod === 'text' && (
                <motion.div variants={itemVariants}>
                  <Card className="bg-card border-foreground/5">
                    <CardHeader>
                      <CardTitle className="text-foreground">{t('workspace.bulk.namesToSearch')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={namesText}
                        onChange={(e) => setNamesText(e.target.value)}
                        placeholder={t('workspace.bulk.textareaPlaceholder')}
                        className="min-h-[200px] bg-background border-foreground/10 text-foreground placeholder:text-muted-foreground"
                      />
                      <p className="text-sm text-muted-foreground mt-2">
                        {t('workspace.bulk.namesDetected', { count: parseNamesFromText().length })}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Structured rows */}
              {inputMethod === 'rows' && (
                <motion.div variants={itemVariants}>
                  <Card className="bg-card border-foreground/5">
                    <CardHeader>
                      <CardTitle className="text-foreground">{t('workspace.bulk.structuredRow')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <Input
                          placeholder={`${t('workspace.bulk.field.name')} *`}
                          value={draftRow.name}
                          onChange={(e) => setDraftRow(r => ({ ...r, name: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') addRow(); }}
                        />
                        <Input
                          placeholder={t('workspace.bulk.field.birthDate')}
                          value={draftRow.birth_date}
                          onChange={(e) => setDraftRow(r => ({ ...r, birth_date: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') addRow(); }}
                        />
                        <Input
                          placeholder={t('workspace.bulk.field.rfcCurp')}
                          value={draftRow.rfc}
                          onChange={(e) => setDraftRow(r => ({ ...r, rfc: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') addRow(); }}
                        />
                        <Input
                          placeholder={t('workspace.bulk.field.country')}
                          value={draftRow.country}
                          onChange={(e) => setDraftRow(r => ({ ...r, country: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') addRow(); }}
                        />
                      </div>
                      <Button variant="outline" onClick={addRow} className="w-full sm:w-auto">
                        <Plus className="w-4 h-4 mr-2" />
                        {t('workspace.bulk.addRow')}
                      </Button>

                      {rows.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            {t('workspace.bulk.rowsAdded', { count: rows.length })}
                          </p>
                          <div className="space-y-1">
                            {rows.map((row, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between gap-3 rounded-lg border border-foreground/5 bg-background px-3 py-2"
                              >
                                <div className="min-w-0 text-sm">
                                  <span className="text-foreground font-medium">{row.name}</span>
                                  <span className="text-muted-foreground">
                                    {[row.birth_date, row.rfc, row.country].filter(Boolean).length > 0
                                      ? ` · ${[row.birth_date, row.rfc, row.country].filter(Boolean).join(' · ')}`
                                      : ''}
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  aria-label={t('workspace.bulk.removeRow')}
                                  onClick={() => removeRow(index)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Min Score Slider */}
              <motion.div variants={itemVariants}>
                <Card className="bg-card border-foreground/5">
                  <CardHeader>
                    <CardTitle className="text-foreground flex items-center justify-between">
                      <span>{t('workspace.bulk.minScore')}</span>
                      <Badge variant="outline" className="text-lg">
                        {Math.round(minScore * 100)}%
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Slider
                      value={[minScore]}
                      onValueChange={([v]) => setMinScore(v)}
                      min={0.5}
                      max={1}
                      step={0.05}
                      className="py-4"
                    />
                    <div className="flex flex-col gap-1 sm:flex-row sm:justify-between text-sm text-muted-foreground">
                      <span>{t('workspace.bulk.scoreMoreResults')}</span>
                      <span>{t('workspace.bulk.scoreExactOnly')}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Start Button */}
              <motion.div variants={itemVariants}>
                <Button
                  size="lg"
                  className="w-full"
                  onClick={startScreening}
                  disabled={startDisabled}
                >
                  <Play className="w-5 h-5 mr-2" />
                  {t('workspace.bulk.startScreening')}
                </Button>
              </motion.div>
            </motion.div>
          )}

          {step === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="bg-card border-foreground/5 p-8">
                <div className="text-center">
                  <div className="relative w-24 h-24 mx-auto mb-6">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="8"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="url(#gradient)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${(job?.processed || 0) / (job?.total || 1) * 283} 283`}
                        className="transition-all duration-500"
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <RefreshCw className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
                    </div>
                  </div>

                  <h2 className="text-2xl font-bold text-foreground mb-2">{t('workspace.bulk.processing')}</h2>
                  <p className="text-muted-foreground mb-6">
                    {t('workspace.bulk.processedOf', { processed: job?.processed ?? 0, total: job?.total ?? 0 })}
                  </p>

                  <div className="w-full max-w-md mx-auto bg-foreground/10 rounded-full h-2 mb-4">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${((job?.processed || 0) / (job?.total || 1)) * 100}%` }}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-700 dark:text-green-400" />
                      <span className="text-muted-foreground">{t('workspace.bulk.successful', { count: job?.completed ?? 0 })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                      <span className="text-muted-foreground">{t('workspace.bulk.failed', { count: job?.failed ?? 0 })}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {step === 'results' && (
            <motion.div
              key="results"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Summary */}
              <motion.div variants={itemVariants}>
                <Card className="bg-card border-foreground/5">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-bold text-foreground mb-1">{t('workspace.bulk.results')}</h2>
                        <p className="text-muted-foreground">
                          {t('workspace.bulk.summaryMatched', {
                            matched: matchedCount,
                            total: job?.total ?? job?.results?.length ?? 0,
                          })}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t('workspace.bulk.resultsSummary', { processed: job?.completed ?? 0, failed: job?.failed ?? 0 })}
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full sm:w-auto">
                        <Button variant="outline" onClick={() => downloadResults('csv')}>
                          <Download className="w-4 h-4 mr-2" />
                          CSV
                        </Button>
                        <Button variant="outline" onClick={() => downloadResults('json')}>
                          <Download className="w-4 h-4 mr-2" />
                          JSON
                        </Button>
                        <Button variant="ghost" onClick={reset}>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          {t('workspace.bulk.new')}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Results Table */}
              {job?.results && job.results.length > 0 && (
                <motion.div variants={itemVariants}>
                  {/* Mobile cards */}
                  <div className="space-y-3 md:hidden">
                    {job.results.map((result, index) => {
                      const m = topMatch(result);
                      const critical = isCriticalResult(result);
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(index * 0.02, 0.3) }}
                        >
                          <Card className={cn('bg-card border-foreground/5', critical && 'border-red-500/40 bg-red-500/5')}>
                            <CardContent className="p-4 space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <p className="text-sm text-foreground break-words flex items-center gap-1.5">
                                  {critical && <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />}
                                  {resultQuery(result)}
                                </p>
                                {statusBadge(result.status)}
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{t('workspace.bulk.table.matches')}</p>
                                  <p className="text-muted-foreground">{result.match_count}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{t('workspace.bulk.table.score')}</p>
                                  {typeof bestScore(result) === 'number' ? (
                                    <Badge variant="outline" className={scoreBadgeClass(bestScore(result))}>
                                      {Math.round(bestScore(result)!)}%
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </div>
                                <div>
                                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{t('workspace.bulk.table.risk')}</p>
                                  {m?.risk_level ? (
                                    <Badge variant="outline" className={riskBadgeClass(m.risk_level)}>
                                      {riskLabel(m.risk_level)}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </div>
                                <div>
                                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{t('workspace.bulk.table.sanctioned')}</p>
                                  {sanctionBadge(m)}
                                </div>
                              </div>
                              <div>
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{t('workspace.bulk.table.bestMatch')}</p>
                                <p className="text-sm text-muted-foreground break-words">{bestMatchName(result) || '-'}</p>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Desktop table */}
                  <Card className="hidden md:block bg-card border-foreground/5">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-foreground/5 border-b border-foreground/5">
                          <tr>
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                              {t('workspace.bulk.table.searchedName')}
                            </th>
                            <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                              {t('workspace.bulk.table.status')}
                            </th>
                            <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                              {t('workspace.bulk.table.matches')}
                            </th>
                            <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                              {t('workspace.bulk.table.bestMatch')}
                            </th>
                            <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                              {t('workspace.bulk.table.risk')}
                            </th>
                            <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                              {t('workspace.bulk.table.sanctioned')}
                            </th>
                            <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                              {t('workspace.bulk.table.score')}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-foreground/5">
                          {job.results.map((result, index) => {
                            const m = topMatch(result);
                            const critical = isCriticalResult(result);
                            return (
                              <motion.tr
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: Math.min(index * 0.02, 0.3) }}
                                className={cn(
                                  'transition-colors',
                                  critical ? 'bg-red-500/5 hover:bg-red-500/10' : 'hover:bg-foreground/5'
                                )}
                              >
                                <td className="px-6 py-4">
                                  <span className="text-sm text-foreground flex items-center gap-1.5">
                                    {critical && <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />}
                                    {resultQuery(result)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center">{statusBadge(result.status)}</td>
                                <td className="px-6 py-4 text-center">
                                  <span className="text-sm text-muted-foreground">{result.match_count}</span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-sm text-muted-foreground">{bestMatchName(result) || '-'}</span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  {m?.risk_level ? (
                                    <Badge variant="outline" className={riskBadgeClass(m.risk_level)}>
                                      {riskLabel(m.risk_level)}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-center">{sanctionBadge(m)}</td>
                                <td className="px-6 py-4 text-right">
                                  {typeof bestScore(result) === 'number' ? (
                                    <Badge variant="outline" className={scoreBadgeClass(bestScore(result))}>
                                      {Math.round(bestScore(result)!)}%
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                              </motion.tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
    </AppPage>
  );
}

export default BulkScreeningPage;
