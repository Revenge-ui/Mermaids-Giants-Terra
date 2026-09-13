import { translateZhCn } from "@riftbound/shared";
import { type CatalogCard } from "../../data/cardCatalog";
import { CardFace } from "../../ui/CardFace";

export function PackRevealCard({ card, revealed, index, onReveal }: { card: CatalogCard; revealed: boolean; index: number; onReveal: () => void }) {
  return <button className={`pack-reveal-card rarity-${card.rarity.toLowerCase()} ${revealed ? "revealed" : ""}`} style={{ "--reveal-delay": `${index * 80}ms` } as React.CSSProperties} onClick={onReveal} aria-label={revealed ? translateZhCn(card.nameKey) : "翻开卡牌"}>
    <span className="reveal-card-inner">
      <span className="reveal-card-back" aria-hidden={revealed}><i>✦</i><small>点击翻开</small></span>
      <span className="reveal-card-front" aria-hidden={!revealed}><CardFace card={card} /></span>
    </span>
  </button>;
}
