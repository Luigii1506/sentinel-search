// Mapeo de cadenas de autoridad/fuente de sanciones → nombre limpio + país ISO2.
//
// El backend entrega `entry.authority` (p.ej. "State Secretariat for Economic
// Affairs") y/o `entry.source` (p.ej. "CH_SECO_SANCTIONS"). Esta utilidad los
// normaliza a un nombre corto reconocible por un oficial de cumplimiento más el
// código de país, para mostrar bandera + jurisdicción de un vistazo.
//
// Diseño:
//  - Match por substring/código, case-insensitive, robusto a variantes.
//  - `country` queda `undefined` cuando no se puede inferir con seguridad
//    (NUNCA se adivina un país incorrecto).

export interface SanctionAuthorityInfo {
  /** Nombre corto/limpio de la autoridad (p.ej. "OFAC", "UE (CFSP)"). */
  cleanName: string;
  /** ISO2 (o "EU"); undefined si no se puede inferir. */
  country?: string;
}

interface AuthorityRule {
  /** Substrings/códigos a buscar (lowercase). Cualquier coincidencia aplica. */
  match: string[];
  cleanName: string;
  country?: string;
}

// El ORDEN importa: las reglas más específicas van primero para que un genérico
// como "ministry of foreign affairs" no capture variantes con país conocido.
const AUTHORITY_RULES: AuthorityRule[] = [
  // ── Estados Unidos ─────────────────────────────────────────────────────────
  {
    match: ['ofac', 'treas-ofac', 'office of foreign assets control', 'ofac_sdn', 'us_ofac'],
    cleanName: 'OFAC',
    country: 'US',
  },
  {
    match: ['us-sam', 'us_sam', 'sam.gov', 'sam exclusions', 'system for award management'],
    cleanName: 'SAM',
    country: 'US',
  },
  {
    match: ['bis', 'bureau of industry', 'bis_csl', 'industry and security'],
    cleanName: 'BIS',
    country: 'US',
  },
  // ── Unión Europea ──────────────────────────────────────────────────────────
  {
    match: ['eu-cfsp', 'eu_cfsp', 'eur-cfsp', 'cfsp', 'european union', 'council of the european union'],
    cleanName: 'UE (CFSP)',
    country: 'EU',
  },
  // ── Reino Unido ────────────────────────────────────────────────────────────
  {
    match: ['hm treasury', 'ofsi', 'fcdo', 'gb_ofsi', 'her majesty', 'his majesty'],
    cleanName: 'OFSI/HM Treasury',
    country: 'GB',
  },
  // ── Canadá ─────────────────────────────────────────────────────────────────
  {
    match: ['canada-sema', 'canada_sema', 'sema', 'ca_sema'],
    cleanName: 'SEMA',
    country: 'CA',
  },
  // ── Suiza ──────────────────────────────────────────────────────────────────
  {
    match: ['state secretariat for economic affairs', 'seco', 'ch_seco'],
    cleanName: 'SECO',
    country: 'CH',
  },
  // ── Francia ────────────────────────────────────────────────────────────────
  {
    match: ['direction générale du trésor', 'direction generale du tresor', 'tresor', 'trésor'],
    cleanName: 'DG Trésor',
    country: 'FR',
  },
  // ── Bélgica ────────────────────────────────────────────────────────────────
  {
    match: ['federal public service finance', 'fps finance', 'spf finances'],
    cleanName: 'FPS Finance',
    country: 'BE',
  },
  // ── Australia ──────────────────────────────────────────────────────────────
  {
    match: ['department of foreign affairs and trade', 'dfat'],
    cleanName: 'DFAT',
    country: 'AU',
  },
  // ── Nueva Zelanda ──────────────────────────────────────────────────────────
  {
    match: ['ministry of foreign affairs and trade', 'mfat'],
    cleanName: 'MFAT',
    country: 'NZ',
  },
  // ── Ucrania ────────────────────────────────────────────────────────────────
  {
    match: ['гур мо україни', 'гур', 'gur', 'main directorate of intelligence'],
    cleanName: 'GUR (Defensa)',
    country: 'UA',
  },
  {
    match: ['national security and defense council', 'national security and defence council', 'nsdc', 'rnbo'],
    cleanName: 'NSDC',
    country: 'UA',
  },
  // ── Japón ──────────────────────────────────────────────────────────────────
  // "Ministry of Finance" es ambiguo; el contexto japonés llega vía el término
  // 資産凍結 (congelamiento de activos) en program/authority, o el código MOF JP.
  {
    match: ['資産凍結', 'mof_jp', 'jp_mof', 'ministry of finance japan'],
    cleanName: 'MOF',
    country: 'JP',
  },
];

// Genéricos: nombre se conserva, SIN país (para no adivinar mal).
const GENERIC_RULES: AuthorityRule[] = [
  {
    match: ['ministry of foreign affairs', 'ministerio de relaciones exteriores'],
    cleanName: 'Ministry of Foreign Affairs',
  },
  {
    match: ['ministry of finance'],
    cleanName: 'Ministry of Finance',
  },
];

function matchRules(haystack: string, rules: AuthorityRule[]): AuthorityRule | undefined {
  return rules.find((rule) => rule.match.some((needle) => haystack.includes(needle)));
}

/**
 * Resuelve {cleanName, country} a partir de authority y/o source.
 * Devuelve undefined si no hay nada útil que mostrar.
 */
export function resolveSanctionAuthority(
  authority?: string | null,
  source?: string | null,
): SanctionAuthorityInfo | undefined {
  const rawAuthority = (authority || '').trim();
  const rawSource = (source || '').trim();
  if (!rawAuthority && !rawSource) return undefined;

  // Buscamos en authority + source combinados (lowercase) para mayor robustez.
  const haystack = `${rawAuthority} ${rawSource}`.toLowerCase();

  const specific = matchRules(haystack, AUTHORITY_RULES);
  if (specific) {
    return { cleanName: specific.cleanName, country: specific.country };
  }

  const generic = matchRules(haystack, GENERIC_RULES);
  if (generic) {
    return { cleanName: generic.cleanName, country: generic.country };
  }

  // Sin mapeo: devolvemos la autoridad cruda (o el source) tal cual, sin país.
  return { cleanName: rawAuthority || rawSource, country: undefined };
}

/**
 * ISO2 → emoji de bandera (indicadores regionales). "EU" → 🇪🇺.
 * Devuelve "" si el código no es un ISO2 válido.
 */
export function flagEmoji(iso2?: string | null): string {
  const code = (iso2 || '').trim().toUpperCase();
  if (code === 'EU') return '🇪🇺';
  if (!/^[A-Z]{2}$/.test(code)) return '';
  const A = 0x1f1e6; // regional indicator 'A'
  const first = A + (code.charCodeAt(0) - 65);
  const second = A + (code.charCodeAt(1) - 65);
  return String.fromCodePoint(first, second);
}
