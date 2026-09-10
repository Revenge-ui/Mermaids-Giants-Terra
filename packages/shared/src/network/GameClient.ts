import { io, type Socket } from "socket.io-client";
import { ErrorCode, type ConnectionStatus } from "../enums/index.js";
import type { DeckSubmission } from "../decks.js";
import type { ActionTarget, PlayerAction } from "./actions.js";
import type { GameEvent } from "./events.js";
import type {
  ClientToServerEvents,
  PlayerActionResult,
  ReconnectResult,
  RoomActionResult,
  ServerToClientEvents
} from "./protocol.js";
import type { PlayerSession, PlayerViewState, RoomState } from "./views.js";

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
type Unsubscribe = () => void;
type ActionWithoutMetadata = PlayerAction extends infer Action
  ? Action extends PlayerAction ? Omit<Action, "playerId" | "actionId" | "clientSequence"> : never
  : never;

export interface SessionStore {
  load(): PlayerSession | undefined;
  save(session: PlayerSession): void;
  clear(): void;
}

export interface GameClientOptions {
  sessionStore?: SessionStore;
  reconnectionAttempts?: number;
}

export class MemorySessionStore implements SessionStore {
  private session?: PlayerSession;
  load(): PlayerSession | undefined { return this.session ? { ...this.session } : undefined; }
  save(session: PlayerSession): void { this.session = { ...session }; }
  clear(): void { this.session = undefined; }
}

export class GameClient {
  private readonly socket: GameSocket;
  private readonly sessionStore: SessionStore;
  private playerId?: string;
  private session?: PlayerSession;
  private clientSequence = 0;
  private actionCounter = 0;
  private connectionStatus: ConnectionStatus = "DISCONNECTED";
  private readonly connectionListeners = new Set<(status: ConnectionStatus) => void>();

  constructor(serverUrl: string, options: GameClientOptions = {}) {
    this.sessionStore = options.sessionStore ?? new MemorySessionStore();
    this.session = this.sessionStore.load();
    this.playerId = this.session?.playerId;
    this.socket = io(serverUrl, {
      autoConnect: false,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5_000,
      reconnectionAttempts: options.reconnectionAttempts ?? 20,
      timeout: 10_000
    });
    this.bindConnectionLifecycle();
  }

  connect(): void {
    if (this.socket.connected) return;
    this.setConnectionStatus(this.session ? "RECONNECTING" : "CONNECTING");
    this.socket.connect();
  }

  disconnect(): void {
    this.socket.disconnect();
    this.setConnectionStatus("DISCONNECTED");
  }

  isConnected(): boolean { return this.socket.connected; }
  getConnectionStatus(): ConnectionStatus { return this.connectionStatus; }
  getPlayerId(): string | undefined { return this.playerId; }
  getSession(): PlayerSession | undefined { return this.session ? { ...this.session } : undefined; }
  clearSession(): void {
    this.sessionStore.clear();
    this.session = undefined;
    this.playerId = undefined;
    this.clientSequence = 0;
  }

  async createRoom(playerName: string, deck: DeckSubmission): Promise<RoomActionResult> {
    const result = await new Promise<RoomActionResult>((resolve) => {
      this.socket.emit("CREATE_ROOM", { playerName, deck }, resolve);
    });
    this.acceptSession(result);
    return result;
  }

  async createAiGame(playerName: string, deck: DeckSubmission): Promise<RoomActionResult> {
    const result = await new Promise<RoomActionResult>((resolve) => {
      this.socket.emit("CREATE_AI_GAME", { playerName, deck }, resolve);
    });
    this.acceptSession(result);
    return result;
  }

  async joinRoom(roomId: string, playerName: string, deck: DeckSubmission): Promise<RoomActionResult> {
    const result = await new Promise<RoomActionResult>((resolve) => {
      this.socket.emit("JOIN_ROOM", { roomId, playerName, deck }, resolve);
    });
    this.acceptSession(result);
    return result;
  }

  async reconnectGame(): Promise<ReconnectResult> {
    if (!this.session) return { ok: false };
    return new Promise<ReconnectResult>((resolve) => {
      this.socket.emit("RECONNECT_GAME", this.session!, (result) => {
        if (!result.ok && result.errorCode && [ErrorCode.INVALID_SESSION, ErrorCode.RECONNECT_EXPIRED, ErrorCode.ROOM_NOT_FOUND].includes(result.errorCode)) {
          this.sessionStore.clear();
          this.session = undefined;
          this.playerId = undefined;
        }
        resolve(result);
      });
    });
  }

