// lib/fantasy.ts — F1 Fantasy data, types, and card definitions

export type CardRarity = 'legend' | 'elite' | 'gold' | 'silver' | 'bronze';
export type CardVersion = 'base' | 'champion' | 'race_winner' | 'legend';
export type CardType = 'driver' | 'constructor';

export type DriverStats = {
  pac: number; // Pace — raw qualifying speed
  rac: number; // Racecraft — wheel-to-wheel ability
  con: number; // Consistency — avoiding mistakes
  exp: number; // Experience — seasons raced
  def: number; // Defence — holding position under pressure
  atk: number; // Attack — overtaking ability
};

export type ConstructorStats = {
  car: number; // Car Performance
  rel: number; // Reliability
  str: number; // Strategy
  pit: number; // Pit Stop Speed
  dev: number; // Development Rate
  bgt: number; // Budget Power
};

export type DriverCard = {
  id: string;
  type: 'driver';
  rarity: CardRarity;
  cardVersion?: CardVersion;
  versionLabel?: string;
  customBg?: [string, string];
  customAccent?: string;
  customBorderColor?: string;
  driverId: string;
  firstName: string;
  lastName: string;
  nationality: string;
  flagEmoji: string;
  constructorId: string;
  teamName: string;
  overall: number;
  price: number;
  stats: DriverStats;
};

export type ConstructorCard = {
  id: string;
  type: 'constructor';
  rarity: CardRarity;
  cardVersion?: CardVersion;
  versionLabel?: string;
  customBg?: [string, string];
  customAccent?: string;
  customBorderColor?: string;
  constructorId: string;
  name: string;
  nationality: string;
  flagEmoji: string;
  overall: number;
  price: number;
  stats: ConstructorStats;
};

export type FantasyCard = DriverCard | ConstructorCard;

export const STARTING_BALANCE = 15_000_000;

// ─── Contract system ──────────────────────────────────────────────────────────

export type ContractTier = 'short' | 'mid' | 'long';

export type ContractTierDef = {
  tier: ContractTier;
  label: string;
  races: number;
  costRatio: number;   // signing cost = card.price × costRatio
  multiplier: number;  // race earnings multiplier
};

export const CONTRACT_TIERS: ContractTierDef[] = [
  { tier: 'short', label: 'Short',  races: 6,  costRatio: 0.15, multiplier: 0.8  },
  { tier: 'mid',   label: 'Mid',    races: 12, costRatio: 0.25, multiplier: 1.0  },
  { tier: 'long',  label: 'Season', races: 24, costRatio: 0.40, multiplier: 1.35 },
];

export type Contract = {
  cardId: string;
  tier: ContractTier;
  signingCost: number;
  multiplier: number;
  racesTotal: number;
  racesCompleted: number;
};

export function getContractCost(price: number, tier: ContractTier): number {
  const def = CONTRACT_TIERS.find(t => t.tier === tier)!;
  return Math.floor(price * def.costRatio);
}

export function getRacesRemaining(contract: Contract): number {
  return Math.max(0, contract.racesTotal - contract.racesCompleted);
}

export function isContractExpired(contract: Contract): boolean {
  return contract.racesCompleted >= contract.racesTotal;
}

// Penalty scales down as contract approaches expiry — early breaks are brutal
export function getTerminationPenalty(contract: Contract): number {
  const remaining = getRacesRemaining(contract);
  return Math.floor(contract.signingCost * (remaining / contract.racesTotal));
}

// Race finish position → coins earned per driver/constructor card owned
export const RACE_REWARDS: Record<number, number> = {
  1: 200_000,
  2: 140_000,
  3: 100_000,
  4: 70_000,
  5: 50_000,
  6: 40_000,
  7: 30_000,
  8: 25_000,
  9: 20_000,
  10: 15_000,
};

