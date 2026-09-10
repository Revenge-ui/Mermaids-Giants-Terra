export const REQUIRED_DECK_SIZE = 30;

export interface DeckSubmission {
  deckId: string;
  cards: Record<string, number>;
}

export interface DeckCatalogEntry {
  id: string;
  deckLimit?: number;
}

export type DeckValidationErrorCode = "TOO_FEW_CARDS" | "TOO_MANY_CARDS" | "UNKNOWN_CARD" | "INVALID_COUNT" | "COPY_LIMIT" | "NOT_OWNED";

export interface DeckValidationError {
  code: DeckValidationErrorCode;
  cardId?: string;
  actual?: number;
  expected?: number;
}

export interface DeckValidationResult {
  valid: boolean;
  totalCards: number;
  errors: DeckValidationError[];
}

export function validateDeck(
  deck: Pick<DeckSubmission, "cards">,
  catalog: readonly DeckCatalogEntry[],
  collection?: Readonly<Record<string, number>>
): DeckValidationResult {
  const definitions = new Map(catalog.map((card) => [card.id, card]));
  const errors: DeckValidationError[] = [];
  let totalCards = 0;
  for (const [cardId, count] of Object.entries(deck.cards)) {
    const definition = definitions.get(cardId);
    if (!definition) errors.push({ code: "UNKNOWN_CARD", cardId });
    if (!Number.isInteger(count) || count < 0) { errors.push({ code: "INVALID_COUNT", cardId, actual: count }); continue; }
    totalCards += count;
    if (definition && count > (definition.deckLimit ?? 2)) errors.push({ code: "COPY_LIMIT", cardId, actual: count, expected: definition.deckLimit ?? 2 });
    if (collection && count > (collection[cardId] ?? 0)) errors.push({ code: "NOT_OWNED", cardId, actual: count, expected: collection[cardId] ?? 0 });
  }
  if (totalCards < REQUIRED_DECK_SIZE) errors.unshift({ code: "TOO_FEW_CARDS", actual: totalCards, expected: REQUIRED_DECK_SIZE });
  if (totalCards > REQUIRED_DECK_SIZE) errors.unshift({ code: "TOO_MANY_CARDS", actual: totalCards, expected: REQUIRED_DECK_SIZE });
  return { valid: errors.length === 0, totalCards, errors };
}

export function expandDeckCards(cards: Readonly<Record<string, number>>): string[] {
  return Object.entries(cards).flatMap(([cardId, count]) => Number.isInteger(count) && count > 0 ? Array.from({ length: count }, () => cardId) : []);
}
