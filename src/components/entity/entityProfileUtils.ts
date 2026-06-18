import type { EntityProfile } from '@/services/entities';
import type { APIEntity, APIPepEntry } from '@/types/api';

export const countryNames: Record<string, string> = {
  MX: 'México', US: 'Estados Unidos', BR: 'Brasil', CO: 'Colombia', UY: 'Uruguay',
  AR: 'Argentina', CL: 'Chile', PE: 'Perú', VE: 'Venezuela', PA: 'Panamá',
  GB: 'Reino Unido', ES: 'España', FR: 'Francia', DE: 'Alemania', IT: 'Italia',
  RU: 'Rusia', CN: 'China', JP: 'Japón', KR: 'Corea del Sur', IN: 'India',
  CA: 'Canadá', AU: 'Australia', CU: 'Cuba', NI: 'Nicaragua', BO: 'Bolivia',
  PY: 'Paraguay', EC: 'Ecuador', GT: 'Guatemala', HN: 'Honduras', SV: 'El Salvador',
  CR: 'Costa Rica', DO: 'Rep. Dominicana', HT: 'Haití', JM: 'Jamaica',
  AE: 'Emiratos Árabes', SA: 'Arabia Saudita', IR: 'Irán', IQ: 'Irak',
  SY: 'Siria', LB: 'Líbano', IL: 'Israel', TR: 'Turquía', UA: 'Ucrania',
  BY: 'Bielorrusia', KP: 'Corea del Norte', MM: 'Myanmar', AF: 'Afganistán',
  PK: 'Pakistán', NG: 'Nigeria', ZA: 'Sudáfrica', KE: 'Kenia', ET: 'Etiopía',
  CD: 'RD Congo', SD: 'Sudán', LY: 'Libia', SO: 'Somalia', YE: 'Yemen',
  NL: 'Países Bajos', BE: 'Bélgica', CH: 'Suiza', AT: 'Austria', PT: 'Portugal',
  SE: 'Suecia', NO: 'Noruega', PL: 'Polonia', CZ: 'Chequia', RO: 'Rumania',
};

const sourceDisplayNames: Record<string, string> = {
  OS_DEFAULT: 'Wikidata',
  OS_WIKIDATA_RELATED: 'Wikidata',
  OS_US_OFAC_SDN: 'OFAC SDN',
  OS_US_OFAC_NONSDN: 'OFAC No-SDN',
  OS_US_OFAC_CONS: 'OFAC Consolidado',
  OS_UN_SC_SANCTIONS: 'ONU Sanciones',
  OS_EU_SANCTIONS: 'UE Sanciones',
  OS_GB_HMT_SANCTIONS: 'Reino Unido OFSI',
  OS_CA_DFATD: 'Canadá Sanciones',
  OS_INTERPOL_RED: 'Interpol',
  OS_EU_EUROPOL: 'Europol',
  OFAC_SDN: 'OFAC SDN',
  OFAC_NON_SDN: 'OFAC No-SDN',
  US_FBI_MOST_WANTED: 'FBI',
  US_DEA_FUGITIVES: 'DEA',
  INTERPOL_RED_NOTICES: 'Interpol',
};

export function formatSourceName(source: string): string | null {
  if (!source) return null;
  if (sourceDisplayNames[source]) return sourceDisplayNames[source];
  if (source.startsWith('OS_')) {
    const clean = source.slice(3);
    if (clean.startsWith('US_')) return 'EE.UU. ' + clean.slice(3).replace(/_/g, ' ');
    if (clean.startsWith('EU_')) return 'UE ' + clean.slice(3).replace(/_/g, ' ');
    if (clean.startsWith('GB_')) return 'UK ' + clean.slice(3).replace(/_/g, ' ');
    if (clean.startsWith('CA_')) return 'Canadá ' + clean.slice(3).replace(/_/g, ' ');
    if (clean.startsWith('UN_')) return 'ONU ' + clean.slice(3).replace(/_/g, ' ');
    return clean.replace(/_/g, ' ');
  }
  if (source.startsWith('PEP_')) return 'PEP ' + source.slice(4).replace(/_/g, ' ');
  return source.replace(/_/g, ' ');
}

