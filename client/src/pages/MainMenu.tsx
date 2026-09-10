import type { ConnectionStatus } from "@riftbound/shared";
import { BottomNav, type FeaturePage } from "../components/menu/BottomNav";
import { LotteryBadge } from "../components/menu/LotteryBadge";
import { ModeButton } from "../components/menu/ModeButton";

function statusText(status: ConnectionStatus): string {
  if (status === "CONNECTED") return "服务器已连接";
  if (status === "CONNECTING") return "正在连接";
  if (status === "RECONNECTING") return "正在恢复对局";
  return "网络未连接";
}

export function MainMenu({ name, onNameChange, status, busy, error, onAi, onOnline, onNavigate }: {
  name: string; onNameChange: (name: string) => void; status: ConnectionStatus; busy: boolean; error: string;
  onAi: () => void; onOnline: () => void; onNavigate: (page: FeaturePage) => void;
}) {
  const connected = status === "CONNECTED";
  return <main className="home-shell">
    <div className="curtain curtain-left" /><div className="curtain curtain-right" /><div className="ambient-runes" aria-hidden="true">✦　◇　✧</div>
    <section className="main-board">
      <span className="board-corner top-left" /><span className="board-corner top-right" /><span className="board-corner bottom-left" /><span className="board-corner bottom-right" />
      <header className="menu-brand"><div className="brand-sigil">✦</div><p>裂隙纪元 · 旅者大厅</p><h1>裂隙牌局</h1><span>在星火与古老誓言之间，选择你的下一场对决</span></header>
      <div className="mode-medallion">
        <label htmlFor="menu-player-name">旅者称号</label>
        <input id="menu-player-name" maxLength={16} value={name} onChange={(event) => onNameChange(event.target.value)} placeholder="无名旅者" />
        <div className="mode-stack">
          <ModeButton icon="♜" title="人机模式" subtitle="挑战石桌守卫" onClick={onAi} disabled={!connected || busy} />
          <ModeButton icon="⚔" title="联机模式" subtitle="以房间码召集旅伴" onClick={onOnline} disabled={!connected || busy} />
        </div>
      </div>
      <BottomNav onNavigate={onNavigate} />
      <div className={`menu-connection ${connected ? "online" : ""}`}><i />{statusText(status)}</div>
      {error && <div className="menu-error" role="alert">{error}</div>}
    </section>
    <LotteryBadge onClick={() => onNavigate("LOTTERY")} />
  </main>;
}
