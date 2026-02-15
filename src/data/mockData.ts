import type {
  Entity,
  SearchSuggestion,
  DashboardStats,
  Alert,
  Investigation,
  AuditLogEntry,
  User,
  GraphNode,
  GraphEdge,
  RiskFactor,
  Relationship,
} from '@/types';

// Helper function to generate dates
const daysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

// Risk Factors Generator
const generateRiskFactors = (overallScore: number): RiskFactor[] => {
  const factors: RiskFactor[] = [
    {
      category: 'sanctions',
      score: Math.min(100, overallScore + Math.random() * 20 - 10),
      level: overallScore > 75 ? 'critical' : overallScore > 50 ? 'high' : overallScore > 25 ? 'medium' : 'low',
      details: 'Based on sanctions list screening',
      lastUpdated: daysAgo(1),
    },
    {
      category: 'pep',
      score: Math.random() * 60,
      level: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
      details: 'Political exposure assessment',
      lastUpdated: daysAgo(3),
    },
    {
      category: 'adverse_media',
      score: Math.random() * 50,
      level: Math.random() > 0.8 ? 'high' : Math.random() > 0.5 ? 'medium' : 'low',
      details: 'Media monitoring results',
      lastUpdated: daysAgo(2),
    },
    {
      category: 'geographic',
      score: Math.random() * 40 + 20,
      level: Math.random() > 0.6 ? 'medium' : 'low',
      details: 'Country risk assessment',
      lastUpdated: daysAgo(5),
    },
    {
      category: 'network',
      score: Math.random() * 70,
      level: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
      details: 'Relationship network analysis',
      lastUpdated: daysAgo(1),
    },
  ];
  return factors;
};