export type CanonicalPepEntry = APIPepEntry & {
  source_dataset?: string;
};

export type UnifiedCareerEntry = {
  id: string;
  title: string;
  start_date?: string | null;
  end_date?: string | null;
  is_current: boolean;
  is_pep: boolean;
  source?: string;
  country?: string;
  context?: string;
};

export function normalizePepRole(value?: string): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizePepDate(value?: string | null): string | null {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;
  const parts = text.split('-');
  if (parts.length !== 3) return text;
  const [year, month, day] = parts;
  return `${year}-${(month || '01').padStart(2, '0')}-${(day || '01').padStart(2, '0')}`;
}

function pepDatesCompatible(left?: string | null, right?: string | null): boolean {
  const leftNorm = normalizePepDate(left);
  const rightNorm = normalizePepDate(right);
  if (!leftNorm || !rightNorm) return true;
  if (leftNorm === rightNorm) return true;
  const leftTime = Date.parse(`${leftNorm}T00:00:00Z`);
  const rightTime = Date.parse(`${rightNorm}T00:00:00Z`);
  if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) return leftNorm === rightNorm;
  return Math.abs(leftTime - rightTime) <= 24 * 60 * 60 * 1000;
}

export function buildCanonicalPepEntries(entity?: APIEntity, profile?: EntityProfile): CanonicalPepEntry[] {
  const legacyEntries = entity?.pep_entries || [];
  const profileEntries = profile?.career?.pep_positions || [];

  if (profileEntries.length === 0) {
    return [...legacyEntries].sort((a, b) => {
      if (a.is_current !== b.is_current) return a.is_current ? -1 : 1;
      return (b.start_date || '').localeCompare(a.start_date || '');
    });
  }

  const matchedLegacyIds = new Set<string>();

  const merged = profileEntries.map((entry, index) => {
    const role = String((entry as { name?: string; cargo?: string }).name || (entry as { cargo?: string }).cargo || '').trim();
    const startDate = (entry as { start_date?: string }).start_date;
    const endDate = (entry as { end_date?: string }).end_date;
    const normalizedRole = normalizePepRole(role);
    const legacyMatch = legacyEntries.find((legacy) => {
      if (normalizePepRole(legacy.role) !== normalizedRole) return false;
      return (
        pepDatesCompatible(legacy.start_date, startDate) &&
        pepDatesCompatible(legacy.end_date, endDate)
      );
    });
    if (legacyMatch?.id) {
      matchedLegacyIds.add(legacyMatch.id);
    }
    const status = String((entry as { status?: string }).status || '').toLowerCase();
    const isCurrent = legacyMatch?.is_current ?? (status === 'current' || status === 'active' || (!endDate && Boolean(startDate)));

    return {
      id: legacyMatch?.id || `profile-pep-${index}`,
      category: legacyMatch?.category || entity?.pep_category || 'PEP',
      role: legacyMatch?.role || role,
      country: legacyMatch?.country || String((entry as { country?: string }).country || '').toUpperCase(),
      institution: legacyMatch?.institution,
      start_date: legacyMatch?.start_date || startDate,
      end_date: legacyMatch?.end_date || endDate,
      is_current: isCurrent,
      party: legacyMatch?.party,
      department: legacyMatch?.department,
      state: legacyMatch?.state,
      source: legacyMatch?.source || String((entry as { source_dataset?: string; source?: string }).source_dataset || (entry as { source?: string }).source || ''),
      source_dataset: String((entry as { source_dataset?: string }).source_dataset || ''),
    } satisfies CanonicalPepEntry;
  });

  const unmatchedLegacyEntries = legacyEntries.filter((legacy) => !matchedLegacyIds.has(legacy.id));
  const combinedEntries = [...merged, ...unmatchedLegacyEntries];

  const deduped = new Map<string, CanonicalPepEntry>();
  combinedEntries.forEach((entry) => {
    const normalizedRole = normalizePepRole(entry.role);
    const existingKey = [...deduped.keys()].find((candidateKey) => {
      const existing = deduped.get(candidateKey);
      if (!existing) return false;
      return (
        normalizePepRole(existing.role) === normalizedRole &&
        (existing.country || '') === (entry.country || '') &&
        pepDatesCompatible(existing.start_date, entry.start_date) &&
        pepDatesCompatible(existing.end_date, entry.end_date)
      );
    });
    if (!existingKey) {
      const key = [normalizedRole, normalizePepDate(entry.start_date) || '', normalizePepDate(entry.end_date) || '', entry.country || ''].join('::');
      deduped.set(key, entry);
      return;
    }
    const existing = deduped.get(existingKey);
    if (!existing) return;
    if (entry.is_current && !existing.is_current) {
      deduped.set(existingKey, entry);
      return;
    }
    if (!existing.institution && entry.institution) {
      deduped.set(existingKey, { ...existing, institution: entry.institution });
    }
  });

  return [...deduped.values()].sort((a, b) => {
    if (a.is_current !== b.is_current) return a.is_current ? -1 : 1;
    return (b.start_date || '').localeCompare(a.start_date || '');
  });
}

