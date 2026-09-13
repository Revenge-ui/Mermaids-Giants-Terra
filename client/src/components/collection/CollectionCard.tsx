import { translateZhCn } from "@riftbound/shared";
import type { CatalogCard } from "../../data/cardCatalog";
import { CardFace } from "../../ui/CardFace";

export function CollectionCard({ card, count, editing, allowed = true, onSelect, onDetails }: {
  card: CatalogCard; count: number; editing: boolean; allowed?: boolean; onSelect: () => void; onDetails: () => void;
}) {
  const owned = count > 0;
  return <article className={`codex-card rarity-${card.rarity.toLowerCase()} ${owned ? "owned" : "unowned"} ${editing ? "deck-pickable" : ""} ${!allowed ? "faction-mismatch" : ""}`}>
    <button className="collection-card-main" onClick={allowed ? onSelect : onDetails} aria-label={`${editing && allowed ? "加入卡组" : "查看卡牌"}：${translateZhCn(card.nameKey)}，拥有 ${count} 张`}><CardFace card={card} /></button>
    <div className="codex-card-actions"><span className="codex-count">{owned ? `×${count}` : "未拥有"}</span>{editing && <span className="deck-add-label">{allowed ? "＋ 加入" : "阵营不符"}</span>}<button className="codex-detail-button" aria-label={`查看${translateZhCn(card.nameKey)}详情`} onClick={onDetails}>详情</button></div>
  </article>;
}