export const DRIVER_CARDS: DriverCard[] = [
  // ── Elite ─────────────────────────────────────────────────────────
  {
    id: 'drv_verstappen',
    type: 'driver',
    rarity: 'elite',
    driverId: 'verstappen',
    firstName: 'Max',
    lastName: 'Verstappen',
    nationality: 'Dutch',
    flagEmoji: '🇳🇱',
    constructorId: 'red_bull',
    teamName: 'Red Bull',
    overall: 97,
    price: 5_000_000,
    stats: { pac: 98, rac: 97, con: 96, exp: 95, def: 94, atk: 98 },
  },
  {
    id: 'drv_hamilton',
    type: 'driver',
    rarity: 'elite',
    driverId: 'hamilton',
    firstName: 'Lewis',
    lastName: 'Hamilton',
    nationality: 'British',
    flagEmoji: '🇬🇧',
    constructorId: 'ferrari',
    teamName: 'Ferrari',
    overall: 95,
    price: 4_500_000,
    stats: { pac: 94, rac: 96, con: 95, exp: 99, def: 95, atk: 95 },
  },
  {
    id: 'drv_alonso',
    type: 'driver',
    rarity: 'elite',
    driverId: 'alonso',
    firstName: 'Fernando',
    lastName: 'Alonso',
    nationality: 'Spanish',
    flagEmoji: '🇪🇸',
    constructorId: 'aston_martin',
    teamName: 'Aston Martin',
    overall: 93,
    price: 4_000_000,
    stats: { pac: 90, rac: 95, con: 91, exp: 99, def: 96, atk: 93 },
  },

  // ── Gold ──────────────────────────────────────────────────────────
  {
    id: 'drv_norris',
    type: 'driver',
    rarity: 'gold',
    driverId: 'norris',
    firstName: 'Lando',
    lastName: 'Norris',
    nationality: 'British',
    flagEmoji: '🇬🇧',
    constructorId: 'mclaren',
    teamName: 'McLaren',
    overall: 91,
    price: 3_500_000,
    stats: { pac: 94, rac: 90, con: 88, exp: 82, def: 86, atk: 92 },
  },
  {
    id: 'drv_leclerc',
    type: 'driver',
    rarity: 'gold',
    driverId: 'leclerc',
    firstName: 'Charles',
    lastName: 'Leclerc',
    nationality: 'Monégasque',
    flagEmoji: '🇲🇨',
    constructorId: 'ferrari',
    teamName: 'Ferrari',
    overall: 90,
    price: 3_200_000,
    stats: { pac: 95, rac: 88, con: 82, exp: 88, def: 84, atk: 90 },
  },
  {
    id: 'drv_piastri',
    type: 'driver',
    rarity: 'gold',
    driverId: 'piastri',
    firstName: 'Oscar',
    lastName: 'Piastri',
    nationality: 'Australian',
    flagEmoji: '🇦🇺',
    constructorId: 'mclaren',
    teamName: 'McLaren',
    overall: 88,
    price: 2_800_000,
    stats: { pac: 92, rac: 88, con: 87, exp: 78, def: 85, atk: 88 },
  },
  {
    id: 'drv_russell',
    type: 'driver',
    rarity: 'gold',
    driverId: 'russell',
    firstName: 'George',
    lastName: 'Russell',
    nationality: 'British',
    flagEmoji: '🇬🇧',
    constructorId: 'mercedes',
    teamName: 'Mercedes',
    overall: 87,
    price: 2_600_000,
    stats: { pac: 90, rac: 85, con: 88, exp: 84, def: 86, atk: 84 },
  },
  {
    id: 'drv_sainz',
    type: 'driver',
    rarity: 'gold',
    driverId: 'sainz',
    firstName: 'Carlos',
    lastName: 'Sainz',
    nationality: 'Spanish',
    flagEmoji: '🇪🇸',
    constructorId: 'williams',
    teamName: 'Williams',
    overall: 87,
    price: 2_400_000,
    stats: { pac: 88, rac: 86, con: 88, exp: 88, def: 87, atk: 87 },
  },
  {
    id: 'drv_perez',
    type: 'driver',
    rarity: 'gold',
    driverId: 'perez',
    firstName: 'Sergio',
    lastName: 'Perez',
    nationality: 'Mexican',
    flagEmoji: '🇲🇽',
    constructorId: 'red_bull',
    teamName: 'Red Bull',
    overall: 83,
    price: 1_800_000,
    stats: { pac: 85, rac: 80, con: 78, exp: 90, def: 80, atk: 80 },
  },

  // ── Silver ────────────────────────────────────────────────────────
  {
    id: 'drv_hulkenberg',
    type: 'driver',
    rarity: 'silver',
    driverId: 'hulkenberg',
    firstName: 'Nico',
    lastName: 'Hulkenberg',
    nationality: 'German',
    flagEmoji: '🇩🇪',
    constructorId: 'sauber',
    teamName: 'Audi',
    overall: 81,
    price: 1_400_000,
    stats: { pac: 80, rac: 78, con: 82, exp: 90, def: 80, atk: 76 },
  },
  {
    id: 'drv_albon',
    type: 'driver',
    rarity: 'silver',
    driverId: 'albon',
    firstName: 'Alexander',
    lastName: 'Albon',
    nationality: 'Thai',
    flagEmoji: '🇹🇭',
    constructorId: 'williams',
    teamName: 'Williams',
    overall: 80,
    price: 1_200_000,
    stats: { pac: 82, rac: 78, con: 80, exp: 80, def: 82, atk: 78 },
  },
  {
    id: 'drv_gasly',
    type: 'driver',
    rarity: 'silver',
    driverId: 'gasly',
    firstName: 'Pierre',
    lastName: 'Gasly',
    nationality: 'French',
    flagEmoji: '🇫🇷',
    constructorId: 'alpine',
    teamName: 'Alpine',
    overall: 80,
    price: 1_100_000,
    stats: { pac: 82, rac: 80, con: 78, exp: 85, def: 78, atk: 80 },
  },
  {
    id: 'drv_antonelli',
    type: 'driver',
    rarity: 'silver',
    driverId: 'antonelli',
    firstName: 'Kimi',
    lastName: 'Antonelli',
    nationality: 'Italian',
    flagEmoji: '🇮🇹',
    constructorId: 'mercedes',
    teamName: 'Mercedes',
    overall: 78,
    price: 1_000_000,
    stats: { pac: 84, rac: 74, con: 70, exp: 58, def: 68, atk: 78 },
  },
  {
    id: 'drv_ocon',
    type: 'driver',
    rarity: 'silver',
    driverId: 'ocon',
    firstName: 'Esteban',
    lastName: 'Ocon',
    nationality: 'French',
    flagEmoji: '🇫🇷',
    constructorId: 'haas',
    teamName: 'Haas',
    overall: 79,
    price: 900_000,
    stats: { pac: 80, rac: 76, con: 78, exp: 84, def: 76, atk: 78 },
  },
  {
    id: 'drv_lawson',
    type: 'driver',
    rarity: 'silver',
    driverId: 'lawson',
    firstName: 'Liam',
    lastName: 'Lawson',
    nationality: 'New Zealander',
    flagEmoji: '🇳🇿',
    constructorId: 'rb',
    teamName: 'Racing Bulls',
    overall: 76,
    price: 750_000,
    stats: { pac: 82, rac: 76, con: 74, exp: 68, def: 72, atk: 78 },
  },
  {
    id: 'drv_stroll',
    type: 'driver',
    rarity: 'silver',
    driverId: 'stroll',
    firstName: 'Lance',
    lastName: 'Stroll',
    nationality: 'Canadian',
    flagEmoji: '🇨🇦',
    constructorId: 'aston_martin',
    teamName: 'Aston Martin',
    overall: 74,
    price: 650_000,
    stats: { pac: 78, rac: 72, con: 72, exp: 82, def: 70, atk: 70 },
  },

  // ── Bronze ────────────────────────────────────────────────────────
  {
    id: 'drv_hadjar',
    type: 'driver',
    rarity: 'bronze',
    driverId: 'hadjar',
    firstName: 'Isack',
    lastName: 'Hadjar',
    nationality: 'French',
    flagEmoji: '🇫🇷',
    constructorId: 'rb',
    teamName: 'Racing Bulls',
    overall: 72,
    price: 500_000,
    stats: { pac: 80, rac: 72, con: 68, exp: 58, def: 68, atk: 72 },
  },
  {
    id: 'drv_bearman',
    type: 'driver',
    rarity: 'bronze',
    driverId: 'bearman',
    firstName: 'Oliver',
    lastName: 'Bearman',
    nationality: 'British',
    flagEmoji: '🇬🇧',
    constructorId: 'haas',
    teamName: 'Haas',
    overall: 70,
    price: 400_000,
    stats: { pac: 78, rac: 70, con: 68, exp: 60, def: 66, atk: 70 },
  },
  {
    id: 'drv_bortoleto',
    type: 'driver',
    rarity: 'bronze',
    driverId: 'bortoleto',
    firstName: 'Gabriel',
    lastName: 'Bortoleto',
    nationality: 'Brazilian',
    flagEmoji: '🇧🇷',
    constructorId: 'sauber',
    teamName: 'Audi',
    overall: 68,
    price: 350_000,
    stats: { pac: 76, rac: 68, con: 66, exp: 55, def: 64, atk: 70 },
  },
  {
    id: 'drv_colapinto',
    type: 'driver',
    rarity: 'bronze',
    driverId: 'colapinto',
    firstName: 'Franco',
    lastName: 'Colapinto',
    nationality: 'Argentinian',
    flagEmoji: '🇦🇷',
    constructorId: 'alpine',
    teamName: 'Alpine',
    overall: 69,
    price: 380_000,
    stats: { pac: 78, rac: 70, con: 66, exp: 62, def: 66, atk: 72 },
  },
  {
    id: 'drv_bottas',
    type: 'driver',
    rarity: 'bronze',
    driverId: 'bottas',
    firstName: 'Valtteri',
    lastName: 'Bottas',
    nationality: 'Finnish',
    flagEmoji: '🇫🇮',
    constructorId: 'sauber',
    teamName: 'Audi',
    overall: 71,
    price: 300_000,
    stats: { pac: 80, rac: 72, con: 74, exp: 88, def: 72, atk: 68 },
  },
];

