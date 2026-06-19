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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { api } from '@/services/api';
import { AppPage, PageHeader } from '@/components/foundation';

interface BatchJob {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  total: number;
  processed: number;
  completed_count: number;
  failed_count: number;
  results?: BatchResult[];
  download_url?: string;
}

interface BatchResult {
  query: string;
  status: 'found' | 'not_found' | 'error';
  match_count: number;
  top_score?: number;
  top_match_name?: string;
  error?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function BulkScreeningPage() {
  const { t } = useTranslation();
  const [step, setStep] = useState<'upload' | 'processing' | 'results'>('upload');
  const [inputMethod, setInputMethod] = useState<'file' | 'text'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [namesText, setNamesText] = useState('');
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
  }, []);

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

  const parseNamesFromCSV = async (csvFile: File): Promise<string[]> => {
    const text = await csvFile.text();
    const lines = text.split('\n');
    const headers = lines[0]?.split(',').map(h => h.trim().toLowerCase());
    const nameIndex = headers?.findIndex(h => h === 'name' || h === 'nombre');
    
    if (nameIndex === -1 || nameIndex === undefined) {
      // If no header, assume first column
      return lines.filter(l => l.trim()).map(l => l.split(',')[0].trim());
    }
    
    return lines.slice(1).map(line => {
      const cols = line.split(',');
      return cols[nameIndex]?.trim();
    }).filter(Boolean);
  };

  const startScreening = async () => {
    let names: string[] = [];
    
    if (inputMethod === 'file' && file) {
      names = await parseNamesFromCSV(file);
    } else if (inputMethod === 'text') {
      names = parseNamesFromText();
    }
    
    if (names.length === 0) {
      toast.error(t('workspace.bulk.toast.noNames'));
      return;
    }

    if (names.length > 1000) {
      toast.error(t('workspace.bulk.toast.tooManyNames'));
      return;
    }
    
    setStep('processing');
    
    try {
      const response = await api.post('/api/v2/screen/gold/batch', {
        names,
        min_score: minScore,
      });
      
      const newJob: BatchJob = {
        job_id: response.data.job_id,
        status: 'queued',
        total: names.length,
        processed: 0,
        completed_count: 0,
        failed_count: 0,
      };
      
      setJob(newJob);
      startPolling(response.data.job_id);
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
          status: data.status,
          processed: data.processed,
          completed_count: data.completed,
          failed_count: data.failed,
          results: data.results,
          download_url: data.download_url,
        }));
        
        if (data.status === 'completed' || data.status === 'failed') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setStep('results');
          if (data.status === 'completed') {
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
        type: format === 'csv' ? 'text/csv' : 'application/json' 
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
    setJob(null);
    if (pollingRef.current) clearInterval(pollingRef.current);
  };

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
              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant={inputMethod === 'file' ? 'default' : 'outline'}
                  onClick={() => setInputMethod('file')}
                  className="flex-1"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {t('workspace.bulk.uploadCsv')}
                </Button>
                <Button
                  variant={inputMethod === 'text' ? 'default' : 'outline'}
                  onClick={() => setInputMethod('text')}
                  className="flex-1"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {t('workspace.bulk.pasteNames')}
                </Button>
              </motion.div>

              {/* File Upload */}
              {inputMethod === 'file' && (
                <motion.div variants={itemVariants}>
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
                  disabled={
                    (inputMethod === 'file' && !file) ||
                    (inputMethod === 'text' && parseNamesFromText().length === 0)
                  }
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
                      <span className="text-muted-foreground">{t('workspace.bulk.successful', { count: job?.completed_count ?? 0 })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                      <span className="text-muted-foreground">{t('workspace.bulk.failed', { count: job?.failed_count ?? 0 })}</span>
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
                          {t('workspace.bulk.resultsSummary', { processed: job?.completed_count ?? 0, failed: job?.failed_count ?? 0 })}
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
                  <div className="space-y-3 md:hidden">
                    {job.results.map((result, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.02, 0.3) }}
                      >
                        <Card className="bg-card border-foreground/5">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm text-foreground break-words">{result.query}</p>
                              {result.status === 'found' ? (
                                <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">{t('workspace.bulk.status.found')}</Badge>
                              ) : result.status === 'not_found' ? (
                                <Badge className="bg-gray-500/10 text-muted-foreground border-gray-500/20">{t('workspace.bulk.status.notFound')}</Badge>
                              ) : (
                                <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">{t('workspace.bulk.status.error')}</Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{t('workspace.bulk.table.matches')}</p>
                                <p className="text-muted-foreground">{result.match_count}</p>
                              </div>
                              <div>
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{t('workspace.bulk.table.score')}</p>
                                {result.top_score ? (
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      result.top_score >= 90
                                        ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                                        : result.top_score >= 70
                                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                                        : 'bg-gray-500/10 text-muted-foreground border-gray-500/20'
                                    )}
                                  >
                                    {Math.round(result.top_score)}%
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{t('workspace.bulk.table.bestMatch')}</p>
                              <p className="text-sm text-muted-foreground break-words">{result.top_match_name || '-'}</p>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>

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
                            <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                              {t('workspace.bulk.table.score')}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-foreground/5">
                          {job.results.map((result, index) => (
                            <motion.tr
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.02 }}
                              className="hover:bg-foreground/5 transition-colors"
                            >
                              <td className="px-6 py-4">
                                <span className="text-sm text-foreground">{result.query}</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                {result.status === 'found' ? (
                                  <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                                    {t('workspace.bulk.status.found')}
                                  </Badge>
                                ) : result.status === 'not_found' ? (
                                  <Badge className="bg-gray-500/10 text-muted-foreground border-gray-500/20">
                                    {t('workspace.bulk.status.notFound')}
                                  </Badge>
                                ) : (
                                  <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
                                    {t('workspace.bulk.status.error')}
                                  </Badge>
                                )}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-sm text-muted-foreground">{result.match_count}</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm text-muted-foreground">
                                  {result.top_match_name || '-'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                {result.top_score ? (
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      result.top_score >= 90
                                        ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                                        : result.top_score >= 70
                                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                                        : 'bg-gray-500/10 text-muted-foreground border-gray-500/20'
                                    )}
                                  >
                                    {Math.round(result.top_score)}%
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                            </motion.tr>
                          ))}
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
