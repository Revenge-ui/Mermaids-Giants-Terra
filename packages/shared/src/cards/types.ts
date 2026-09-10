import type { CardType } from "../enums/index.js";

export type EffectDefinition =
  | { type: "DEAL_DAMAGE"; amount: number; target: "ANY_ENEMY" }
  | { type: "HEAL"; amount: number; target: "FRIENDLY_HERO" }
  | { type: "DRAW_CARD"; amount: number }
  | { type: "BUFF"; attack: number; health: number; target: "FRIENDLY_MINION" };

export interface BaseCardDefinition {
  id: string;
  type: CardType;
  cost: number;
  nameKey: string;
  descriptionKey: string;
  rune: string;
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
