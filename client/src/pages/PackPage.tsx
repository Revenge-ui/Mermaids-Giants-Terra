import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { FeatureFrame } from "../components/menu/FeatureFrame";
import { PackAltar } from "../components/packs/PackAltar";
import { PackDraggable } from "../components/packs/PackDraggable";
import { PackRevealCard } from "../components/packs/PackRevealCard";
import { getPackDefinition, LRT_GIFT_PACK_ID } from "../data/packDefinitions";
import type { CatalogCard, CardRarity } from "../data/cardCatalog";
import { PACK_BATCH_OPTIONS, PackOpeningService, type PackBatchSize } from "../packOpeningService";
import type { PackInventory } from "../packStorage";
import { translateZhCn } from "@riftbound/shared";
import { GameToast } from "../ui/GameUI";
import { CardArtwork } from "../ui/CardFace";
import { summarizePackResults, type PackResultGroup } from "../ui/packSummary";
import { UIAudioManager } from "../audioManager";

type Phase = "IDLE" | "OPENING" | "REVEAL" | "SUMMARY";
const rarityOrder: CardRarity[] = ["LEGENDARY", "EPIC", "RARE", "COMMON"];
const rarityNames: Record<CardRarity, string> = { COMMON: "普通", RARE: "稀有", EPIC: "史诗", LEGENDARY: "传说" };

