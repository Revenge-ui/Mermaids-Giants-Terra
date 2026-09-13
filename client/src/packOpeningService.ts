import { COLLECTIBLE_CARDS, getPackDefinition } from "./data/packDefinitions";
import type { CardRarity, CatalogCard } from "./data/cardCatalog";

export const PACK_RARITY_WEIGHTS: Readonly<Record<CardRarity, number>> = {
  COMMON: 0.7, RARE: 0.22, EPIC: 0.065, LEGENDARY: 0.015
};
export const PACK_BATCH_OPTIONS = [1, 5, 10] as const;
export type PackBatchSize = typeof PACK_BATCH_OPTIONS[number];

const RARITY_ORDER: readonly CardRarity[] = ["COMMON", "RARE", "EPIC", "LEGENDARY"];

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))]!;
}

function rollRarity(random: () => number, minimum: CardRarity = "COMMON"): CardRarity {
  const allowed = RARITY_ORDER.filter((rarity) => RARITY_ORDER.indexOf(rarity) >= RARITY_ORDER.indexOf(minimum));
  const total = allowed.reduce((sum, rarity) => sum + PACK_RARITY_WEIGHTS[rarity], 0);
  let roll = random() * total;
  for (const rarity of allowed) {
    roll -= PACK_RARITY_WEIGHTS[rarity];
    if (roll <= 0) return rarity;
  }
  return allowed.at(-1)!;
}

export class PackOpeningService {
  constructor(private readonly cards: readonly CatalogCard[] = COLLECTIBLE_CARDS, private readonly random: () => number = Math.random) {}

  openPack(packId: string): CatalogCard[] {
    const definition = getPackDefinition(packId);
    if (!definition) throw new Error("UNKNOWN_PACK");
    if (!this.cards.length) throw new Error("EMPTY_COLLECTIBLE_POOL");
    const rarities = [definition.guaranteedRarity, ...Array.from({ length: definition.cardsPerPack - 1 }, () => rollRarity(this.random))];
    return rarities.map((rarity) => {
      const exactPool = this.cards.filter((card) => card.rarity === rarity);
      return pick(exactPool.length ? exactPool : this.cards, this.random);
    });
  }

  openPacks(packId: string, count: PackBatchSize): CatalogCard[] {
    return Array.from({ length: count }, () => this.openPack(packId)).flat();
  }
}
