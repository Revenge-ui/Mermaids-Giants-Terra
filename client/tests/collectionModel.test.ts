import assert from "node:assert/strict";
import test from "node:test";
import { isCardAllowedInDeck, validateDeck } from "@riftbound/shared";
import { DEFAULT_COLLECTION_FILTERS, filterCollectionCards, pageItems } from "../src/collectionModel";
import { CARD_CATALOG } from "../src/data/cardCatalog";
import { STARTER_DECK_CARDS, addCardToDeck, createLocalDeck, deleteLocalDeck, deckCardCount, deckManaCurve, loadActiveDeckId, loadDecks, MAX_DECK_SIZE, removeCardFromDeck, renameLocalDeck, resolveDeckFaction, saveActiveDeckId, saveDecks, toDeckSubmission, validateLocalDeck } from "../src/deckStorage";
import { starterCollection } from "../src/localProgress";

const owned = starterCollection();
const mermaid = CARD_CATALOG.find((card) => card.id === "MER-M-001")!;
const giant = CARD_CATALOG.find((card) => card.id === "GIA-M-001")!;
const spell = CARD_CATALOG.find((card) => card.id === "GEN-S-001")!;

test("official catalog contains 20 Mermaid minions, 20 Giant minions and 20 common spells", () => {
  assert.equal(CARD_CATALOG.filter((card) => card.faction === "MERMAID" && card.type === "MINION").length, 20);
  assert.equal(CARD_CATALOG.filter((card) => card.faction === "GIANT" && card.type === "MINION").length, 20);
  assert.equal(CARD_CATALOG.filter((card) => card.faction === "COMMON" && card.type === "SPELL").length, 20);
});

test("collection category, mana, ownership and search filters work with factions", () => {
  const result = filterCollectionCards(CARD_CATALOG, owned, { ...DEFAULT_COLLECTION_FILTERS, category: "MERMAID", mana: 1, ownedOnly: true });
  assert.equal(result.length > 0, true);
  assert.equal(result.every((card) => card.faction === "MERMAID" && card.cost === 1), true);
  assert.equal(filterCollectionCards(CARD_CATALOG, owned, { ...DEFAULT_COLLECTION_FILTERS, search: "潮湾" })[0]?.id, "MER-M-001");
  assert.equal(filterCollectionCards(CARD_CATALOG, owned, { ...DEFAULT_COLLECTION_FILTERS, keywords: ["HEAL"] }).length > 0, true);
});

test("rarity filtering and pagination remain stable", () => {
  const legendary = filterCollectionCards(CARD_CATALOG, owned, { ...DEFAULT_COLLECTION_FILTERS, rarities: ["LEGENDARY"] });
  assert.equal(legendary.every((card) => card.rarity === "LEGENDARY"), true);
  assert.deepEqual(pageItems([1, 2, 3, 4, 5], 2, 2), [3, 4]);
});

test("unified faction rule permits own faction and common spells only", () => {
  assert.equal(isCardAllowedInDeck("MERMAID", mermaid), true);
  assert.equal(isCardAllowedInDeck("MERMAID", spell), true);
  assert.equal(isCardAllowedInDeck("MERMAID", giant), false);
  assert.equal(isCardAllowedInDeck("GIANT", giant), true);
  assert.equal(isCardAllowedInDeck("GIANT", spell), true);
  assert.equal(isCardAllowedInDeck("GIANT", mermaid), false);
});

test("data-layer add refuses the opposing faction and keeps copy/size limits", () => {
  let deck = createLocalDeck("规则测试", "MERMAID", 1);
  assert.equal(addCardToDeck(deck, giant).reason, "FACTION_MISMATCH");
  deck = addCardToDeck(deck, mermaid).deck;
  deck = addCardToDeck(deck, mermaid).deck;
  assert.equal(addCardToDeck(deck, mermaid).reason, "COPY_LIMIT");
  const full = { ...deck, cards: Object.fromEntries(Array.from({ length: MAX_DECK_SIZE }, (_, index) => [`X${index}`, 1])) };
  assert.equal(addCardToDeck(full, mermaid).reason, "FULL");
});

