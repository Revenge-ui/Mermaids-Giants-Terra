import { CARD_CATALOG, type CardRarity, type CatalogCard } from "./data/cardCatalog";

export type CollectionCounts = Record<string, number>;

export interface LotteryReward {
  id: string;
  icon: string;
  title: string;
  description: string;
}

const COLLECTION_KEY = "riftbound.collection.v0.1";

export const LOTTERY_REWARDS: readonly LotteryReward[] = [
  { id: "COINS_80", icon: "◉", title: "80 枚星铸币", description: "可用于未来的商店与活动系统。" },
  { id: "PACK_1", icon: "▣", title: "神秘卡包", description: "获得一个本地模拟卡包。" },
  { id: "RARE_CARD", icon: "✦", title: "稀有卡牌", description: "星辉在牌面上留下了新的印记。" },
  { id: "SKIN_SHARD", icon: "◇", title: "皮肤碎片", description: "收集后可用于未来的外观系统。" },
  { id: "COINS_200", icon: "◉", title: "200 枚星铸币", description: "来自裂隙深处的额外馈赠。" }
];

export function rarityFromRoll(roll: number): CardRarity {
  if (roll < 0.7) return "COMMON";
  if (roll < 0.9) return "RARE";
  if (roll < 0.98) return "EPIC";
  return "LEGENDARY";
}

export function openLocalPack(random: () => number = Math.random, size = 5): CatalogCard[] {
  return Array.from({ length: size }, () => {
    const rarity = rarityFromRoll(random());
    const pool = CARD_CATALOG.filter((card) => card.rarity === rarity);
    return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]!;
  });
}

export function starterCollection(): CollectionCounts {
  // Prototype accounts receive enough copies to test both official factions.
  return Object.fromEntries(CARD_CATALOG.map((card) => [card.id, card.deckLimit]));
}

export function loadCollection(storage: Pick<Storage, "getItem">): CollectionCounts {
  try {
    const saved = storage.getItem(COLLECTION_KEY);
    if (!saved) return starterCollection();
    const parsed = JSON.parse(saved) as CollectionCounts;
    const migrated = starterCollection();
    for (const [cardId, count] of Object.entries(parsed)) migrated[cardId] = Math.max(migrated[cardId] ?? 0, count);
    return migrated;
  } catch { return starterCollection(); }
}

export function saveCollection(storage: Pick<Storage, "setItem">, collection: CollectionCounts): void {
  storage.setItem(COLLECTION_KEY, JSON.stringify(collection));
}

export function addCards(collection: CollectionCounts, cards: readonly CatalogCard[]): CollectionCounts {
  const next = { ...collection };
  for (const card of cards) next[card.id] = (next[card.id] ?? 0) + 1;
  return next;
}

export function drawLotteryReward(random: () => number = Math.random): LotteryReward {
  return LOTTERY_REWARDS[Math.min(LOTTERY_REWARDS.length - 1, Math.floor(random() * LOTTERY_REWARDS.length))]!;
}
