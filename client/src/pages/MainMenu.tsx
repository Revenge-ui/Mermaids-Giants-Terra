import type { ConnectionStatus } from "@riftbound/shared";
import { useState } from "react";
import { FactionSigil } from "../ui/FactionSigil";
import { GameLoading, GameModal, GameToast } from "../ui/GameUI";
import { BottomNav, type FeaturePage } from "../components/menu/BottomNav";
import { LotteryBadge } from "../components/menu/LotteryBadge";
import { ModeButton } from "../components/menu/ModeButton";

function statusText(status: ConnectionStatus): string {
  if (status === "CONNECTED") return "服务器已连接";
  if (status === "CONNECTING") return "正在连接";
  if (status === "RECONNECTING") return "正在恢复对局";
  return "网络未连接";
}

export function MainMenu({ name, onNameChange, status, busy, error, giftClaimed, onAi, onOnline, onNavigate }: {
  name: string; onNameChange: (name: string) => void; status: ConnectionStatus; busy: boolean; error: string;
  giftClaimed: boolean; onAi: () => void; onOnline: () => void; onNavigate: (page: FeaturePage) => void;
}) {
  const connected = status === "CONNECTED";
  const [faction, setFaction] = useState<"MERMAID" | "GIANT" | null>(null);
  return <main className="home-shell">
    <div className="curtain curtain-left" /><div className="curtain curtain-right" /><div className="ambient-runes" aria-hidden="true">✦　◇　✧</div>
    <section className="main-board">
      <span className="board-corner top-left" /><span className="board-corner top-right" /><span className="board-corner bottom-left" /><span className="board-corner bottom-right" />
      <header className="menu-brand"><div className="brand-sigil">✦</div><p>新神纪元 · 旅者大厅</p><h1>Mermaids-Giants-Terra</h1><span>本版本为测试版本<br />正式版将在下个世纪推出</span></header>
      <div className="home-factions" aria-label="阵营世界观"><button type="button" className="mermaid" onClick={() => setFaction("MERMAID")}><small>THE ANCIENT TIDE</small><FactionSigil faction="MERMAID" /><span><b>鱼人</b><small>潮汐之下，古老文明仍在低语</small></span><em>探索阵营 ＋</em></button><button type="button" className="giant" onClick={() => setFaction("GIANT")}><small>THE AWAKENING EARTH</small><FactionSigil faction="GIANT" /><span><b>巨人</b><small>群山苏醒，大地记得最初的誓言</small></span><em>探索阵营 ＋</em></button></div>
      <div className="mode-medallion">
        <label htmlFor="menu-player-name">旅者称号</label>
        <input id="menu-player-name" maxLength={16} value={name} onChange={(event) => onNameChange(event.target.value)} placeholder="无名旅者" />
        <div className="mode-stack">
          <ModeButton icon="♜" title="人机模式" subtitle="挑战人类新神" onClick={onAi} disabled={!connected || busy} />
          <ModeButton icon="⚔" title="联机模式" subtitle="以房间码召集旅伴" onClick={onOnline} disabled={!connected || busy} />
        </div>
      </div>
      <BottomNav giftClaimed={giftClaimed} onNavigate={onNavigate} />
      <div className={`menu-connection ${connected ? "online" : ""}`}><i />{statusText(status)}</div>
      {busy && <GameLoading label="正在开启你的牌局…" />}
      <GameToast message={error} kind="error" />
    </section>
    <LotteryBadge onClick={() => onNavigate("LOTTERY")} />
    {faction && <GameModal title={faction === "MERMAID" ? "鱼人 · 潮汐的守望者" : "巨人 · 大地的铭记者"} onClose={() => setFaction(null)}><div className="faction-lore"><FactionSigil faction={faction} /><p>{faction === "MERMAID" ? "在被星光遗忘的深海，潮汐仍传唱古老的名字。以海洋的生灵与通用法术，书写你的篇章。" : "石碑记载着世界最初的震颤。远古巨人从山脉间归来，以大地的生灵与通用法术，守护沉眠的誓约。"}</p></div></GameModal>}
  </main>;
}
