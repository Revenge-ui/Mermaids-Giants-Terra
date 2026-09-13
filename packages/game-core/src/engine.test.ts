import assert from "node:assert/strict";
import test from "node:test";
import { ErrorCode, type PlayerAction } from "@riftbound/shared";
import { createGame, createPlayerEvents, createPlayerView, executeAction } from "./engine.js";
import { CARD_DATABASE, SPECIAL_BITCOIN_COIN_ID } from "./cards/database.js";
import { GameRuleError } from "./GameRuleError.js";
import type { CardInstance, GameState, MinionInstance, PlayerState } from "./state.js";

function rawGame(seed = 42): GameState {
  return createGame(
    "GAME_TEST",
    "123456",
    [{ playerId: "P1", name: "甲" }, { playerId: "P2", name: "乙" }],
    seed
  ).state;
}

function newGame(seed = 42): GameState {
  let state = rawGame(seed);
  for (const player of state.players) {
    state = executeAction(state, {
      type: "CONFIRM_MULLIGAN", playerId: player.playerId, cardInstanceIds: [],
      actionId: `MULLIGAN_${seed}_${player.playerId}`, clientSequence: 0,
    }).state;
  }
  return state;
}

function currentAndOpponent(state: GameState): [PlayerState, PlayerState] {
  return [
    state.players.find((player) => player.playerId === state.currentPlayerId)!,
    state.players.find((player) => player.playerId !== state.currentPlayerId)!
  ];
}

function giveCard(player: PlayerState, definitionId: string): CardInstance {
  const deckIndex = player.deck.findIndex((card) => card.definitionId === definitionId);
  const card = deckIndex >= 0
    ? player.deck.splice(deckIndex, 1)[0]!
    : { instanceId: `TEST_${definitionId}`, definitionId };
  player.hand.push(card);
  return card;
}

function minion(instanceId: string, definitionId: string, attack: number, health: number): MinionInstance {
  return { instanceId, definitionId, attack, health, maxHealth: health, canAttack: true };
}

function expectRuleError(action: () => unknown, code: ErrorCode): void {
  assert.throws(action, (error) => error instanceof GameRuleError && error.code === code);
}

let sequence = 0;
type ActionWithoutMetadata = PlayerAction extends infer Action
  ? Action extends PlayerAction ? Omit<Action, "playerId" | "actionId" | "clientSequence"> : never
  : never;
function action(playerId: string, value: ActionWithoutMetadata): PlayerAction {
  sequence += 1;
  return { ...value, playerId, actionId: `TEST_ACTION_${sequence}`, clientSequence: sequence } as PlayerAction;
}

test("1: player cannot act during the opponent turn", () => {
  const state = newGame();
  const [, opponent] = currentAndOpponent(state);
  expectRuleError(
    () => executeAction(state, action(opponent.playerId, { type: "END_TURN" })),
    ErrorCode.NOT_YOUR_TURN
  );
});

test("2: insufficient mana rejects a card", () => {
  const state = newGame();
  const [player] = currentAndOpponent(state);
  const card = giveCard(player, "MER-M-020");
  player.mana = 1;
  expectRuleError(
    () => executeAction(state, action(player.playerId, { type: "PLAY_CARD", cardInstanceId: card.instanceId })),
    ErrorCode.NOT_ENOUGH_MANA
  );
});

test("3 and 4: playing a minion spends mana and summons it", () => {
  const state = newGame();
  const [player] = currentAndOpponent(state);
  const card = giveCard(player, "MER-M-003");
  player.mana = 5;
  const result = executeAction(state, action(player.playerId, { type: "PLAY_CARD", cardInstanceId: card.instanceId }));
  assert.equal(result.state.revision, state.revision + 1);
  assert.equal(result.state.players.find((item) => item.playerId === player.playerId)!.mana, 3);
  assert.equal(result.state.players.find((item) => item.playerId === player.playerId)!.board[0]?.definitionId, "MER-M-003");
  assert.ok(result.events.some((event) => event.type === "MINION_SUMMONED"));
});

test("5: newly summoned minion cannot attack", () => {
  const state = newGame();
  const [player, opponent] = currentAndOpponent(state);
  const card = giveCard(player, "MER-M-001");
  player.mana = 5;
  const played = executeAction(state, action(player.playerId, { type: "PLAY_CARD", cardInstanceId: card.instanceId })).state;
  expectRuleError(
    () => executeAction(played, action(player.playerId, { type: "ATTACK", attackerId: card.instanceId, target: { type: "HERO", playerId: opponent.playerId } })),
    ErrorCode.MINION_CANNOT_ATTACK
  );
});