export const CONSTRUCTOR_CARDS: ConstructorCard[] = [
  {
    id: 'con_red_bull',
    type: 'constructor',
    rarity: 'elite',
    constructorId: 'red_bull',
    name: 'Red Bull Racing',
    nationality: 'Austrian',
    flagEmoji: '🇦🇹',
    overall: 95,
    price: 8_000_000,
    stats: { car: 96, rel: 92, str: 95, pit: 98, dev: 90, bgt: 98 },
  },
  {
    id: 'con_ferrari',
    type: 'constructor',
    rarity: 'elite',
    constructorId: 'ferrari',
    name: 'Ferrari',
    nationality: 'Italian',
    flagEmoji: '🇮🇹',
    overall: 92,
    price: 7_000_000,
    stats: { car: 94, rel: 88, str: 88, pit: 92, dev: 92, bgt: 96 },
  },
  {
    id: 'con_mclaren',
    type: 'constructor',
    rarity: 'gold',
    constructorId: 'mclaren',
    name: 'McLaren',
    nationality: 'British',
    flagEmoji: '🇬🇧',
    overall: 91,
    price: 6_500_000,
    stats: { car: 94, rel: 90, str: 90, pit: 90, dev: 92, bgt: 90 },
  },
  {
    id: 'con_mercedes',
    type: 'constructor',
    rarity: 'gold',
    constructorId: 'mercedes',
    name: 'Mercedes',
    nationality: 'German',
    flagEmoji: '🇩🇪',
    overall: 88,
    price: 5_500_000,
    stats: { car: 90, rel: 92, str: 90, pit: 88, dev: 88, bgt: 94 },
  },
  {
    id: 'con_aston_martin',
    type: 'constructor',
    rarity: 'gold',
    constructorId: 'aston_martin',
    name: 'Aston Martin',
    nationality: 'British',
    flagEmoji: '🇬🇧',
    overall: 82,
    price: 3_200_000,
    stats: { car: 84, rel: 84, str: 82, pit: 82, dev: 80, bgt: 80 },
  },
  {
    id: 'con_williams',
    type: 'constructor',
    rarity: 'silver',
    constructorId: 'williams',
    name: 'Williams',
    nationality: 'British',
    flagEmoji: '🇬🇧',
    overall: 76,
    price: 2_000_000,
    stats: { car: 78, rel: 78, str: 76, pit: 76, dev: 76, bgt: 72 },
  },
  {
    id: 'con_alpine',
    type: 'constructor',
    rarity: 'silver',
    constructorId: 'alpine',
    name: 'Alpine',
    nationality: 'French',
    flagEmoji: '🇫🇷',
    overall: 74,
    price: 1_800_000,
    stats: { car: 76, rel: 76, str: 74, pit: 74, dev: 74, bgt: 70 },
  },
  {
    id: 'con_rb',
    type: 'constructor',
    rarity: 'silver',
    constructorId: 'rb',
    name: 'Racing Bulls',
    nationality: 'Italian',
    flagEmoji: '🇮🇹',
    overall: 72,
    price: 1_500_000,
    stats: { car: 74, rel: 74, str: 72, pit: 76, dev: 70, bgt: 66 },
  },
  {
    id: 'con_haas',
    type: 'constructor',
    rarity: 'bronze',
    constructorId: 'haas',
    name: 'Haas',
    nationality: 'American',
    flagEmoji: '🇺🇸',
    overall: 66,
    price: 800_000,
    stats: { car: 68, rel: 70, str: 66, pit: 68, dev: 62, bgt: 60 },
  },
  {
    id: 'con_sauber',
    type: 'constructor',
    rarity: 'bronze',
    constructorId: 'sauber',
    name: 'Audi',
    nationality: 'German',
    flagEmoji: '🇩🇪',
    overall: 64,
    price: 700_000,
    stats: { car: 66, rel: 68, str: 64, pit: 66, dev: 68, bgt: 62 },
  },
];