  playCard(cardInstanceId: string, target?: ActionTarget): Promise<PlayerActionResult> {
    return this.sendAction(this.action({ type: "PLAY_CARD", cardInstanceId, target }));
  }

  attack(attackerId: string, target: ActionTarget): Promise<PlayerActionResult> {
    return this.sendAction(this.action({ type: "ATTACK", attackerId, target }));
  }

  endTurn(): Promise<PlayerActionResult> { return this.sendAction(this.action({ type: "END_TURN" })); }
  surrender(): Promise<PlayerActionResult> { return this.sendAction(this.action({ type: "SURRENDER" })); }

  sendAction(action: PlayerAction): Promise<PlayerActionResult> {
    if (!this.playerId) return Promise.resolve({ ok: false, actionId: action.actionId });
    return new Promise<PlayerActionResult>((resolve) => this.socket.emit("PLAYER_ACTION", action, resolve));
  }

  onConnectionChange(handler: (status: ConnectionStatus) => void): Unsubscribe {
    this.connectionListeners.add(handler);
    handler(this.connectionStatus);
    return () => this.connectionListeners.delete(handler);
  }

  onRoomState(handler: (state: RoomState) => void): Unsubscribe {
    this.socket.on("ROOM_STATE", handler);
    return () => this.socket.off("ROOM_STATE", handler);
  }

  onGameUpdate(handler: (state: PlayerViewState, events: GameEvent[]) => void): Unsubscribe {
    const listener = (payload: { state: PlayerViewState; events: GameEvent[] }) => handler(payload.state, payload.events);
    this.socket.on("GAME_UPDATE", listener);
    return () => this.socket.off("GAME_UPDATE", listener);
  }

  onOpponentConnection(handler: (connected: boolean, graceExpiresAt?: number) => void): Unsubscribe {
    const listener = (payload: { connected: boolean; graceExpiresAt?: number }) => handler(payload.connected, payload.graceExpiresAt);
    this.socket.on("OPPONENT_CONNECTION", listener);
    return () => this.socket.off("OPPONENT_CONNECTION", listener);
  }

  onServerInfo(handler: (version: string) => void): Unsubscribe {
    const listener = (payload: { version: string }) => handler(payload.version);
    this.socket.on("SERVER_INFO", listener);
    return () => this.socket.off("SERVER_INFO", listener);
  }

  onError(handler: (code: ErrorCode) => void): Unsubscribe {
    const listener = (payload: { code: ErrorCode }) => handler(payload.code);
    this.socket.on("GAME_ERROR", listener);
    return () => this.socket.off("GAME_ERROR", listener);
  }

  private action(action: ActionWithoutMetadata): PlayerAction {
    if (!this.playerId) throw new Error("Player session is not established");
    this.clientSequence += 1;
    this.actionCounter += 1;
    return {
      ...action,
      playerId: this.playerId,
      actionId: `ACTION_${Date.now()}_${this.actionCounter}`,
      clientSequence: this.clientSequence
    } as PlayerAction;
  }

  private acceptSession(result: RoomActionResult): void {
    if (!result.ok || !result.session) return;
    this.session = { ...result.session };
    this.playerId = result.session.playerId;
    this.sessionStore.save(result.session);
  }

  private bindConnectionLifecycle(): void {
    this.socket.on("connect", () => {
      if (!this.session) return this.setConnectionStatus("CONNECTED");
      this.setConnectionStatus("RECONNECTING");
      void this.reconnectGame().then((result) => this.setConnectionStatus(result.ok || !this.session ? "CONNECTED" : "FAILED"));
    });
    this.socket.on("disconnect", (reason) => {
      this.setConnectionStatus(reason !== "io client disconnect" && this.socket.active ? "RECONNECTING" : "DISCONNECTED");
    });
    this.socket.io.on("reconnect_attempt", () => this.setConnectionStatus("RECONNECTING"));
    this.socket.io.on("reconnect_failed", () => this.setConnectionStatus("FAILED"));
    this.socket.on("connect_error", () => this.setConnectionStatus(this.socket.active ? "RECONNECTING" : "FAILED"));
  }

  private setConnectionStatus(status: ConnectionStatus): void {
    if (status === this.connectionStatus) return;
    this.connectionStatus = status;
    this.connectionListeners.forEach((listener) => listener(status));
  }
}
