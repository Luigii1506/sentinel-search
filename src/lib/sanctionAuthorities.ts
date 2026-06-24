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
  /** URL autoritativa del regulador (página oficial de sanciones); undefined si desconocida. */
  officialUrl?: string;
  /** Descripción de una frase: quién es la autoridad / qué es la lista. */
  description?: string;
}

interface AuthorityRule {
  /** Substrings/códigos a buscar (lowercase). Cualquier coincidencia aplica. */
  match: string[];
  cleanName: string;
  country?: string;
  /** URL oficial del regulador. */
  officialUrl?: string;
  /** Descripción de una frase. */
  description?: string;
}

// El ORDEN importa: las reglas más específicas van primero para que un genérico
// como "ministry of foreign affairs" no capture variantes con país conocido.
const AUTHORITY_RULES: AuthorityRule[] = [
  // ── Estados Unidos ─────────────────────────────────────────────────────────
  {
    match: ['ofac', 'treas-ofac', 'office of foreign assets control', 'ofac_sdn', 'ofac_cons', 'us_ofac'],
    cleanName: 'OFAC',
    country: 'US',
    officialUrl: 'https://ofac.treasury.gov/sanctions-programs-and-country-information',
    description: 'Oficina de Control de Activos Extranjeros del Tesoro de EE.UU. (sanciones financieras).',
  },
  {
    match: ['us-sam', 'us_sam', 'sam_exclusions', 'sam.gov', 'sam exclusions', 'system for award management'],
    cleanName: 'SAM',
    country: 'US',
    officialUrl: 'https://sam.gov/content/exclusions',
    description: 'Sistema federal de EE.UU. de exclusiones/inhabilitaciones de contratistas (debarment).',
  },
  {
    match: ['bis', 'bureau of industry', 'bis_csl', 'industry and security'],
    cleanName: 'BIS',
    country: 'US',
    officialUrl: 'https://www.bis.doc.gov/index.php/the-denied-persons-list',
    description: 'Bureau of Industry and Security de EE.UU. (control de exportaciones).',
  },
  // ── Unión Europea ──────────────────────────────────────────────────────────
  {
    match: ['eu-cfsp', 'eu_cfsp', 'eur-cfsp', 'cfsp', 'eu_sanctions', 'eu_fsf', 'european union', 'council of the european union'],
    cleanName: 'UE (CFSP)',
    country: 'EU',
    officialUrl: 'https://www.sanctionsmap.eu/',
    description: 'Lista consolidada de sanciones financieras de la Unión Europea.',
  },
  // ── Reino Unido ────────────────────────────────────────────────────────────
  {
    match: ['hm treasury', 'ofsi', 'fcdo', 'gb_ofsi', 'gb_hmt', 'her majesty', 'his majesty'],
    cleanName: 'OFSI/HM Treasury',
    country: 'GB',
    officialUrl: 'https://www.gov.uk/government/publications/financial-sanctions-consolidated-list-of-targets',
    description: 'Office of Financial Sanctions Implementation del Tesoro del Reino Unido.',
  },
  // ── Canadá ─────────────────────────────────────────────────────────────────
  {
    match: ['canada-sema', 'canada_sema', 'canada_sanctions', 'sema', 'ca_sema'],
    cleanName: 'SEMA',
    country: 'CA',
    officialUrl: 'https://www.international.gc.ca/world-monde/international_relations-relations_internationales/sanctions/consolidated-consolide.aspx',
    description: 'Sanciones autónomas de Canadá (SEMA/JVCFOA).',
  },
  // ── Suiza ──────────────────────────────────────────────────────────────────
  {
    match: ['state secretariat for economic affairs', 'seco', 'ch_seco'],
    cleanName: 'SECO',
    country: 'CH',
    officialUrl: 'https://www.seco.admin.ch/seco/en/home/Aussenwirtschaftspolitik_Wirtschaftliche_Zusammenarbeit/Wirtschaftsbeziehungen/exportkontrollen-und-sanktionen/sanktionen-embargos.html',
    description: 'Secretaría de Estado de Economía de Suiza (sanciones).',
  },
  // ── Francia ────────────────────────────────────────────────────────────────
  {
    match: ['direction générale du trésor', 'direction generale du tresor', 'fr_tresor', 'tresor', 'trésor'],
    cleanName: 'DG Trésor',
    country: 'FR',
    officialUrl: 'https://gels-avoirs.dgtresor.gouv.fr/',
    description: 'Dirección General del Tesoro de Francia (congelamiento de activos).',
  },
  // ── Bélgica ────────────────────────────────────────────────────────────────
  {
    match: ['federal public service finance', 'fps finance', 'be_fod', 'spf finances'],
    cleanName: 'FPS Finance',
    country: 'BE',
    officialUrl: 'https://finance.belgium.be/en/treasury/financial-sanctions',
    description: 'Tesorería del Servicio Público Federal de Finanzas de Bélgica.',
  },
  // ── Australia ──────────────────────────────────────────────────────────────
  {
    match: ['department of foreign affairs and trade', 'au_dfat', 'dfat'],
    cleanName: 'DFAT',
    country: 'AU',
    officialUrl: 'https://www.dfat.gov.au/international-relations/security/sanctions/consolidated-list',
    description: 'Departamento de Asuntos Exteriores y Comercio de Australia.',
  },
  // ── Nueva Zelanda ──────────────────────────────────────────────────────────
  {
    match: ['ministry of foreign affairs and trade', 'mfat'],
    cleanName: 'MFAT',
    country: 'NZ',
    officialUrl: 'https://www.mfat.govt.nz/en/countries-and-regions/russia/russia-sanctions/',
    description: 'Ministerio de Asuntos Exteriores y Comercio de Nueva Zelanda.',
  },
  // ── Ucrania ────────────────────────────────────────────────────────────────
  {
    match: ['гур мо україни', 'гур', 'gur', 'main directorate of intelligence'],
    cleanName: 'GUR (Defensa)',
    country: 'UA',
    officialUrl: 'https://war-sanctions.gur.gov.ua/en',
    description: 'Dirección de Inteligencia de Defensa de Ucrania (war sanctions).',
  },
  {
    match: ['national security and defense council', 'national security and defence council', 'nsdc', 'rnbo'],
    cleanName: 'NSDC',
    country: 'UA',
    officialUrl: 'https://sanctions.nazk.gov.ua/en/',
    description: 'Consejo de Seguridad Nacional y Defensa de Ucrania.',
  },
  // ── Japón ──────────────────────────────────────────────────────────────────
  // "Ministry of Finance" es ambiguo; el contexto japonés llega vía el término
  // 資産凍結 (congelamiento de activos) en program/authority, o el código MOF JP.
  {
    match: ['資産凍結', 'mof_jp', 'jp_mof', 'ministry of finance japan'],
    cleanName: 'MOF',
    country: 'JP',
    officialUrl: 'https://www.mof.go.jp/policy/international_policy/gaitame_kawase/gaitame/economic_sanctions/list.html',
    description: 'Ministerio de Finanzas de Japón (congelamiento de activos).',
  },
  // ── ONU ────────────────────────────────────────────────────────────────────
  {
    match: ['un_sc', 'un security council', 'united nations security council', 'un consolidated', 'un sc consolidated'],
    cleanName: 'ONU (CSNU)',
    officialUrl: 'https://www.un.org/securitycouncil/content/un-sc-consolidated-list',
    description: 'Lista consolidada del Consejo de Seguridad de la ONU.',
  },
  // ── Interpol ───────────────────────────────────────────────────────────────
  {
    match: ['interpol', 'red notice', 'red notices'],
    cleanName: 'Interpol',
    officialUrl: 'https://www.interpol.int/How-we-work/Notices/Red-Notices',
    description: 'Notificaciones Rojas de Interpol.',
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
    return {
      cleanName: specific.cleanName,
      country: specific.country,
      officialUrl: specific.officialUrl,
      description: specific.description,
    };
  }

  const generic = matchRules(haystack, GENERIC_RULES);
  if (generic) {
    return {
      cleanName: generic.cleanName,
      country: generic.country,
      officialUrl: generic.officialUrl,
      description: generic.description,
    };
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
