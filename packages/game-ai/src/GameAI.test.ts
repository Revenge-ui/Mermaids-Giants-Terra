import assert from "node:assert/strict";
import test from "node:test";
import { CARD_DATABASE, createGame, createPlayerView, executeAction, type GameState } from "@riftbound/game-core";
import { validateDeck, type PlayerAction, type PlayerViewState } from "@riftbound/shared";
import { RuleBasedGameAI } from "./GameAI.js";
import { NORMAL_AI_DECK } from "./aiDecks.js";

const ai = new RuleBasedGameAI();

function initial(seed = 7): GameState {
  let state = createGame(`GAME_${seed}`, `ROOM_${seed}`, [{ playerId: "A", name: "甲" }, { playerId: "B", name: "乙" }], seed).state;
  for (const player of state.players) {
    state = executeAction(state, { type: "CONFIRM_MULLIGAN", playerId: player.playerId, cardInstanceIds: [], actionId: `SETUP_${seed}_${player.playerId}`, clientSequence: 0 }).state;
  }
  return state;
}

function choose(state: GameState, sequence: number): PlayerAction | null {
  return ai.chooseAction({ view: createPlayerView(state, state.currentPlayerId), actionId: `AI_ACTION_${sequence}`, clientSequence: sequence });
}

test("AI 生成的动作可以通过正常规则验证", () => {
  const state = initial();
  const action = choose(state, 1);
  assert.ok(action);
  assert.doesNotThrow(() => executeAction(state, action));
});

test("AI 不会在非自己回合行动", () => {
  const state = initial();
  const otherId = state.players.find((player) => player.playerId !== state.currentPlayerId)!.playerId;
  assert.equal(ai.chooseAction({ view: createPlayerView(state, otherId), actionId: "AI_ACTION_OTHER", clientSequence: 1 }), null);
});

test("AI 不读取敌方隐藏手牌", () => {
  const state = initial();
  const view = createPlayerView(state, state.currentPlayerId);
  Object.defineProperty(view.opponent, "hand", { get: () => { throw new Error("secret hand accessed"); } });
  assert.doesNotThrow(() => ai.chooseAction({ view, actionId: "AI_ACTION_SECRET", clientSequence: 1 }));
});

test("AI 有斩杀法术时优先攻击英雄", () => {
  const state = initial();
  const me = state.players.find((player) => player.playerId === state.currentPlayerId)!;
  const enemy = state.players.find((player) => player.playerId !== state.currentPlayerId)!;
  me.hand = [{ instanceId: "LETHAL_SPELL", definitionId: "GEN-S-014" }];
  me.mana = 4;
  enemy.health = 5;
  const action = choose(state, 1);
  assert.equal(action?.type, "PLAY_CARD");
  assert.deepEqual(action?.type === "PLAY_CARD" ? action.target : undefined, { type: "HERO", playerId: enemy.playerId });
});

test("AI 没有可执行动作时结束回合", () => {
  const state = initial();
  const me = state.players.find((player) => player.playerId === state.currentPlayerId)!;
  me.hand = [];
  me.board = [];
  const action = choose(state, 1);
  assert.equal(action?.type, "END_TURN");
});

test("单回合决策不会超过安全上限", () => {
  let state = initial();
  const startingPlayer = state.currentPlayerId;
  let count = 0;
  while (state.status === "PLAYING" && state.currentPlayerId === startingPlayer && count < 31) {
    const action = choose(state, count + 1);
    assert.ok(action);
    state = executeAction(state, action).state;
    count += 1;
  }
  assert.ok(count <= 30);
});

test("AI 动作仍由 authoritative game-core 结算", () => {
  const state = initial();
  const beforeRevision = state.revision;
  const action = choose(state, 1)!;
  const result = executeAction(state, action);
  assert.equal(state.revision, beforeRevision);
  assert.equal(result.state.revision, beforeRevision + 1);
});

test("Game Over 后 AI 停止行动", () => {
  const state = initial();
  state.status = "FINISHED";
  state.winnerId = "A";
  const view = createPlayerView(state, state.currentPlayerId);
  assert.equal(ai.chooseAction({ view, actionId: "AI_ACTION_OVER", clientSequence: 1 }), null);
});

function simulate(seed: number): { state: GameState; actions: number } {
  let state = initial(seed);
  let actions = 0;
  while (state.status === "PLAYING" && actions < 2_000) {
    const action = choose(state, actions + 1);
    assert.ok(action, `seed ${seed} returned no action during its turn`);
    state = executeAction(state, action).state;
    actions += 1;
  }
  return { state, actions };
}

test("连续运行多局不会崩溃", () => {
  for (let seed = 1; seed <= 10; seed += 1) assert.equal(simulate(seed).state.status, "FINISHED");
});

test("AI vs AI 自动模拟 100 局全部结束且无非法动作", () => {
  let longest = 0;
  for (let seed = 100; seed < 200; seed += 1) {
    const result = simulate(seed);
    assert.equal(result.state.status, "FINISHED", `seed ${seed} did not finish`);
    longest = Math.max(longest, result.actions);
  }
  assert.ok(longest < 2_000);
});

test("AI 起手只替换自身可见的高费普通卡", () => {
  const state = createGame("MULLIGAN_AI", "ROOM_AI", [{ playerId: "A", name: "甲" }, { playerId: "B", name: "乙" }], 17).state;
  const view = createPlayerView(state, state.players[0]!.playerId);
  const selected = ai.chooseMulligan(view);
  assert.equal(selected.every((id) => view.you.hand.some((card) => card.instanceId === id && card.cost >= 5 && card.definitionId !== "SPECIAL_BITCOIN_COIN")), true);
  assert.equal(selected.some((id) => view.opponent.playerId === id), false);
});

test("AI uses an explicit legal single-faction deck", () => {
  assert.equal(NORMAL_AI_DECK.faction, "GIANT");
  assert.equal(validateDeck(NORMAL_AI_DECK, CARD_DATABASE).valid, true);
  assert.equal(Object.keys(NORMAL_AI_DECK.cards).some((id) => id.startsWith("MER-M-")), false);
});
