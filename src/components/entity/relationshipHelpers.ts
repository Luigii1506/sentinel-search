import i18n from '@/i18n';

/**
 * Llaves estables de tipo de entidad extendido. La traducción visible se
 * resuelve vía i18n (`entity.typeExtended.<type>`); estas llaves no contienen
 * texto traducido.
 */
const EXTENDED_ENTITY_TYPE_KEYS = new Set([
  'person',
  'individual',
  'legalentity',
  'legal_entity',
  'company',
  'organization',
  'vehicle',
  'vessel',
  'aircraft',
  'asset',
  'security',
  'contract',
  'publicbody',
  'public_body',
  'event',
  'unknown',
]);

/**
 * Etiqueta localizada para un tipo de entidad extendido.
 * Cae a "Relacionado" (entity.relationships.subtype.related) cuando el tipo
 * no está reconocido o no tiene traducción específica.
 */
export function getEntityTypeLabelExtended(type?: string | null): string {
  const key = (type || '').toLowerCase();
  const fallback = i18n.t('entity.relationships.subtype.related', { defaultValue: 'Relacionado' });
  if (!EXTENDED_ENTITY_TYPE_KEYS.has(key)) return fallback;
  return i18n.t(`entity.typeExtended.${key}`, { defaultValue: fallback });
}

/**
 * Llaves estables de subtipo de relación (desacopladas de la traducción).
 * El subtipo entrante se normaliza a una de estas llaves; el texto visible
 * sale de `entity.relationships.subtype.<key>`.
 */
const RELATIONSHIP_SUBTYPE_KEYS = new Set([
  'associate',
  'associateof',
  'family',
  'familymember',
  'spouse',
  'wife',
  'husband',
  'child',
  'son',
  'daughter',
  'parent',
  'father',
  'mother',
  'sibling',
  'brother',
  'sister',
  'cousin',
  'uncle',
  'aunt',
  'partner',
  'colleague',
  'coworker',
  'employee',
  'employer',
  'owner',
  'director',
  'shareholder',
  'member',
  'founder',
  'successor',
  'predecessor',
  'subordinate',
  'superior',
  'political',
  'politicalally',
  'ally',
  'allyof',
  'associatepolitical',
  'organization',
  'affiliation',
  'ownership',
  'controller',
  'representative',
  'sanctions',
  'profile',
  'profilecontext',
]);

export function translateSubtype(subtype?: string | null): string {
  if (!subtype) return i18n.t('entity.relationships.subtype.related', { defaultValue: 'Relacionado' });

  const normalized = subtype
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const compact = normalized.replace(/\s+/g, '');

  // Fallback: capitaliza palabras desconocidas (comportamiento previo).
  const capitalizedFallback = normalized
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const matchedKey = RELATIONSHIP_SUBTYPE_KEYS.has(compact)
    ? compact
    : RELATIONSHIP_SUBTYPE_KEYS.has(normalized)
      ? normalized
      : null;

  if (matchedKey) {
    return i18n.t(`entity.relationships.subtype.${matchedKey}`, { defaultValue: capitalizedFallback });
  }

  return capitalizedFallback;
}

export function getReferenceRelationshipSection(rel: {
  related_entity_type?: string;
  type: string;
}): 'people' | 'organizations' | 'other' {
  const relatedType = (rel.related_entity_type || '').toLowerCase();
  if (relatedType === 'individual' || relatedType === 'person') return 'people';
  if (relatedType === 'organization' || relatedType === 'company' || relatedType === 'legalentity') return 'organizations';
  return 'other';
}

/**
 * Resumen localizado de una relación de referencia (o null si no aplica).
 * Devuelve una llave estable resuelta vía `entity.relationships.summary.<key>`.
 */
export function getReferenceRelationshipSummary(rel: {
  type: string;
  subtype?: string;
}): string | null {
  const type = rel.type?.toLowerCase();
  const subtype = rel.subtype?.toLowerCase();

  let key: string | null = null;
  if (type === 'membership' && subtype === 'education') key = 'education';
  else if (type === 'political' && subtype === 'member') key = 'partyMember';
  else if (type === 'membership' && subtype === 'member') key = 'orgMember';
  else if (type === 'professional') key = 'professional';
  else if (type === 'representation') key = 'representation';
  else if (type === 'sanction') key = 'sanction';

  if (!key) return null;
  return i18n.t(`entity.relationships.summary.${key}`);
}

/**
 * Devuelve una LLAVE ESTABLE de subgrupo (no texto traducido). El componente
 * que renderiza resuelve la etiqueta visible vía
 * `entity.relationships.subgroup.<key>`.
 */