test("6: minions deal simultaneous combat damage", () => {
  const state = newGame();
  const [player, opponent] = currentAndOpponent(state);
  player.board = [minion("A", "MER-M-003", 2, 3)];
  opponent.board = [minion("B", "MER-M-004", 3, 4)];
  const result = executeAction(state, action(player.playerId, { type: "ATTACK", attackerId: "A", target: { type: "MINION", playerId: opponent.playerId, instanceId: "B" } }));
  const nextPlayer = result.state.players.find((item) => item.playerId === player.playerId)!;
  const nextOpponent = result.state.players.find((item) => item.playerId === opponent.playerId)!;
  assert.equal(nextPlayer.board.length, 0);
  assert.equal(nextOpponent.board[0]?.health, 2);
});

test("7: minions at zero health die", () => {
  const state = newGame();
  const [player, opponent] = currentAndOpponent(state);
  player.board = [minion("A", "MER-M-003", 2, 3)];
  opponent.board = [minion("B", "MER-M-002", 2, 1)];
  const result = executeAction(state, action(player.playerId, { type: "ATTACK", attackerId: "A", target: { type: "MINION", playerId: opponent.playerId, instanceId: "B" } }));
  assert.equal(result.state.players.find((item) => item.playerId === opponent.playerId)!.board.length, 0);
  assert.ok(result.events.some((event) => event.type === "MINION_DIED" && event.instanceId === "B"));
});

test("8: hero at zero health ends the game", () => {
  const state = newGame();
  const [player, opponent] = currentAndOpponent(state);
  opponent.health = 2;
  player.board = [minion("A", "MER-M-003", 2, 3)];
  const result = executeAction(state, action(player.playerId, { type: "ATTACK", attackerId: "A", target: { type: "HERO", playerId: opponent.playerId } }));
  assert.equal(result.state.status, "FINISHED");
  assert.equal(result.state.winnerId, player.playerId);
  assert.ok(result.events.some((event) => event.type === "GAME_OVER"));
});

test("9: player view never contains the opponent hand", () => {
  const state = newGame();
  const [player, opponent] = currentAndOpponent(state);
  const view = createPlayerView(state, player.playerId);
  assert.equal(view.opponent.handCount, opponent.hand.length);
  assert.equal("hand" in view.opponent, false);
  const drawEvents = createPlayerEvents([
    { type: "CARD_DRAWN", playerId: opponent.playerId, cardInstanceId: "SECRET", definitionId: "MER-M-001" }
  ], player.playerId);
  assert.deepEqual(drawEvents[0], { type: "CARD_DRAWN", playerId: opponent.playerId });
});

test("10: illegal actions do not mutate the input state", () => {
  const state = newGame();
  const [player] = currentAndOpponent(state);
  const before = JSON.stringify(state);
  const illegal = action(player.playerId, { type: "PLAY_CARD", cardInstanceId: "NOT_IN_HAND" });
  expectRuleError(() => executeAction(state, illegal), ErrorCode.CARD_NOT_IN_HAND);
  assert.equal(JSON.stringify(state), before);
});

test("seeded creation is reproducible", () => {
  assert.deepEqual(newGame(777), newGame(777));
  assert.notDeepEqual(newGame(777), newGame(778));
});

test("surrender produces a winner without client-computed results", () => {
  const state = newGame();
  const [player, opponent] = currentAndOpponent(state);
  const result = executeAction(state, action(player.playerId, { type: "SURRENDER" }));
  assert.equal(result.state.winnerId, opponent.playerId);
  assert.equal(result.state.status, "FINISHED");
});

test("custom LocalDeck expansion creates unique authoritative CardInstances", () => {
  const firstDeck = Array.from({ length: 30 }, (_, index) => `MER-M-${String(index % 15 + 1).padStart(3, "0")}`);
  const secondDeck = Array.from({ length: 30 }, (_, index) => `GIA-M-${String(index % 15 + 1).padStart(3, "0")}`);
  const state = createGame("GAME_CUSTOM", "445566", [
    { playerId: "P1", name: "甲", faction: "MERMAID", deckDefinitionIds: firstDeck },
    { playerId: "P2", name: "乙", faction: "GIANT", deckDefinitionIds: secondDeck }
  ], 77).state;
  for (const player of state.players) {
    const instances = [...player.deck, ...player.hand].filter((card) => card.definitionId !== SPECIAL_BITCOIN_COIN_ID);
    assert.equal(instances.length, 30);
    assert.equal(new Set(instances.map((card) => card.instanceId)).size, 30);
  }
  assert.equal([...state.players[0].deck, ...state.players[0].hand].filter((card) => card.definitionId !== SPECIAL_BITCOIN_COIN_ID).every((card) => firstDeck.includes(card.definitionId)), true);
  assert.equal([...state.players[1].deck, ...state.players[1].hand].filter((card) => card.definitionId !== SPECIAL_BITCOIN_COIN_ID).every((card) => secondDeck.includes(card.definitionId)), true);
});

