import type { PointerEvent } from "react";

export function PackDraggable({ name, dragging, offset, disabled, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onDoubleClick }: {
  name: string; dragging: boolean; offset: { x: number; y: number }; disabled: boolean;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: () => void;
  onDoubleClick: () => void;
}) {
  return <div className={`gift-pack ${dragging ? "dragging" : ""} ${disabled ? "disabled" : ""}`}
    style={{ transform: `translate3d(${offset.x}px,${offset.y}px,0)` }} role="button" tabIndex={disabled ? -1 : 0}
    onPointerDown={disabled ? undefined : onPointerDown} onPointerMove={disabled ? undefined : onPointerMove}
    aria-label={`${name}，拖入祭坛或按回车开启`} aria-disabled={disabled}
    onPointerUp={disabled ? undefined : onPointerUp} onPointerCancel={onPointerCancel}
    onKeyDown={(event) => { if (!disabled && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onDoubleClick(); } }}
    onDoubleClick={disabled ? undefined : onDoubleClick}>
    <i>✧</i><b>{name}</b><span>五重秘印</span>
  </div>;
}
