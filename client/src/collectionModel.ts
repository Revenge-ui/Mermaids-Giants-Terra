import { translateZhCn } from "@riftbound/shared";
import type { CardKeyword, CardRarity, CatalogCard } from "./data/cardCatalog";
import type { CollectionCounts } from "./localProgress";

export type ManaFilter = "ALL" | 0 | 1 | 2 | 3 | 4 | 5 | 6 | "7+";
export type CardCategory = "ALL" | "MERMAID" | "GIANT" | "SPELL";
export type CardSort = "COST" | "NAME" | "RARITY";

export interface CollectionFiltersState {
  category: CardCategory;
  mana: ManaFilter;
  search: string;
  rarities: readonly CardRarity[];
  keywords: readonly CardKeyword[];
  ownedOnly: boolean;
  sort: CardSort;
}

const RARITY_ORDER: Readonly<Record<CardRarity, number>> = { COMMON: 0, RARE: 1, EPIC: 2, LEGENDARY: 3 };

export const DEFAULT_COLLECTION_FILTERS: CollectionFiltersState = {
  category: "ALL", mana: "ALL", search: "", rarities: [], keywords: [], ownedOnly: false, sort: "COST"
};

export function filterCollectionCards(cards: readonly CatalogCard[], owned: CollectionCounts, filters: CollectionFiltersState): CatalogCard[] {
  const query = filters.search.trim().toLocaleLowerCase("zh-CN");
  return cards.filter((card) => {
    if (filters.category === "SPELL" && card.type !== "SPELL") return false;
    if ((filters.category === "MERMAID" || filters.category === "GIANT") && card.faction !== filters.category) return false;
    if (filters.mana !== "ALL" && (filters.mana === "7+" ? card.cost < 7 : card.cost !== filters.mana)) return false;
    if (filters.ownedOnly && (owned[card.id] ?? 0) < 1) return false;
    if (filters.rarities.length && !filters.rarities.includes(card.rarity)) return false;
    if (filters.keywords.length && !filters.keywords.some((keyword) => card.keywords.includes(keyword))) return false;
    if (query) {
      const searchable = `${translateZhCn(card.nameKey)} ${translateZhCn(card.descriptionKey)} ${card.keywords.join(" ")}`.toLocaleLowerCase("zh-CN");
      if (!searchable.includes(query)) return false;
    }
    return true;
  }).sort((left, right) => {
    if (filters.sort === "NAME") return translateZhCn(left.nameKey).localeCompare(translateZhCn(right.nameKey), "zh-CN");
    if (filters.sort === "RARITY") return RARITY_ORDER[right.rarity] - RARITY_ORDER[left.rarity] || left.cost - right.cost;
    return left.cost - right.cost || translateZhCn(left.nameKey).localeCompare(translateZhCn(right.nameKey), "zh-CN");
  });
}

export function pageItems<T>(items: readonly T[], page: number, pageSize: number): T[] {
  return items.slice(Math.max(0, page - 1) * pageSize, Math.max(0, page) * pageSize);
}