// Mock Entities
export const mockEntities: Entity[] = [
  // Critical Risk - Sanctioned Individual
  {
    id: 'ent-001',
    type: 'person',
    primaryName: 'Viktor Petrovich Volkov',
    aliases: [
      { name: 'Viktor Volkov', type: 'also_known_as' },
      { name: 'V. P. Volkov', type: 'also_known_as' },
      { name: 'Виктор Волков', type: 'alias' },
    ],
    gender: 'male',
    dateOfBirth: '1968-03-15',
    placeOfBirth: 'Moscow, Russia',
    nationalities: ['Russia'],
    addresses: [
      {
        id: 'addr-001',
        street: 'Naberezhnaya Tower, Presnenskaya Emb. 10',
        city: 'Moscow',
        country: 'Russia',
        type: 'residential',
        isCurrent: true,
        source: 'OFAC',
      },
      {
        id: 'addr-002',
        street: 'Kempinski Residences, St. Moritz',
        city: 'St. Moritz',
        country: 'Switzerland',
        type: 'residential',
        isCurrent: false,
        source: 'ADVERSE_MEDIA',
      },
    ],
    identifications: [
      {
        id: 'id-001',
        type: 'passport',
        number: '75 1234567',
        country: 'Russia',
        source: 'OFAC',
      },
    ],
    overallRiskScore: 95,
    riskLevel: 'critical',
    riskFactors: generateRiskFactors(95),
    sanctions: [
      {
        id: 'san-001',
        source: 'OFAC',
        program: 'SDN',
        listingDate: '2022-03-15',
        reason: 'Associated with Russian energy sector; close associate of senior Russian government officials',
        status: 'active',
        referenceNumber: 'EO14024',
      },
      {
        id: 'san-002',
        source: 'EU',
        program: 'SDN',
        listingDate: '2022-03-15',
        reason: 'Benefiting from or supporting the Government of Russia',
        status: 'active',
        referenceNumber: 'EU/2022/345',
      },
      {
        id: 'san-003',
        source: 'HMT',
        program: 'SDN',
        listingDate: '2022-03-15',
        reason: 'Involved in obtaining a benefit from or supporting the Government of Russia',
        status: 'active',
        referenceNumber: 'UK/2022/123',
      },
    ],
    pepEntries: [
      {
        id: 'pep-001',
        category: 'close_associate',
        role: 'Close Associate of Government Official',
        country: 'Russia',
        startDate: '2010-01-01',
        isCurrent: true,
        source: 'PEP',
      },
    ],
    adverseMedia: [
      {
        id: 'am-001',
        title: 'Russian Oligarch Sanctions: Volkov Assets Frozen Across Europe',
        summary: 'Authorities in Switzerland, UK, and EU have frozen assets belonging to Viktor Volkov following sanctions designation. Estimated net worth of $2.3 billion under investigation.',
        source: 'Financial Times',
        publicationDate: daysAgo(45),
        sentiment: 'negative',
        categories: ['sanctions', 'asset_freeze', 'investigation'],
        language: 'en',
      },
      {
        id: 'am-002',
        title: 'Volkov Linked to Offshore Network in Pandora Papers',
        summary: 'Leaked documents reveal extensive offshore holdings including properties in London, Monaco, and Dubai.',
        source: 'ICIJ',
        publicationDate: daysAgo(180),
        sentiment: 'negative',
        categories: ['offshore', 'transparency', 'investigation'],
        language: 'en',
      },
    ],
    relationships: [], // Will be populated separately
    investigations: [],
    firstSeen: daysAgo(365),
    lastUpdated: daysAgo(1),
    dataSources: ['OFAC', 'EU', 'HMT', 'PEP', 'ADVERSE_MEDIA'],
  },

  // High Risk - PEP
  {
    id: 'ent-002',
    type: 'person',
    primaryName: 'Maria Elena Rodriguez Santos',
    aliases: [
      { name: 'M. E. Rodriguez', type: 'also_known_as' },
      { name: 'Maria Rodriguez', type: 'alias' },
    ],
    gender: 'female',
    dateOfBirth: '1975-08-22',
    placeOfBirth: 'Caracas, Venezuela',
    nationalities: ['Venezuela'],
    addresses: [
      {
        id: 'addr-003',
        street: 'Avenida Libertador, Torre Centro',
        city: 'Caracas',
        country: 'Venezuela',
        type: 'residential',
        isCurrent: true,
        source: 'PEP',
      },
    ],
    identifications: [
      {
        id: 'id-002',
        type: 'national_id',
        number: 'V-12345678',
        country: 'Venezuela',
        source: 'PEP',
      },
    ],
    overallRiskScore: 78,
    riskLevel: 'high',
    riskFactors: generateRiskFactors(78),
    sanctions: [],
    pepEntries: [
      {
        id: 'pep-002',
        category: 'minister',
        role: 'Minister of Petroleum and Mining',
        country: 'Venezuela',
        startDate: '2020-04-01',
        isCurrent: true,
        source: 'PEP',
      },
    ],
    adverseMedia: [
      {
        id: 'am-003',
        title: 'Venezuelan Oil Minister Faces Corruption Allegations',
        summary: 'Opposition leaders allege mismanagement of state oil company funds during tenure.',
        source: 'Reuters',
        publicationDate: daysAgo(30),
        sentiment: 'negative',
        categories: ['corruption', 'allegations'],
        language: 'en',
      },
    ],
    relationships: [],
    investigations: [],
    firstSeen: daysAgo(180),
    lastUpdated: daysAgo(5),
    dataSources: ['PEP', 'ADVERSE_MEDIA'],
  },

  // Medium Risk - Company
  {
    id: 'ent-003',
    type: 'company',
    primaryName: 'Global Maritime Trading Ltd',
    aliases: [
      { name: 'GMT Ltd', type: 'trading_as' },
      { name: 'Global Maritime', type: 'also_known_as' },
    ],
    incorporationDate: '2015-06-10',
    incorporationCountry: 'Marshall Islands',
    companyType: 'Limited Liability Company',
    status: 'active',
    addresses: [
      {
        id: 'addr-004',
        street: 'Trust Company Complex, Ajeltake Road',
        city: 'Majuro',
        country: 'Marshall Islands',
        type: 'registered',
        isCurrent: true,
        source: 'WORLDCHECK',
      },
      {
        id: 'addr-005',
        street: 'Port Authority Building, Room 402',
        city: 'Singapore',
        country: 'Singapore',
        type: 'business',
        isCurrent: true,
        source: 'WORLDCHECK',
      },
    ],
    identifications: [
      {
        id: 'id-003',
        type: 'company_reg',
        number: '78945',
        country: 'Marshall Islands',
        source: 'WORLDCHECK',
      },
    ],
    overallRiskScore: 52,
    riskLevel: 'medium',
    riskFactors: generateRiskFactors(52),
    sanctions: [],
    pepEntries: [],
    adverseMedia: [
      {
        id: 'am-004',
        title: 'Shipping Company Investigated for Sanctions Evasion',
        summary: 'Authorities investigating potential involvement in oil transfers to sanctioned entities.',
        source: 'Lloyd\'s List',
        publicationDate: daysAgo(60),
        sentiment: 'negative',
        categories: ['sanctions', 'investigation', 'shipping'],
        language: 'en',
      },
    ],
    relationships: [],
    investigations: [],
    firstSeen: daysAgo(90),
    lastUpdated: daysAgo(10),
    dataSources: ['WORLDCHECK', 'ADVERSE_MEDIA'],
  },

  // Critical Risk - Vessel
  {
    id: 'ent-004',
    type: 'vessel',
    primaryName: 'MV Ocean Star',
    aliases: [
      { name: 'Ocean Star', type: 'also_known_as' },
      { name: 'Formerly: MV Pacific Trader', type: 'former_name' },
    ],
    addresses: [
      {
        id: 'addr-006',
        city: 'Panama City',
        country: 'Panama',
        type: 'registered',
        isCurrent: true,
        source: 'OFAC',
      },
    ],
    identifications: [
      {
        id: 'id-004',
        type: 'vessel_imo',
        number: '9234567',
        source: 'OFAC',
      },
    ],
    overallRiskScore: 88,
    riskLevel: 'critical',
    riskFactors: generateRiskFactors(88),
    sanctions: [
      {
        id: 'san-004',
        source: 'OFAC',
        program: 'SDN',
        listingDate: '2023-01-20',
        reason: 'Property of blocked person; involved in transportation of sanctioned goods',
        status: 'active',
        referenceNumber: 'EO13846',
      },
    ],
    pepEntries: [],
    adverseMedia: [
      {
        id: 'am-005',
        title: 'Sanctioned Vessel Spotted in Iranian Waters',
        summary: 'Satellite imagery shows vessel engaging in ship-to-ship transfers near Iranian port.',
        source: 'Maritime Executive',
        publicationDate: daysAgo(15),
        sentiment: 'negative',
        categories: ['sanctions', 'shipping', 'iran'],
        language: 'en',
      },
    ],
    relationships: [],
    investigations: [],
    firstSeen: daysAgo(120),
    lastUpdated: daysAgo(2),
    dataSources: ['OFAC', 'ADVERSE_MEDIA'],
  },

  // Low Risk - Person
  {
    id: 'ent-005',
    type: 'person',
    primaryName: 'John Michael Thompson',
    aliases: [
      { name: 'John Thompson', type: 'also_known_as' },
      { name: 'J. M. Thompson', type: 'also_known_as' },
    ],
    gender: 'male',
    dateOfBirth: '1985-12-03',
    placeOfBirth: 'London, United Kingdom',
    nationalities: ['United Kingdom'],
    addresses: [
      {
        id: 'addr-007',
        street: '123 High Street',
        city: 'London',
        postalCode: 'SW1A 1AA',
        country: 'United Kingdom',
        type: 'residential',
        isCurrent: true,
        source: 'INTERNAL',
      },
    ],
    identifications: [
      {
        id: 'id-005',
        type: 'passport',
        number: '123456789',
        country: 'United Kingdom',
        source: 'INTERNAL',
      },
    ],
    overallRiskScore: 12,
    riskLevel: 'low',
    riskFactors: generateRiskFactors(12),
    sanctions: [],
    pepEntries: [],
    adverseMedia: [],
    relationships: [],
    investigations: [],
    firstSeen: daysAgo(30),
    lastUpdated: daysAgo(30),
    dataSources: ['INTERNAL'],
  },

  // High Risk - Company with PEP connection
  {
    id: 'ent-006',
    type: 'company',
    primaryName: 'Phoenix Investment Holdings SA',
    aliases: [
      { name: 'Phoenix Holdings', type: 'trading_as' },
    ],
    incorporationDate: '2018-09-15',
    incorporationCountry: 'Panama',
    companyType: 'Sociedad Anonima',
    status: 'active',
    addresses: [
      {
        id: 'addr-008',
        street: 'Avenida Balboa, Torre Bac',
        city: 'Panama City',
        country: 'Panama',
        type: 'registered',
        isCurrent: true,
        source: 'WORLDCHECK',
      },
    ],
    identifications: [
      {
        id: 'id-006',
        type: 'company_reg',
        number: '155789234',
        country: 'Panama',
        source: 'WORLDCHECK',
      },
    ],
    overallRiskScore: 68,
    riskLevel: 'high',
    riskFactors: generateRiskFactors(68),
    sanctions: [],
    pepEntries: [],
    adverseMedia: [
      {
        id: 'am-006',
        title: 'Panama Company Linked to Political Corruption Scandal',
        summary: 'Investigation reveals connections to officials in multiple jurisdictions.',
        source: 'OCCRP',
        publicationDate: daysAgo(90),
        sentiment: 'negative',
        categories: ['corruption', 'offshore', 'investigation'],
        language: 'en',
      },
    ],
    relationships: [],
    investigations: [],
    firstSeen: daysAgo(200),
    lastUpdated: daysAgo(7),
    dataSources: ['WORLDCHECK', 'ADVERSE_MEDIA'],
  },

  // Medium Risk - Aircraft
  {
    id: 'ent-007',
    type: 'aircraft',
    primaryName: 'Boeing 737-700 BBJ',
    aliases: [
      { name: 'Tail Number: P4-ABC', type: 'also_known_as' },
    ],
    addresses: [
      {
        id: 'addr-009',
        city: 'Cayman Islands',
        country: 'Cayman Islands',
        type: 'registered',
        isCurrent: true,
        source: 'WORLDCHECK',
      },
    ],
    identifications: [
      {
        id: 'id-007',
        type: 'aircraft_tail',
        number: 'P4-ABC',
        source: 'WORLDCHECK',
      },
    ],
    overallRiskScore: 45,
    riskLevel: 'medium',
    riskFactors: generateRiskFactors(45),
    sanctions: [],
    pepEntries: [],
    adverseMedia: [],
    relationships: [],
    investigations: [],
    firstSeen: daysAgo(60),
    lastUpdated: daysAgo(14),
    dataSources: ['WORLDCHECK'],
  },

  // Critical Risk - Organization
  {
    id: 'ent-008',
    type: 'organization',
    primaryName: 'Al-Baraka Trading Company',
    aliases: [
      { name: 'Al-Baraka Co.', type: 'trading_as' },
      { name: 'ABC Trading', type: 'also_known_as' },
    ],
    addresses: [
      {
        id: 'addr-010',
        street: 'Al-Mutanabbi Street, Building 45',
        city: 'Sana\'a',
        country: 'Yemen',
        type: 'business',
        isCurrent: true,
        source: 'OFAC',
      },
    ],
    identifications: [
      {
        id: 'id-008',
        type: 'company_reg',
        number: 'YEM-78945',
        country: 'Yemen',
        source: 'OFAC',
      },
    ],
    overallRiskScore: 92,
    riskLevel: 'critical',
    riskFactors: generateRiskFactors(92),
    sanctions: [
      {
        id: 'san-005',
        source: 'OFAC',
        program: 'SDN',
        listingDate: '2021-11-10',
        reason: 'Materially assisting, sponsoring, or providing financial, material, or technological support to designated entities',
        status: 'active',
        referenceNumber: 'EO13224',
      },
      {
        id: 'san-006',
        source: 'UN',
        program: 'ISIL',
        listingDate: '2021-12-01',
        reason: 'Association with Al-Qaida and related entities',
        status: 'active',
        referenceNumber: 'QDe.XXX',
      },
    ],
    pepEntries: [],
    adverseMedia: [
      {
        id: 'am-007',
        title: 'Designated Entity Continues Operations Despite Sanctions',
        summary: 'Reports indicate company still conducting business through front companies in neighboring countries.',
        source: 'BBC News',
        publicationDate: daysAgo(20),
        sentiment: 'negative',
        categories: ['sanctions', 'terrorism', 'investigation'],
        language: 'en',
      },
    ],
    relationships: [],
    investigations: [],
    firstSeen: daysAgo(300),
    lastUpdated: daysAgo(3),
    dataSources: ['OFAC', 'UN', 'ADVERSE_MEDIA'],
  },
];

