import {
  GameClient,
  type ActionTarget,
  type ConnectionStatus,
  type DeckSubmission,
  type ErrorCode,
  type GameEvent,
  type PlayerViewState,
  type RoomActionResult,
  type RoomState,
  type SessionStore
} from "@riftbound/shared";

/**
 * Cocos-facing facade with no dependency on cc, DOM, WeChat, Steam, or Epic APIs.
 * A future Cocos Component can own this facade and translate callbacks into scene events.
 */
export class CocosGameClient {
  private readonly client: GameClient;

  constructor(serverUrl: string, sessionStore?: SessionStore) {
    this.client = new GameClient(serverUrl, { sessionStore });
  }

  connect(): void { this.client.connect(); }
  disconnect(): void { this.client.disconnect(); }
  clearSession(): void { this.client.clearSession(); }
  createRoom(playerName: string, deck: DeckSubmission): Promise<RoomActionResult> { return this.client.createRoom(playerName, deck); }
  joinRoom(roomId: string, playerName: string, deck: DeckSubmission): Promise<RoomActionResult> { return this.client.joinRoom(roomId, playerName, deck); }
  playCard(cardInstanceId: string, target?: ActionTarget): void { void this.client.playCard(cardInstanceId, target); }
  attack(attackerId: string, target: ActionTarget): void { void this.client.attack(attackerId, target); }
  endTurn(): void { void this.client.endTurn(); }
  surrender(): void { void this.client.surrender(); }
  onConnectionChange(handler: (status: ConnectionStatus) => void): () => void { return this.client.onConnectionChange(handler); }
  onOpponentConnection(handler: (connected: boolean, graceExpiresAt?: number) => void): () => void { return this.client.onOpponentConnection(handler); }
  onRoomState(handler: (state: RoomState) => void): () => void { return this.client.onRoomState(handler); }
  onGameUpdate(handler: (state: PlayerViewState, events: GameEvent[]) => void): () => void { return this.client.onGameUpdate(handler); }
  onError(handler: (code: ErrorCode) => void): () => void { return this.client.onError(handler); }
}
