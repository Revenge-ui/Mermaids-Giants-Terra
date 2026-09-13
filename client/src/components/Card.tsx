import { translateZhCn, type CardView } from "@riftbound/shared";
import { CardFace } from "../ui/CardFace";

export function Card({ card, selected, playable, drawn, index, fanOffset, fanAngle, onClick }: {
  card: CardView;
  selected: boolean;
  playable: boolean;
  drawn?: boolean;
  index: number;
  fanOffset: number;
  fanAngle: number;
  onClick: () => void;
}) {
  const style = { "--fan-x": `${fanOffset}px`, "--fan-r": `${fanAngle}deg` } as React.CSSProperties;
  return (
    <button
      className={`card hand-${card.type.toLowerCase()} ${selected ? "selected" : ""} ${playable ? "playable" : "unplayable"} ${drawn ? "drawn" : ""}`}
      style={style}
      aria-disabled={!playable}
      onClick={(event) => { event.stopPropagation(); if (playable) onClick(); }}
      aria-label={`第 ${index + 1} 张手牌，${translateZhCn(card.nameKey)}，费用 ${card.cost}`}
    >
      <CardFace card={card} />
    </button>
  );
}
