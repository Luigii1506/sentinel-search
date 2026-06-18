export const entityTypeLabelExtended: Record<string, string> = {
  person: 'Persona',
  individual: 'Persona',
  legalentity: 'Entidad legal',
  legal_entity: 'Entidad legal',
  company: 'Empresa',
  organization: 'Organización',
  vehicle: 'Vehículo',
  vessel: 'Embarcación',
  aircraft: 'Aeronave',
  asset: 'Activo',
  security: 'Valor',
  contract: 'Contrato',
  publicbody: 'Organismo público',
  public_body: 'Organismo público',
  event: 'Evento',
  unknown: 'Relacionado',
};

const relationshipSubtypeLabels: Record<string, string> = {
  associate: 'Asociado',
  associateof: 'Asociado',
  family: 'Familiar',
  familymember: 'Familiar',
  spouse: 'Cónyuge',
  wife: 'Esposa',
  husband: 'Esposo',
  child: 'Hijo o hija',
  son: 'Hijo',
  daughter: 'Hija',
  parent: 'Padre o madre',
  father: 'Padre',
  mother: 'Madre',
  sibling: 'Hermano o hermana',
  brother: 'Hermano',
  sister: 'Hermana',
  cousin: 'Primo o prima',
  uncle: 'Tío',
  aunt: 'Tía',
  partner: 'Socio o pareja',
  colleague: 'Colaborador',
  coworker: 'Colaborador',
  employee: 'Empleado',
  employer: 'Empleador',
  owner: 'Propietario',
  director: 'Director',
  shareholder: 'Accionista',
  member: 'Miembro',
  founder: 'Fundador',
  successor: 'Sucesor',
  predecessor: 'Predecesor',
  subordinate: 'Subordinado',
  superior: 'Superior jerárquico',
  political: 'Vínculo político',
  politicalally: 'Aliado político',
  ally: 'Aliado',
  allyof: 'Aliado',
  associatepolitical: 'Asociado político',
  organization: 'Relación organizacional',
  affiliation: 'Afiliación',
  ownership: 'Propiedad',
  controller: 'Controlador',
  representative: 'Representante',
  sanctions: 'Relación sancionatoria',
  profile: 'Contexto de perfil',
  profilecontext: 'Contexto de perfil',
};

export function translateSubtype(subtype?: string | null): string {
  if (!subtype) return 'Relacionado';

  const normalized = subtype
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const compact = normalized.replace(/\s+/g, '');

  if (relationshipSubtypeLabels[compact]) return relationshipSubtypeLabels[compact];
  if (relationshipSubtypeLabels[normalized]) return relationshipSubtypeLabels[normalized];

  return normalized
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
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

export function getReferenceRelationshipSummary(rel: {
  type: string;
  subtype?: string;
}): string | null {
  const type = rel.type?.toLowerCase();
  const subtype = rel.subtype?.toLowerCase();

  if (type === 'membership' && subtype === 'education') return 'Estudió en esta institución';
  if (type === 'political' && subtype === 'member') return 'Miembro de este partido';
  if (type === 'membership' && subtype === 'member') return 'Miembro de esta organización';
  if (type === 'professional') return 'Vínculo profesional con esta entidad';
  if (type === 'representation') return 'Representación vinculada a esta entidad';
  if (type === 'sanction') return 'Relación sancionatoria con esta entidad';

  return null;
}

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
    if (type === 'membership' && subtype === 'education') return 'Educación';
    if (type === 'political' || (type === 'membership' && subtype === 'member')) return 'Afiliación y membresía';
    if (type === 'representation') return 'Representación';
    if (type === 'directorship' || type === 'occupancy' || type === 'professional' || type === 'employment') return 'Cargos y funciones';
    if (relatedType === 'individual' || relatedType === 'person') return 'Personas vinculadas';
    if (relatedType === 'organization' || relatedType === 'company' || relatedType === 'legalentity') return 'Organizaciones vinculadas';
    return 'Otras conexiones';
  }

  switch (sectionKey) {
    case 'family':
      if (has('wife', 'husband', 'spouse', 'partner', 'significant other', 'fiance', 'fiancé', 'fiancée', 'cohabitant')) return 'Pareja';
      if (has('son', 'daughter', 'child', 'stepson', 'stepdaughter', 'godson', 'goddaughter')) return 'Hijos';
      if (has('father', 'mother', 'parent', 'stepfather', 'stepmother', 'godfather', 'godmother', 'godparent')) return 'Padres';
      if (has('brother', 'sister', 'sibling', 'half-brother', 'half-sister', 'stepbrother', 'stepsister')) return 'Hermanos';
      if (has('grand', 'uncle', 'aunt', 'nephew', 'niece', 'cousin', 'in-law')) return 'Familia extendida';
      return 'Otros familiares';
    case 'associates':
      if (has('business partner', 'partner')) return 'Socios';
      if (has('advisor', 'agent', 'representative', 'nominee', 'appointee')) return 'Operadores y representantes';
      return 'Asociados';
    case 'corporate':
      if (type === 'beneficial_ownership' || has('owner', 'shareholder', 'beneficiary', 'founder', 'parent_company', 'subsidiary')) return 'Propiedad y control';
      if (type === 'directorship' || has('director', 'board_member', 'chairman', 'ceo', 'cfo', 'coo', 'secretary', 'treasurer')) return 'Dirección y consejo';
      if (type === 'employment' || has('employee', 'manager')) return 'Empleo';
      if (type === 'membership' || has('member')) return 'Membresías';
      return 'Otras corporativas';
    case 'political':
      if (type === 'political' || has('member')) return 'Partidos y militancia';
      if (type === 'representation' || has('representative', 'agent', 'nominee', 'appointee')) return 'Representación';
      if (type === 'occupancy' || has('advisor')) return 'Cargos y función pública';
      return 'Otras políticas';
    case 'sanctions':
      return 'Vínculos sancionatorios';
    case 'profile':
      if (has('education')) return 'Educación';
      return 'Perfil y trayectoria';
    default:
      return 'Vínculos adicionales';
  }
}

export function getRelationshipSubgroupPriority(sectionKey: string, subgroupLabel: string, referenceLike: boolean): number {
  const referencePriority: Record<string, number> = {
    'Personas vinculadas': 10,
    'Educación': 20,
    'Afiliación y membresía': 30,
    'Cargos y funciones': 40,
    'Representación': 50,
    'Organizaciones vinculadas': 60,
    'Otras conexiones': 90,
  };

  const sectionPriority: Record<string, Record<string, number>> = {
    family: {
      'Pareja': 10,
      'Hijos': 20,
      'Padres': 30,
      'Hermanos': 40,
      'Familia extendida': 50,
      'Otros familiares': 90,
    },
    associates: {
      'Socios': 10,
      'Operadores y representantes': 20,
      'Asociados': 90,
    },
    corporate: {
      'Propiedad y control': 10,
      'Dirección y consejo': 20,
      'Empleo': 30,
      'Membresías': 40,
      'Otras corporativas': 90,
    },
    political: {
      'Cargos y función pública': 10,
      'Representación': 20,
      'Partidos y militancia': 30,
      'Otras políticas': 90,
    },
    sanctions: {
      'Vínculos sancionatorios': 10,
    },
    profile: {
      'Educación': 10,
      'Perfil y trayectoria': 90,
    },
  };

  if (referenceLike) return referencePriority[subgroupLabel] ?? 999;
  return sectionPriority[sectionKey]?.[subgroupLabel] ?? 999;
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
