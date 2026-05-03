// lib/fantasyStorage.ts — AsyncStorage helpers for the Fantasy game

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  STARTING_BALANCE, getCardById, isContractExpired, getTerminationPenalty,
  getContractCost, CONTRACT_TIERS,
  type FantasyCard, type ContractTier, type Contract,
} from './fantasy';
import { generatePackCards, type PackType } from './packs';

const BALANCE_KEY           = 'apex_fantasy_balance';
const CONTRACTS_KEY         = 'apex_fantasy_contracts';
const TOTAL_EARNINGS_KEY    = 'apex_fantasy_total_earnings';
const LEADERBOARD_SCORE_KEY = 'apex_fantasy_leaderboard_score';
const COLLECTION_KEY        = 'apex_fantasy_collection';

export type ContractMap = Record<string, Contract>; // cardId → Contract

// ─── Balance ──────────────────────────────────────────────────────────────────

export async function getBalance(): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(BALANCE_KEY);
    const stored = v !== null ? Number(v) : STARTING_BALANCE;
    // DEV: top up to 100M for testing — remove when done
    if (stored < 100_000_000) {
      await AsyncStorage.setItem(BALANCE_KEY, '100000000');
      return 100_000_000;
    }
    return stored;
  } catch {
    return STARTING_BALANCE;
  }
}

export async function setBalance(amount: number): Promise<void> {
  try {
    await AsyncStorage.setItem(BALANCE_KEY, String(Math.max(0, amount)));
  } catch {}
}

export async function adjustBalance(delta: number): Promise<number> {
  const current = await getBalance();
  const next = Math.max(0, current + delta);
  await setBalance(next);
  return next;
}

// ─── Contracts ────────────────────────────────────────────────────────────────

export async function getContracts(): Promise<ContractMap> {
  try {
    const v = await AsyncStorage.getItem(CONTRACTS_KEY);
    return v ? JSON.parse(v) : {};
  } catch {
    return {};
  }
}

async function saveContracts(contracts: ContractMap): Promise<void> {
  await AsyncStorage.setItem(CONTRACTS_KEY, JSON.stringify(contracts));
}

export async function getActiveContracts(): Promise<ContractMap> {
  const contracts = await getContracts();
  const active: ContractMap = {};
  for (const [id, c] of Object.entries(contracts)) {
    if (!isContractExpired(c)) active[id] = c;
  }
  return active;
}

export async function getActiveContractCards(): Promise<Array<{ card: FantasyCard; contract: Contract }>> {
  const active = await getActiveContracts();
  return Object.values(active)
    .map(c => {
      const card = getCardById(c.cardId);
      return card ? { card, contract: c } : null;
    })
    .filter(Boolean) as Array<{ card: FantasyCard; contract: Contract }>;
}

export async function hasActiveContract(cardId: string): Promise<boolean> {
  const contracts = await getContracts();
  const c = contracts[cardId];
  return !!c && !isContractExpired(c);
}

// ─── Sign contract ────────────────────────────────────────────────────────────

export type SignResult = 'ok' | 'already_contracted' | 'insufficient_funds';

export async function signContract(card: FantasyCard, tier: ContractTier): Promise<SignResult> {
  const [balance, contracts] = await Promise.all([getBalance(), getContracts()]);

  const existing = contracts[card.id];
  if (existing && !isContractExpired(existing)) return 'already_contracted';

  const tierDef = CONTRACT_TIERS.find(t => t.tier === tier)!;
  const signingCost = getContractCost(card.price, tier);
  if (balance < signingCost) return 'insufficient_funds';

  const newContract: Contract = {
    cardId: card.id,
    tier,
    signingCost,
    multiplier: tierDef.multiplier,
    racesTotal: tierDef.races,
    racesCompleted: 0,
  };

  await Promise.all([
    setBalance(balance - signingCost),
    saveContracts({ ...contracts, [card.id]: newContract }),
  ]);
  return 'ok';
}

