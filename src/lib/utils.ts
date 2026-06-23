import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import i18n, { currentLang } from '@/i18n';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ISO_REGION_RE = /^[A-Za-z]{2}$/;

/**
 * Localized country name for an ISO 3166-1 alpha-2 code, using the native
 * Intl.DisplayNames API (es / en follow the active UI language).
 *
 * - Non-ISO inputs (already-resolved names, multi-letter blocks like "EU",
 *   "INT") are returned as-is when Intl cannot resolve them.
 * - Falls back to the original input if the code does not resolve.
 */
export function getCountryName(code?: string | null): string {
  const value = (code || '').trim();
  if (!value) return '';
  if (!ISO_REGION_RE.test(value)) return value;
  try {
    const display = new Intl.DisplayNames([currentLang()], { type: 'region' });
    return display.of(value.toUpperCase()) || value;
  } catch {
    return value;
  }
}

function isDateOnlyString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseDisplayDate(value: string): Date {
  if (isDateOnlyString(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }
  return new Date(value);
}

// Format number with commas
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

// Format large numbers (e.g., 1.2M, 500K)
export function formatCompactNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1) + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K';
  }
  return num.toString();
}

// Format date
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = parseDisplayDate(dateString);
  if (Number.isNaN(date.getTime())) return '';  // evita "Invalid Date" en fechas vacías/malformadas
  return date.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: isDateOnlyString(dateString) ? 'UTC' : undefined,
  });
}

// Format datetime
export function formatDateTime(dateString: string): string {
  const date = parseDisplayDate(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: isDateOnlyString(dateString) ? 'UTC' : undefined,
  });
}

// Format relative time (e.g., "2 days ago")
export function formatRelativeTime(dateString: string): string {
  const date = parseDisplayDate(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  if (diffInSeconds < 2592000) {
    const weeks = Math.floor(diffInSeconds / 604800);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }
  return formatDate(dateString);
}

// Get risk color
export function getRiskColor(riskLevel: string): string {
  switch (riskLevel) {
    case 'critical':
      return '#ef4444';
    case 'high':
      return '#f97316';
    case 'medium':
      return '#eab308';
    case 'low':
      return '#22c55e';
    default:
      return '#6a6a6a';
  }
}

// Get risk background color
export function getRiskBgColor(riskLevel: string): string {
  switch (riskLevel) {
    case 'critical':
      return 'bg-red-500/15 text-red-500 border-red-500/30';
    case 'high':
      return 'bg-orange-500/15 text-orange-500 border-orange-500/30';
    case 'medium':
      return 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30';
    case 'low':
      return 'bg-green-500/15 text-green-500 border-green-500/30';
    default:
      return 'bg-gray-500/15 text-gray-500 border-gray-500/30';
  }
}

// Get risk label
export function getRiskLabel(riskLevel: string): string {
  const known = new Set(['critical', 'high', 'medium', 'low']);
  return i18n.t(`common.riskLevel.${known.has(riskLevel) ? riskLevel : 'none'}`);
}

// Get entity type icon
export function getEntityTypeLabel(type: string): string {
  const known = new Set(['person', 'company', 'vessel', 'aircraft', 'organization']);
  return i18n.t(`common.entityType.${known.has(type) ? type : 'entity'}`);
}

// Get source badge color
export function getSourceBadgeClass(source: string): string {
  const sourceClasses: Record<string, string> = {
    'OFAC': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    'UN': 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    'HMT': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    'EU': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    'DFAT': 'bg-teal-500/15 text-teal-400 border-teal-500/30',
    'FINCEN': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    'INTERPOL': 'bg-red-500/15 text-red-400 border-red-500/30',
    'WORLDCHECK': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    'PEP': 'bg-pink-500/15 text-pink-400 border-pink-500/30',
    'ADVERSE_MEDIA': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    'INTERNAL': 'bg-gray-500/15 text-gray-400 border-gray-500/30',
  };
  return sourceClasses[source] || 'bg-gray-500/15 text-gray-400 border-gray-500/30';
}

// Get relationship type label
export function getRelationshipTypeLabel(type: string): string {
  const known = new Set([
    'ownership', 'family', 'employment', 'partnership', 'transaction',
    'shared_address', 'shared_contact', 'legal_rep', 'beneficial_owner',
  ]);
  return known.has(type) ? i18n.t(`common.relationshipType.${type}`) : type.replace('_', ' ');
}

// Get investigation status label
export function getInvestigationStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'open': 'Open',
    'in_progress': 'In Progress',
    'pending_review': 'Pending Review',
    'closed': 'Closed',
    'escalated': 'Escalated',
  };
  return labels[status] || status;
}

// Get investigation status color
export function getInvestigationStatusColor(status: string): string {
  switch (status) {
    case 'open':
      return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    case 'in_progress':
      return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
    case 'pending_review':
      return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
    case 'closed':
      return 'bg-green-500/15 text-green-400 border-green-500/30';
    case 'escalated':
      return 'bg-red-500/15 text-red-400 border-red-500/30';
    default:
      return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
  }
}

// Debounce function
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Truncate text
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

const HUMAN_NAME_SMALL_WORDS = new Set([
  'de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'das', 'do', 'dos',
  'di', 'du', 'des', 'van', 'von', 'der', 'den', 'of', 'the', 'and',
]);

function titleCaseSegment(segment: string): string {
  return segment
    .split(/\s+/)
    .filter(Boolean)
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (/^[A-Z0-9]{2,}$/.test(word) && !/[a-z]/.test(word)) {
        return word;
      }
      if (/^q\d+$/i.test(word)) {
        return word.toUpperCase();
      }
      if (index > 0 && HUMAN_NAME_SMALL_WORDS.has(lower)) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

export function humanizeEntityName(name?: string | null): string {
  if (!name) return '';

  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';

  const mostlyUppercase = trimmed === trimmed.toUpperCase();
  if (!mostlyUppercase) {
    return trimmed.replace(/\s+[–—-]\s+/g, ' – ');
  }

  // Fully uppercase input (canonical names) carries no case info — lowercase
  // first so titleCaseSegment doesn't treat every word as an acronym and
  // leave it uppercase. Genuine mixed-case names keep their acronyms above.
  return trimmed
    .toLowerCase()
    .replace(/\s+[–—-]\s+/g, ' – ')
    .split(/([–—-])/)
    .map((part) => {
      if (part === '-' || part === '–' || part === '—') {
        return part;
      }
      return titleCaseSegment(part);
    })
    .join('')
    .replace(/\s+([–—-])\s+/g, ' $1 ');
}

// Generate initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Calculate risk score color
export function getRiskScoreColor(score: number): string {
  if (score >= 80) return '#ef4444';
  if (score >= 60) return '#f97316';
  if (score >= 40) return '#eab308';
  if (score >= 20) return '#22c55e';
  return '#6a6a6a';
}

// Calculate risk score level
export function getRiskScoreLevel(score: number): string {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  if (score >= 20) return 'low';
  return 'none';
}
