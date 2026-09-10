import assert from "node:assert/strict";
import test from "node:test";
import { CARD_CATALOG } from "../src/data/cardCatalog";
import {
  LOTTERY_REWARDS,
  addCards,
  drawLotteryReward,
  openLocalPack,
  rarityFromRoll,
  starterCollection
} from "../src/localProgress";

test("稀有度概率边界稳定", () => {
  assert.equal(rarityFromRoll(0), "COMMON");
  assert.equal(rarityFromRoll(0.7), "RARE");
  assert.equal(rarityFromRoll(0.9), "EPIC");
  assert.equal(rarityFromRoll(0.98), "LEGENDARY");
});

test("本地开包按指定数量返回公共卡牌数据", () => {
  const rolls = [0.1, 0, 0.75, 0, 0.92, 0, 0.99, 0];
  let index = 0;
  const cards = openLocalPack(() => rolls[index++] ?? 0, 4);
  assert.equal(cards.length, 4);
  assert.deepEqual(cards.map((card) => card.rarity), ["COMMON", "RARE", "EPIC", "LEGENDARY"]);
  assert.equal(cards.every((card) => CARD_CATALOG.includes(card)), true);
});

test("开包加入收藏时不修改旧收藏", () => {
  const original = starterCollection();
  const card = CARD_CATALOG[0]!;
  const before = original[card.id];
  const next = addCards(original, [card, card]);
  assert.equal(original[card.id], before);
  assert.equal(next[card.id], (before ?? 0) + 2);
});

test("抽奖结果来自固定奖励池并可被确定复现", () => {
  assert.equal(drawLotteryReward(() => 0), LOTTERY_REWARDS[0]);
  assert.equal(drawLotteryReward(() => 0.999), LOTTERY_REWARDS.at(-1));
});
