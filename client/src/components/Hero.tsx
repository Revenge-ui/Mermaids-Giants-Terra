import type { PublicPlayerState } from "@riftbound/shared";
import { DamageNumber } from "./DamageNumber";
import { FactionSigil } from "../ui/FactionSigil";
import { FACTION_LABEL } from "../data/cardCatalog";

export function Hero({ player, enemy, targetable, impacted, floating, onClick }: {
  player: PublicPlayerState;
  enemy?: boolean;
  targetable?: boolean;
  impacted?: boolean;
  floating?: Array<{ id: string; amount: number; kind: "damage" | "heal" }>;
  onClick?: () => void;
}) {
  return (
    <button
      className={`hero faction-${player.faction.toLowerCase()} ${enemy ? "enemy" : "friendly"} ${targetable ? "targetable" : ""} ${impacted ? "impact" : ""} ${floating?.some((cue) => cue.kind === "heal") ? "healed" : ""}`}
      data-entity-id={player.playerId}
      onClick={(event) => { event.stopPropagation(); onClick?.(); }}
      disabled={!onClick}
      aria-label={`${enemy ? "敌方" : "己方"}英雄 ${player.name}，${player.health} 点生命`}
    >
      <span className="hero-portrait"><FactionSigil faction={player.faction} /></span>
      <span className="hero-copy"><small>{FACTION_LABEL[player.faction]} · {enemy ? "对手" : "旅者"}</small><b>{player.name}</b></span>
      <span className={`health-gem ${impacted ? "changed" : ""}`}>♥ {Math.max(0, player.health)}</span>
      {floating?.map((cue) => <DamageNumber key={cue.id} amount={cue.amount} kind={cue.kind} />)}
    </button>
  );
}