// Relationships
export const mockRelationships: Relationship[] = [
  // Viktor Volkov ownership of companies
  {
    id: 'rel-001',
    sourceEntityId: 'ent-001',
    targetEntityId: 'ent-003',
    type: 'ownership',
    description: 'Beneficial owner with 85% stake',
    startDate: '2015-06-10',
    isCurrent: true,
    confidence: 95,
    source: 'ADVERSE_MEDIA',
  },
  {
    id: 'rel-002',
    sourceEntityId: 'ent-001',
    targetEntityId: 'ent-006',
    type: 'ownership',
    description: 'Ultimate beneficial owner through shell companies',
    startDate: '2018-09-15',
    isCurrent: true,
    confidence: 88,
    source: 'ADVERSE_MEDIA',
  },
  // Company to vessel
  {
    id: 'rel-003',
    sourceEntityId: 'ent-003',
    targetEntityId: 'ent-004',
    type: 'ownership',
    description: 'Registered owner',
    startDate: '2020-01-15',
    isCurrent: true,
    confidence: 100,
    source: 'OFAC',
  },
  // Company to aircraft
  {
    id: 'rel-004',
    sourceEntityId: 'ent-006',
    targetEntityId: 'ent-007',
    type: 'ownership',
    description: 'Aircraft owned by company executive',
    startDate: '2019-03-20',
    isCurrent: true,
    confidence: 75,
    source: 'WORLDCHECK',
  },
  // Organization connections
  {
    id: 'rel-005',
    sourceEntityId: 'ent-008',
    targetEntityId: 'ent-003',
    type: 'transaction',
    description: 'Alleged business dealings',
    isCurrent: false,
    confidence: 65,
    source: 'ADVERSE_MEDIA',
  },
];

