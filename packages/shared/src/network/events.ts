export type GameEvent =
  | { type: "GAME_STARTED"; gameId: string; firstPlayerId: string }
  | { type: "BONUS_CARD_GRANTED"; playerId: string; cardInstanceId?: string; definitionId?: string }
  | { type: "MULLIGAN_CONFIRMED"; playerId: string; replacedCount: number }
  | { type: "MULLIGAN_COMPLETE" }
  | { type: "TURN_STARTED"; playerId: string; turn: number }
  | { type: "TURN_ENDED"; playerId: string; turn: number }
  | { type: "CARD_DRAWN"; playerId: string; cardInstanceId?: string; definitionId?: string }
  | { type: "CARD_PLAYED"; playerId: string; cardInstanceId: string; definitionId: string }
  | { type: "MANA_SPENT"; playerId: string; amount: number }
  | { type: "TEMP_MANA_GAINED"; playerId: string; amount: number }
  | { type: "MINION_SUMMONED"; playerId: string; instanceId: string; definitionId: string }
  | { type: "DAMAGE_DEALT"; sourceId: string; targetId: string; amount: number }
  | { type: "HEAL_APPLIED"; targetId: string; amount: number }
  | { type: "MINION_DIED"; playerId: string; instanceId: string }
  | { type: "PLAYER_SURRENDERED"; playerId: string }
  | { type: "PLAYER_DISCONNECTED"; playerId: string; graceExpiresAt: number }
  | { type: "PLAYER_RECONNECTED"; playerId: string }
  | { type: "GAME_OVER"; winnerId: string };
