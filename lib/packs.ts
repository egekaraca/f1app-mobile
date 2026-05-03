// lib/packs.ts — Pack types, odds, and card generation

import { ALL_CARDS, LEGEND_CARDS, SPECIAL_CARDS, type FantasyCard, type CardRarity } from './fantasy';

export type PackType = {
  id: string;
  name: string;
  subtitle: string;
  cardCount: number;
  cost: number;
  color: string;
  gradientColors: [string, string];
  odds: Record<CardRarity, number>;
  guaranteed?: Partial<Record<CardRarity, number>>;
};

export const PACK_TYPES: PackType[] = [
  {
    id: 'standard',
    name: 'Standard Pack',
    subtitle: '5 cards · Mixed rarities',
    cardCount: 5,
    cost: 500_000,
    color: '#9aaab8',
    gradientColors: ['#1a2030', '#0d1018'],
    odds: { legend: 0.00, elite: 0.03, gold: 0.12, silver: 0.35, bronze: 0.50 },
  },
  {
    id: 'premium',
    name: 'Premium Pack',
    subtitle: '5 cards · Guaranteed Gold+',
    cardCount: 5,
    cost: 1_500_000,
    color: '#d4a017',
    gradientColors: ['#2c1c00', '#180e00'],
    odds: { legend: 0.00, elite: 0.15, gold: 0.37, silver: 0.38, bronze: 0.10 },
    guaranteed: { gold: 1 },
  },
  {
    id: 'elite',
    name: 'Elite Pack',
    subtitle: '3 cards · Guaranteed Elite',
    cardCount: 3,
    cost: 4_000_000,
    color: '#a080f0',
    gradientColors: ['#1c1030', '#0d0818'],
    odds: { legend: 0.05, elite: 0.40, gold: 0.40, silver: 0.15, bronze: 0.00 },
    guaranteed: { elite: 1 },
  },
  {
    id: 'legend',
    name: 'Legend Pack',
    subtitle: '3 cards · Guaranteed Legend',
    cardCount: 3,
    cost: 10_000_000,
    color: '#c8a000',
    gradientColors: ['#18120a', '#0a0805'],
    odds: { legend: 0.60, elite: 0.35, gold: 0.05, silver: 0.00, bronze: 0.00 },
    guaranteed: { legend: 1 },
  },
];

function pickRarity(odds: Record<CardRarity, number>): CardRarity {
  const r = Math.random();
  let cumulative = 0;
  for (const [rarity, prob] of Object.entries(odds) as [CardRarity, number][]) {
    if (prob === 0) continue;
    cumulative += prob;
    if (r < cumulative) return rarity as CardRarity;
  }
  return 'bronze';
}

function pickCard(rarity: CardRarity, exclude: string[]): FantasyCard {
  const pool = ALL_CARDS.filter(c => c.rarity === rarity && !exclude.includes(c.id));
  if (!pool.length) {
    const fallback = ALL_CARDS.filter(c => !exclude.includes(c.id));
    return fallback[Math.floor(Math.random() * fallback.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

export function generatePackCards(pack: PackType): FantasyCard[] {
  const result: FantasyCard[] = [];
  const usedIds: string[] = [];

  // Fulfill guarantees first
  if (pack.guaranteed) {
    for (const [rarity, count] of Object.entries(pack.guaranteed) as [CardRarity, number][]) {
      for (let i = 0; i < count; i++) {
        const card = pickCard(rarity, usedIds);
        result.push(card);
        usedIds.push(card.id);
      }
    }
  }

  // Fill remaining slots
  while (result.length < pack.cardCount) {
    const rarity = pickRarity(pack.odds);
    const card = pickCard(rarity, usedIds);
    result.push(card);
    usedIds.push(card.id);
  }

  // Shuffle so guaranteed card isn't always first
  return result.sort(() => Math.random() - 0.5);
}
