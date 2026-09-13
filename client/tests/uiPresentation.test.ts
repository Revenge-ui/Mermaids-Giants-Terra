import assert from "node:assert/strict";
import test from "node:test";
import { CARD_CATALOG } from "../src/data/cardCatalog";
import { summarizePackResults } from "../src/ui/packSummary";
import { attackVector } from "../src/battle/useBattleMotion";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Card } from "../src/components/Card";
import { CardDetail } from "../src/components/CardDetail";
import type { CardView } from "@riftbound/shared";
import { withRequestTimeout } from "../src/ui/requestTimeout";

test("批量开包聚合重复卡但不更改收藏或原始结果", () => {
  const card = CARD_CATALOG[0]!;
  const owned = Object.freeze({ [card.id]: 2 });
  const results = Object.freeze([card, card, card]);
  const groups = summarizePackResults(results, owned);
  assert.equal(groups.length, 1);
  assert.equal(groups[0]?.count, 3);
  assert.equal(groups[0]?.isNew, false);
  assert.equal(owned[card.id], 2);
  assert.equal(results.length, 3);
});

test("新卡标记依据开包前拥有数量，稀有卡优先展示", () => {
  const common = CARD_CATALOG.find(card => card.rarity === "COMMON")!;
  const legendary = CARD_CATALOG.find(card => card.rarity === "LEGENDARY")!;
  const groups = summarizePackResults([common, legendary, common], {});
  assert.equal(groups[0]?.card.id, legendary.id);
  assert.equal(groups.every(group => group.isNew), true);
  assert.equal(groups.reduce((sum, group) => sum + group.count, 0), 3);
});

test("攻击位移指向目标且限制距离，重叠目标不产生无效数值", () => {
  assert.deepEqual(attackVector({ x: 0, y: 0 }, { x: 3, y: 4 }), { x: 3, y: 4 });
  const vector = attackVector({ x: 0, y: 0 }, { x: -300, y: -400 });
  assert.ok(vector.x < 0 && vector.y < 0);
  assert.ok(Math.abs(Math.hypot(vector.x, vector.y) - 135) < 0.001);
  assert.deepEqual(attackVector({ x: 4, y: 4 }, { x: 4, y: 4 }), { x: 0, y: 0 });
});

test("手牌与详情不复用战场 minion 类名，避免高度和宽度污染", () => {
  const definition = CARD_CATALOG.find(card => card.type === "MINION")!;
  const card = { ...definition, definitionId: definition.id, instanceId: "DISPLAY_TEST" } as CardView;
  const hand = renderToStaticMarkup(createElement(Card, { card, selected: false, playable: true, index: 0, fanOffset: 0, fanAngle: 0, onClick: () => {} }));
  const detail = renderToStaticMarkup(createElement(CardDetail, { card }));
  for (const html of [hand, detail]) {
    const classes = html.match(/class="([^"]*)"/)?.[1]?.split(/\s+/) ?? [];
    assert.equal(classes.includes("minion"), false);
  }
  assert.match(hand, /hand-minion/);
  assert.match(detail, /detail-minion/);
});

test("请求无回应不会永久停留在加载状态，也不会自动重发动作", async () => {
  let calls = 0;
  const request = new Promise<never>(() => { calls += 1; });
  await assert.rejects(withRequestTimeout(request, 5), /REQUEST_TIMEOUT/);
  assert.equal(calls, 1);
  assert.equal(await withRequestTimeout(Promise.resolve("confirmed"), 50), "confirmed");
});
