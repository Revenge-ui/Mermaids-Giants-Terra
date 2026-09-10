export type CardRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
export type CatalogCardType = "MINION" | "SPELL";
export type CardKeyword = "DAMAGE" | "HEAL" | "DRAW" | "BUFF";

export interface CatalogCard {
  id: string;
  nameKey: string;
  descriptionKey: string;
  type: CatalogCardType;
  cost: number;
  rarity: CardRarity;
  rune: string;
  keywords: readonly CardKeyword[];
  deckLimit: number;
  attack?: number;
  health?: number;
}

// 前端展示目录只包含公开信息，不包含任何对局中的秘密状态。
const BASE_CARD_CATALOG = [
  { id: "CARD_000001", nameKey: "card_000001_name", cost: 1, rarity: "COMMON", rune: "☘", attack: 1, health: 2 },
  { id: "CARD_000002", nameKey: "card_000002_name", cost: 1, rarity: "COMMON", rune: "✦", attack: 2, health: 1 },
  { id: "CARD_000003", nameKey: "card_000003_name", cost: 2, rarity: "COMMON", rune: "⬟", attack: 2, health: 3 },
  { id: "CARD_000004", nameKey: "card_000004_name", cost: 2, rarity: "RARE", rune: "◈", attack: 3, health: 2 },
  { id: "CARD_000005", nameKey: "card_000005_name", cost: 3, rarity: "RARE", rune: "☼", attack: 2, health: 5 },
  { id: "CARD_000006", nameKey: "card_000006_name", cost: 3, rarity: "COMMON", rune: "⚔", attack: 4, health: 3 },
  { id: "CARD_000007", nameKey: "card_000007_name", cost: 4, rarity: "RARE", rune: "⚒", attack: 4, health: 5 },
  { id: "CARD_000008", nameKey: "card_000008_name", cost: 4, rarity: "COMMON", rune: "♢", attack: 5, health: 4 },
  { id: "CARD_000009", nameKey: "card_000009_name", cost: 5, rarity: "EPIC", rune: "♜", attack: 5, health: 6 },
  { id: "CARD_000010", nameKey: "card_000010_name", cost: 5, rarity: "RARE", rune: "⚙", attack: 6, health: 5 },
  { id: "CARD_000011", nameKey: "card_000011_name", cost: 6, rarity: "EPIC", rune: "♞", attack: 6, health: 7 },
  { id: "CARD_000012", nameKey: "card_000012_name", cost: 7, rarity: "EPIC", rune: "ϟ", attack: 8, health: 8 },
  { id: "CARD_000013", nameKey: "card_000013_name", cost: 8, rarity: "LEGENDARY", rune: "☾", attack: 9, health: 9 },
  { id: "CARD_000014", nameKey: "card_000014_name", cost: 10, rarity: "LEGENDARY", rune: "✺", attack: 12, health: 12 },
  { id: "CARD_000015", nameKey: "card_000015_name", cost: 2, rarity: "COMMON", rune: "☄" },
  { id: "CARD_000016", nameKey: "card_000016_name", cost: 2, rarity: "COMMON", rune: "✚" },
  { id: "CARD_000017", nameKey: "card_000017_name", cost: 3, rarity: "RARE", rune: "⌁" },
  { id: "CARD_000018", nameKey: "card_000018_name", cost: 3, rarity: "EPIC", rune: "⬢" },
  { id: "CARD_000019", nameKey: "card_000019_name", cost: 1, rarity: "COMMON", rune: "✧" },
  { id: "CARD_000020", nameKey: "card_000020_name", cost: 4, rarity: "RARE", rune: "✥" }
] as const;

const CARD_KEYWORDS: Readonly<Record<string, readonly CardKeyword[]>> = {
  CARD_000015: ["DAMAGE"], CARD_000016: ["HEAL"], CARD_000017: ["DRAW"],
  CARD_000018: ["BUFF"], CARD_000019: ["DAMAGE"], CARD_000020: ["HEAL"]
};

export const CARD_CATALOG: readonly CatalogCard[] = BASE_CARD_CATALOG.map((card) => ({
  ...card,
  descriptionKey: card.nameKey.replace("_name", "_description"),
  type: "attack" in card ? "MINION" : "SPELL",
  deckLimit: card.rarity === "LEGENDARY" ? 1 : 2,
  keywords: CARD_KEYWORDS[card.id] ?? []
}));

export const RARITY_LABEL: Readonly<Record<CardRarity, string>> = {
  COMMON: "普通", RARE: "稀有", EPIC: "史诗", LEGENDARY: "传说"
};

export const KEYWORD_LABEL: Readonly<Record<CardKeyword, string>> = {
  DAMAGE: "伤害", HEAL: "治疗", DRAW: "抽牌", BUFF: "强化"
};