export function PackPage({ inventory, collection, onCommitOpening, onGift, onBack }: {
  collection: Readonly<Record<string, number>>;
  inventory: PackInventory;
  onCommitOpening: (packId: string, amount: number, cards: readonly CatalogCard[]) => boolean;
  onGift: () => void;
  onBack: () => void;
}) {
  const definition = getPackDefinition(LRT_GIFT_PACK_ID)!;
  const remaining = inventory[LRT_GIFT_PACK_ID] ?? 0;
  const [batchSize, setBatchSize] = useState<PackBatchSize>(1);
  const [phase, setPhase] = useState<Phase>("IDLE");
  const [cards, setCards] = useState<CatalogCard[]>([]);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [groups, setGroups] = useState<PackResultGroup[]>([]);
  const [notice, setNotice] = useState("");
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);
  const [overAltar, setOverAltar] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const origin = useRef({ x: 0, y: 0 });
  const altarRef = useRef<HTMLDivElement>(null);
  const openingRef = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const rarityCounts = useMemo(() => Object.fromEntries(rarityOrder.map((rarity) => [rarity, cards.filter((card) => card.rarity === rarity).length])) as Record<CardRarity, number>, [cards]);
  const highlightedGroups = showAll ? groups : groups.filter((group) => group.isNew || group.card.rarity === "EPIC" || group.card.rarity === "LEGENDARY");

  const beginOpening = () => {
    if (phase !== "IDLE" || openingRef.current || remaining < batchSize) return;
    openingRef.current = true;
    let result: CatalogCard[];
    try {
      result = new PackOpeningService().openPacks(LRT_GIFT_PACK_ID, batchSize);
      if (!onCommitOpening(LRT_GIFT_PACK_ID, batchSize, result)) { openingRef.current = false; setNotice("卡包数量已变化，请重新选择数量。"); return; }
    } catch { openingRef.current = false; setNotice("开包未能保存，请检查浏览器是否允许本地存储。"); return; }
    setGroups(summarizePackResults(result, collection)); UIAudioManager.play("openPack");
    setPhase("OPENING"); setCards(result); setRevealed(result.map(() => false)); setShowAll(false);
    setDragging(false); setOverAltar(false); setOffset({ x: 0, y: 0 });
    const duration = batchSize === 1 ? 1300 : batchSize === 5 ? 2300 : 3200;
    timer.current = window.setTimeout(() => setPhase(batchSize === 1 ? "REVEAL" : "SUMMARY"), duration);
  };
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || draggingRef.current || phase !== "IDLE") return;
    event.currentTarget.setPointerCapture(event.pointerId); origin.current = { x: event.clientX, y: event.clientY }; draggingRef.current = true; setDragging(true);
  };
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    setOffset({ x: event.clientX - origin.current.x, y: event.clientY - origin.current.y });
    const bounds = altarRef.current?.getBoundingClientRect();
    setOverAltar(Boolean(bounds && event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom));
  };
  const pointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* capture may already be released */ }
    const bounds = altarRef.current?.getBoundingClientRect();
    const shouldOpen = Boolean(bounds && event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom);
    setDragging(false); setOverAltar(false); setOffset({ x: 0, y: 0 });
    if (shouldOpen) beginOpening();
  };
  const cancelDrag = () => { draggingRef.current = false; setDragging(false); setOverAltar(false); setOffset({ x: 0, y: 0 }); };
  const reveal = (index: number) => { if (revealed[index]) return; UIAudioManager.play(cards[index]?.rarity === "LEGENDARY" ? "legendaryReveal" : "cardReveal"); setRevealed((current) => current.map((value, cardIndex) => cardIndex === index ? true : value)); };
  const allRevealed = revealed.length > 0 && revealed.every(Boolean);
  const reset = () => { openingRef.current = false; setPhase("IDLE"); setCards([]); setRevealed([]); setShowAll(false); };

  return <FeatureFrame icon="▣" eyebrow="星辉秘藏" title="开启卡包" description="将卡包拖入原创符文祭坛，再揭晓其中的秘印。" onBack={onBack}>
    {remaining <= 0 && phase === "IDLE" ? <section className="no-pack-state"><i>◇</i><h2>你还没有卡包</h2><p>领取神秘赠礼后即可在这里开启。</p><button className="feature-primary" onClick={onGift}>前往神的馈赠</button></section> : <div className={`pack-opening-stage phase-${phase.toLowerCase()} batch-${batchSize}`}>
      <div className="pack-stock"><span>{definition.name}</span><b>剩余 {remaining}</b></div>
      {phase === "IDLE" && <div className="pack-batch-options" aria-label="选择开包数量">{PACK_BATCH_OPTIONS.map((amount) => <button key={amount} className={batchSize === amount ? "active" : ""} disabled={remaining < amount} onClick={() => setBatchSize(amount)}>开{amount}包{remaining < amount && <small>卡包不足</small>}</button>)}</div>}
      {(phase === "IDLE" || phase === "OPENING") && <PackAltar altarRef={altarRef} active={overAltar} opening={phase === "OPENING"} />}
      {phase === "IDLE" && <div className="pack-dock"><PackDraggable name={batchSize === 1 ? definition.name : `${batchSize}包 · ${definition.name}`} dragging={dragging} offset={offset} disabled={remaining < batchSize} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={cancelDrag} onDoubleClick={beginOpening} /><small>按住卡包拖到祭坛 · 双击也可开启</small></div>}
      {phase === "OPENING" && <div className="pack-burst" aria-live="polite"><i>✦</i><b>{batchSize === 1 ? "秘印正在裂解……" : `${batchSize}重秘印连续共鸣……`}</b></div>}
      {phase === "REVEAL" && <div className="reveal-stage" aria-live="polite"><div className="pack-reveal-grid">{cards.map((card, index) => <PackRevealCard key={`${card.id}-${index}`} card={card} index={index} revealed={revealed[index] ?? false} onReveal={() => reveal(index)} />)}</div><div className="reveal-actions">{!allRevealed && <button className="feature-secondary" onClick={() => setRevealed(cards.map(() => true))}>全部翻开</button>}{allRevealed && (remaining > 0 ? <button className="feature-primary" onClick={reset}>再开一包</button> : <><b>卡包已经用完</b><button className="feature-secondary" onClick={onBack}>返回</button></>)}</div></div>}
      {phase === "SUMMARY" && <section className="pack-summary" aria-live="polite"><header><span>秘藏已归入你的典藏</span><h2>获得 {cards.length} 张卡牌</h2></header><div className="rarity-summary">{rarityOrder.map((rarity) => <div key={rarity} className={`rarity-${rarity.toLowerCase()}`}><b>{rarityNames[rarity]}</b><span>{rarityCounts[rarity]}</span></div>)}<div><b>首次获得</b><span>{groups.filter((group) => group.isNew).length}<small>种</small></span></div></div><p>{showAll ? "全部卡牌 · 重复卡已合并计数" : "史诗、传说与首次获得"}</p><div className="batch-results-list">{highlightedGroups.map(({card,count,isNew}) => <div className={`batch-result rarity-${card.rarity.toLowerCase()}`} key={card.id}><CardArtwork faction={card.faction} variant={card.id} /><div><b>{translateZhCn(card.nameKey)}</b><small>{rarityNames[card.rarity]} · {card.cost} 费 {isNew && <em>NEW</em>}</small></div><strong>×{count}</strong></div>)}</div>{!highlightedGroups.length && <p>熟悉的盟友再次回应了召唤。全部卡牌数量已加入收藏。</p>}<div className="reveal-actions"><button className="feature-secondary" onClick={() => setShowAll(!showAll)}>{showAll ? "只看精选" : "查看全部"}</button>{remaining >= batchSize ? <button className="feature-primary" onClick={reset}>再开 {batchSize} 包</button> : <button className="feature-secondary" onClick={onBack}>返回</button>}</div></section>}
    </div>}
    <GameToast message={notice} kind="error" onClose={() => setNotice("")} />
  </FeatureFrame>;
}
