import type { CardDefinition } from "@riftbound/shared";

export const CARD_DATABASE: readonly CardDefinition[] = [
  { id: "CARD_000001", nameKey: "card_000001_name", descriptionKey: "card_000001_description", type: "MINION", cost: 1, attack: 1, health: 2, rune: "☘" },
  { id: "CARD_000002", nameKey: "card_000002_name", descriptionKey: "card_000002_description", type: "MINION", cost: 1, attack: 2, health: 1, rune: "✦" },
  { id: "CARD_000003", nameKey: "card_000003_name", descriptionKey: "card_000003_description", type: "MINION", cost: 2, attack: 2, health: 3, rune: "⬟" },
  { id: "CARD_000004", nameKey: "card_000004_name", descriptionKey: "card_000004_description", type: "MINION", cost: 2, attack: 3, health: 2, rune: "◈" },
  { id: "CARD_000005", nameKey: "card_000005_name", descriptionKey: "card_000005_description", type: "MINION", cost: 3, attack: 2, health: 5, rune: "☼" },
  { id: "CARD_000006", nameKey: "card_000006_name", descriptionKey: "card_000006_description", type: "MINION", cost: 3, attack: 4, health: 3, rune: "⚔" },
  { id: "CARD_000007", nameKey: "card_000007_name", descriptionKey: "card_000007_description", type: "MINION", cost: 4, attack: 4, health: 5, rune: "⚒" },
  { id: "CARD_000008", nameKey: "card_000008_name", descriptionKey: "card_000008_description", type: "MINION", cost: 4, attack: 5, health: 4, rune: "♢" },
  { id: "CARD_000009", nameKey: "card_000009_name", descriptionKey: "card_000009_description", type: "MINION", cost: 5, attack: 5, health: 6, rune: "♜" },
  { id: "CARD_000010", nameKey: "card_000010_name", descriptionKey: "card_000010_description", type: "MINION", cost: 5, attack: 6, health: 5, rune: "⚙" },
  { id: "CARD_000011", nameKey: "card_000011_name", descriptionKey: "card_000011_description", type: "MINION", cost: 6, attack: 6, health: 7, rune: "♞" },
  { id: "CARD_000012", nameKey: "card_000012_name", descriptionKey: "card_000012_description", type: "MINION", cost: 7, attack: 8, health: 8, rune: "ϟ" },
  { id: "CARD_000013", nameKey: "card_000013_name", descriptionKey: "card_000013_description", type: "MINION", cost: 8, attack: 9, health: 9, rune: "☾", deckLimit: 1 },
  { id: "CARD_000014", nameKey: "card_000014_name", descriptionKey: "card_000014_description", type: "MINION", cost: 10, attack: 12, health: 12, rune: "✺", deckLimit: 1 },
  { id: "CARD_000015", nameKey: "card_000015_name", descriptionKey: "card_000015_description", type: "SPELL", cost: 2, rune: "☄", effect: { type: "DEAL_DAMAGE", amount: 3, target: "ANY_ENEMY" } },
  { id: "CARD_000016", nameKey: "card_000016_name", descriptionKey: "card_000016_description", type: "SPELL", cost: 2, rune: "✚", effect: { type: "HEAL", amount: 4, target: "FRIENDLY_HERO" } },
  { id: "CARD_000017", nameKey: "card_000017_name", descriptionKey: "card_000017_description", type: "SPELL", cost: 3, rune: "⌁", effect: { type: "DRAW_CARD", amount: 2 } },
  { id: "CARD_000018", nameKey: "card_000018_name", descriptionKey: "card_000018_description", type: "SPELL", cost: 3, rune: "⬢", effect: { type: "BUFF", attack: 2, health: 2, target: "FRIENDLY_MINION" } },
  { id: "CARD_000019", nameKey: "card_000019_name", descriptionKey: "card_000019_description", type: "SPELL", cost: 1, rune: "✧", effect: { type: "DEAL_DAMAGE", amount: 2, target: "ANY_ENEMY" } },
  { id: "CARD_000020", nameKey: "card_000020_name", descriptionKey: "card_000020_description", type: "SPELL", cost: 4, rune: "✥", effect: { type: "HEAL", amount: 6, target: "FRIENDLY_HERO" } }
];

export const CARD_DEFINITIONS = new Map(CARD_DATABASE.map((card) => [card.id, card]));
export const DEFAULT_DECK_DEFINITION_IDS = CARD_DATABASE.map((card) => card.id);

export function getCardDefinition(definitionId: string): CardDefinition {
  const definition = CARD_DEFINITIONS.get(definitionId);
  if (!definition) throw new Error(`Unknown card definition: ${definitionId}`);
  return definition;
}
