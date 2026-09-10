import { translateZhCn } from "@riftbound/shared";
import { KEYWORD_LABEL, RARITY_LABEL, type CatalogCard } from "../../data/cardCatalog";

export function CollectionCard({ card, count, editing, onSelect, onDetails }: {
  card: CatalogCard; count: number; editing: boolean; onSelect: () => void; onDetails: () => void;
}) {
  const owned = count > 0;
  return <article className={`codex-card rarity-${card.rarity.toLowerCase()} ${owned ? "owned" : "unowned"} ${editing ? "deck-pickable" : ""}`} onClick={onSelect}>
    <b className="codex-cost">{card.cost}</b><span className="codex-count">{owned ? `×${count}` : "未拥有"}</span>
    <div className="codex-art"><i>{card.rune}</i><em>{RARITY_LABEL[card.rarity]}</em></div>
    <h3>{translateZhCn(card.nameKey)}</h3><small>{card.type === "MINION" ? "随从" : "法术"}</small>
    <p>{translateZhCn(card.descriptionKey)}</p>
    {card.type === "MINION" ? <div className="codex-stats"><b>⚔ {card.attack}</b><b>♥ {card.health}</b></div> : <div className="codex-keywords">{card.keywords.map((keyword) => KEYWORD_LABEL[keyword]).join(" · ") || "奥术"}</div>}
    <button className="codex-detail-button" onClick={(event) => { event.stopPropagation(); onDetails(); }}>查看</button>
    {editing && <span className="add-to-deck">＋ 加入卡组</span>}
  </article>;
}
