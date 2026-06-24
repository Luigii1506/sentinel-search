import api from './api';

// ── Types ──

export type ReportType = 'relevante' | 'inusual' | 'preocupante';
export type SubjectPersonType = 'fisica' | 'moral';

export interface RegimeReportType {
  // The backend may return plain strings or objects; we normalize to strings.
  value: string;
}

export interface Regime {
  regime: string;
  report_types: string[];
}

export interface RegimesResponse {
  regimes: Regime[];
}

export interface RegulatoryOperation {
  id: string;
  reference: string;
  report_type: ReportType;
  operation_date?: string;
  operation_type?: string;
  instrument?: string;
  currency?: string;
  amount?: number;
  amount_mxn?: number;
  branch?: string;
  subject_person_type?: SubjectPersonType;
  subject_name?: string;
  subject_rfc?: string;
  subject_curp?: string;
  subject_birth_date?: string;
  subject_nationality?: string;
  subject_address?: string;
  unusual_reason?: string;
  period?: string;
  client_id?: string;
  reported?: boolean;
  created_at?: string;
}

export interface CreateOperationBody {
  reference: string;
  report_type: ReportType;
  operation_date?: string;
  operation_type?: string;
  instrument?: string;
  currency?: string;
  amount?: number;
  amount_mxn?: number;
  branch?: string;
  subject_person_type?: SubjectPersonType;
  subject_name?: string;
  subject_rfc?: string;
  subject_curp?: string;
  subject_birth_date?: string;
  subject_nationality?: string;
  subject_address?: string;
  unusual_reason?: string;
  period?: string;
  client_id?: string;
}

export interface ListOperationsParams {
  period?: string;
  report_type?: string;
  reported?: boolean;
  limit?: number;
  offset?: number;
}

export interface ListOperationsResponse {
  operations?: RegulatoryOperation[];
  items?: RegulatoryOperation[];
  total: number;
}

export interface EntityConfig {
  clave_rcc: string;
  rfc: string;
  razon_social: string;
}

export interface GenerateReportBody {
  regime: string;
  report_type: string;
  period: string;
  entity_config: EntityConfig;
}

export interface GenerateReportResponse {
  xml: string;
  operation_count: number;
  warnings: string[];
}

export interface ImportResult {
  imported?: number;
  total?: number;
  errors?: string[];
  message?: string;
}

export interface DownloadReportParams {
  regime: string;
  report_type: string;
  period: string;
  clave_rcc: string;
  rfc: string;
  razon_social: string;
}

// ── Service ──

export const regulatoryService = {
  async getRegimes(): Promise<RegimesResponse> {
    const response = await api.get('/api/v2/regulatory/regimes');
    return response.data;
  },

  async listOperations(params?: ListOperationsParams): Promise<ListOperationsResponse> {
    const response = await api.get('/api/v2/regulatory/operations', { params });
    return response.data;
  },

  async createOperation(body: CreateOperationBody): Promise<RegulatoryOperation> {
    const response = await api.post('/api/v2/regulatory/operations', body);
    return response.data;
  },

  async importOperations(
    file: File,
    reportType: string,
    period: string,
  ): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/api/v2/regulatory/operations/import', formData, {
      params: { report_type: reportType, period },
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async generateReport(body: GenerateReportBody): Promise<GenerateReportResponse> {
    const response = await api.post('/api/v2/regulatory/reports/generate', body);
    return response.data;
  },

  /**
   * Downloads the XML report as a blob and triggers a browser download.
   */
  async downloadReport(params: DownloadReportParams): Promise<void> {
    const response = await api.get('/api/v2/regulatory/reports/download', {
      params,
      responseType: 'blob',
    });

    const blob = new Blob([response.data], { type: 'application/xml' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${params.regime}_${params.report_type}_${params.period}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};

export default regulatoryService;