// ─── Terminate contract ───────────────────────────────────────────────────────

export type TerminateResult = 'ok' | 'no_contract' | 'insufficient_funds';

export async function terminateContract(cardId: string): Promise<TerminateResult> {
  const [balance, contracts] = await Promise.all([getBalance(), getContracts()]);
  const contract = contracts[cardId];
  if (!contract || isContractExpired(contract)) return 'no_contract';

  const penalty = getTerminationPenalty(contract);
  if (balance < penalty) return 'insufficient_funds';

  const updated = { ...contracts };
  delete updated[cardId];

  await Promise.all([
    setBalance(balance - penalty),
    saveContracts(updated),
  ]);
  return 'ok';
}

// ─── Leaderboard score ────────────────────────────────────────────────────────

export async function getLeaderboardScore(): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(LEADERBOARD_SCORE_KEY);
    return v ? Number(v) : 0;
  } catch {
    return 0;
  }
}

export async function addLeaderboardScore(points: number): Promise<number> {
  const current = await getLeaderboardScore();
  const next = current + points;
  await AsyncStorage.setItem(LEADERBOARD_SCORE_KEY, String(next));
  return next;
}

// ─── Total earnings ───────────────────────────────────────────────────────────

export async function getTotalEarnings(): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(TOTAL_EARNINGS_KEY);
    return v ? Number(v) : 0;
  } catch {
    return 0;
  }
}

export async function recordEarnings(amount: number): Promise<void> {
  const current = await getTotalEarnings();
  await AsyncStorage.setItem(TOTAL_EARNINGS_KEY, String(current + amount));
}

// ─── Card collection ──────────────────────────────────────────────────────────

export type OwnedCardInstance = {
  instanceId: string;
  cardId: string;
  pulledAt: number;
  packId: string;
};

export async function getCollection(): Promise<OwnedCardInstance[]> {
  try {
    const v = await AsyncStorage.getItem(COLLECTION_KEY);
    return v ? JSON.parse(v) : [];
  } catch {
    return [];
  }
}

export type OpenPackResult = {
  cards: FantasyCard[];
  duplicateIds: Set<string>;
  duplicateCoins: number;
  newBalance: number;
};

export async function buyAndOpenPack(pack: PackType): Promise<OpenPackResult | 'insufficient_funds'> {
  const [balance, collection] = await Promise.all([getBalance(), getCollection()]);

  if (balance < pack.cost) return 'insufficient_funds';

  const cards = generatePackCards(pack);
  const ownedCardIds = new Set(collection.map(i => i.cardId));

  const newInstances: OwnedCardInstance[] = [];
  const duplicateIds = new Set<string>();
  let duplicateCoins = 0;

  for (const card of cards) {
    if (ownedCardIds.has(card.id)) {
      duplicateIds.add(card.id);
      duplicateCoins += Math.floor(card.price * 0.12);
    } else {
      newInstances.push({
        instanceId: `${card.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        cardId: card.id,
        pulledAt: Date.now(),
        packId: pack.id,
      });
      ownedCardIds.add(card.id);
    }
  }

  const newBalance = balance - pack.cost + duplicateCoins;
  const updatedCollection = [...collection, ...newInstances];

  await Promise.all([
    setBalance(newBalance),
    AsyncStorage.setItem(COLLECTION_KEY, JSON.stringify(updatedCollection)),
  ]);

  return { cards, duplicateIds, duplicateCoins, newBalance };
}

// ─── Reset (for testing) ──────────────────────────────────────────────────────

export async function resetFantasyData(): Promise<void> {
  await AsyncStorage.multiRemove([
    BALANCE_KEY,
    CONTRACTS_KEY,
    TOTAL_EARNINGS_KEY,
    LEADERBOARD_SCORE_KEY,
    COLLECTION_KEY,
    'apex_fantasy_owned_cards',
  ]);
}
