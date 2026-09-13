import { translateZhCn } from "@riftbound/shared";
import { FACTION_LABEL, KEYWORD_LABEL, RARITY_LABEL, type CatalogCard } from "../../data/cardCatalog";
import { CardFace } from "../../ui/CardFace";
import { GameModal } from "../../ui/GameUI";

export function CardDetailModal({ card, count, onClose }: { card: CatalogCard | null; count: number; onClose: () => void }) {
  if (!card) return null;
  return <GameModal title={translateZhCn(card.nameKey)} onClose={onClose} className="card-inspection">
    <div className="card-inspection-layout"><div className="inspection-preview"><CardFace card={card} /></div><div className="modal-card-copy">
      <p>{FACTION_LABEL[card.faction]} · {card.type === "MINION" ? "随从" : "法术"} · {RARITY_LABEL[card.rarity]}</p>
      <blockquote>{translateZhCn(card.descriptionKey)}</blockquote>
      <dl><div><dt>拥有数量</dt><dd>{count}</dd></div><div><dt>费用</dt><dd>{card.cost}</dd></div>{card.type === "MINION" && <><div><dt>攻击</dt><dd>{card.attack}</dd></div><div><dt>生命</dt><dd>{card.health}</dd></div></>}<div><dt>关键词</dt><dd>{card.keywords.map((keyword) => KEYWORD_LABEL[keyword]).join("、") || "无"}</dd></div></dl>
      <p className="prototype-note">测试卡池：部分策划效果尚待实现，以对战实际规则为准。</p>
      <div className="craft-actions"><button disabled title="制作系统尚未开放">制作 · 未开放</button><button disabled title="分解系统尚未开放">分解 · 未开放</button></div>
    </div></div>
  </GameModal>;
}
