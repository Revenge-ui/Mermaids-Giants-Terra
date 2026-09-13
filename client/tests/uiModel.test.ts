import assert from "node:assert/strict";
import test from "node:test";
import type { CardView, PlayerViewState } from "@riftbound/shared";
import {
  emptySelection,
  canInteractWithBattle,
  isCardPlayable,
  isLegalTarget,
  opponentViewContainsSecretHand,
  presentationFromEvents,
  resetSelectionForGame,
  selectionAfterStateSync,
  targetModeForCard
} from "../src/uiModel";

const minionCard: CardView = {
  id: "MER-M-003", definitionId: "MER-M-003", instanceId: "HAND_1", type: "MINION", faction: "MERMAID", rarity: "COMMON", cost: 2,
  nameKey: "mer_m_003_name", descriptionKey: "mer_m_003_description", rune: "◉", attack: 2, health: 3
};
const damageCard: CardView = {
  id: "GEN-S-014", definitionId: "GEN-S-014", instanceId: "SPELL_1", type: "SPELL", faction: "COMMON", rarity: "RARE", cost: 4,
  nameKey: "gen_s_014_name", descriptionKey: "gen_s_014_description", rune: "✦", effect: { type: "DEAL_DAMAGE", amount: 5, target: "ANY_ENEMY" }
};

function view(overrides: Partial<PlayerViewState> = {}): PlayerViewState {
  return {
    gameId: "GAME_A", roomId: "123456", currentPlayerId: "P1", firstPlayerId: "P1", turn: 3, status: "PLAYING", stateRevision: 7, opponentConnected: true, mulliganConfirmed: true, opponentMulliganConfirmed: true,
    you: { playerId: "P1", name: "甲", faction: "MERMAID", health: 30, mana: 4, maxMana: 4, temporaryMana: 0, deckCount: 14, handCount: 2, hand: [minionCard, damageCard], board: [{ instanceId: "ALLY_1", definitionId: "MER-M-003", nameKey: "mer_m_003_name", rune: "◉", attack: 2, health: 3, maxHealth: 3, canAttack: true }] },
    opponent: { playerId: "P2", name: "乙", faction: "GIANT", health: 27, mana: 3, maxMana: 3, temporaryMana: 0, deckCount: 13, handCount: 4, board: [{ instanceId: "ENEMY_1", definitionId: "GIA-M-001", nameKey: "gia_m_001_name", rune: "◆", attack: 2, health: 1, maxHealth: 3, canAttack: false }] },
    ...overrides
  };
}

test("非己方回合卡牌不可操作", () => assert.equal(isCardPlayable(view({ currentPlayerId: "P2" }), minionCard, null), false));
test("法力不足卡牌不可操作", () => assert.equal(isCardPlayable(view({ you: { ...view().you, mana: 1 } }), minionCard, null), false));
test("伤害法术正确识别并高亮合法敌方目标", () => {
  const game = view();
  assert.equal(targetModeForCard(damageCard), "ENEMY");
  assert.equal(isLegalTarget("ENEMY", game, { type: "HERO", playerId: "P2" }), true);
  assert.equal(isLegalTarget("ENEMY", game, { type: "MINION", playerId: "P2", instanceId: "ENEMY_1" }), true);
});
test("非法目标不可选择", () => assert.equal(isLegalTarget("ENEMY", view(), { type: "MINION", playerId: "P1", instanceId: "ALLY_1" }), false));
test("pending Action 阻止重复操作", () => assert.equal(isCardPlayable(view(), minionCard, "PLAY_CARD"), false));
test("GameEvent 生成伤害、攻击、死亡和回合表现", () => {
  const presentation = presentationFromEvents([
    { type: "DAMAGE_DEALT", sourceId: "ALLY_1", targetId: "ENEMY_1", amount: 2 },
    { type: "MINION_DIED", playerId: "P2", instanceId: "ENEMY_1" },
    { type: "TURN_STARTED", playerId: "P1", turn: 4 }
  ], "P1", view(), 9);
  assert.equal(presentation.attackingId, "ALLY_1");
  assert.equal(presentation.floatingNumbers[0]?.amount, 2);
  assert.equal(presentation.dyingMinions[0]?.minion.instanceId, "ENEMY_1");
  assert.equal(presentation.turnBanner, "YOUR_TURN");
});
test("GameOver 后所有卡牌不可操作", () => assert.equal(isCardPlayable(view({ status: "FINISHED", winnerId: "P1" }), minionCard, null), false));
test("对手公开视图不包含秘密手牌", () => assert.equal(opponentViewContainsSecretHand(view()), false));
test("断线重连状态同步后清除旧选择并使用当前 gameId", () => assert.deepEqual(selectionAfterStateSync("GAME_A"), { gameId: "GAME_A" }));
test("切换对局不会保留上一局选择", () => {
  const old = { gameId: "GAME_A", cardInstanceId: "HAND_1", attackerId: "ALLY_1" };
  assert.deepEqual(resetSelectionForGame(old, "GAME_B"), emptySelection("GAME_B"));
});

test("断线、开场覆盖层和等待确认均禁止战斗操作", () => {
  assert.equal(canInteractWithBattle(view(), true, null, false), true);
  assert.equal(canInteractWithBattle(view(), false, null, false), false);
  assert.equal(canInteractWithBattle(view(), true, null, true), false);
  assert.equal(canInteractWithBattle(view(), true, "END_TURN", false), false);
  assert.equal(canInteractWithBattle(view({ status: "FINISHED" }), true, null, false), false);
});

test("战场已满不高亮随从，但仍允许法术", () => {
  const game = view();
  game.you.board = Array.from({ length: 7 }, (_, index) => ({ ...game.you.board[0]!, instanceId: `M_${index}` }));
  assert.equal(isCardPlayable(game, minionCard, null), false);
  assert.equal(isCardPlayable(game, damageCard, null), true);
});

test("攻击表现记录真实目标而不是固定方向", () => {
  const result = presentationFromEvents([{ type: "DAMAGE_DEALT", sourceId: "ALLY_1", targetId: "P2", amount: 2 }], "P1", view(), 1);
  assert.equal(result.attackingId, "ALLY_1");
  assert.equal(result.attackTargetId, "P2");
});

test("敌方出牌展示只通过公开事件查卡，不需要敌方手牌", () => {
  const game = view();
  const result = presentationFromEvents([{ type: "CARD_PLAYED", playerId: "P2", cardInstanceId: "PUBLIC_PLAY", definitionId: "GEN-S-014" }], "P1", game, 1);
  assert.equal(result.playedCard?.id, "GEN-S-014");
  assert.equal(opponentViewContainsSecretHand(game), false);
});
