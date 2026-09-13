import type { CardView, PlayerViewState } from "@riftbound/shared";
import { Card } from "./Card";
import { CardDetail } from "./CardDetail";
import { isCardPlayable, type PendingAction } from "../uiModel";

export function Hand({ game, selectedId, inspectedCard, drawnCardId, pending, canAct = true, onInspect, onPlay }: {
  game: PlayerViewState;
  selectedId?: string;
  inspectedCard: CardView | null;
  drawnCardId?: string;
  pending: PendingAction;
  canAct?: boolean;
  onInspect: (card: CardView | null) => void;
  onPlay: (card: CardView) => void;
}) {
  const count = game.you.hand.length;
  const spread = Math.min(8, 54 / Math.max(1, count - 1));
  return (
    <section className="hand-dock" aria-label="你的手牌">
      <CardDetail card={inspectedCard} />
      <div className="deck-pile" aria-label={`牌库还有 ${game.you.deckCount} 张牌`}><i /><i /><b>{game.you.deckCount}</b></div>
      <div className="hand-zone">
        {game.you.hand.map((card, index) => {
          const centered = index - (count - 1) / 2;
          return (
            <div key={card.instanceId} className={`hand-card-slot ${selectedId === card.instanceId ? "is-selected" : ""}`} style={{ "--hand-index": index, "--hand-count": count, "--hand-center": centered } as React.CSSProperties} onFocus={() => onInspect(card)} onBlur={() => onInspect(null)} onMouseEnter={() => onInspect(card)} onMouseLeave={() => onInspect(selectedId === card.instanceId ? card : null)}>
              <Card card={card} index={index} selected={selectedId === card.instanceId} playable={canAct && isCardPlayable(game, card, pending)} drawn={drawnCardId === card.instanceId} fanAngle={centered * spread} fanOffset={centered * Math.min(22, 150 / Math.max(1, count))} onClick={() => onPlay(card)} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