// Link relationships to entities
mockEntities.forEach(entity => {
  entity.relationships = mockRelationships.filter(
    rel => rel.sourceEntityId === entity.id || rel.targetEntityId === entity.id
  );
});

// Search Suggestions
export const mockSearchSuggestions: SearchSuggestion[] = [
  {
    id: 'ent-001',
    name: 'Viktor Petrovich Volkov',
    type: 'person',
    riskLevel: 'critical',
    sources: ['OFAC', 'EU', 'HMT'],
    nationality: 'Russia',
    description: 'Sanctioned individual - Russian energy sector',
    matchScore: 100,
  },
  {
    id: 'ent-002',
    name: 'Maria Elena Rodriguez Santos',
    type: 'person',
    riskLevel: 'high',
    sources: ['PEP'],
    nationality: 'Venezuela',
    description: 'Minister of Petroleum and Mining',
    matchScore: 95,
  },
  {
    id: 'ent-003',
    name: 'Global Maritime Trading Ltd',
    type: 'company',
    riskLevel: 'medium',
    sources: ['WORLDCHECK', 'ADVERSE_MEDIA'],
    nationality: 'Marshall Islands',
    description: 'Shipping company under investigation',
    matchScore: 90,
  },
  {
    id: 'ent-004',
    name: 'MV Ocean Star',
    type: 'vessel',
    riskLevel: 'critical',
    sources: ['OFAC'],
    nationality: 'Panama',
    description: 'Sanctioned vessel - IMO 9234567',
    matchScore: 100,
  },
  {
    id: 'ent-006',
    name: 'Phoenix Investment Holdings SA',
    type: 'company',
    riskLevel: 'high',
    sources: ['WORLDCHECK', 'ADVERSE_MEDIA'],
    nationality: 'Panama',
    description: 'Linked to political corruption scandal',
    matchScore: 88,
  },
  {
    id: 'ent-008',
    name: 'Al-Baraka Trading Company',
    type: 'organization',
    riskLevel: 'critical',
    sources: ['OFAC', 'UN'],
    nationality: 'Yemen',
    description: 'Designated entity - terrorism financing',
    matchScore: 100,
  },
];

