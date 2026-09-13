import assert from "node:assert/strict";
import test from "node:test";
import { createPlayerView } from "@riftbound/game-core";
import { ErrorCode, type DeckSubmission, type PlayerAction } from "@riftbound/shared";
import { Logger } from "./logger.js";
import { RoomService, RoomServiceError } from "./RoomService.js";

const options = { reconnectGracePeriodMs: 1_000, waitingRoomTtlMs: 2_000, finishedRoomTtlMs: 3_000 };
const service = () => new RoomService(new Logger("error"), options);
const DECK_A: DeckSubmission = { deckId: "DECK_A", faction: "MERMAID", cards: { "MER-M-001": 2, "MER-M-002": 2, "MER-M-003": 2, "MER-M-004": 2, "MER-M-005": 2, "MER-M-006": 2, "MER-M-007": 2, "MER-M-008": 2, "MER-M-009": 2, "MER-M-010": 2, "MER-M-011": 2, "MER-M-012": 2, "MER-M-013": 2, "MER-M-014": 2, "GEN-S-001": 2 } };
const DECK_B: DeckSubmission = { deckId: "DECK_B", faction: "GIANT", cards: { "GIA-M-001": 2, "GIA-M-002": 2, "GIA-M-003": 2, "GIA-M-004": 2, "GIA-M-005": 2, "GIA-M-006": 2, "GIA-M-007": 2, "GIA-M-008": 2, "GIA-M-009": 2, "GIA-M-010": 2, "GIA-M-011": 2, "GIA-M-012": 2, "GIA-M-013": 2, "GIA-M-014": 2, "GEN-S-001": 2 } };

function expectCode(operation: () => unknown, code: ErrorCode): void {
  assert.throws(operation, (error) => error instanceof RoomServiceError && error.code === code);
}

function startedRoom() {
  const rooms = service();
  const first = rooms.createRoom("SOCKET_1", "甲", 100);
  const second = rooms.joinRoom(first.room.roomId, "SOCKET_2", "乙", 101);
  rooms.applyPlayerAction("SOCKET_1", { type: "CONFIRM_MULLIGAN", playerId: first.session.playerId, cardInstanceIds: [], actionId: "SETUP_MULLIGAN_1", clientSequence: 0 }, 102);
  rooms.applyPlayerAction("SOCKET_2", { type: "CONFIRM_MULLIGAN", playerId: second.session.playerId, cardInstanceIds: [], actionId: "SETUP_MULLIGAN_2", clientSequence: 0 }, 103);
  return { rooms, room: second.room, first: first.session, second: second.session };
}

function endTurn(playerId: string, actionId = "ACTION_0001"): PlayerAction {
  return { type: "END_TURN", playerId, actionId, clientSequence: 1 };
}

test("1: creates a collision-safe six digit room", () => {
  const created = service().createRoom("SOCKET_1", "甲", 100);
  assert.match(created.room.roomId, /^\d{6}$/);
  assert.equal(created.room.status, "WAITING");
  assert.equal(created.session.sessionToken.length >= 32, true);
});

test("2: a second player joins and starts the game", () => {
  const { room } = startedRoom();
  assert.equal(room.players.length, 2);
  assert.equal(room.game?.status, "PLAYING");
});

test("3: a third player cannot join", () => {
  const { rooms, room } = startedRoom();
  expectCode(() => rooms.joinRoom(room.roomId, "SOCKET_3", "丙"), ErrorCode.ROOM_FULL);
});

test("4: joining an unknown room fails", () => {
  expectCode(() => service().joinRoom("999999", "SOCKET_2", "乙"), ErrorCode.ROOM_NOT_FOUND);
});

test("5: disconnect preserves the authoritative game state", () => {
  const { rooms, room } = startedRoom();
  const before = room.game;
  rooms.disconnect("SOCKET_1", 200);
  assert.equal(rooms.getRoom(room.roomId)?.game, before);
  assert.equal(room.players[0]?.connected, false);
});

test("6 and 8: a valid session reconnects and restores the same view", () => {
  const { rooms, room, first } = startedRoom();
  const before = createPlayerView(room.game!, first.playerId);
  rooms.disconnect("SOCKET_1", 200);
  const reconnected = rooms.reconnect(first.roomId, first.playerId, first.sessionToken, "SOCKET_NEW", 500);
  const after = createPlayerView(reconnected.room.game!, first.playerId);
  assert.deepEqual(after, before);
  assert.equal(reconnected.room.players[0]?.connected, true);
});

test("7: an invalid session token cannot impersonate a player", () => {
  const { rooms, first } = startedRoom();
  rooms.disconnect("SOCKET_1", 200);
  expectCode(() => rooms.reconnect(first.roomId, first.playerId, "x".repeat(43), "ATTACKER", 500), ErrorCode.INVALID_SESSION);
});

test("9: reconnect views still exclude the opponent hand", () => {
  const { rooms, room, first } = startedRoom();
  rooms.disconnect("SOCKET_1", 200);
  rooms.reconnect(first.roomId, first.playerId, first.sessionToken, "SOCKET_NEW", 500);
  const view = createPlayerView(room.game!, first.playerId);
  assert.equal("hand" in view.opponent, false);
});

