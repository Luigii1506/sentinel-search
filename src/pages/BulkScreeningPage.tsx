import { useState, useRef, useCallback } from 'react';
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
      toast.error('Por favor sube un archivo CSV');
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
      toast.error('No se encontraron nombres para procesar');
      return;
    }
    
    if (names.length > 1000) {
      toast.error('Maximo 1000 nombres por batch');
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
      toast.success(`Job creado: ${names.length} nombres`);
    } catch (error) {
      toast.error('Error al crear el job');
      setStep('upload');
    }
  };

  const startPolling = (jobId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    
    pollingRef.current = setInterval(async () => {
      try {
        const response = await api.get(`/api/v2/screen/batch/${jobId}`);
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
            toast.success('Screening completado');
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
      const response = await api.get(`/api/v2/screen/batch/${job.job_id}/download?format=${format}`, {
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
      
      toast.success(`Descargado: ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Error al descargar');
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
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-start gap-3 mb-2">
            <FileSpreadsheet className="w-8 h-8 text-blue-400" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Bulk Screening</h1>
          </div>
          <p className="text-gray-400">
            Screening masivo de nombres contra la base de datos
          </p>
        </motion.div>

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
                  Subir CSV
                </Button>
                <Button
                  variant={inputMethod === 'text' ? 'default' : 'outline'}
                  onClick={() => setInputMethod('text')}
                  className="flex-1"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Pegar Nombres
                </Button>
              </motion.div>

              {/* File Upload */}
              {inputMethod === 'file' && (
                <motion.div variants={itemVariants}>
                  <Card
                    className={cn(
                      'border-2 border-dashed transition-colors',
                      isDragging ? 'border-blue-500 bg-blue-500/5' : 'border-white/10',
                      file ? 'bg-green-500/5 border-green-500/30' : 'bg-[#1a1a1a]'
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
                            <FileText className="w-8 h-8 text-green-400" />
                            <div className="text-left min-w-0">
                              <p className="text-white font-medium break-all">{file.name}</p>
                              <p className="text-sm text-gray-400">
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
                          <Upload className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                          <p className="text-white font-medium mb-2">
                            Arrastra un archivo CSV o haz click para seleccionar
                          </p>
                          <p className="text-sm text-gray-500">
                            Debe tener una columna llamada "name" o "nombre"
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
                  <Card className="bg-[#1a1a1a] border-white/5">
                    <CardHeader>
                      <CardTitle className="text-white">Nombres a buscar</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={namesText}
                        onChange={(e) => setNamesText(e.target.value)}
                        placeholder="Pega los nombres aqui, uno por linea...&#10;Ejemplo:&#10;Juan Perez&#10;Maria Garcia&#10;Carlos Lopez"
                        className="min-h-[200px] bg-[#0a0a0a] border-white/10 text-white placeholder:text-gray-600"
                      />
                      <p className="text-sm text-gray-500 mt-2">
                        {parseNamesFromText().length} nombres detectados
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Min Score Slider */}
              <motion.div variants={itemVariants}>
                <Card className="bg-[#1a1a1a] border-white/5">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center justify-between">
                      <span>Score minimo de coincidencia</span>
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
                    <div className="flex flex-col gap-1 sm:flex-row sm:justify-between text-sm text-gray-500">
                      <span>50% (Mas resultados)</span>
                      <span>100% (Solo exactos)</span>
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
                  Iniciar Screening
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
              <Card className="bg-[#1a1a1a] border-white/5 p-8">
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
                      <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
                    </div>
                  </div>
                  
                  <h2 className="text-2xl font-bold text-white mb-2">Procesando...</h2>
                  <p className="text-gray-400 mb-6">
                    {job?.processed} de {job?.total} nombres procesados
                  </p>
                  
                  <div className="w-full max-w-md mx-auto bg-white/10 rounded-full h-2 mb-4">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${((job?.processed || 0) / (job?.total || 1)) * 100}%` }}
                    />
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span className="text-gray-300">{job?.completed_count} exitosos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <span className="text-gray-300">{job?.failed_count} fallidos</span>
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
                <Card className="bg-[#1a1a1a] border-white/5">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-bold text-white mb-1">Resultados</h2>
                        <p className="text-gray-400">
                          {job?.completed_count} procesados · {job?.failed_count} fallidos
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
                          Nuevo
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
                        <Card className="bg-[#1a1a1a] border-white/5">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm text-white break-words">{result.query}</p>
                              {result.status === 'found' ? (
                                <Badge className="bg-green-500/10 text-green-400 border-green-500/20">Encontrado</Badge>
                              ) : result.status === 'not_found' ? (
                                <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/20">No encontrado</Badge>
                              ) : (
                                <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Error</Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Matches</p>
                                <p className="text-gray-300">{result.match_count}</p>
                              </div>
                              <div>
                                <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Score</p>
                                {result.top_score ? (
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      result.top_score >= 90
                                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                        : result.top_score >= 70
                                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                        : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                    )}
                                  >
                                    {Math.round(result.top_score)}%
                                  </Badge>
                                ) : (
                                  <span className="text-gray-500">-</span>
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Mejor Coincidencia</p>
                              <p className="text-sm text-gray-300 break-words">{result.top_match_name || '-'}</p>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>

                  <Card className="hidden md:block bg-[#1a1a1a] border-white/5">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-white/5 border-b border-white/5">
                          <tr>
                            <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4">
                              Nombre Buscado
                            </th>
                            <th className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4">
                              Status
                            </th>
                            <th className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4">
                              Matches
                            </th>
                            <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4">
                              Mejor Coincidencia
                            </th>
                            <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4">
                              Score
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {job.results.map((result, index) => (
                            <motion.tr
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.02 }}
                              className="hover:bg-white/5 transition-colors"
                            >
                              <td className="px-6 py-4">
                                <span className="text-sm text-white">{result.query}</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                {result.status === 'found' ? (
                                  <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                                    Encontrado
                                  </Badge>
                                ) : result.status === 'not_found' ? (
                                  <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/20">
                                    No encontrado
                                  </Badge>
                                ) : (
                                  <Badge className="bg-red-500/10 text-red-400 border-red-500/20">
                                    Error
                                  </Badge>
                                )}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-sm text-gray-300">{result.match_count}</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm text-gray-300">
                                  {result.top_match_name || '-'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                {result.top_score ? (
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      result.top_score >= 90
                                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                        : result.top_score >= 70
                                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                        : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                    )}
                                  >
                                    {Math.round(result.top_score)}%
                                  </Badge>
                                ) : (
                                  <span className="text-gray-500">-</span>
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
      </div>
    </div>
  );
}

export default BulkScreeningPage;
