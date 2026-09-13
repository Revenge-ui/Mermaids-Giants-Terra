import type { ActionTarget, CardView, GameEvent, MinionView, PlayerViewState } from "@riftbound/shared";
import { CARD_CATALOG } from "./data/cardCatalog";
import type { DisplayCard } from "./ui/CardFace";

export type TargetMode = "ENEMY" | "FRIENDLY_MINION" | null;
export type PendingAction = "PLAY_CARD" | "ATTACK" | "END_TURN" | "SURRENDER" | "MULLIGAN" | null;

export interface SelectionState {
  gameId?: string;
  cardInstanceId?: string;
  attackerId?: string;
}

export interface FloatingNumberCue {
  id: string;
  targetId: string;
  amount: number;
  kind: "damage" | "heal";
}

export interface DyingMinionCue {
  owner: "YOU" | "OPPONENT";
  minion: MinionView;
}

export interface PresentationState {
  nonce: number;
  floatingNumbers: FloatingNumberCue[];
  summonedIds: string[];
  dyingMinions: DyingMinionCue[];
  impactedIds: string[];
  attackingId?: string;
  attackTargetId?: string;
  drawnCardId?: string;
  playedCard?: DisplayCard;
  turnBanner?: "YOUR_TURN" | "OPPONENT_TURN";
}

export const emptySelection = (gameId?: string): SelectionState => ({ gameId });

export function selectionAfterStateSync(gameId: string): SelectionState {
  return emptySelection(gameId);
}

export function resetSelectionForGame(selection: SelectionState, gameId: string): SelectionState {
  return selection.gameId === gameId ? selection : emptySelection(gameId);
}

export function isYourTurn(game: PlayerViewState): boolean {
  return game.status === "PLAYING" && game.currentPlayerId === game.you.playerId;
}

/** UI gating only; the server still validates every action independently. */
export function canInteractWithBattle(game: PlayerViewState, connected: boolean, pending: PendingAction, overlayVisible: boolean): boolean {
  return connected && pending === null && !overlayVisible && isYourTurn(game);
}

export function targetModeForCard(card: CardView | undefined): TargetMode {
  if (!card || card.type !== "SPELL") return null;
  if (card.effect.type === "DEAL_DAMAGE") return "ENEMY";
  if (card.effect.type === "BUFF") return "FRIENDLY_MINION";
  return null;
}

export function isCardPlayable(game: PlayerViewState, card: CardView, pending: PendingAction): boolean {
  return pending === null && isYourTurn(game) && card.cost <= game.you.mana && (card.type !== "MINION" || game.you.board.length < 7);
}

export function isLegalTarget(mode: TargetMode, game: PlayerViewState, target: ActionTarget): boolean {
  if (game.status !== "PLAYING" || game.currentPlayerId !== game.you.playerId) return false;
  if (mode === "ENEMY") {
    if (target.playerId !== game.opponent.playerId) return false;
    return target.type === "HERO" || game.opponent.board.some((minion) => minion.instanceId === target.instanceId);
  }
  if (mode === "FRIENDLY_MINION") {
    return target.type === "MINION" && target.playerId === game.you.playerId && game.you.board.some((minion) => minion.instanceId === target.instanceId);
  }
  return false;
}

function allMinions(game: PlayerViewState | null): Array<DyingMinionCue> {
  if (!game) return [];
  return [
    ...game.you.board.map((minion) => ({ owner: "YOU" as const, minion })),
    ...game.opponent.board.map((minion) => ({ owner: "OPPONENT" as const, minion }))
  ];
}

export function presentationFromEvents(
  events: readonly GameEvent[],
  viewerId: string,
  previousGame: PlayerViewState | null,
  nonce: number
): PresentationState {
  const oldMinions = allMinions(previousGame);
  const oldHand = previousGame?.you.hand ?? [];
  const damage = events.filter((event): event is Extract<GameEvent, { type: "DAMAGE_DEALT" }> => event.type === "DAMAGE_DEALT");
  const heal = events.filter((event): event is Extract<GameEvent, { type: "HEAL_APPLIED" }> => event.type === "HEAL_APPLIED");
  const deathIds = new Set(events.filter((event): event is Extract<GameEvent, { type: "MINION_DIED" }> => event.type === "MINION_DIED").map((event) => event.instanceId));
  const played = events.find((event): event is Extract<GameEvent, { type: "CARD_PLAYED" }> => event.type === "CARD_PLAYED");
  const draw = events.find((event): event is Extract<GameEvent, { type: "CARD_DRAWN" }> => event.type === "CARD_DRAWN" && event.playerId === viewerId);
  const turn = [...events].reverse().find((event): event is Extract<GameEvent, { type: "TURN_STARTED" }> => event.type === "TURN_STARTED");

  return {
    nonce,
    floatingNumbers: [
      ...damage.map((event, index) => ({ id: `${nonce}-d-${index}`, targetId: event.targetId, amount: event.amount, kind: "damage" as const })),
      ...heal.map((event, index) => ({ id: `${nonce}-h-${index}`, targetId: event.targetId, amount: event.amount, kind: "heal" as const }))
    ],
    summonedIds: events.filter((event): event is Extract<GameEvent, { type: "MINION_SUMMONED" }> => event.type === "MINION_SUMMONED").map((event) => event.instanceId),
    dyingMinions: oldMinions.filter(({ minion }) => deathIds.has(minion.instanceId)),
    impactedIds: [...new Set(damage.map((event) => event.targetId))],
    attackingId: damage.find((event) => oldMinions.some(({ minion }) => minion.instanceId === event.sourceId))?.sourceId,
    attackTargetId: damage.find((event) => oldMinions.some(({ minion }) => minion.instanceId === event.sourceId))?.targetId,
    drawnCardId: draw?.cardInstanceId,
    // CARD_PLAYED is public; never inspect an opponent's hidden hand to show a spell.
    playedCard: played ? oldHand.find((card) => card.instanceId === played.cardInstanceId) ?? CARD_CATALOG.find((card) => card.id === played.definitionId) : undefined,
    turnBanner: turn ? (turn.playerId === viewerId ? "YOUR_TURN" : "OPPONENT_TURN") : undefined
  };
}

export function opponentViewContainsSecretHand(game: PlayerViewState): boolean {
  return Object.prototype.hasOwnProperty.call(game.opponent, "hand");
}