// Dashboard Stats
export const mockDashboardStats: DashboardStats = {
  totalScreened: 524783921,
  matchesFound: 2847563,
  highRiskMatches: 45231,
  pendingInvestigations: 1847,
  averageResponseTime: 42,
  dailySearches: 284756,
};

// Alerts
export const mockAlerts: Alert[] = [
  {
    id: 'alert-001',
    entityId: 'ent-001',
    entityName: 'Viktor Petrovich Volkov',
    type: 'new_sanction',
    severity: 'critical',
    message: 'New EU sanctions designation added',
    createdAt: daysAgo(1),
    isRead: false,
  },
  {
    id: 'alert-002',
    entityId: 'ent-003',
    entityName: 'Global Maritime Trading Ltd',
    type: 'media_alert',
    severity: 'high',
    message: 'New adverse media article published',
    createdAt: daysAgo(2),
    isRead: false,
  },
  {
    id: 'alert-003',
    entityId: 'ent-004',
    entityName: 'MV Ocean Star',
    type: 'status_change',
    severity: 'critical',
    message: 'Vessel spotted in Iranian waters',
    createdAt: daysAgo(1),
    isRead: true,
  },
  {
    id: 'alert-004',
    entityId: 'ent-002',
    entityName: 'Maria Elena Rodriguez Santos',
    type: 'risk_increase',
    severity: 'medium',
    message: 'Risk score increased due to new media',
    createdAt: daysAgo(3),
    isRead: false,
  },
];