test("AI room starts immediately and AI actions use the normal rule engine", () => {
  const rooms = service();
  const created = rooms.createAiGame("SOCKET_HUMAN", "旅者", 300);
  assert.equal(created.room.status, "MULLIGAN");
  rooms.applyPlayerAction("SOCKET_HUMAN", { type: "CONFIRM_MULLIGAN", playerId: created.session.playerId, cardInstanceIds: [], actionId: "HUMAN_MULLIGAN", clientSequence: 0 }, 301);
  rooms.applyAiAction(created.room.roomId, { type: "CONFIRM_MULLIGAN", playerId: created.aiPlayerId, cardInstanceIds: [], actionId: "AI_MULLIGAN", clientSequence: 0 }, 302);
  assert.equal(created.room.status, "PLAYING");
  assert.equal(created.room.players.length, 2);
  assert.equal(created.room.players.find((player) => player.playerId === created.aiPlayerId)?.isAi, true);
  assert.equal("hand" in createPlayerView(created.room.game!, created.session.playerId).opponent, false);

  const aiTurn = created.room.game!.currentPlayerId === created.aiPlayerId;
  if (aiTurn) {
    const beforeRevision = created.room.game!.revision;
    const result = rooms.applyAiAction(created.room.roomId, endTurn(created.aiPlayerId, "AI_ACTION_0001"), 303);
    assert.equal(result.result.state.revision, beforeRevision + 1);
  } else {
    expectCode(() => rooms.applyAiAction(created.room.roomId, endTurn(created.session.playerId, "HUMAN_FAKE_AI"), 301), ErrorCode.PLAYER_ID_MISMATCH);
  }
});

test("10: a duplicate actionId is idempotent", () => {
  const { rooms, room, first, second } = startedRoom();
  const current = room.game!.currentPlayerId;
  const socketId = current === first.playerId ? "SOCKET_1" : "SOCKET_2";
  const action = endTurn(current);
  const firstResult = rooms.applyPlayerAction(socketId, action, 200);
  const secondResult = rooms.applyPlayerAction(socketId, action, 201);
  assert.equal(firstResult.duplicate, false);
  assert.equal(secondResult.duplicate, true);
  assert.equal(secondResult.result.state.revision, firstResult.result.state.revision);
  assert.equal(secondResult.result.state.turn, 2);
  assert.ok(second.playerId);
});

test("11: an illegal action does not mutate state", () => {
  const { rooms, room, first, second } = startedRoom();
  const wrong = room.game!.currentPlayerId === first.playerId ? second : first;
  const socketId = wrong.playerId === first.playerId ? "SOCKET_1" : "SOCKET_2";
  const before = JSON.stringify(room.game);
  assert.throws(() => rooms.applyPlayerAction(socketId, endTurn(wrong.playerId), 200));
  assert.equal(JSON.stringify(room.game), before);
});

test("12: actions cannot alter a finished game", () => {
  const { rooms, room, first, second } = startedRoom();
  const surrendering = room.game!.currentPlayerId === first.playerId ? first : second;
  const socketId = surrendering.playerId === first.playerId ? "SOCKET_1" : "SOCKET_2";
  rooms.applyPlayerAction(socketId, { type: "SURRENDER", playerId: surrendering.playerId, actionId: "ACTION_END", clientSequence: 1 }, 200);
  const before = JSON.stringify(room.game);
  assert.throws(() => rooms.applyPlayerAction(socketId, endTurn(surrendering.playerId, "ACTION_AFTER"), 201));
  assert.equal(JSON.stringify(room.game), before);
});

test("13: disconnect timeout awards the game to the connected player", () => {
  const { rooms, room, first, second } = startedRoom();
  rooms.disconnect("SOCKET_1", 200);
  const events = rooms.maintain(1_200);
  assert.equal(room.status, "FINISHED");
  assert.equal(room.game?.winnerId, second.playerId);
  assert.equal(events[0]?.type, "GAME_FINISHED");
  assert.notEqual(room.game?.winnerId, first.playerId);
});

test("14: finished rooms are removed after their retention period", () => {
  const { rooms, room, first } = startedRoom();
  rooms.disconnect("SOCKET_1", 200);
  rooms.maintain(1_200);
  const events = rooms.maintain(4_200);
  assert.equal(rooms.getRoom(room.roomId), undefined);
  assert.ok(events.some((event) => event.type === "ROOM_DESTROYED"));
  assert.ok(first.roomId);
});

test("waiting rooms are removed after their TTL", () => {
  const rooms = service();
  const { room } = rooms.createRoom("SOCKET_1", "甲", 100);
  const events = rooms.maintain(2_100);
  assert.equal(rooms.getRoom(room.roomId), undefined);
  assert.ok(events.some((event) => event.type === "ROOM_DESTROYED"));
});

test("socket identity cannot submit another player's action", () => {
  const { rooms, first, second } = startedRoom();
  expectCode(() => rooms.applyPlayerAction("SOCKET_1", endTurn(second.playerId)), ErrorCode.PLAYER_ID_MISMATCH);
  assert.notEqual(first.playerId, second.playerId);
});

