import { isCardAllowedInDeck, validateDeck, type DeckFaction, type DeckSubmission, type DeckValidationResult } from "@riftbound/shared";
import { CARD_CATALOG, type CatalogCard } from "./data/cardCatalog";

export const MAX_DECK_SIZE = 30;
const DECKS_KEY = "riftbound.decks.v0.1";
const ACTIVE_DECK_KEY = "riftbound.activeDeck.v0.1";

export const STARTER_DECK_CARDS: Readonly<Record<string, number>> = {
  "MER-M-001": 2, "MER-M-002": 2, "MER-M-003": 2, "MER-M-004": 2,
  "MER-M-005": 2, "MER-M-006": 2, "MER-M-007": 2, "MER-M-008": 2,
  "MER-M-009": 2, "MER-M-010": 2, "MER-M-011": 2, "MER-M-012": 2,
  "MER-M-013": 2, "MER-M-014": 2, "GEN-S-001": 2
};

export interface LocalDeck {
  id: string;
  name: string;
  faction: DeckFaction;
  cards: Record<string, number>;
  createdAt: number;
  migrationIssue?: "NEEDS_FACTION" | "MIXED_FACTIONS";
}

export interface DeckEditResult { deck: LocalDeck; changed: boolean; reason?: "FULL" | "COPY_LIMIT" | "FACTION_MISMATCH"; }
export interface DeckRenameResult { deck: LocalDeck; changed: boolean; error?: "EMPTY" | "TOO_LONG"; }

export function createLocalDeck(name: string, factionOrNow: DeckFaction | number = "MERMAID", now = Date.now()): LocalDeck {
  const faction = typeof factionOrNow === "number" ? "MERMAID" : factionOrNow;
  const createdAt = typeof factionOrNow === "number" ? factionOrNow : now;
  return { id: `DECK_${createdAt}_${Math.random().toString(36).slice(2, 8)}`, name: name.trim() || "未命名卡组", faction, cards: {}, createdAt };
}

export function createStarterDeck(now = Date.now()): LocalDeck {
  return { ...createLocalDeck("深潮入门套牌", "MERMAID", now), cards: { ...STARTER_DECK_CARDS } };
}

function migrateDeck(deck: Omit<LocalDeck, "faction"> & { faction?: unknown }, catalog: readonly CatalogCard[]): LocalDeck {
  if (deck.faction === "MERMAID" || deck.faction === "GIANT") return deck as LocalDeck;
  const definitions = new Map(catalog.map((card) => [card.id, card]));
  const factions = new Set<DeckFaction>();
  let hasUnknown = false;
  for (const [cardId, count] of Object.entries(deck.cards ?? {})) {
    if (count <= 0) continue;
    const card = definitions.get(cardId);
    if (!card) { hasUnknown = true; continue; }
    if (card.faction !== "COMMON") factions.add(card.faction);
  }
  if (factions.size === 1 && !hasUnknown) return { ...deck, faction: [...factions][0]! } as LocalDeck;
  return { ...deck, faction: "MERMAID", migrationIssue: factions.size === 0 && !hasUnknown ? "NEEDS_FACTION" : "MIXED_FACTIONS" } as LocalDeck;
}

export function loadDecks(storage: Pick<Storage, "getItem"> & Partial<Pick<Storage, "setItem">>, catalog: readonly CatalogCard[] = CARD_CATALOG): LocalDeck[] {
  try {
    const saved = storage.getItem(DECKS_KEY);
    const parsed = saved ? JSON.parse(saved) as LocalDeck[] : [];
    const valid = Array.isArray(parsed) ? parsed.filter((deck) => deck && typeof deck.id === "string" && typeof deck.name === "string" && deck.cards && typeof deck.cards === "object") : [];
    const migrated = valid.map((deck) => migrateDeck(deck, catalog));
    if (storage.setItem && JSON.stringify(migrated) !== JSON.stringify(valid)) storage.setItem(DECKS_KEY, JSON.stringify(migrated));
    return migrated;
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
  if (deck.migrationIssue) throw new Error("Deck faction must be resolved before battle");
  return { deckId: deck.id, faction: deck.faction, cards: { ...deck.cards } };
}

export function resolveDeckFaction(deck: LocalDeck, faction: DeckFaction): LocalDeck {
  return { ...deck, faction, migrationIssue: undefined };
}

export function validateLocalDeck(deck: LocalDeck, catalog: readonly CatalogCard[], collection?: Readonly<Record<string, number>>): DeckValidationResult {
  if (deck.migrationIssue) return { valid: false, totalCards: deckCardCount(deck), errors: [{ code: "FACTION_MISMATCH" }] };
  return validateDeck(deck, catalog, collection);
}

export function deckCardCount(deck: LocalDeck): number {
  return Object.values(deck.cards).reduce((sum, count) => sum + count, 0);
}

export function addCardToDeck(deck: LocalDeck, card: CatalogCard): DeckEditResult {
  if (deck.migrationIssue || !isCardAllowedInDeck(deck.faction, card)) return { deck, changed: false, reason: "FACTION_MISMATCH" };
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
