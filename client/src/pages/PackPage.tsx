import { useEffect, useRef, useState } from "react";
import { translateZhCn } from "@riftbound/shared";
import { FeatureFrame } from "../components/menu/FeatureFrame";
import { RARITY_LABEL, type CatalogCard } from "../data/cardCatalog";
import { openLocalPack } from "../localProgress";

export function PackPage({ onBack, onCardsAdded }: { onBack: () => void; onCardsAdded: (cards: readonly CatalogCard[]) => void }) {
  const [opening, setOpening] = useState(false);
  const [cards, setCards] = useState<CatalogCard[]>([]);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const open = () => {
    if (opening) return;
    setOpening(true); setCards([]);
    timer.current = window.setTimeout(() => { const result = openLocalPack(); setCards(result); onCardsAdded(result); setOpening(false); }, 720);
  };
  return <FeatureFrame icon="▣" eyebrow="星辉秘藏" title="开启卡包" description="揭开五张卡牌。当前奖励保存在这台设备的浏览器中。" onBack={onBack}>
    <div className={`pack-vault ${opening ? "opening" : ""}`}><div className="pack-object"><i>✦</i><b>裂隙秘藏</b><span>五重星印</span></div><button className="feature-primary pack-open" onClick={open} disabled={opening}>{opening ? "星印正在解封…" : cards.length ? "再开一包" : "开启卡包"}</button></div>
    <div className="pack-results" aria-live="polite">{cards.map((card, index) => <article className={`reward-card rarity-${card.rarity.toLowerCase()}`} style={{ "--reveal-delay": `${index * 90}ms` } as React.CSSProperties} key={`${card.id}-${index}`}><span className="reward-cost">{card.cost}</span><i>{card.rune}</i><h3>{translateZhCn(card.nameKey)}</h3><p>{RARITY_LABEL[card.rarity]}</p>{card.attack !== undefined ? <div><b>⚔ {card.attack}</b><b>♥ {card.health}</b></div> : <small>法术</small>}</article>)}</div>
  </FeatureFrame>;
}
