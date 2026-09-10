import { translateZhCn } from "@riftbound/shared";
import { KEYWORD_LABEL, RARITY_LABEL, type CatalogCard } from "../../data/cardCatalog";

export function CardDetailModal({ card, count, onClose }: { card: CatalogCard | null; count: number; onClose: () => void }) {
  if (!card) return null;
  return <div className="codex-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className={`codex-modal rarity-${card.rarity.toLowerCase()}`} role="dialog" aria-modal="true" aria-labelledby="card-detail-title">
      <button className="modal-close" onClick={onClose} aria-label="关闭卡牌详情">×</button>
      <div className="modal-card-art"><i>{card.rune}</i><span>{RARITY_LABEL[card.rarity]}</span></div>
      <div className="modal-card-copy"><p>{card.type === "MINION" ? "随从卡" : "法术卡"} · {card.id}</p><h2 id="card-detail-title">{translateZhCn(card.nameKey)}</h2><div className="modal-cost">费用 <b>{card.cost}</b></div><blockquote>{translateZhCn(card.descriptionKey)}</blockquote>
        <dl><div><dt>拥有数量</dt><dd>{count}</dd></div><div><dt>稀有度</dt><dd>{RARITY_LABEL[card.rarity]}</dd></div>{card.type === "MINION" && <><div><dt>攻击</dt><dd>{card.attack}</dd></div><div><dt>生命</dt><dd>{card.health}</dd></div></>}<div><dt>关键词</dt><dd>{card.keywords.map((keyword) => KEYWORD_LABEL[keyword]).join("、") || "无"}</dd></div></dl>
        <div className="craft-actions"><button disabled>制作（预留）</button><button disabled>分解（预留）</button></div>
      </div>
    </section>
  </div>;
}
