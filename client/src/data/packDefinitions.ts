import { CARD_CATALOG, type CardRarity, type CatalogCard } from "./cardCatalog";

export interface PackDefinition {
  id: string;
  name: string;
  cardsPerPack: number;
  guaranteedRarity: CardRarity;
}

export const LRT_GIFT_PACK_ID = "lrt-gift";

export const PACK_DEFINITIONS: readonly PackDefinition[] = [
  { id: LRT_GIFT_PACK_ID, name: "lrt的馈赠", cardsPerPack: 5, guaranteedRarity: "RARE" }
];

// 当前目录中的牌全部是面向玩家的正式可收藏牌。未来 AI/debug 牌应在这里显式排除。
export const COLLECTIBLE_CARDS: readonly CatalogCard[] = CARD_CATALOG;

export function getPackDefinition(packId: string): PackDefinition | undefined {
  return PACK_DEFINITIONS.find((pack) => pack.id === packId);
}
