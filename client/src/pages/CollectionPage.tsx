import { translateZhCn } from "@riftbound/shared";
import { FeatureFrame } from "../components/menu/FeatureFrame";
import { CARD_CATALOG, RARITY_LABEL } from "../data/cardCatalog";
import type { CollectionCounts } from "../localProgress";

export function CollectionPage({ collection, onBack }: { collection: CollectionCounts; onBack: () => void }) {
  const owned = CARD_CATALOG.filter((card) => (collection[card.id] ?? 0) > 0);
  return <FeatureFrame icon="❖" eyebrow="旅者档案" title="我的收藏" description={`已拥有 ${owned.length} 种卡牌；开包获得的结果会自动加入这里。`} onBack={onBack}>
    <div className="collection-grid">{owned.map((card) => <article className={`collection-card rarity-${card.rarity.toLowerCase()}`} key={card.id}><span className="collection-count">×{collection[card.id]}</span><b className="collection-cost">{card.cost}</b><i>{card.rune}</i><h2>{translateZhCn(card.nameKey)}</h2><p>{RARITY_LABEL[card.rarity]}</p><div>{card.attack !== undefined ? <><b>⚔ {card.attack}</b><b>♥ {card.health}</b></> : <span>奥术法术</span>}</div></article>)}</div>
  </FeatureFrame>;
}
