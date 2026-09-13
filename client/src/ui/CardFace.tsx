import { useId } from "react";
import { translateZhCn } from "@riftbound/shared";
import { FACTION_LABEL, KEYWORD_LABEL, RARITY_LABEL } from "../data/cardCatalog";

export interface DisplayCard {
  id: string; nameKey: string; descriptionKey: string; cost: number;
  type: "MINION" | "SPELL"; faction: "MERMAID" | "GIANT" | "COMMON";
  rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
  attack?: number; health?: number; keywords?: readonly string[];
}
export function cardVisualFaction(card: Pick<DisplayCard, "id" | "faction">): string { return card.id === "SPECIAL_BITCOIN_COIN" ? "SPECIAL" : card.faction; }
/** Original engraved silhouettes. Replace this component with licensed art later, without changing any rules. */
export function CardArtwork({ faction, variant = "" }: { faction: string; variant?: string }) {
  const id = useId().replace(/:/g, "");
  const shift = [...variant].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 24;
  return <svg className={`card-artwork faction-${faction.toLowerCase()}`} viewBox="0 0 240 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><radialGradient id={id}><stop stopColor="var(--art-light)" /><stop offset="1" stopColor="var(--art-dark)" /></radialGradient></defs>
    <path fill={`url(#${id})`} d="M0 0h240v160H0z" /><circle cx={120 + shift} cy="57" r="39" fill="none" stroke="currentColor" opacity=".25" /><circle cx={120 + shift} cy="57" r="32" fill="none" stroke="currentColor" opacity=".12" />
    {faction === "MERMAID" ? <g><path d="M0 108Q40 77 85 104T165 98T240 110V160H0Z" fill="#061d29" /><path d="M0 128Q48 103 94 129T188 125T240 125" stroke="currentColor" fill="none" opacity=".4" /><path d="m110 49 10-16 11 16-8 4 12 23-7 22q-12 20 8 33l23-3-15 17-26-6-14-22 7-24-9-22z" fill="#89afaa" /><path d="m110 57-17 23-24 7 24-1 18-14m18-16 23 20 8-7-9 18-24-15" fill="#89afaa" /><path d="m160 37-4 83m-10-75 12 11 13-13" stroke="#c6d5bd" strokeWidth="2" /><path d="m23 160 4-48m0 27-13-13m13 1 14-20m157 53 7-59m-4 33 21-12" stroke="#315a5b" strokeWidth="4" /></g> : faction === "GIANT" ? <g><path d="m0 143 45-70 33 42 43-64 57 55 26-30 36 70v14H0Z" fill="#28262a" /><path d="m110 34 23 2 9 20-9 11 13 9 13 41-13 10-13-36-4 21 13 40h-22l-8-36-13 36H78l19-52-6-20-12 31-17-5 20-43 22-5-7-10z" fill="#a69880" /><path d="m111 47 14 4-11 10m3 14 4 18-7 8 6 12" stroke="#f1c797" opacity=".75" fill="none" strokeWidth="2" /><path d="m0 153 58-12 46 14 56-9 80 8" stroke="#bf9578" opacity=".4" /></g> : faction === "SPECIAL" ? <g stroke="#edcd80"><circle cx="120" cy="82" r="48" fill="#6e5226" /><circle cx="120" cy="82" r="41" fill="#332b22" strokeDasharray="2 4" /><text x="120" y="103" textAnchor="middle" fill="#e9cc8c" stroke="none" fontFamily="Georgia" fontSize="60">₿</text></g> : <g stroke="currentColor" fill="none"><path d="m120 28 23 35 37 19-37 19-23 35-23-35-37-19 37-19Z" strokeWidth="2" /><path d="m120 46 21 36-21 36-21-36Z" fill="currentColor" opacity=".4" /><ellipse cx="120" cy="133" rx="80" ry="13" opacity=".3" /><path d="M40 133V87m160 46V87M57 123V70m126 53V70" opacity=".25" /></g>}
    <path d="M8 9h224v142H8z" fill="none" stroke="currentColor" opacity=".13" />
  </svg>;
}
/** Single card face shared by hand, mulligan, collection, details and pack reveals. */
export function CardFace({ card }: { card: DisplayCard }) {
  const special = cardVisualFaction(card) === "SPECIAL";
  return <span className={`card-face faction-${cardVisualFaction(card).toLowerCase()} rarity-${card.rarity.toLowerCase()}`}>
    <span className="face-art"><CardArtwork faction={cardVisualFaction(card)} variant={card.id} /></span>
    <b className="face-cost">{card.cost}</b>
    <span className="face-faction">{special ? "后手奖励" : FACTION_LABEL[card.faction]} · {card.type === "MINION" ? "随从" : "法术"}</span>
    <strong className="face-name">{translateZhCn(card.nameKey)}</strong>
    <span className="face-description">{translateZhCn(card.descriptionKey)}</span>
    <span className="face-keywords">{card.keywords?.map((word) => KEYWORD_LABEL[word as keyof typeof KEYWORD_LABEL] ?? word).join(" · ")}</span>
    <span className="face-footer">{card.type === "MINION" && <b className="face-attack" aria-label={`攻击 ${card.attack}`}>{card.attack}</b>}<small>{special ? "特殊" : RARITY_LABEL[card.rarity]}</small>{card.type === "MINION" && <b className="face-health" aria-label={`生命 ${card.health}`}>{card.health}</b>}</span>
  </span>;
}