// Investigations
export const mockInvestigations: Investigation[] = [
  {
    id: 'inv-001',
    entityId: 'ent-001',
    status: 'in_progress',
    assignedTo: 'Sarah Johnson',
    openedAt: daysAgo(30),
    notes: [
      {
        id: 'note-001',
        author: 'Sarah Johnson',
        content: 'Initial screening completed. Multiple sanctions matches confirmed. Enhanced due diligence required.',
        createdAt: daysAgo(30),
        type: 'general',
      },
      {
        id: 'note-002',
        author: 'Sarah Johnson',
        content: 'Asset tracing initiated. Found connections to 3 offshore companies.',
        createdAt: daysAgo(15),
        type: 'finding',
      },
    ],
  },
  {
    id: 'inv-002',
    entityId: 'ent-003',
    status: 'pending_review',
    assignedTo: 'Michael Chen',
    openedAt: daysAgo(45),
    notes: [
      {
        id: 'note-003',
        author: 'Michael Chen',
        content: 'Shipping routes analysis completed. Suspicious patterns identified.',
        createdAt: daysAgo(40),
        type: 'finding',
      },
    ],
  },
];

// Audit Logs
export const mockAuditLogs: AuditLogEntry[] = [
  {
    id: 'audit-001',
    userId: 'user-001',
    userName: 'Sarah Johnson',
    action: 'search',
    entityId: 'ent-001',
    entityName: 'Viktor Petrovich Volkov',
    timestamp: daysAgo(1),
    ipAddress: '192.168.1.100',
  },
  {
    id: 'audit-002',
    userId: 'user-001',
    userName: 'Sarah Johnson',
    action: 'view',
    entityId: 'ent-001',
    entityName: 'Viktor Petrovich Volkov',
    timestamp: daysAgo(1),
    ipAddress: '192.168.1.100',
  },
  {
    id: 'audit-003',
    userId: 'user-002',
    userName: 'Michael Chen',
    action: 'export',
    entityId: 'ent-003',
    entityName: 'Global Maritime Trading Ltd',
    timestamp: daysAgo(2),
    ipAddress: '192.168.1.101',
  },
  {
    id: 'audit-004',
    userId: 'user-001',
    userName: 'Sarah Johnson',
    action: 'note_added',
    entityId: 'ent-001',
    entityName: 'Viktor Petrovich Volkov',
    timestamp: daysAgo(3),
    ipAddress: '192.168.1.100',
  },
];

