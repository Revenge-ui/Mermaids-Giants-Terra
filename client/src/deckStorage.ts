import type { DeckSubmission } from "@riftbound/shared";
import type { CatalogCard } from "./data/cardCatalog";

export const MAX_DECK_SIZE = 30;
const DECKS_KEY = "riftbound.decks.v0.1";
const ACTIVE_DECK_KEY = "riftbound.activeDeck.v0.1";

export const STARTER_DECK_CARDS: Readonly<Record<string, number>> = {
  CARD_000001: 2, CARD_000002: 2, CARD_000003: 2, CARD_000004: 2,
  CARD_000005: 2, CARD_000006: 2, CARD_000007: 2, CARD_000008: 2,
  CARD_000009: 2, CARD_000010: 2, CARD_000011: 2, CARD_000012: 2,
  CARD_000015: 2, CARD_000016: 2, CARD_000017: 2
};

export interface LocalDeck {
  id: string;
  name: string;
  cards: Record<string, number>;
  createdAt: number;
}

export interface DeckEditResult { deck: LocalDeck; changed: boolean; reason?: "FULL" | "COPY_LIMIT"; }
export interface DeckRenameResult { deck: LocalDeck; changed: boolean; error?: "EMPTY" | "TOO_LONG"; }

export function createLocalDeck(name: string, now = Date.now()): LocalDeck {
  return { id: `DECK_${now}_${Math.random().toString(36).slice(2, 8)}`, name: name.trim() || "未命名卡组", cards: {}, createdAt: now };
}

export function createStarterDeck(now = Date.now()): LocalDeck {
  return { ...createLocalDeck("裂隙入门套牌", now), cards: { ...STARTER_DECK_CARDS } };
}

export function loadDecks(storage: Pick<Storage, "getItem">): LocalDeck[] {
  try {
    const saved = storage.getItem(DECKS_KEY);
    const parsed = saved ? JSON.parse(saved) as LocalDeck[] : [];
    return Array.isArray(parsed) ? parsed.filter((deck) => deck && typeof deck.id === "string" && typeof deck.name === "string") : [];
  } catch { return []; }
}

export function saveDecks(storage: Pick<Storage, "setItem">, decks: readonly LocalDeck[]): void {
  storage.setItem(DECKS_KEY, JSON.stringify(decks));
}

export function loadActiveDeckId(storage: Pick<Storage, "getItem">, decks: readonly LocalDeck[]): string | null {
  const id = storage.getItem(ACTIVE_DECK_KEY);
  return id && decks.some((deck) => deck.id === id) ? id : null;
}

export function saveActiveDeckId(storage: Pick<Storage, "setItem" | "removeItem">, deckId: string | null): void {
  if (deckId) storage.setItem(ACTIVE_DECK_KEY, deckId); else storage.removeItem(ACTIVE_DECK_KEY);
}

export function renameLocalDeck(deck: LocalDeck, name: string): DeckRenameResult {
  const normalized = name.trim();
  if (!normalized) return { deck, changed: false, error: "EMPTY" };
  if ([...normalized].length > 20) return { deck, changed: false, error: "TOO_LONG" };
  return { deck: { ...deck, name: normalized }, changed: normalized !== deck.name };
}

export function deleteLocalDeck(decks: readonly LocalDeck[], deckId: string, activeDeckId: string | null): { decks: LocalDeck[]; activeDeckId: string | null } {
  return { decks: decks.filter((deck) => deck.id !== deckId), activeDeckId: activeDeckId === deckId ? null : activeDeckId };
}

export function toDeckSubmission(deck: LocalDeck): DeckSubmission {
  return { deckId: deck.id, cards: { ...deck.cards } };
}

export function deckCardCount(deck: LocalDeck): number {
  return Object.values(deck.cards).reduce((sum, count) => sum + count, 0);
}

export function addCardToDeck(deck: LocalDeck, card: CatalogCard): DeckEditResult {
  if (deckCardCount(deck) >= MAX_DECK_SIZE) return { deck, changed: false, reason: "FULL" };
  const limit = card.rarity === "LEGENDARY" ? 1 : 2;
  if ((deck.cards[card.id] ?? 0) >= limit) return { deck, changed: false, reason: "COPY_LIMIT" };
  return { deck: { ...deck, cards: { ...deck.cards, [card.id]: (deck.cards[card.id] ?? 0) + 1 } }, changed: true };
}

export function removeCardFromDeck(deck: LocalDeck, cardId: string): LocalDeck {
  const count = deck.cards[cardId] ?? 0;
  if (!count) return deck;
  const cards = { ...deck.cards };
  if (count === 1) delete cards[cardId]; else cards[cardId] = count - 1;
  return { ...deck, cards };
}

export function deckManaCurve(deck: LocalDeck, catalog: readonly CatalogCard[]): number[] {
  const curve = Array.from({ length: 8 }, () => 0);
  for (const card of catalog) curve[Math.min(7, card.cost)]! += deck.cards[card.id] ?? 0;
  return curve;
}
