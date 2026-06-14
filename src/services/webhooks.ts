import { api } from './api';

export type WebhookEvent =
  | 'screening.critical_match'
  | 'screening.high_match'
  | 'source.sync_complete'
  | 'source.sync_failed';

export const ALL_EVENTS: { id: WebhookEvent; label: string; description: string }[] = [
  {
    id: 'screening.critical_match',
    label: 'Match crítico',
    description: 'Una búsqueda devolvió al menos un match con risk_level=critical.',
  },
  {
    id: 'screening.high_match',
    label: 'Match alto',
    description: 'Una búsqueda devolvió al menos un match con risk_level=high.',
  },
  {
    id: 'source.sync_complete',
    label: 'Source sync OK',
    description: 'Una fuente terminó de sincronizar exitosamente.',
  },
  {
    id: 'source.sync_failed',
    label: 'Source sync falló',
    description: 'Una fuente falló durante la sincronización.',
  },
];

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  is_active: boolean;
  failure_count: number;
  last_triggered: string | null;
  created_at: string | null;
}

export interface WebhookCreated extends Webhook {
  secret: string;       // Returned ONCE at creation
  message: string;
}

export const webhooksService = {
  async list(): Promise<Webhook[]> {
    const { data } = await api.get<Webhook[]>('/api/v1/webhooks');
    return data;
  },

  async create(payload: { name: string; url: string; events: WebhookEvent[] }): Promise<WebhookCreated> {
    const { data } = await api.post<WebhookCreated>('/api/v1/webhooks', payload);
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/v1/webhooks/${id}`);
  },

  async test(id: string): Promise<{ status: string; detail?: string }> {
    const { data } = await api.post<{ status: string; detail?: string }>(
      `/api/v1/webhooks/${id}/test`,
    );
    return data;
  },
};
