import { translateZhCn, type CardView } from "@riftbound/shared";
import { CardArtwork, cardVisualFaction } from "../ui/CardFace";

export function CardDetail({ card }: { card: CardView | null }) {
  if (!card) return <aside className="card-detail empty"><span>将鼠标移到卡牌上</span><small>查看完整的咒文与属性</small></aside>;
  return (
    <aside className={`card-detail detail-${card.type.toLowerCase()}`} aria-live="polite">
      <div className="detail-art"><CardArtwork faction={cardVisualFaction(card)} variant={card.id} /></div>
      <div className="detail-copy"><span>{card.type === "MINION" ? "随从" : "法术"}</span><h3>{translateZhCn(card.nameKey)}</h3><p>{translateZhCn(card.descriptionKey)}</p></div>
      <b className="detail-cost">{card.cost}</b>
      {card.type === "MINION" && <div className="detail-stats"><b>⚔ {card.attack}</b><b>♥ {card.health}</b></div>}
    </aside>
  );
}
