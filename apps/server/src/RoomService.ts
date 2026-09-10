import { randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import {
  CARD_DATABASE,
  createGame,
  executeAction,
  GameRuleError,
  type GameResult,
  type GameState
} from "@riftbound/game-core";
import { NORMAL_AI_DECK } from "@riftbound/game-ai";
import {
  ErrorCode,
  expandDeckCards,
  validateDeck,
  type DeckSubmission,
  type GameStatus,
  type PlayerAction,
  type PlayerSession,
  type RoomState
} from "@riftbound/shared";
import type { Logger } from "./logger.js";

const MAX_PROCESSED_ACTIONS_PER_PLAYER = 128;

export interface RoomPlayer {
  playerId: string;
  name: string;
  sessionToken: string;
  socketId?: string;
  connected: boolean;
  disconnectedAt?: number;
  isAi?: boolean;
  deck?: DeckSubmission;
  ready: boolean;
}

export interface Room {
  roomId: string;
  status: GameStatus;
  players: RoomPlayer[];
  game?: GameState;
  createdAt: number;
  lastActivityAt: number;
  finishedAt?: number;
}

export interface RoomServiceOptions {
  reconnectGracePeriodMs: number;
  waitingRoomTtlMs: number;
  finishedRoomTtlMs: number;
}

export interface SessionResult {
  room: Room;
  session: PlayerSession;
}

export interface JoinResult extends SessionResult {
  initial: GameResult;
}

export interface AiGameResult extends SessionResult {
  initial: GameResult;
  aiPlayerId: string;
}

export interface ReconnectResult extends SessionResult {
  previousSocketId?: string;
}

export interface ActionResult {
  room: Room;
  result: GameResult;
  duplicate: boolean;
}

export type MaintenanceEvent =
  | { type: "GAME_FINISHED"; room: Room; result: GameResult; disconnectedPlayerId: string }
  | { type: "ROOM_DESTROYED"; roomId: string; socketIds: string[] };

export class RoomServiceError extends Error {
  constructor(public readonly code: ErrorCode) { super(code); }
}

function safeName(value: string): string { return value.trim().slice(0, 16) || "无名旅者"; }
function newPlayerId(): string { return `PLAYER_${randomUUID()}`; }
function newSessionToken(): string { return randomBytes(32).toString("base64url"); }

function tokenMatches(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

export class RoomService {
  private readonly rooms = new Map<string, Room>();
  private readonly socketPlayers = new Map<string, { roomId: string; playerId: string }>();
  private readonly processedActions = new Map<string, Map<string, number>>();

  constructor(private readonly logger: Logger, private readonly options: RoomServiceOptions) {}

  createRoom(socketId: string, playerName: string, deckOrNow?: DeckSubmission | number, nowOverride = Date.now()): SessionResult {
    const deck = typeof deckOrNow === "number" ? undefined : deckOrNow;
    const now = typeof deckOrNow === "number" ? deckOrNow : nowOverride;
    if (this.socketPlayers.has(socketId)) throw new RoomServiceError(ErrorCode.ALREADY_IN_ROOM);
    const roomId = this.createRoomCode();
    const player = this.createPlayer(socketId, playerName, deck);
    const room: Room = {
      roomId,
      status: "WAITING",
      players: [player],
      createdAt: now,
      lastActivityAt: now
    };
    this.rooms.set(roomId, room);
    this.bindSocket(socketId, roomId, player.playerId);
    this.logger.info("room_created", { roomId, playerId: player.playerId });
    return { room, session: this.sessionFor(room, player) };
  }

  joinRoom(roomId: string, socketId: string, playerName: string, deckOrNow?: DeckSubmission | number, nowOverride = Date.now()): JoinResult {
    const deck = typeof deckOrNow === "number" ? undefined : deckOrNow;
    const now = typeof deckOrNow === "number" ? deckOrNow : nowOverride;
    if (this.socketPlayers.has(socketId)) throw new RoomServiceError(ErrorCode.ALREADY_IN_ROOM);
    const room = this.rooms.get(roomId.trim());
    if (!room) throw new RoomServiceError(ErrorCode.ROOM_NOT_FOUND);
    if (room.status !== "WAITING") throw new RoomServiceError(room.status === "FINISHED" ? ErrorCode.GAME_ALREADY_OVER : ErrorCode.ROOM_FULL);
    if (room.players.length >= 2) throw new RoomServiceError(ErrorCode.ROOM_FULL);

    const player = this.createPlayer(socketId, playerName, deck);
    room.players.push(player);
    room.lastActivityAt = now;
    this.bindSocket(socketId, room.roomId, player.playerId);
    this.logger.info("room_joined", { roomId: room.roomId, playerId: player.playerId });

    const gameId = `GAME_${room.roomId}_${now}`;
    const first = room.players[0]!;
    const initial = createGame(gameId, room.roomId, [
      { playerId: first.playerId, name: first.name, deckDefinitionIds: first.deck ? this.validatedDefinitionIds(first.deck) : undefined },
      { playerId: player.playerId, name: player.name, deckDefinitionIds: player.deck ? this.validatedDefinitionIds(player.deck) : undefined }
    ], randomInt(1, 0x7fffffff));
    room.game = initial.state;
    room.status = "PLAYING";
    this.logger.info("game_started", { roomId: room.roomId, gameId });
    return { room, initial, session: this.sessionFor(room, player) };
  }

  createAiGame(socketId: string, playerName: string, deckOrNow?: DeckSubmission | number, nowOverride = Date.now()): AiGameResult {
    const deck = typeof deckOrNow === "number" ? undefined : deckOrNow;
    const now = typeof deckOrNow === "number" ? deckOrNow : nowOverride;
    if (this.socketPlayers.has(socketId)) throw new RoomServiceError(ErrorCode.ALREADY_IN_ROOM);
    const roomId = this.createRoomCode();
    const human = this.createPlayer(socketId, playerName, deck);
    const ai: RoomPlayer = {
      playerId: `AI_${randomUUID()}`,
      name: "石桌守卫",
      sessionToken: newSessionToken(),
      connected: true,
      isAi: true,
      deck: NORMAL_AI_DECK,
      ready: true
    };
    const gameId = `GAME_AI_${roomId}_${now}`;
    const initial = createGame(gameId, roomId, [
      { playerId: human.playerId, name: human.name, deckDefinitionIds: human.deck ? this.validatedDefinitionIds(human.deck) : undefined },
      { playerId: ai.playerId, name: ai.name, deckDefinitionIds: this.validatedDefinitionIds(NORMAL_AI_DECK) }
    ], randomInt(1, 0x7fffffff));
    const room: Room = {
      roomId,
      status: "PLAYING",
      players: [human, ai],
      game: initial.state,
      createdAt: now,
      lastActivityAt: now
    };
    this.rooms.set(roomId, room);
    this.bindSocket(socketId, roomId, human.playerId);
    this.logger.info("ai_game_started", { roomId, gameId, playerId: human.playerId, aiPlayerId: ai.playerId });
    return { room, initial, session: this.sessionFor(room, human), aiPlayerId: ai.playerId };
  }

  reconnect(roomId: string, playerId: string, sessionToken: string, socketId: string, now = Date.now()): ReconnectResult {
    const room = this.rooms.get(roomId);
    if (!room) throw new RoomServiceError(ErrorCode.ROOM_NOT_FOUND);
    const player = room.players.find((candidate) => candidate.playerId === playerId);
    if (!player || !tokenMatches(player.sessionToken, sessionToken)) throw new RoomServiceError(ErrorCode.INVALID_SESSION);
    if (player.disconnectedAt !== undefined && now - player.disconnectedAt > this.options.reconnectGracePeriodMs && room.status === "PLAYING") {
      throw new RoomServiceError(ErrorCode.RECONNECT_EXPIRED);
    }

    const previousSocketId = player.socketId;
    if (previousSocketId) this.socketPlayers.delete(previousSocketId);
    player.socketId = socketId;
    player.connected = true;
    player.disconnectedAt = undefined;
    room.lastActivityAt = now;
    this.bindSocket(socketId, room.roomId, player.playerId);
    this.logger.info("player_reconnected", { roomId, playerId });
    return { room, session: this.sessionFor(room, player), previousSocketId };
  }

  applyPlayerAction(socketId: string, action: PlayerAction, now = Date.now()): ActionResult {
    const identity = this.socketPlayers.get(socketId);
    if (!identity) throw new RoomServiceError(ErrorCode.NOT_IN_ROOM);
    if (action.playerId !== identity.playerId) throw new RoomServiceError(ErrorCode.PLAYER_ID_MISMATCH);
    const room = this.rooms.get(identity.roomId);
    if (!room) throw new RoomServiceError(ErrorCode.NOT_IN_ROOM);
    if (!room.game) throw new RoomServiceError(ErrorCode.GAME_NOT_STARTED);

    return this.applyRoomAction(room, action, now);
  }

  applyAiAction(roomId: string, action: PlayerAction, now = Date.now()): ActionResult {
    const room = this.rooms.get(roomId);
    if (!room || !room.game) throw new RoomServiceError(ErrorCode.GAME_NOT_STARTED);
    const player = room.players.find((candidate) => candidate.playerId === action.playerId);
    if (!player?.isAi) throw new RoomServiceError(ErrorCode.PLAYER_ID_MISMATCH);
    return this.applyRoomAction(room, action, now);
  }

  private applyRoomAction(room: Room, action: PlayerAction, now: number): ActionResult {
    if (!room.game) throw new RoomServiceError(ErrorCode.GAME_NOT_STARTED);
    const processed = this.processedActions.get(action.playerId);
    const previousRevision = processed?.get(action.actionId);
    if (previousRevision !== undefined) {
      return { room, result: { state: room.game, events: [] }, duplicate: true };
    }

    const result = executeAction(room.game, action);
    room.game = result.state;
    room.status = result.state.status;
    room.lastActivityAt = now;
    this.rememberAction(action.playerId, action.actionId, result.state.revision);
    if (result.state.status === "FINISHED") {
      room.finishedAt = now;
      this.logger.info("game_finished", { roomId: room.roomId, gameId: result.state.gameId, winnerId: result.state.winnerId });
    }
    return { room, result, duplicate: false };
  }

  disconnect(socketId: string, now = Date.now()): { room: Room; player: RoomPlayer; graceExpiresAt: number } | undefined {
    const identity = this.socketPlayers.get(socketId);
    this.socketPlayers.delete(socketId);
    if (!identity) return undefined;
    const room = this.rooms.get(identity.roomId);
    const player = room?.players.find((candidate) => candidate.playerId === identity.playerId);
    if (!room || !player || player.socketId !== socketId) return undefined;
    player.connected = false;
    player.socketId = undefined;
    player.disconnectedAt = now;
    room.lastActivityAt = now;
    this.logger.info("client_disconnected", { roomId: room.roomId, playerId: player.playerId });
    return { room, player, graceExpiresAt: now + this.options.reconnectGracePeriodMs };
  }

  maintain(now = Date.now()): MaintenanceEvent[] {
    const events: MaintenanceEvent[] = [];
    for (const room of [...this.rooms.values()]) {
      if (room.status === "PLAYING" && room.game) {
        const expired = room.players.find((player) => !player.connected && player.disconnectedAt !== undefined && now - player.disconnectedAt >= this.options.reconnectGracePeriodMs);
        if (expired) {
          const result = executeAction(room.game, {
            type: "SURRENDER",
            playerId: expired.playerId,
            actionId: `DISCONNECT_TIMEOUT_${room.roomId}`,
            clientSequence: 0
          });
          room.game = result.state;
          room.status = "FINISHED";
          room.finishedAt = now;
          room.lastActivityAt = now;
          this.logger.info("game_finished", { roomId: room.roomId, gameId: result.state.gameId, winnerId: result.state.winnerId });
          events.push({ type: "GAME_FINISHED", room, result, disconnectedPlayerId: expired.playerId });
        }
      }

      const waitingExpired = room.status === "WAITING" && now - room.lastActivityAt >= this.options.waitingRoomTtlMs;
      const finishedExpired = room.status === "FINISHED" && now - (room.finishedAt ?? room.lastActivityAt) >= this.options.finishedRoomTtlMs;
      if (waitingExpired || finishedExpired) {
        const socketIds = room.players.flatMap((player) => player.socketId ? [player.socketId] : []);
        this.destroyRoom(room.roomId);
        events.push({ type: "ROOM_DESTROYED", roomId: room.roomId, socketIds });
      }
    }
    return events;
  }

  getRoom(roomId: string): Room | undefined { return this.rooms.get(roomId); }
  roomForSocket(socketId: string): Room | undefined {
    const identity = this.socketPlayers.get(socketId);
    return identity ? this.rooms.get(identity.roomId) : undefined;
  }

  toRoomState(room: Room): RoomState {
    return {
      roomId: room.roomId,
      players: room.players.map(({ playerId, name, connected, ready }) => ({ playerId, name, connected, ready })),
      status: room.status
    };
  }

  close(): void {
    for (const roomId of [...this.rooms.keys()]) this.destroyRoom(roomId);
  }

  private createPlayer(socketId: string, playerName: string, deck?: DeckSubmission): RoomPlayer {
    if (deck) this.validatedDefinitionIds(deck);
    return {
      playerId: newPlayerId(),
      name: safeName(playerName),
      sessionToken: newSessionToken(),
      socketId,
      connected: true,
      deck,
      ready: Boolean(deck)
    };
  }

  private validatedDefinitionIds(deck: DeckSubmission): string[] {
    const validation = validateDeck(deck, CARD_DATABASE);
    if (!validation.valid) throw new RoomServiceError(ErrorCode.INVALID_DECK);
    return expandDeckCards(deck.cards);
  }

  private sessionFor(room: Room, player: RoomPlayer): PlayerSession {
    return { roomId: room.roomId, playerId: player.playerId, sessionToken: player.sessionToken };
  }

  private bindSocket(socketId: string, roomId: string, playerId: string): void {
    this.socketPlayers.set(socketId, { roomId, playerId });
  }

  private rememberAction(playerId: string, actionId: string, revision: number): void {
    const actions = this.processedActions.get(playerId) ?? new Map<string, number>();
    actions.set(actionId, revision);
    while (actions.size > MAX_PROCESSED_ACTIONS_PER_PLAYER) actions.delete(actions.keys().next().value!);
    this.processedActions.set(playerId, actions);
  }

  private destroyRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    for (const player of room.players) {
      if (player.socketId) this.socketPlayers.delete(player.socketId);
      this.processedActions.delete(player.playerId);
    }
    this.rooms.delete(roomId);
    this.logger.info("room_destroyed", { roomId });
  }

  private createRoomCode(): string {
    let roomId: string;
    do roomId = randomInt(100000, 1_000_000).toString(); while (this.rooms.has(roomId));
    return roomId;
  }
}

export function errorCodeOf(error: unknown): ErrorCode {
  if (error instanceof GameRuleError || error instanceof RoomServiceError) return error.code;
  return ErrorCode.INTERNAL_ERROR;
}