export function buildUnifiedCareerEntries(profile?: EntityProfile, pepEntries: CanonicalPepEntry[] = []): UnifiedCareerEntry[] {
  const positions = profile?.career?.positions || [];
  const usedPepIds = new Set<string>();
  const entries: UnifiedCareerEntry[] = [];

  positions.forEach((position, index) => {
    const normalizedPosition = normalizePepRole(position.name);
    const pepMatch = pepEntries.find((pep) => {
      if (normalizePepRole(pep.role) !== normalizedPosition) return false;
      return (
        pepDatesCompatible(pep.start_date, position.start) &&
        pepDatesCompatible(pep.end_date, position.end)
      );
    });

    if (pepMatch) usedPepIds.add(pepMatch.id);

    entries.push({
      id: position.qid || pepMatch?.id || `career-position-${index}`,
      title: position.name,
      start_date: position.start,
      end_date: position.end,
      is_current: pepMatch?.is_current ?? Boolean(position.is_current),
      is_pep: Boolean(pepMatch),
      source: pepMatch?.source || pepMatch?.source_dataset,
      country: pepMatch?.country,
      context: pepMatch?.department || pepMatch?.institution || pepMatch?.party,
    });
  });

  pepEntries.forEach((pep, index) => {
    if (usedPepIds.has(pep.id)) return;
    entries.push({
      id: pep.id || `career-pep-${index}`,
      title: pep.role,
      start_date: pep.start_date,
      end_date: pep.end_date,
      is_current: pep.is_current,
      is_pep: true,
      source: pep.source || pep.source_dataset,
      country: pep.country,
      context: pep.department || pep.institution || pep.party,
    });
  });

  const deduped = new Map<string, UnifiedCareerEntry>();
  entries.forEach((entry) => {
    const normalizedTitle = normalizePepRole(entry.title);
    const existingKey = [...deduped.keys()].find((candidateKey) => {
      const existing = deduped.get(candidateKey);
      if (!existing) return false;
      return (
        normalizePepRole(existing.title) === normalizedTitle &&
        pepDatesCompatible(existing.start_date, entry.start_date) &&
        pepDatesCompatible(existing.end_date, entry.end_date)
      );
    });
    if (!existingKey) {
      const key = [normalizedTitle, normalizePepDate(entry.start_date) || '', normalizePepDate(entry.end_date) || ''].join('::');
      deduped.set(key, entry);
      return;
    }
    const existing = deduped.get(existingKey);
    if (!existing) return;
    if (entry.is_pep && !existing.is_pep) {
      deduped.set(existingKey, entry);
      return;
    }
    if (!existing.context && entry.context) {
      deduped.set(existingKey, { ...existing, context: entry.context, source: existing.source || entry.source, country: existing.country || entry.country });
    }
  });

  return [...deduped.values()].sort((a, b) => {
    if (a.is_current !== b.is_current) return a.is_current ? -1 : 1;
    return (b.start_date || '').localeCompare(a.start_date || '');
  });
}