// ─── Legend cards ─────────────────────────────────────────────────────────────

export const LEGEND_CARDS: DriverCard[] = [
  {
    id: 'leg_senna',
    type: 'driver', rarity: 'legend', cardVersion: 'legend', versionLabel: 'LEGEND',
    driverId: 'senna', firstName: 'Ayrton', lastName: 'Senna',
    nationality: 'Brazilian', flagEmoji: '🇧🇷',
    constructorId: 'mclaren', teamName: 'McLaren',
    overall: 99, price: 13_000_000,
    stats: { pac: 99, rac: 99, con: 88, exp: 97, def: 97, atk: 99 },
  },
  {
    id: 'leg_schumacher',
    type: 'driver', rarity: 'legend', cardVersion: 'legend', versionLabel: 'LEGEND',
    driverId: 'schumacher', firstName: 'Michael', lastName: 'Schumacher',
    nationality: 'German', flagEmoji: '🇩🇪',
    constructorId: 'ferrari', teamName: 'Ferrari',
    overall: 99, price: 14_000_000,
    stats: { pac: 97, rac: 98, con: 97, exp: 99, def: 98, atk: 98 },
  },
  {
    id: 'leg_prost',
    type: 'driver', rarity: 'legend', cardVersion: 'legend', versionLabel: 'LEGEND',
    driverId: 'prost', firstName: 'Alain', lastName: 'Prost',
    nationality: 'French', flagEmoji: '🇫🇷',
    constructorId: 'mclaren', teamName: 'McLaren',
    overall: 97, price: 11_000_000,
    stats: { pac: 93, rac: 97, con: 99, exp: 99, def: 96, atk: 92 },
  },
  {
    id: 'leg_vettel',
    type: 'driver', rarity: 'legend', cardVersion: 'legend', versionLabel: 'LEGEND',
    driverId: 'vettel', firstName: 'Sebastian', lastName: 'Vettel',
    nationality: 'German', flagEmoji: '🇩🇪',
    constructorId: 'red_bull', teamName: 'Red Bull',
    overall: 96, price: 10_000_000,
    stats: { pac: 94, rac: 95, con: 96, exp: 97, def: 93, atk: 95 },
  },
  {
    id: 'leg_fangio',
    type: 'driver', rarity: 'legend', cardVersion: 'legend', versionLabel: 'LEGEND',
    driverId: 'fangio', firstName: 'Juan Manuel', lastName: 'Fangio',
    nationality: 'Argentinian', flagEmoji: '🇦🇷',
    constructorId: 'mercedes', teamName: 'Mercedes',
    overall: 98, price: 12_000_000,
    stats: { pac: 96, rac: 97, con: 96, exp: 95, def: 94, atk: 97 },
  },
];

