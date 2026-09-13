import type { RefObject } from "react";

export function PackAltar({ altarRef, active, opening }: { altarRef: RefObject<HTMLDivElement | null>; active: boolean; opening: boolean }) {
  return <div ref={altarRef} className={`pack-altar ${active ? "active" : ""} ${opening ? "opening" : ""}`} aria-label="开包祭坛">
    <span className="altar-ring">✦</span><b>{opening ? "符文正在苏醒" : "将卡包拖到此处"}</b><small>松开即可开启</small>
  </div>;
}