test("cards can be removed and the mana curve updates", () => {
  let deck = createLocalDeck("曲线测试", "MERMAID", 2);
  deck = addCardToDeck(deck, mermaid).deck;
  deck = addCardToDeck(deck, spell).deck;
  assert.equal(deckCardCount(deck), 2);
  assert.equal(deckManaCurve(deck, CARD_CATALOG).reduce((sum, count) => sum + count, 0), 2);
  assert.equal(deckCardCount(removeCardFromDeck(deck, mermaid.id)), 1);
});

test("local decks persist faction and active selection", () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  const deck = { ...createLocalDeck("出战", "MERMAID", 3), cards: { ...STARTER_DECK_CARDS } };
  saveDecks(storage, [deck]);
  assert.deepEqual(loadDecks(storage), [deck]);
  saveActiveDeckId(storage, deck.id);
  assert.equal(loadActiveDeckId(storage, [deck]), deck.id);
  assert.deepEqual(toDeckSubmission(deck), { deckId: deck.id, faction: "MERMAID", cards: deck.cards });
  assert.notEqual(toDeckSubmission(deck).cards, deck.cards);
});

test("legacy single-faction decks infer faction", () => {
  const storageFor = (cards: Record<string, number>) => ({ getItem: () => JSON.stringify([{ id: "OLD", name: "旧卡组", cards, createdAt: 1 }]) });
  assert.equal(loadDecks(storageFor({ "MER-M-001": 2, "GEN-S-001": 2 }))[0]?.faction, "MERMAID");
  assert.equal(loadDecks(storageFor({ "GIA-M-001": 2, "GEN-S-001": 2 }))[0]?.faction, "GIANT");
});

test("common-only legacy asks for faction; mixed legacy is retained and flagged", () => {
  const common = loadDecks({ getItem: () => JSON.stringify([{ id: "COMMON", name: "通用", cards: { "GEN-S-001": 2 }, createdAt: 1 }]) })[0]!;
  const mixed = loadDecks({ getItem: () => JSON.stringify([{ id: "MIXED", name: "混合", cards: { "MER-M-001": 2, "GIA-M-001": 2 }, createdAt: 1 }]) })[0]!;
  assert.equal(common.migrationIssue, "NEEDS_FACTION");
  assert.equal(mixed.migrationIssue, "MIXED_FACTIONS");
  assert.equal(mixed.cards["GIA-M-001"], 2);
  assert.equal(resolveDeckFaction(common, "GIANT").migrationIssue, undefined);
});

test("30-card faction decks validate; mixed faction and wrong sizes fail", () => {
  const legal = { deckId: "LEGAL", faction: "MERMAID" as const, cards: { ...STARTER_DECK_CARDS } };
  assert.equal(validateDeck(legal, CARD_CATALOG, owned).valid, true);
  assert.equal(validateDeck({ ...legal, cards: { ...legal.cards, "MER-M-001": 1 } }, CARD_CATALOG).errors[0]?.code, "TOO_FEW_CARDS");
  assert.equal(validateDeck({ ...legal, cards: { ...legal.cards, "GIA-M-001": 2, "MER-M-001": 0 } }, CARD_CATALOG).errors.some((error) => error.code === "FACTION_MISMATCH"), true);
  assert.equal(validateDeck({ ...legal, cards: { ...legal.cards, "GEN-S-002": 2 } }, CARD_CATALOG).errors[0]?.code, "TOO_MANY_CARDS");
});

test("new and old Mermaid gods are legendary Mermaid cards forbidden in Giant decks", () => {
  for (const id of ["MER-M-019", "MER-M-020"]) {
    const card = CARD_CATALOG.find((candidate) => candidate.id === id)!;
    assert.equal(card.rarity, "LEGENDARY");
    assert.equal(card.faction, "MERMAID");
    assert.equal(card.deckLimit, 1);
    assert.equal(isCardAllowedInDeck("GIANT", card), false);
  }
});

test("rename, delete and unresolved-deck validation remain safe", () => {
  const first = createLocalDeck("旧名称", "MERMAID", 4);
  const second = createLocalDeck("乙", "GIANT", 5);
  assert.equal(renameLocalDeck(first, "   ").error, "EMPTY");
  assert.equal(renameLocalDeck(first, "  新名称  ").deck.name, "新名称");
  assert.equal(deleteLocalDeck([first, second], first.id, first.id).activeDeckId, null);
  const unresolved = { ...first, migrationIssue: "NEEDS_FACTION" as const };
  assert.equal(validateLocalDeck(unresolved, CARD_CATALOG, owned).valid, false);
});
