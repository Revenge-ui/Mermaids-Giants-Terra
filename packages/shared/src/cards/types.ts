import type { CardFaction, CardRarity, CardType } from "../enums/index.js";

export type EffectDefinition =
  | { type: "DEAL_DAMAGE"; amount: number; target: "ANY_ENEMY" }
  | { type: "HEAL"; amount: number; target: "FRIENDLY_HERO" }
  | { type: "DRAW_CARD"; amount: number }
  | { type: "BUFF"; attack: number; health: number; target: "FRIENDLY_MINION" }
  | { type: "GAIN_TEMP_MANA"; amount: number }
  | { type: "PROTOTYPE" };

export interface BaseCardDefinition {
  id: string;
  type: CardType;
  cost: number;
  nameKey: string;
  descriptionKey: string;
  rune: string;
  faction: CardFaction;
  rarity: CardRarity;
  species?: string;
  keywords?: readonly string[];
  targetRule?: string;
  implementationTags?: readonly string[];
  deckLimit?: number;
}

export interface MinionCardDefinition extends BaseCardDefinition {
  type: "MINION";
  attack: number;
  health: number;
}

export interface SpellCardDefinition extends BaseCardDefinition {
  type: "SPELL";
  effect: EffectDefinition;
}

export type CardDefinition = MinionCardDefinition | SpellCardDefinition;

export type CardView = CardDefinition & {
  instanceId: string;
  definitionId: string;
};

export interface MinionView {
  instanceId: string;
  definitionId: string;
  nameKey: string;
  rune: string;
  attack: number;
  health: number;
  maxHealth: number;
  canAttack: boolean;
}
