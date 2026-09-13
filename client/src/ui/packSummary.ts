import type { CatalogCard } from "../data/cardCatalog";
export interface PackResultGroup { card: CatalogCard; count: number; isNew: boolean }
/** Group duplicates for presentation; the ungrouped draw results still go to storage. */
export function summarizePackResults(cards: readonly CatalogCard[], owned: Readonly<Record<string, number>>): PackResultGroup[] {
  const byId = new Map<string, PackResultGroup>();
  for (const card of cards) {
    const existing = byId.get(card.id);
    if (existing) existing.count += 1;
    else byId.set(card.id, { card, count: 1, isNew: (owned[card.id] ?? 0) === 0 });
  }
  const rank = { LEGENDARY: 0, EPIC: 1, RARE: 2, COMMON: 3 };
  return [...byId.values()].sort((a, b) => rank[a.card.rarity] - rank[b.card.rarity] || a.card.cost - b.card.cost || a.card.id.localeCompare(b.card.id));
}
