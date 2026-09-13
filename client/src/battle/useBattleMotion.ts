import { useLayoutEffect, type RefObject } from "react";
import type { PresentationState } from "../uiModel";
import { audioManager } from "../audioManager";

export function attackVector(from: { x: number; y: number }, to: { x: number; y: number }) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const scale = Math.min(1, 135 / Math.max(1, Math.hypot(dx, dy)));
  return { x: dx * scale, y: dy * scale };
}
/** Measures presentation DOM only. Never changes health, cards or match state. */
export function useBattleMotion(root: RefObject<HTMLElement | null>, cue: PresentationState) {
  useLayoutEffect(() => {
    if (!cue.attackingId || !cue.attackTargetId || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const entities = Array.from(root.current?.querySelectorAll<HTMLElement>("[data-entity-id]") ?? []);
    const attacker = entities.find((node) => node.dataset.entityId === cue.attackingId);
    const target = entities.find((node) => node.dataset.entityId === cue.attackTargetId);
    if (!attacker || !target) return;
    const a = attacker.getBoundingClientRect(), b = target.getBoundingClientRect();
    const vector = attackVector({ x: a.x + a.width / 2, y: a.y + a.height / 2 }, { x: b.x + b.width / 2, y: b.y + b.height / 2 });
    const motion = attacker.animate([{ transform: "translate(0,0)", offset: 0 }, { transform: `translate(${vector.x}px,${vector.y}px) scale(1.06)`, offset: .42 }, { transform: "translate(0,0)", offset: 1 }], { duration: 460, easing: "cubic-bezier(.3,.05,.2,1)" });
    audioManager.play("attack");
    return () => motion.cancel();
  }, [root, cue.nonce, cue.attackingId, cue.attackTargetId]);
}
