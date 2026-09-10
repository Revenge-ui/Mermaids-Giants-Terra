import { existsSync } from "node:fs";
import { randomInt } from "node:crypto";
import { createServer } from "node:http";
import { join, resolve } from "node:path";
import cors, { type CorsOptions } from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { Server, type Socket } from "socket.io";
import { createPlayerEvents, createPlayerView } from "@riftbound/game-core";
import { RuleBasedGameAI } from "@riftbound/game-ai";
import {
  ErrorCode,
  GAME_PROTOCOL_VERSION,
  type ClientToServerEvents,
  type GameEvent,
  type PlayerAction,
  type RoomActionResult,
  type ServerToClientEvents
} from "@riftbound/shared";
import { serverConfig } from "./config.js";
import { Logger } from "./logger.js";
import { SlidingWindowRateLimiter } from "./RateLimiter.js";
import { errorCodeOf, RoomService, RoomServiceError, type Room } from "./RoomService.js";
import {
  createRoomPayloadSchema,
  joinRoomPayloadSchema,
  playerActionSchema,
  reconnectPayloadSchema
} from "./validation.js";

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
const logger = new Logger(serverConfig.logLevel);
const roomService = new RoomService(logger, serverConfig);
const limiter = new SlidingWindowRateLimiter(serverConfig.rateLimitWindowMs);
const gameAi = new RuleBasedGameAI();
const aiTimers = new Map<string, ReturnType<typeof setTimeout>>();
const aiTurnActions = new Map<string, { turn: number; count: number; sequence: number }>();
const MAX_AI_ACTIONS_PER_TURN = 30;

const originAllowed = (origin: string | undefined): boolean => !origin || serverConfig.allowedOrigins.includes(origin);
const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (originAllowed(origin)) callback(null, true);
    else callback(new Error("Origin is not allowed"));
  },
  methods: ["GET", "POST"]
};

const app = express();
app.disable("x-powered-by");
app.use(cors(corsOptions));
app.use(express.json({ limit: "16kb" }));
app.get("/health", (_request, response) => response.json({
  status: "ok",
  service: "riftbound-server",
  version: GAME_PROTOCOL_VERSION,
  uptimeSeconds: Math.floor(process.uptime())
}));

const serverDirectory = import.meta.dirname ?? process.cwd();
const clientDist = resolve(serverDirectory, "../../../client/dist");
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((request, response, next) => {
    if (request.method === "GET" && !request.path.startsWith("/socket.io") && request.accepts("html")) {
      response.sendFile(join(clientDist, "index.html"));
      return;
    }
    next();
  });
}

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  if (error instanceof Error && error.message === "Origin is not allowed") {
    response.status(403).json({ error: "ORIGIN_NOT_ALLOWED" });
    return;
  }
  logger.error("http_request_failed");
  response.status(500).json({ error: "INTERNAL_ERROR" });
});

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: corsOptions,
  pingInterval: 25_000,
  pingTimeout: 20_000,
  maxHttpBufferSize: 32_000
});

function emitRoomState(room: Room): void {
  io.to(room.roomId).emit("ROOM_STATE", roomService.toRoomState(room));
}

function emitGameUpdate(room: Room, events: readonly GameEvent[]): void {
  if (!room.game) return;
  for (const player of room.players) {
    if (!player.socketId || !player.connected) continue;
    const view = createPlayerView(room.game, player.playerId);
    const opponent = room.players.find((candidate) => candidate.playerId !== player.playerId);
    view.opponentConnected = opponent?.connected ?? false;
    io.to(player.socketId).emit("GAME_UPDATE", {
      state: view,
      events: createPlayerEvents(events, player.playerId)
    });
  }
}

function cancelAiTurn(roomId: string): void {
  const timer = aiTimers.get(roomId);
  if (timer) clearTimeout(timer);
  aiTimers.delete(roomId);
  aiTurnActions.delete(roomId);
}

