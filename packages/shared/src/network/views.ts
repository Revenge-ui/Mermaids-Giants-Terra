import type { CardView, MinionView } from "../cards/types.js";
import type { GameStatus } from "../enums/index.js";

export interface PublicPlayerState {
  playerId: string;
  name: string;
  health: number;
  mana: number;
  maxMana: number;
  deckCount: number;
  handCount: number;
  board: MinionView[];
}

export interface PlayerViewState {
  gameId: string;
  roomId: string;
  you: PublicPlayerState & { hand: CardView[] };
  opponent: PublicPlayerState;
  currentPlayerId: string;
  turn: number;
  status: GameStatus;
  winnerId?: string;
  stateRevision: number;
  opponentConnected: boolean;
}

export interface RoomPlayer {
  playerId: string;
  name: string;
  connected: boolean;
  ready?: boolean;
}

export interface RoomState {
  roomId: string;
  players: RoomPlayer[];
  status: GameStatus;
}

export interface PlayerSession {
  roomId: string;
  playerId: string;
  sessionToken: string;
}
