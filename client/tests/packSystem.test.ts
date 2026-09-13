import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { COLLECTIBLE_CARDS, LRT_GIFT_PACK_ID } from "../src/data/packDefinitions";
import { addCards } from "../src/localProgress";
import { PackOpeningService } from "../src/packOpeningService";
import { claimLrtGift, consumePack, consumePacks, loadGiftState, loadPackInventory } from "../src/packStorage";

function memoryStorage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}

test("神的馈赠只能领取一次，刷新后仍保存50包", () => {
  const storage = memoryStorage();
  const first = claimLrtGift(storage);
  const second = claimLrtGift(storage);
  assert.equal(first.claimed, true);
  assert.equal(first.inventory[LRT_GIFT_PACK_ID], 50);
  assert.equal(second.claimed, false);
  assert.equal(loadGiftState(storage).lrtGiftClaimed, true);
  assert.equal(loadPackInventory(storage)[LRT_GIFT_PACK_ID], 50);
});

test("没有卡包不能开，每次消费库存只减少一包", () => {
  const storage = memoryStorage();
  assert.equal(consumePack(storage, {}, LRT_GIFT_PACK_ID), null);
  const next = consumePack(storage, { [LRT_GIFT_PACK_ID]: 2 }, LRT_GIFT_PACK_ID)!;
  assert.equal(next[LRT_GIFT_PACK_ID], 1);
  assert.equal(loadPackInventory(storage)[LRT_GIFT_PACK_ID], 1);
  const empty = consumePack(storage, consumePack(storage, next, LRT_GIFT_PACK_ID)!, LRT_GIFT_PACK_ID);
  assert.equal(empty, null);
});

test("每包五张、至少一张稀有以上且只来自可收藏卡池", () => {
  const cards = new PackOpeningService(COLLECTIBLE_CARDS, () => 0).openPack(LRT_GIFT_PACK_ID);
  const collectibleIds = new Set(COLLECTIBLE_CARDS.map((card) => card.id));
  assert.equal(cards.length, 5);
  assert.equal(cards.some((card) => card.rarity !== "COMMON"), true);
  assert.equal(cards.every((card) => collectibleIds.has(card.id)), true);
});

test("开出的重复卡会真实增加收藏数量", () => {
  const duplicate = COLLECTIBLE_CARDS[0]!;
  const result = addCards({ [duplicate.id]: 2 }, [duplicate, duplicate]);
  assert.equal(result[duplicate.id], 4);
});

test("开包卡池同时包含鱼人、巨人和通用法术，不受组卡阵营限制", () => {
  assert.equal(COLLECTIBLE_CARDS.some((card) => card.faction === "MERMAID"), true);
  assert.equal(COLLECTIBLE_CARDS.some((card) => card.faction === "GIANT"), true);
  assert.equal(COLLECTIBLE_CARDS.some((card) => card.faction === "COMMON"), true);
});

test("开5包扣除5份库存并得到25张牌", () => {
  const storage = memoryStorage();
  const inventory = { [LRT_GIFT_PACK_ID]: 10 };
  const cards = new PackOpeningService(COLLECTIBLE_CARDS, () => 0).openPacks(LRT_GIFT_PACK_ID, 5);
  const next = consumePacks(storage, inventory, LRT_GIFT_PACK_ID, 5)!;
  assert.equal(cards.length, 25);
  assert.equal(next[LRT_GIFT_PACK_ID], 5);
});

test("开10包扣除10份库存并得到50张牌", () => {
  const storage = memoryStorage();
  const inventory = { [LRT_GIFT_PACK_ID]: 10 };
  const cards = new PackOpeningService(COLLECTIBLE_CARDS, () => 0).openPacks(LRT_GIFT_PACK_ID, 10);
  const next = consumePacks(storage, inventory, LRT_GIFT_PACK_ID, 10)!;
  assert.equal(cards.length, 50);
  assert.equal(next[LRT_GIFT_PACK_ID], 0);
});

test("批量开包库存不足时不扣除", () => {
  const storage = memoryStorage();
  const inventory = { [LRT_GIFT_PACK_ID]: 7 };
  assert.equal(consumePacks(storage, inventory, LRT_GIFT_PACK_ID, 10), null);
  assert.deepEqual(inventory, { [LRT_GIFT_PACK_ID]: 7 });
  assert.deepEqual(loadPackInventory(storage), {});
});

test("批量模式让每一个独立卡包都至少含一张稀有或以上", () => {
  const cards = new PackOpeningService(COLLECTIBLE_CARDS, () => 0).openPacks(LRT_GIFT_PACK_ID, 10);
  for (let pack = 0; pack < 10; pack += 1) {
    assert.equal(cards.slice(pack * 5, pack * 5 + 5).some((card) => card.rarity !== "COMMON"), true);
  }
});

test("批量开出的全部重复卡都可以累计进收藏", () => {
  const duplicate = COLLECTIBLE_CARDS[0]!;
  const result = addCards({ [duplicate.id]: 3 }, Array.from({ length: 50 }, () => duplicate));
  assert.equal(result[duplicate.id], 53);
});

test("特殊比特币不会出现在收藏卡池或任意开包结果", () => {
  assert.equal(COLLECTIBLE_CARDS.some((card) => card.id === "SPECIAL_BITCOIN_COIN"), false);
  const result = new PackOpeningService(COLLECTIBLE_CARDS, () => 0.5).openPacks(LRT_GIFT_PACK_ID, 10);
  assert.equal(result.some((card) => card.id === "SPECIAL_BITCOIN_COIN"), false);
});

test("玩家可见品牌和极简启动器配置正确", () => {
  const html = readFileSync(resolve("index.html"), "utf8");
  const menu = readFileSync(resolve("src/pages/MainMenu.tsx"), "utf8");
  const launcher = readFileSync(resolve("../apps/launcher/CardGameLauncher.cs"), "utf8");
  assert.match(html, /<title>Mermaids-Giants-Terra<\/title>/);
  assert.match(menu, /Mermaids-Giants-Terra/);
  assert.match(menu, /新神纪元 · 旅者大厅/);
  assert.match(menu, /本版本为测试版本/);
  assert.match(menu, /正式版将在下个世纪推出/);
  assert.match(menu, /人类新神/);
  assert.match(launcher, /Text = "Mermaids-Giants-Terra"/);
  assert.match(launcher, /Text = "Loading\.\.\."/);
  assert.match(launcher, /new ProgressBar/);
  assert.match(launcher, /launcher-error\.txt/);
});