function scheduleAiTurn(room: Room): void {
  if (aiTimers.has(room.roomId) || !room.game || room.status !== "PLAYING") return;
  const aiPlayer = room.players.find((player) => player.isAi && player.playerId === room.game?.currentPlayerId);
  if (!aiPlayer) return;
  const timer = setTimeout(() => {
    aiTimers.delete(room.roomId);
    const currentRoom = roomService.getRoom(room.roomId);
    if (!currentRoom?.game || currentRoom.status !== "PLAYING") return cancelAiTurn(room.roomId);
    const currentAi = currentRoom.players.find((player) => player.isAi && player.playerId === currentRoom.game?.currentPlayerId);
    if (!currentAi) return;

    const previous = aiTurnActions.get(room.roomId);
    const counter = previous?.turn === currentRoom.game.turn ? previous : { turn: currentRoom.game.turn, count: 0, sequence: previous?.sequence ?? 0 };
    counter.count += 1;
    counter.sequence += 1;
    aiTurnActions.set(room.roomId, counter);
    const meta = { playerId: currentAi.playerId, actionId: `AI_ACTION_${currentRoom.game.gameId}_${counter.sequence}`, clientSequence: counter.sequence };
    const action = counter.count >= MAX_AI_ACTIONS_PER_TURN
      ? { ...meta, type: "END_TURN" as const }
      : gameAi.chooseAction({ view: createPlayerView(currentRoom.game, currentAi.playerId), actionId: meta.actionId, clientSequence: meta.clientSequence });
    if (!action) return;
    try {
      const result = roomService.applyAiAction(room.roomId, action);
      emitGameUpdate(result.room, result.result.events);
      if (result.room.status === "FINISHED") cancelAiTurn(result.room.roomId);
      else scheduleAiTurn(result.room);
    } catch (error) {
      logger.warn("ai_action_failed", { roomId: room.roomId, playerId: currentAi.playerId, errorCode: errorCodeOf(error) });
      cancelAiTurn(room.roomId);
    }
  }, randomInt(400, 1_001));
  timer.unref();
  aiTimers.set(room.roomId, timer);
}

function fail(socket: GameSocket, error: unknown, playerId?: string): ErrorCode {
  const code = errorCodeOf(error);
  logger.warn("invalid_action", { socketId: socket.id, playerId, errorCode: code });
  socket.emit("GAME_ERROR", { code });
  return code;
}

function invalidPayload(): RoomServiceError { return new RoomServiceError(ErrorCode.INVALID_PAYLOAD); }
function rateLimited(): RoomServiceError { return new RoomServiceError(ErrorCode.RATE_LIMITED); }

