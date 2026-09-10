import type { CatalogCard } from "./data/cardCatalog";

export const MAX_DECK_SIZE = 30;
const DECKS_KEY = "riftbound.decks.v0.1";

export interface LocalDeck {
  id: string;
  name: string;
  cards: Record<string, number>;
  createdAt: number;
}

export interface DeckEditResult { deck: LocalDeck; changed: boolean; reason?: "FULL" | "COPY_LIMIT"; }

export function createLocalDeck(name: string, now = Date.now()): LocalDeck {
  return { id: `DECK_${now}_${Math.random().toString(36).slice(2, 8)}`, name: name.trim() || "未命名卡组", cards: {}, createdAt: now };
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