// ─── Special version cards ────────────────────────────────────────────────────

export const SPECIAL_CARDS: DriverCard[] = [
  {
    id: 'drv_hamilton_7x',
    type: 'driver', rarity: 'elite', cardVersion: 'champion', versionLabel: '7× CHAMPION',
    customBg: ['#12060a', '#1e0c12'],
    customAccent: '#f0c830',
    customBorderColor: '#c8a000',
    driverId: 'hamilton', firstName: 'Lewis', lastName: 'Hamilton',
    nationality: 'British', flagEmoji: '🇬🇧',
    constructorId: 'mercedes', teamName: 'Mercedes',
    overall: 98, price: 8_000_000,
    stats: { pac: 96, rac: 98, con: 98, exp: 99, def: 97, atk: 97 },
  },
  {
    id: 'drv_verstappen_4x',
    type: 'driver', rarity: 'elite', cardVersion: 'champion', versionLabel: '4× CHAMPION',
    customBg: ['#130200', '#200500'],
    customAccent: '#ff4422',
    customBorderColor: '#cc2200',
    driverId: 'verstappen', firstName: 'Max', lastName: 'Verstappen',
    nationality: 'Dutch', flagEmoji: '🇳🇱',
    constructorId: 'red_bull', teamName: 'Red Bull',
    overall: 99, price: 9_000_000,
    stats: { pac: 99, rac: 99, con: 98, exp: 97, def: 96, atk: 99 },
  },
  {
    id: 'drv_norris_miami',
    type: 'driver', rarity: 'gold', cardVersion: 'race_winner', versionLabel: 'MIAMI GP 2024',
    customBg: ['#001818', '#001428'],
    customAccent: '#ff4d94',
    customBorderColor: '#cc2d74',
    driverId: 'norris', firstName: 'Lando', lastName: 'Norris',
    nationality: 'British', flagEmoji: '🇬🇧',
    constructorId: 'mclaren', teamName: 'McLaren',
    overall: 94, price: 5_500_000,
    stats: { pac: 97, rac: 93, con: 91, exp: 84, def: 88, atk: 96 },
  },
];

