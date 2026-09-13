import { translateZhCn, type MinionView } from "@riftbound/shared";
import { DamageNumber } from "./DamageNumber";
import { CARD_CATALOG } from "../data/cardCatalog";
import { CardArtwork } from "../ui/CardFace";

export function Minion({ minion, selected, targetable, summoned, attacking, impacted, dying, floating, onClick }: {
  minion: MinionView;
  selected?: boolean;
  targetable?: boolean;
  summoned?: boolean;
  attacking?: boolean;
  impacted?: boolean;
  dying?: boolean;
  floating?: Array<{ id: string; amount: number; kind: "damage" | "heal" }>;
  onClick?: () => void;
}) {
  const wounded = minion.health < minion.maxHealth;
  const definition = CARD_CATALOG.find((card) => card.id === minion.definitionId);
  return (
    <button
      className={`minion ${minion.canAttack ? "ready" : "resting"} ${selected ? "selected" : ""} ${targetable ? "targetable" : ""} ${summoned ? "summoned" : ""} ${attacking ? "attacking" : ""} ${impacted ? "impact" : ""} ${dying ? "dying" : ""}`}
      onClick={(event) => { event.stopPropagation(); onClick?.(); }}
      disabled={!onClick || dying}
      data-entity-id={minion.instanceId}
      aria-label={`${translateZhCn(minion.nameKey)}，${minion.attack} 攻击，${minion.health} 生命`}
    >
      <span className="minion-frame"><CardArtwork faction={definition?.faction ?? "COMMON"} variant={minion.definitionId} /></span>
      <span className="minion-name">{translateZhCn(minion.nameKey)}</span>
      <span className="stat attack">⚔ {minion.attack}</span>
      <span className={`stat health ${wounded ? "wounded" : ""}`}>♥ {minion.health}</span>
      <span className="minion-state">{dying ? "消散" : minion.canAttack ? "可攻击" : "休整"}</span>
      {floating?.map((cue) => <DamageNumber key={cue.id} amount={cue.amount} kind={cue.kind} />)}
    </button>
  );
}
