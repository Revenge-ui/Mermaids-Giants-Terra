import type { CardView, MinionView } from "../cards/types.js";
import type { DeckFaction, GameStatus } from "../enums/index.js";

export interface PublicPlayerState {
  playerId: string;
  name: string;
  faction: DeckFaction;
  health: number;
  mana: number;
  maxMana: number;
  temporaryMana: number;
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
  firstPlayerId: string;
  mulliganConfirmed: boolean;
  opponentMulliganConfirmed: boolean;
}

export interface RoomPlayer {
  playerId: string;
  name: string;
  faction: DeckFaction;
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