test("online game waits for both players to confirm mulligan independently", () => {
  const rooms = service();
  const first = rooms.createRoom("SOCKET_M1", "甲", DECK_A, 110);
  const joined = rooms.joinRoom(first.room.roomId, "SOCKET_M2", "乙", DECK_B, 111);
  assert.equal(joined.room.status, "MULLIGAN");
  rooms.applyPlayerAction("SOCKET_M1", { type: "CONFIRM_MULLIGAN", playerId: first.session.playerId, cardInstanceIds: [], actionId: "MULLIGAN_ONLY_A", clientSequence: 1 }, 112);
  assert.equal(joined.room.status, "MULLIGAN");
  const opponentView = createPlayerView(joined.room.game!, joined.session.playerId);
  assert.equal(opponentView.opponentMulliganConfirmed, true);
  assert.equal("hand" in opponentView.opponent, false);
  rooms.applyPlayerAction("SOCKET_M2", { type: "CONFIRM_MULLIGAN", playerId: joined.session.playerId, cardInstanceIds: [], actionId: "MULLIGAN_ONLY_B", clientSequence: 1 }, 113);
  assert.equal(joined.room.status, "PLAYING");
});

test("server rejects an invalid submitted deck before room creation", () => {
  expectCode(() => service().createRoom("SOCKET_BAD", "甲", { deckId: "BAD", faction: "MERMAID", cards: { "MER-M-001": 29 } }), ErrorCode.INVALID_DECK);
});

test("online players receive separate authoritative decks from their submissions", () => {
  const rooms = service();
  const first = rooms.createRoom("SOCKET_A", "甲", DECK_A, 500);
  const joined = rooms.joinRoom(first.room.roomId, "SOCKET_B", "乙", DECK_B, 501);
  const game = joined.room.game!;
  const firstCards = [...game.players[0].deck, ...game.players[0].hand].map((card) => card.definitionId).filter((id) => id !== "SPECIAL_BITCOIN_COIN");
  const secondCards = [...game.players[1].deck, ...game.players[1].hand].map((card) => card.definitionId).filter((id) => id !== "SPECIAL_BITCOIN_COIN");
  assert.equal(firstCards.length, 30);
  assert.equal(secondCards.length, 30);
  assert.equal(firstCards.filter((id) => id === "MER-M-001").length, 2);
  assert.equal(secondCards.filter((id) => id === "GIA-M-001").length, 2);
  assert.equal(game.players[0].faction, "MERMAID");
  assert.equal(game.players[1].faction, "GIANT");
  const productionInstances = [...game.players[0].deck, ...game.players[0].hand, ...game.players[1].deck, ...game.players[1].hand].filter((card) => card.definitionId !== "SPECIAL_BITCOIN_COIN");
  assert.equal(new Set(productionInstances.map((card) => card.instanceId)).size, 60);
});

test("AI uses its independent validated deck while the human uses the selected deck", () => {
  const created = service().createAiGame("SOCKET_HUMAN", "旅者", DECK_A, 600);
  const human = created.room.game!.players.find((player) => player.playerId === created.session.playerId)!;
  const ai = created.room.game!.players.find((player) => player.playerId === created.aiPlayerId)!;
  assert.equal([...human.deck, ...human.hand].filter((card) => card.definitionId === "MER-M-001").length, 2);
  assert.equal([...ai.deck, ...ai.hand].filter((card) => card.definitionId === "GIA-M-001").length, 2);
  assert.equal(human.faction, "MERMAID");
  assert.equal(ai.faction, "GIANT");
  assert.notEqual(human.deck, ai.deck);
});

test("room views never expose submitted deck lists", () => {
  const rooms = service();
  const created = rooms.createRoom("SOCKET_A", "甲", DECK_A, 700);
  const publicRoom = rooms.toRoomState(created.room);
  assert.equal(JSON.stringify(publicRoom).includes("MER-M-001"), false);
  assert.equal(publicRoom.players[0]?.ready, true);
});

test("server rejects a forged mixed-faction deck", () => {
  const mixed: DeckSubmission = { ...DECK_A, deckId: "MIXED", cards: { ...DECK_A.cards, "MER-M-001": 0, "GIA-M-001": 2 } };
  expectCode(() => service().createRoom("SOCKET_MIXED", "甲", mixed), ErrorCode.INVALID_DECK);
});

test("reconnect preserves the existing shuffled deck instead of rebuilding it", () => {
  const rooms = service();
  const first = rooms.createRoom("SOCKET_A", "甲", DECK_A, 800);
  rooms.joinRoom(first.room.roomId, "SOCKET_B", "乙", DECK_B, 801);
  const before = JSON.stringify(first.room.game);
  rooms.disconnect("SOCKET_A", 802);
  rooms.reconnect(first.session.roomId, first.session.playerId, first.session.sessionToken, "SOCKET_A2", 803);
  assert.equal(JSON.stringify(first.room.game), before);
});
