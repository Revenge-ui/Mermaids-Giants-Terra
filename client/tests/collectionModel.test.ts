import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_COLLECTION_FILTERS, filterCollectionCards, pageItems } from "../src/collectionModel";
import { CARD_CATALOG } from "../src/data/cardCatalog";
import { addCardToDeck, createLocalDeck, deckCardCount, deckManaCurve, loadDecks, MAX_DECK_SIZE, removeCardFromDeck, saveDecks } from "../src/deckStorage";

const owned = { CARD_000001: 2, CARD_000015: 1 };

test("收藏类型、费用和只显示拥有筛选正确", () => {
  const result = filterCollectionCards(CARD_CATALOG, owned, { ...DEFAULT_COLLECTION_FILTERS, category: "MINION", mana: 1, ownedOnly: true });
  assert.deepEqual(result.map((card) => card.id), ["CARD_000001"]);
});

test("收藏支持中文名称、描述和效果关键词搜索", () => {
  assert.equal(filterCollectionCards(CARD_CATALOG, owned, { ...DEFAULT_COLLECTION_FILTERS, search: "苔径" })[0]?.id, "CARD_000001");
  assert.equal(filterCollectionCards(CARD_CATALOG, owned, { ...DEFAULT_COLLECTION_FILTERS, search: "恢复" }).every((card) => card.keywords.includes("HEAL")), true);
  assert.equal(filterCollectionCards(CARD_CATALOG, owned, { ...DEFAULT_COLLECTION_FILTERS, keywords: ["DRAW"] })[0]?.id, "CARD_000017");
});

test("收藏支持稀有度筛选和稳定分页", () => {
  const legendary = filterCollectionCards(CARD_CATALOG, owned, { ...DEFAULT_COLLECTION_FILTERS, rarities: ["LEGENDARY"] });
  assert.equal(legendary.every((card) => card.rarity === "LEGENDARY"), true);
  assert.deepEqual(pageItems([1, 2, 3, 4, 5], 2, 2), [3, 4]);
});

test("卡组遵守普通两张、传说一张与三十张容量限制", () => {
  const common = CARD_CATALOG.find((card) => card.rarity === "COMMON")!;
  const legendary = CARD_CATALOG.find((card) => card.rarity === "LEGENDARY")!;
  let deck = createLocalDeck("规则测试", 1);
  deck = addCardToDeck(deck, common).deck;
  deck = addCardToDeck(deck, common).deck;
  assert.equal(addCardToDeck(deck, common).reason, "COPY_LIMIT");
  deck = addCardToDeck(deck, legendary).deck;
  assert.equal(addCardToDeck(deck, legendary).reason, "COPY_LIMIT");
  const full = { ...deck, cards: Object.fromEntries(Array.from({ length: MAX_DECK_SIZE }, (_, index) => [`X${index}`, 1])) };
  assert.equal(addCardToDeck(full, common).reason, "FULL");
});

test("卡组可移除卡牌并实时计算费用曲线", () => {
  const oneCost = CARD_CATALOG.find((card) => card.cost === 1)!;
  const highCost = CARD_CATALOG.find((card) => card.cost >= 7)!;
  let deck = createLocalDeck("曲线测试", 2);
  deck = addCardToDeck(deck, oneCost).deck;
  deck = addCardToDeck(deck, highCost).deck;
  assert.equal(deckCardCount(deck), 2);
  assert.deepEqual(deckManaCurve(deck, CARD_CATALOG).filter((count) => count > 0), [1, 1]);
  deck = removeCardFromDeck(deck, oneCost.id);
  assert.equal(deckCardCount(deck), 1);
});

test("本地卡组可以保存并重新载入", () => {
  let serialized: string | null = null;
  const storage = { getItem: () => serialized, setItem: (_key: string, value: string) => { serialized = value; } };
  const decks = [createLocalDeck("本地卡组", 3)];
  saveDecks(storage, decks);
  assert.deepEqual(loadDecks(storage), decks);
});
