import type { GameEvent, GameStatus } from "@riftbound/shared";

export interface CardInstance {
  instanceId: string;
  definitionId: string;
}

export interface MinionInstance {
  instanceId: string;
  definitionId: string;
  attack: number;
  health: number;
  maxHealth: number;
  canAttack: boolean;
}

export interface PlayerState {
  playerId: string;
  name: string;
  health: number;
  mana: number;
  maxMana: number;
  deck: CardInstance[];
  hand: CardInstance[];
  board: MinionInstance[];
}

export interface GameState {
  gameId: string;
  roomId: string;
  turn: number;
  currentPlayerId: string;
  status: GameStatus;
  players: [PlayerState, PlayerState];
  randomSeed: number;
  revision: number;
  winnerId?: string;
}

export interface GameResult {
  state: GameState;
  events: GameEvent[];
}

export interface GamePlayer {
  playerId: string;
  name: string;
  deckDefinitionIds?: readonly string[];
}