export const ALL_CARDS: FantasyCard[] = [
  ...DRIVER_CARDS, ...CONSTRUCTOR_CARDS, ...LEGEND_CARDS, ...SPECIAL_CARDS,
];

export function getCardById(id: string): FantasyCard | undefined {
  return ALL_CARDS.find(c => c.id === id);
}

export const RARITY_COLORS: Record<CardRarity, { bg: [string, string]; accent: string; text: string }> = {
  legend: {
    bg: ['#050505', '#0e0b05'],
    accent: '#c8a000',
    text: '#f5d060',
  },
  elite: {
    bg: ['#07052a', '#160842'],
    accent: '#d4af37',
    text: '#f5d97e',
  },
  gold: {
    bg: ['#1c1200', '#2c1c00'],
    accent: '#d4a017',
    text: '#f0c040',
  },
  silver: {
    bg: ['#0e1014', '#161c22'],
    accent: '#9aaab8',
    text: '#c8d8e8',
  },
  bronze: {
    bg: ['#160900', '#241200'],
    accent: '#bf8050',
    text: '#d4a07a',
  },
};

// ─── Flag image URL (flagcdn.com) ─────────────────────────────────────────────

const NATIONALITY_TO_ISO2: Record<string, string> = {
  Dutch: 'nl',
  British: 'gb',
  'Monégasque': 'mc',
  Australian: 'au',
  Spanish: 'es',
  German: 'de',
  Italian: 'it',
  French: 'fr',
  Thai: 'th',
  Canadian: 'ca',
  'New Zealander': 'nz',
  Mexican: 'mx',
  Brazilian: 'br',
  Argentinian: 'ar',
  Finnish: 'fi',
  Austrian: 'at',
  American: 'us',
  Portuguese: 'pt',
};

export function getFlagUrl(nationality: string): string | null {
  const iso2 = NATIONALITY_TO_ISO2[nationality];
  return iso2 ? `https://flagcdn.com/w40/${iso2}.png` : null;
}