test("starting hands are 3 for first and 4 plus Bitcoin for second", () => {
  const state = rawGame(91);
  const first = state.players.find((player) => player.playerId === state.firstPlayerId)!;
  const second = state.players.find((player) => player.playerId !== state.firstPlayerId)!;
  assert.equal(state.status, "MULLIGAN");
  assert.equal(first.hand.length, 3);
  assert.equal(first.hand.some((card) => card.definitionId === SPECIAL_BITCOIN_COIN_ID), false);
  assert.equal(second.hand.filter((card) => card.definitionId !== SPECIAL_BITCOIN_COIN_ID).length, 4);
  assert.equal(second.hand.filter((card) => card.definitionId === SPECIAL_BITCOIN_COIN_ID).length, 1);
});

test("mulligan replaces selected instances and allows an empty confirmation", () => {
  let state = rawGame(92);
  const first = state.players.find((player) => player.playerId === state.firstPlayerId)!;
  const replacedId = first.hand[0]!.instanceId;
  state = executeAction(state, action(first.playerId, { type: "CONFIRM_MULLIGAN", cardInstanceIds: [replacedId] })).state;
  const nextFirst = state.players.find((player) => player.playerId === first.playerId)!;
  assert.equal(nextFirst.hand.length, 3);
  assert.equal(nextFirst.hand.some((card) => card.instanceId === replacedId), false);
  assert.equal(state.status, "MULLIGAN");
  const second = state.players.find((player) => player.playerId !== first.playerId)!;
  state = executeAction(state, action(second.playerId, { type: "CONFIRM_MULLIGAN", cardInstanceIds: [] })).state;
  assert.equal(state.status, "PLAYING");
  assert.equal(state.currentPlayerId, state.firstPlayerId);
});

test("both players must confirm and the opponent view reveals no mulligan card ids", () => {
  let state = rawGame(93);
  const first = state.players[0]!;
  const second = state.players[1]!;
  const result = executeAction(state, action(first.playerId, { type: "CONFIRM_MULLIGAN", cardInstanceIds: [first.hand[0]!.instanceId] }));
  state = result.state;
  assert.equal(state.status, "MULLIGAN");
  const view = createPlayerView(state, second.playerId);
  assert.equal(view.opponentMulliganConfirmed, true);
  assert.equal(JSON.stringify(createPlayerEvents(result.events, second.playerId)).includes("instanceId"), false);
});

test("Bitcoin cannot be mulliganed and is not a collectible deck card", () => {
  const state = rawGame(94);
  const second = state.players.find((player) => player.playerId !== state.firstPlayerId)!;
  const coin = second.hand.find((card) => card.definitionId === SPECIAL_BITCOIN_COIN_ID)!;
  expectRuleError(() => executeAction(state, action(second.playerId, { type: "CONFIRM_MULLIGAN", cardInstanceIds: [coin.instanceId] })), ErrorCode.INVALID_ACTION);
  assert.equal(CARD_DATABASE.some((card) => card.id === SPECIAL_BITCOIN_COIN_ID), false);
});

test("Bitcoin grants only temporary mana and never permanent max mana", () => {
  let state = newGame(95);
  const second = state.players.find((player) => player.playerId !== state.firstPlayerId)!;
  if (state.currentPlayerId !== second.playerId) state = executeAction(state, action(state.currentPlayerId, { type: "END_TURN" })).state;
  const current = state.players.find((player) => player.playerId === second.playerId)!;
  const coin = current.hand.find((card) => card.definitionId === SPECIAL_BITCOIN_COIN_ID)!;
  current.mana = 2; current.maxMana = 2;
  state = executeAction(state, action(current.playerId, { type: "PLAY_CARD", cardInstanceId: coin.instanceId })).state;
  const boosted = state.players.find((player) => player.playerId === current.playerId)!;
  assert.equal(boosted.mana, 3);
  assert.equal(boosted.maxMana, 2);
  assert.equal(boosted.temporaryMana, 1);
  state = executeAction(state, action(current.playerId, { type: "END_TURN" })).state;
  assert.equal(state.players.find((player) => player.playerId === current.playerId)!.temporaryMana, 0);
  assert.equal(state.players.find((player) => player.playerId === current.playerId)!.maxMana, 2);
});
