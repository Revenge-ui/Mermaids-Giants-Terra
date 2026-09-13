import assert from "node:assert/strict";
import test from "node:test";
import { isCardAllowedInDeck, validateDeck, type DeckSubmission } from "@riftbound/shared";
import { CARD_DATABASE } from "./cards/database.js";

const byId = (id: string) => CARD_DATABASE.find((card) => card.id === id)!;
const mermaidCards = Object.fromEntries(Array.from({ length: 14 }, (_, index) => [`MER-M-${String(index + 1).padStart(3, "0")}`, 2]));
const giantCards = Object.fromEntries(Array.from({ length: 14 }, (_, index) => [`GIA-M-${String(index + 1).padStart(3, "0")}`, 2]));
const mermaidDeck: DeckSubmission = { deckId: "MERMAID_TEST", faction: "MERMAID", cards: { ...mermaidCards, "GEN-S-001": 2 } };
const giantDeck: DeckSubmission = { deckId: "GIANT_TEST", faction: "GIANT", cards: { ...giantCards, "GEN-S-001": 2 } };

test("formal database is exactly 20 Mermaid, 20 Giant and 20 common spells", () => {
  assert.equal(CARD_DATABASE.filter((card) => card.faction === "MERMAID" && card.type === "MINION").length, 20);
  assert.equal(CARD_DATABASE.filter((card) => card.faction === "GIANT" && card.type === "MINION").length, 20);
  assert.equal(CARD_DATABASE.filter((card) => card.faction === "COMMON" && card.type === "SPELL").length, 20);
});

test("Mermaid deck accepts Mermaid minions", () => assert.equal(isCardAllowedInDeck("MERMAID", byId("MER-M-001")), true));
test("Mermaid deck accepts common spells", () => assert.equal(isCardAllowedInDeck("MERMAID", byId("GEN-S-001")), true));
test("Mermaid deck rejects Giant minions", () => assert.equal(isCardAllowedInDeck("MERMAID", byId("GIA-M-001")), false));
test("Giant deck accepts Giant minions", () => assert.equal(isCardAllowedInDeck("GIANT", byId("GIA-M-001")), true));
test("Giant deck accepts common spells", () => assert.equal(isCardAllowedInDeck("GIANT", byId("GEN-S-001")), true));
test("Giant deck rejects Mermaid minions", () => assert.equal(isCardAllowedInDeck("GIANT", byId("MER-M-001")), false));
test("pure Mermaid plus common 30-card deck validates", () => assert.equal(validateDeck(mermaidDeck, CARD_DATABASE).valid, true));
test("pure Giant plus common 30-card deck validates", () => assert.equal(validateDeck(giantDeck, CARD_DATABASE).valid, true));

test("mixed deck fails with FACTION_MISMATCH without mutating submission", () => {
  const mixed: DeckSubmission = { ...mermaidDeck, cards: { ...mermaidDeck.cards, "MER-M-001": 0, "GIA-M-001": 2 } };
  const before = JSON.stringify(mixed);
  assert.equal(validateDeck(mixed, CARD_DATABASE).errors.some((error) => error.code === "FACTION_MISMATCH"), true);
  assert.equal(JSON.stringify(mixed), before);
});

test("the two Mermaid gods are faction-locked one-copy legendary minions", () => {
  for (const id of ["MER-M-019", "MER-M-020"]) {
    const card = byId(id);
    assert.equal(card.type, "MINION");
    assert.equal(card.faction, "MERMAID");
    assert.equal(card.rarity, "LEGENDARY");
    assert.equal(card.deckLimit, 1);
    assert.equal(isCardAllowedInDeck("GIANT", card), false);
  }
});

test("legacy CARD_ ids are absent from the formal production pool", () => {
  assert.equal(CARD_DATABASE.some((card) => card.id.startsWith("CARD_")), false);
});