io.on("connection", (socket) => {
  logger.info("client_connected", { socketId: socket.id });
  socket.emit("SERVER_INFO", { version: GAME_PROTOCOL_VERSION });

  socket.on("CREATE_ROOM", (rawPayload, ack) => {
    try {
      if (!limiter.allow(`${socket.id}:create`, serverConfig.createRoomRateLimit)) throw rateLimited();
      const parsed = createRoomPayloadSchema.safeParse(rawPayload);
      if (!parsed.success) throw invalidPayload();
      const { room, session } = roomService.createRoom(socket.id, parsed.data.playerName, parsed.data.deck);
      socket.join(room.roomId);
      socket.join(session.playerId);
      const result: RoomActionResult = { ok: true, roomId: room.roomId, playerId: session.playerId, session };
      ack(result);
      emitRoomState(room);
    } catch (error) {
      ack({ ok: false, errorCode: fail(socket, error) });
    }
  });

  socket.on("CREATE_AI_GAME", (rawPayload, ack) => {
    try {
      if (!limiter.allow(`${socket.id}:create`, serverConfig.createRoomRateLimit)) throw rateLimited();
      const parsed = createRoomPayloadSchema.safeParse(rawPayload);
      if (!parsed.success) throw invalidPayload();
      const { room, session, initial } = roomService.createAiGame(socket.id, parsed.data.playerName, parsed.data.deck);
      socket.join(room.roomId);
      socket.join(session.playerId);
      ack({ ok: true, roomId: room.roomId, playerId: session.playerId, session });
      emitRoomState(room);
      emitGameUpdate(room, initial.events);
      scheduleAiTurn(room);
    } catch (error) {
      ack({ ok: false, errorCode: fail(socket, error) });
    }
  });

  socket.on("JOIN_ROOM", (rawPayload, ack) => {
    try {
      if (!limiter.allow(`${socket.id}:join`, serverConfig.joinRoomRateLimit)) throw rateLimited();
      const parsed = joinRoomPayloadSchema.safeParse(rawPayload);
      if (!parsed.success) throw invalidPayload();
      const { room, initial, session } = roomService.joinRoom(parsed.data.roomId, socket.id, parsed.data.playerName, parsed.data.deck);
      socket.join(room.roomId);
      socket.join(session.playerId);
      ack({ ok: true, roomId: room.roomId, playerId: session.playerId, session });
      emitRoomState(room);
      emitGameUpdate(room, initial.events);
    } catch (error) {
      ack({ ok: false, errorCode: fail(socket, error) });
    }
  });

  socket.on("RECONNECT_GAME", (rawPayload, ack) => {
    try {
      if (!limiter.allow(`${socket.id}:join`, serverConfig.joinRoomRateLimit)) throw rateLimited();
      const parsed = reconnectPayloadSchema.safeParse(rawPayload);
      if (!parsed.success) throw invalidPayload();
      const { room, session, previousSocketId } = roomService.reconnect(
        parsed.data.roomId,
        parsed.data.playerId,
        parsed.data.sessionToken,
        socket.id
      );
      socket.join(room.roomId);
      socket.join(session.playerId);
      if (previousSocketId && previousSocketId !== socket.id) io.sockets.sockets.get(previousSocketId)?.disconnect(true);
      ack({ ok: true, roomId: room.roomId, playerId: session.playerId, stateRevision: room.game?.revision });
      emitRoomState(room);
      emitGameUpdate(room, [{ type: "PLAYER_RECONNECTED", playerId: session.playerId }]);
      scheduleAiTurn(room);
      for (const opponent of room.players.filter((player) => player.playerId !== session.playerId && player.socketId)) {
        io.to(opponent.socketId!).emit("OPPONENT_CONNECTION", { connected: true });
      }
    } catch (error) {
      ack({ ok: false, errorCode: fail(socket, error) });
    }
  });

  socket.on("PLAYER_ACTION", (rawAction, ack) => {
    let actionId = "INVALID";
    try {
      if (!limiter.allow(`${socket.id}:action`, serverConfig.actionRateLimit)) throw rateLimited();
      const parsed = playerActionSchema.safeParse(rawAction);
      if (!parsed.success) throw invalidPayload();
      const action = parsed.data as PlayerAction;
      actionId = action.actionId;
      const { room, result, duplicate } = roomService.applyPlayerAction(socket.id, action);
      if (!duplicate) emitGameUpdate(room, result.events);
      if (!duplicate) scheduleAiTurn(room);
      ack({ ok: true, actionId, duplicate, stateRevision: result.state.revision });
    } catch (error) {
      ack({ ok: false, actionId, errorCode: fail(socket, error, roomService.roomForSocket(socket.id)?.players.find((p) => p.socketId === socket.id)?.playerId) });
    }
  });

  socket.on("disconnect", () => {
    logger.info("client_disconnected", { socketId: socket.id });
    limiter.clear(`${socket.id}:create`);
    limiter.clear(`${socket.id}:join`);
    limiter.clear(`${socket.id}:action`);
    const disconnected = roomService.disconnect(socket.id);
    if (!disconnected) return;
    emitRoomState(disconnected.room);
    emitGameUpdate(disconnected.room, [{
      type: "PLAYER_DISCONNECTED",
      playerId: disconnected.player.playerId,
      graceExpiresAt: disconnected.graceExpiresAt
    }]);
    for (const opponent of disconnected.room.players.filter((player) => player.connected && player.socketId)) {
      io.to(opponent.socketId!).emit("OPPONENT_CONNECTION", {
        connected: false,
        graceExpiresAt: disconnected.graceExpiresAt
      });
    }
  });
});

const maintenanceTimer = setInterval(() => {
  limiter.cleanup();
  for (const event of roomService.maintain()) {
    if (event.type === "GAME_FINISHED") {
      emitRoomState(event.room);
      emitGameUpdate(event.room, event.result.events);
    } else {
      cancelAiTurn(event.roomId);
      for (const socketId of event.socketIds) io.sockets.sockets.get(socketId)?.leave(event.roomId);
    }
  }
}, serverConfig.cleanupIntervalMs);
maintenanceTimer.unref();

httpServer.listen(serverConfig.port, serverConfig.host, () => {
  logger.info("server_start", { host: serverConfig.host, port: serverConfig.port, environment: serverConfig.environment, version: GAME_PROTOCOL_VERSION });
});

let shuttingDown = false;
function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("server_shutdown", { signal });
  clearInterval(maintenanceTimer);
  for (const roomId of [...aiTimers.keys()]) cancelAiTurn(roomId);
  roomService.close();
  io.close(() => {
    httpServer.close(() => process.exit(0));
    httpServer.closeIdleConnections();
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));
