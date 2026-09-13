export type ActionTarget =
  | { type: "HERO"; playerId: string }
  | { type: "MINION"; playerId: string; instanceId: string };

interface ActionMetadata {
  playerId: string;
  actionId: string;
  clientSequence: number;
}

export type PlayerAction =
  | ActionMetadata & {
      type: "PLAY_CARD";
      cardInstanceId: string;
      target?: ActionTarget;
    }
  | ActionMetadata & {
      type: "ATTACK";
      attackerId: string;
      target: ActionTarget;
    }
  | ActionMetadata & { type: "END_TURN" }
  | ActionMetadata & { type: "CONFIRM_MULLIGAN"; cardInstanceIds: string[] }
  | ActionMetadata & { type: "SURRENDER" };
