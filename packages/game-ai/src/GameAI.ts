import type { ActionTarget, CardView, MinionView, PlayerAction, PlayerViewState } from "@riftbound/shared";

export interface GameAIContext {
  view: PlayerViewState;
  actionId: string;
  clientSequence: number;
}

export interface GameAI {
  chooseAction(context: GameAIContext): PlayerAction | null;
  chooseMulligan(view: PlayerViewState): string[];
}

function metadata(context: GameAIContext) {
  return { playerId: context.view.you.playerId, actionId: context.actionId, clientSequence: context.clientSequence };
}

function heroTarget(view: PlayerViewState): ActionTarget {
  return { type: "HERO", playerId: view.opponent.playerId };
}

function minionTarget(view: PlayerViewState, minion: MinionView): ActionTarget {
  return { type: "MINION", playerId: view.opponent.playerId, instanceId: minion.instanceId };
}

function threat(minion: MinionView): number { return minion.attack * 2 + minion.health; }

function cardValue(card: CardView): number {
  if (card.type === "MINION") return card.attack + card.health - card.cost * 0.2;
  const effect = card.effect;
  if (effect.type === "DEAL_DAMAGE") return effect.amount * 2 - card.cost * 0.15;
  if (effect.type === "DRAW_CARD") return effect.amount * 2.5 - card.cost * 0.15;
  if (effect.type === "HEAL") return effect.amount * 1.15 - card.cost * 0.15;
  if (effect.type === "BUFF") return effect.attack + effect.health - card.cost * 0.15;
  return -card.cost * 0.15;
}

function playableTarget(view: PlayerViewState, card: CardView): ActionTarget | undefined | null {
  if (card.type === "MINION") return view.you.board.length < 7 ? undefined : null;
  const effect = card.effect;
  if (effect.type === "HEAL") return view.you.health < 30 ? undefined : null;
  if (effect.type === "DRAW_CARD") return undefined;
  if (effect.type === "BUFF") {
    const target = [...view.you.board].sort((a, b) => threat(b) - threat(a))[0];
    return target ? { type: "MINION", playerId: view.you.playerId, instanceId: target.instanceId } : null;
  }
  if (effect.type === "PROTOTYPE") return undefined;
  const killable = [...view.opponent.board].filter((minion) => minion.health <= effect.amount).sort((a, b) => threat(b) - threat(a))[0];
  return killable ? minionTarget(view, killable) : heroTarget(view);
}

export class RuleBasedGameAI implements GameAI {
  chooseMulligan(view: PlayerViewState): string[] {
    if (view.status !== "MULLIGAN" || view.mulliganConfirmed) return [];
    return view.you.hand.filter((card) => card.definitionId !== "SPECIAL_BITCOIN_COIN" && card.cost >= 5).map((card) => card.instanceId);
  }

  chooseAction(context: GameAIContext): PlayerAction | null {
    const view = context.view;
    if (view.status !== "PLAYING" || view.currentPlayerId !== view.you.playerId) return null;
    const meta = metadata(context);
    const playable = view.you.hand.filter((card) => card.cost <= view.you.mana);

    const lethalSpell = playable.find((card) => card.type === "SPELL" && card.effect.type === "DEAL_DAMAGE" && card.effect.amount >= view.opponent.health);
    if (lethalSpell) return { ...meta, type: "PLAY_CARD", cardInstanceId: lethalSpell.instanceId, target: heroTarget(view) };

    const ready = view.you.board.filter((minion) => minion.canAttack);
    const totalReadyAttack = ready.reduce((total, minion) => total + minion.attack, 0);
    if (totalReadyAttack >= view.opponent.health && ready.length > 0) {
      const attacker = [...ready].sort((a, b) => b.attack - a.attack)[0]!;
      return { ...meta, type: "ATTACK", attackerId: attacker.instanceId, target: heroTarget(view) };
    }

    const threats = [...view.opponent.board].sort((a, b) => threat(b) - threat(a));
    for (const target of threats) {
      const attacker = [...ready]
        .filter((minion) => minion.attack >= target.health)
        .sort((a, b) => (b.health - target.attack) - (a.health - target.attack))[0];
      if (attacker && (attacker.health > target.attack || threat(target) >= threat(attacker))) {
        return { ...meta, type: "ATTACK", attackerId: attacker.instanceId, target: minionTarget(view, target) };
      }
    }

    const rankedCards = [...playable].sort((a, b) => cardValue(b) - cardValue(a));
    for (const card of rankedCards) {
      const target = playableTarget(view, card);
      if (target === null) continue;
      return { ...meta, type: "PLAY_CARD", cardInstanceId: card.instanceId, ...(target ? { target } : {}) };
    }

    if (ready.length > 0) {
      const attacker = [...ready].sort((a, b) => b.attack - a.attack)[0]!;
      return { ...meta, type: "ATTACK", attackerId: attacker.instanceId, target: heroTarget(view) };
    }
    return { ...meta, type: "END_TURN" };
  }
}