// Current User
export const mockCurrentUser: User = {
  id: 'user-001',
  email: 'sarah.johnson@sentinel.com',
  firstName: 'Sarah',
  lastName: 'Johnson',
  role: 'analyst',
  permissions: ['search', 'view', 'investigate', 'export', 'notes'],
  lastLogin: daysAgo(0),
  isActive: true,
};

// Graph Data for Network Visualization
export const generateGraphData = (centerEntityId: string): { nodes: GraphNode[]; edges: GraphEdge[] } => {
  const centerEntity = mockEntities.find(e => e.id === centerEntityId);
  if (!centerEntity) return { nodes: [], edges: [] };

  const nodes: GraphNode[] = [
    {
      id: centerEntity.id,
      type: centerEntity.type,
      position: { x: 400, y: 300 },
      data: {
        label: centerEntity.primaryName,
        entity: centerEntity,
        riskLevel: centerEntity.riskLevel,
        isExpanded: true,
      },
    },
  ];

  const edges: GraphEdge[] = [];
  const relatedEntities = new Set<string>();

  // Add related entities from relationships
  centerEntity.relationships.forEach((rel, index) => {
    const isSource = rel.sourceEntityId === centerEntityId;
    const relatedId = isSource ? rel.targetEntityId : rel.sourceEntityId;
    const relatedEntity = mockEntities.find(e => e.id === relatedId);

    if (relatedEntity && !relatedEntities.has(relatedId)) {
      relatedEntities.add(relatedId);

      // Calculate position in a circle around center
      const angle = (index * 2 * Math.PI) / Math.max(centerEntity.relationships.length, 1);
      const radius = 250;
      const x = 400 + radius * Math.cos(angle);
      const y = 300 + radius * Math.sin(angle);

      nodes.push({
        id: relatedEntity.id,
        type: relatedEntity.type,
        position: { x, y },
        data: {
          label: relatedEntity.primaryName,
          entity: relatedEntity,
          riskLevel: relatedEntity.riskLevel,
          isExpanded: false,
        },
      });

      edges.push({
        id: `edge-${rel.id}`,
        source: rel.sourceEntityId,
        target: rel.targetEntityId,
        type: rel.type,
        data: {
          label: rel.type.replace('_', ' '),
          confidence: rel.confidence,
        },
      });
    }
  });

  // Add some additional connected nodes for visualization
  const additionalNodes = mockEntities
    .filter(e => e.id !== centerEntityId && !relatedEntities.has(e.id))
    .slice(0, 3);

  additionalNodes.forEach((entity, index) => {
    const angle = ((centerEntity.relationships.length + index) * 2 * Math.PI) / 6;
    const radius = 350;
    const x = 400 + radius * Math.cos(angle);
    const y = 300 + radius * Math.sin(angle);

    nodes.push({
      id: entity.id,
      type: entity.type,
      position: { x, y },
      data: {
        label: entity.primaryName,
        entity,
        riskLevel: entity.riskLevel,
        isExpanded: false,
      },
    });

    edges.push({
      id: `edge-additional-${index}`,
      source: centerEntityId,
      target: entity.id,
      type: 'shared_contact',
      data: {
        label: 'potential link',
        confidence: 45,
      },
    });
  });

  return { nodes, edges };
};

// Export all mock data
export const mockData = {
  entities: mockEntities,
  relationships: mockRelationships,
  searchSuggestions: mockSearchSuggestions,
  dashboardStats: mockDashboardStats,
  alerts: mockAlerts,
  investigations: mockInvestigations,
  auditLogs: mockAuditLogs,
  currentUser: mockCurrentUser,
  generateGraphData,
};

export default mockData;
