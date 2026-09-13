import type { CardFaction, CardRarity } from "@riftbound/shared";

export type { CardRarity };
export type CatalogCardType = "MINION" | "SPELL";
export type CardKeyword = "DAMAGE" | "HEAL" | "DRAW" | "BUFF" | "GUARD" | "CHARGE" | "DRAIN" | "BARRIER";

export interface CatalogCard {
  id: string;
  nameKey: string;
  descriptionKey: string;
  type: CatalogCardType;
  faction: CardFaction;
  species?: string;
  cost: number;
  rarity: CardRarity;
  rune: string;
  keywords: readonly CardKeyword[];
  deckLimit: number;
  attack?: number;
  health?: number;
}

// Public catalog only; it never contains match hand/deck order or any other secret state.
export const CARD_CATALOG: readonly CatalogCard[] = [
  { id: "MER-M-001", nameKey: "mer_m_001_name", descriptionKey: "mer_m_001_description", type: "MINION", faction: "MERMAID", cost: 1, rarity: "COMMON", rune: "◉", keywords: [], deckLimit: 2, species: "人鱼", attack: 1, health: 2 },
  { id: "MER-M-002", nameKey: "mer_m_002_name", descriptionKey: "mer_m_002_description", type: "MINION", faction: "MERMAID", cost: 1, rarity: "COMMON", rune: "◉", keywords: [], deckLimit: 2, species: "人鱼", attack: 2, health: 1 },
  { id: "MER-M-003", nameKey: "mer_m_003_name", descriptionKey: "mer_m_003_description", type: "MINION", faction: "MERMAID", cost: 2, rarity: "COMMON", rune: "◉", keywords: ["HEAL", "GUARD"], deckLimit: 2, species: "人鱼", attack: 2, health: 3 },
  { id: "MER-M-004", nameKey: "mer_m_004_name", descriptionKey: "mer_m_004_description", type: "MINION", faction: "MERMAID", cost: 2, rarity: "COMMON", rune: "◉", keywords: [], deckLimit: 2, species: "人鱼", attack: 2, health: 2 },
  { id: "MER-M-005", nameKey: "mer_m_005_name", descriptionKey: "mer_m_005_description", type: "MINION", faction: "MERMAID", cost: 2, rarity: "COMMON", rune: "◉", keywords: ["DRAW"], deckLimit: 2, species: "人鱼", attack: 3, health: 2 },
  { id: "MER-M-006", nameKey: "mer_m_006_name", descriptionKey: "mer_m_006_description", type: "MINION", faction: "MERMAID", cost: 3, rarity: "RARE", rune: "◉", keywords: [], deckLimit: 2, species: "人鱼", attack: 2, health: 4 },
  { id: "MER-M-007", nameKey: "mer_m_007_name", descriptionKey: "mer_m_007_description", type: "MINION", faction: "MERMAID", cost: 3, rarity: "COMMON", rune: "◉", keywords: ["CHARGE"], deckLimit: 2, species: "人鱼", attack: 3, health: 3 },
  { id: "MER-M-008", nameKey: "mer_m_008_name", descriptionKey: "mer_m_008_description", type: "MINION", faction: "MERMAID", cost: 3, rarity: "RARE", rune: "◉", keywords: ["DRAW"], deckLimit: 2, species: "人鱼", attack: 2, health: 4 },
  { id: "MER-M-009", nameKey: "mer_m_009_name", descriptionKey: "mer_m_009_description", type: "MINION", faction: "MERMAID", cost: 3, rarity: "COMMON", rune: "◉", keywords: ["GUARD"], deckLimit: 2, species: "人鱼", attack: 3, health: 4 },
  { id: "MER-M-010", nameKey: "mer_m_010_name", descriptionKey: "mer_m_010_description", type: "MINION", faction: "MERMAID", cost: 4, rarity: "RARE", rune: "◉", keywords: [], deckLimit: 2, species: "人鱼", attack: 3, health: 4 },
  { id: "MER-M-011", nameKey: "mer_m_011_name", descriptionKey: "mer_m_011_description", type: "MINION", faction: "MERMAID", cost: 4, rarity: "COMMON", rune: "◉", keywords: ["GUARD"], deckLimit: 2, species: "人鱼", attack: 4, health: 4 },
  { id: "MER-M-012", nameKey: "mer_m_012_name", descriptionKey: "mer_m_012_description", type: "MINION", faction: "MERMAID", cost: 4, rarity: "RARE", rune: "◉", keywords: ["HEAL"], deckLimit: 2, species: "人鱼", attack: 3, health: 5 },
  { id: "MER-M-013", nameKey: "mer_m_013_name", descriptionKey: "mer_m_013_description", type: "MINION", faction: "MERMAID", cost: 5, rarity: "EPIC", rune: "◉", keywords: ["CHARGE"], deckLimit: 2, species: "人鱼", attack: 5, health: 4 },
  { id: "MER-M-014", nameKey: "mer_m_014_name", descriptionKey: "mer_m_014_description", type: "MINION", faction: "MERMAID", cost: 5, rarity: "RARE", rune: "◉", keywords: [], deckLimit: 2, species: "人鱼", attack: 4, health: 6 },
  { id: "MER-M-015", nameKey: "mer_m_015_name", descriptionKey: "mer_m_015_description", type: "MINION", faction: "MERMAID", cost: 5, rarity: "EPIC", rune: "◉", keywords: ["HEAL"], deckLimit: 2, species: "人鱼", attack: 3, health: 7 },
  { id: "MER-M-016", nameKey: "mer_m_016_name", descriptionKey: "mer_m_016_description", type: "MINION", faction: "MERMAID", cost: 6, rarity: "RARE", rune: "◉", keywords: [], deckLimit: 2, species: "人鱼", attack: 5, health: 7 },
  { id: "MER-M-017", nameKey: "mer_m_017_name", descriptionKey: "mer_m_017_description", type: "MINION", faction: "MERMAID", cost: 6, rarity: "EPIC", rune: "◉", keywords: ["GUARD"], deckLimit: 2, species: "人鱼", attack: 4, health: 8 },
  { id: "MER-M-018", nameKey: "mer_m_018_name", descriptionKey: "mer_m_018_description", type: "MINION", faction: "MERMAID", cost: 7, rarity: "EPIC", rune: "◉", keywords: [], deckLimit: 2, species: "人鱼", attack: 6, health: 7 },
  { id: "MER-M-019", nameKey: "mer_m_019_name", descriptionKey: "mer_m_019_description", type: "MINION", faction: "MERMAID", cost: 8, rarity: "LEGENDARY", rune: "◉", keywords: ["GUARD"], deckLimit: 1, species: "人鱼", attack: 7, health: 9 },
  { id: "MER-M-020", nameKey: "mer_m_020_name", descriptionKey: "mer_m_020_description", type: "MINION", faction: "MERMAID", cost: 9, rarity: "LEGENDARY", rune: "◉", keywords: [], deckLimit: 1, species: "人鱼", attack: 8, health: 8 },
  { id: "GIA-M-001", nameKey: "gia_m_001_name", descriptionKey: "gia_m_001_description", type: "MINION", faction: "GIANT", cost: 1, rarity: "COMMON", rune: "◆", keywords: [], deckLimit: 2, species: "巨人", attack: 1, health: 3 },
  { id: "GIA-M-002", nameKey: "gia_m_002_name", descriptionKey: "gia_m_002_description", type: "MINION", faction: "GIANT", cost: 2, rarity: "COMMON", rune: "◆", keywords: [], deckLimit: 2, species: "巨人", attack: 2, health: 4 },
  { id: "GIA-M-003", nameKey: "gia_m_003_name", descriptionKey: "gia_m_003_description", type: "MINION", faction: "GIANT", cost: 2, rarity: "COMMON", rune: "◆", keywords: [], deckLimit: 2, species: "巨人", attack: 3, health: 2 },
  { id: "GIA-M-004", nameKey: "gia_m_004_name", descriptionKey: "gia_m_004_description", type: "MINION", faction: "GIANT", cost: 2, rarity: "COMMON", rune: "◆", keywords: ["GUARD"], deckLimit: 2, species: "巨人", attack: 2, health: 3 },
  { id: "GIA-M-005", nameKey: "gia_m_005_name", descriptionKey: "gia_m_005_description", type: "MINION", faction: "GIANT", cost: 3, rarity: "COMMON", rune: "◆", keywords: [], deckLimit: 2, species: "巨人", attack: 3, health: 4 },
  { id: "GIA-M-006", nameKey: "gia_m_006_name", descriptionKey: "gia_m_006_description", type: "MINION", faction: "GIANT", cost: 3, rarity: "RARE", rune: "◆", keywords: ["DAMAGE", "GUARD"], deckLimit: 2, species: "巨人", attack: 2, health: 6 },
  { id: "GIA-M-007", nameKey: "gia_m_007_name", descriptionKey: "gia_m_007_description", type: "MINION", faction: "GIANT", cost: 3, rarity: "COMMON", rune: "◆", keywords: ["DAMAGE"], deckLimit: 2, species: "巨人", attack: 4, health: 3 },
  { id: "GIA-M-008", nameKey: "gia_m_008_name", descriptionKey: "gia_m_008_description", type: "MINION", faction: "GIANT", cost: 4, rarity: "RARE", rune: "◆", keywords: [], deckLimit: 2, species: "巨人", attack: 3, health: 5 },
  { id: "GIA-M-009", nameKey: "gia_m_009_name", descriptionKey: "gia_m_009_description", type: "MINION", faction: "GIANT", cost: 4, rarity: "COMMON", rune: "◆", keywords: ["GUARD"], deckLimit: 2, species: "巨人", attack: 3, health: 6 },
  { id: "GIA-M-010", nameKey: "gia_m_010_name", descriptionKey: "gia_m_010_description", type: "MINION", faction: "GIANT", cost: 4, rarity: "RARE", rune: "◆", keywords: ["DAMAGE"], deckLimit: 2, species: "巨人", attack: 5, health: 4 },
  { id: "GIA-M-011", nameKey: "gia_m_011_name", descriptionKey: "gia_m_011_description", type: "MINION", faction: "GIANT", cost: 5, rarity: "RARE", rune: "◆", keywords: [], deckLimit: 2, species: "巨人", attack: 4, health: 6 },
  { id: "GIA-M-012", nameKey: "gia_m_012_name", descriptionKey: "gia_m_012_description", type: "MINION", faction: "GIANT", cost: 5, rarity: "COMMON", rune: "◆", keywords: ["CHARGE"], deckLimit: 2, species: "巨人", attack: 6, health: 5 },
  { id: "GIA-M-013", nameKey: "gia_m_013_name", descriptionKey: "gia_m_013_description", type: "MINION", faction: "GIANT", cost: 6, rarity: "EPIC", rune: "◆", keywords: ["DAMAGE"], deckLimit: 2, species: "巨人", attack: 6, health: 7 },
  { id: "GIA-M-014", nameKey: "gia_m_014_name", descriptionKey: "gia_m_014_description", type: "MINION", faction: "GIANT", cost: 6, rarity: "RARE", rune: "◆", keywords: ["CHARGE"], deckLimit: 2, species: "巨人", attack: 5, health: 7 },
  { id: "GIA-M-015", nameKey: "gia_m_015_name", descriptionKey: "gia_m_015_description", type: "MINION", faction: "GIANT", cost: 7, rarity: "EPIC", rune: "◆", keywords: ["DAMAGE", "GUARD"], deckLimit: 2, species: "巨人", attack: 5, health: 10 },
  { id: "GIA-M-016", nameKey: "gia_m_016_name", descriptionKey: "gia_m_016_description", type: "MINION", faction: "GIANT", cost: 7, rarity: "RARE", rune: "◆", keywords: [], deckLimit: 2, species: "巨人", attack: 8, health: 7 },
  { id: "GIA-M-017", nameKey: "gia_m_017_name", descriptionKey: "gia_m_017_description", type: "MINION", faction: "GIANT", cost: 8, rarity: "EPIC", rune: "◆", keywords: [], deckLimit: 2, species: "巨人", attack: 7, health: 9 },
  { id: "GIA-M-018", nameKey: "gia_m_018_name", descriptionKey: "gia_m_018_description", type: "MINION", faction: "GIANT", cost: 8, rarity: "EPIC", rune: "◆", keywords: ["DAMAGE"], deckLimit: 2, species: "巨人", attack: 9, health: 8 },
  { id: "GIA-M-019", nameKey: "gia_m_019_name", descriptionKey: "gia_m_019_description", type: "MINION", faction: "GIANT", cost: 9, rarity: "LEGENDARY", rune: "◆", keywords: ["GUARD"], deckLimit: 1, species: "巨人", attack: 7, health: 12 },
  { id: "GIA-M-020", nameKey: "gia_m_020_name", descriptionKey: "gia_m_020_description", type: "MINION", faction: "GIANT", cost: 10, rarity: "LEGENDARY", rune: "◆", keywords: ["DAMAGE"], deckLimit: 1, species: "巨人", attack: 10, health: 10 },
  { id: "GEN-S-001", nameKey: "gen_s_001_name", descriptionKey: "gen_s_001_description", type: "SPELL", faction: "COMMON", cost: 0, rarity: "COMMON", rune: "✦", keywords: ["DAMAGE"], deckLimit: 2 },
  { id: "GEN-S-002", nameKey: "gen_s_002_name", descriptionKey: "gen_s_002_description", type: "SPELL", faction: "COMMON", cost: 1, rarity: "COMMON", rune: "✦", keywords: ["DAMAGE", "DRAW"], deckLimit: 2 },
  { id: "GEN-S-003", nameKey: "gen_s_003_name", descriptionKey: "gen_s_003_description", type: "SPELL", faction: "COMMON", cost: 1, rarity: "COMMON", rune: "✦", keywords: ["HEAL"], deckLimit: 2 },
  { id: "GEN-S-004", nameKey: "gen_s_004_name", descriptionKey: "gen_s_004_description", type: "SPELL", faction: "COMMON", cost: 1, rarity: "COMMON", rune: "✦", keywords: ["BUFF", "GUARD"], deckLimit: 2 },
  { id: "GEN-S-005", nameKey: "gen_s_005_name", descriptionKey: "gen_s_005_description", type: "SPELL", faction: "COMMON", cost: 2, rarity: "COMMON", rune: "✦", keywords: ["DRAW"], deckLimit: 2 },
  { id: "GEN-S-006", nameKey: "gen_s_006_name", descriptionKey: "gen_s_006_description", type: "SPELL", faction: "COMMON", cost: 2, rarity: "RARE", rune: "✦", keywords: ["DAMAGE", "GUARD"], deckLimit: 2 },
  { id: "GEN-S-007", nameKey: "gen_s_007_name", descriptionKey: "gen_s_007_description", type: "SPELL", faction: "COMMON", cost: 2, rarity: "COMMON", rune: "✦", keywords: [], deckLimit: 2 },
  { id: "GEN-S-008", nameKey: "gen_s_008_name", descriptionKey: "gen_s_008_description", type: "SPELL", faction: "COMMON", cost: 2, rarity: "RARE", rune: "✦", keywords: ["BARRIER"], deckLimit: 2 },
  { id: "GEN-S-009", nameKey: "gen_s_009_name", descriptionKey: "gen_s_009_description", type: "SPELL", faction: "COMMON", cost: 3, rarity: "COMMON", rune: "✦", keywords: ["DRAW"], deckLimit: 2 },
  { id: "GEN-S-010", nameKey: "gen_s_010_name", descriptionKey: "gen_s_010_description", type: "SPELL", faction: "COMMON", cost: 3, rarity: "RARE", rune: "✦", keywords: ["DRAW"], deckLimit: 2 },
  { id: "GEN-S-011", nameKey: "gen_s_011_name", descriptionKey: "gen_s_011_description", type: "SPELL", faction: "COMMON", cost: 3, rarity: "COMMON", rune: "✦", keywords: ["HEAL", "DRAW"], deckLimit: 2 },
  { id: "GEN-S-012", nameKey: "gen_s_012_name", descriptionKey: "gen_s_012_description", type: "SPELL", faction: "COMMON", cost: 3, rarity: "RARE", rune: "✦", keywords: ["BUFF", "CHARGE"], deckLimit: 2 },
  { id: "GEN-S-013", nameKey: "gen_s_013_name", descriptionKey: "gen_s_013_description", type: "SPELL", faction: "COMMON", cost: 4, rarity: "EPIC", rune: "✦", keywords: [], deckLimit: 2 },
  { id: "GEN-S-014", nameKey: "gen_s_014_name", descriptionKey: "gen_s_014_description", type: "SPELL", faction: "COMMON", cost: 4, rarity: "RARE", rune: "✦", keywords: ["DAMAGE"], deckLimit: 2 },
  { id: "GEN-S-015", nameKey: "gen_s_015_name", descriptionKey: "gen_s_015_description", type: "SPELL", faction: "COMMON", cost: 4, rarity: "COMMON", rune: "✦", keywords: [], deckLimit: 2 },
  { id: "GEN-S-016", nameKey: "gen_s_016_name", descriptionKey: "gen_s_016_description", type: "SPELL", faction: "COMMON", cost: 5, rarity: "EPIC", rune: "✦", keywords: [], deckLimit: 2 },
  { id: "GEN-S-017", nameKey: "gen_s_017_name", descriptionKey: "gen_s_017_description", type: "SPELL", faction: "COMMON", cost: 5, rarity: "RARE", rune: "✦", keywords: ["HEAL", "DRAW"], deckLimit: 2 },
  { id: "GEN-S-018", nameKey: "gen_s_018_name", descriptionKey: "gen_s_018_description", type: "SPELL", faction: "COMMON", cost: 6, rarity: "EPIC", rune: "✦", keywords: ["DAMAGE"], deckLimit: 2 },
  { id: "GEN-S-019", nameKey: "gen_s_019_name", descriptionKey: "gen_s_019_description", type: "SPELL", faction: "COMMON", cost: 7, rarity: "LEGENDARY", rune: "✦", keywords: ["DRAW"], deckLimit: 1 },
  { id: "GEN-S-020", nameKey: "gen_s_020_name", descriptionKey: "gen_s_020_description", type: "SPELL", faction: "COMMON", cost: 8, rarity: "LEGENDARY", rune: "✦", keywords: ["DAMAGE"], deckLimit: 1 },
];

export const RARITY_LABEL: Readonly<Record<CardRarity, string>> = {
  COMMON: "普通", RARE: "稀有", EPIC: "史诗", LEGENDARY: "传说"
};

export const FACTION_LABEL: Readonly<Record<CardFaction, string>> = {
  MERMAID: "鱼人", GIANT: "巨人", COMMON: "通用"
};

export const KEYWORD_LABEL: Readonly<Record<CardKeyword, string>> = {
  DAMAGE: "伤害", HEAL: "治疗", DRAW: "抽牌", BUFF: "强化", GUARD: "守护",
  CHARGE: "突袭", DRAIN: "汲取", BARRIER: "护盾"
};