export function getRelationshipSubgroup(
  rel: { type: string; subtype?: string; related_entity_type?: string },
  sectionKey: string,
  referenceLike: boolean
): string {
  const type = (rel.type || '').toLowerCase();
  const subtype = (rel.subtype || '').toLowerCase();
  const relatedType = (rel.related_entity_type || '').toLowerCase();
  const has = (...values: string[]): boolean => values.some((value) => subtype.includes(value));

  if (referenceLike) {
    if (type === 'membership' && subtype === 'education') return 'education';
    if (type === 'political' || (type === 'membership' && subtype === 'member')) return 'affiliation';
    if (type === 'representation') return 'representation';
    if (type === 'directorship' || type === 'occupancy' || type === 'professional' || type === 'employment') return 'positions';
    if (relatedType === 'individual' || relatedType === 'person') return 'linkedPeople';
    if (relatedType === 'organization' || relatedType === 'company' || relatedType === 'legalentity') return 'linkedOrgs';
    return 'other';
  }

  switch (sectionKey) {
    case 'family':
      if (has('wife', 'husband', 'spouse', 'partner', 'significant other', 'fiance', 'fiancé', 'fiancée', 'cohabitant')) return 'partner';
      if (has('son', 'daughter', 'child', 'stepson', 'stepdaughter', 'godson', 'goddaughter')) return 'children';
      if (has('father', 'mother', 'parent', 'stepfather', 'stepmother', 'godfather', 'godmother', 'godparent')) return 'parents';
      if (has('brother', 'sister', 'sibling', 'half-brother', 'half-sister', 'stepbrother', 'stepsister')) return 'siblings';
      if (has('grand', 'uncle', 'aunt', 'nephew', 'niece', 'cousin', 'in-law')) return 'extendedFamily';
      return 'otherFamily';
    case 'associates':
      if (has('business partner', 'partner')) return 'partners';
      if (has('advisor', 'agent', 'representative', 'nominee', 'appointee')) return 'operators';
      return 'associates';
    case 'corporate':
      if (type === 'beneficial_ownership' || has('owner', 'shareholder', 'beneficiary', 'founder', 'parent_company', 'subsidiary')) return 'ownership';
      if (type === 'directorship' || has('director', 'board_member', 'chairman', 'ceo', 'cfo', 'coo', 'secretary', 'treasurer')) return 'board';
      if (type === 'employment' || has('employee', 'manager')) return 'employment';
      if (type === 'membership' || has('member')) return 'memberships';
      return 'otherCorporate';
    case 'political':
      if (type === 'political' || has('member')) return 'parties';
      if (type === 'representation' || has('representative', 'agent', 'nominee', 'appointee')) return 'representation';
      if (type === 'occupancy' || has('advisor')) return 'publicOffice';
      return 'otherPolitical';
    case 'sanctions':
      return 'sanctions';
    case 'profile':
      if (has('education')) return 'education';
      return 'profileTrajectory';
    default:
      return 'other';
  }
}

export function getRelationshipSubgroupPriority(sectionKey: string, subgroupKey: string, referenceLike: boolean): number {
  const referencePriority: Record<string, number> = {
    linkedPeople: 10,
    education: 20,
    affiliation: 30,
    positions: 40,
    representation: 50,
    linkedOrgs: 60,
    other: 90,
  };

  const sectionPriority: Record<string, Record<string, number>> = {
    family: {
      partner: 10,
      children: 20,
      parents: 30,
      siblings: 40,
      extendedFamily: 50,
      otherFamily: 90,
    },
    associates: {
      partners: 10,
      operators: 20,
      associates: 90,
    },
    corporate: {
      ownership: 10,
      board: 20,
      employment: 30,
      memberships: 40,
      otherCorporate: 90,
    },
    political: {
      publicOffice: 10,
      representation: 20,
      parties: 30,
      otherPolitical: 90,
    },
    sanctions: {
      sanctions: 10,
    },
    profile: {
      education: 10,
      profileTrajectory: 90,
    },
  };

  if (referenceLike) return referencePriority[subgroupKey] ?? 999;
  return sectionPriority[sectionKey]?.[subgroupKey] ?? 999;
}

export function getReferenceRelationshipSortScore(rel: {
  related_entity_risk_score?: number;
  related_entity_is_pep?: boolean;
  related_entity_sources?: string[];
  relationship_strength?: number;
  related_entity_name: string;
}): number {
  const riskScore = rel.related_entity_risk_score || 0;
  const pepBoost = rel.related_entity_is_pep ? 25 : 0;
  const sourceBoost = Math.min((rel.related_entity_sources?.length || 0) * 1.5, 30);
  const strengthBoost = (rel.relationship_strength || 0) * 10;
  return riskScore + pepBoost + sourceBoost + strengthBoost;
}
