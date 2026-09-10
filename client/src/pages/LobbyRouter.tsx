import { useState } from "react";
import type { ConnectionStatus, RoomState } from "@riftbound/shared";
import { gameClient } from "../gameClient";
import { addCards, loadCollection, saveCollection, type CollectionCounts } from "../localProgress";
import type { CatalogCard } from "../data/cardCatalog";
import { CollectionPage } from "./CollectionPage";
import { LotteryPage } from "./LotteryPage";
import { MainMenu } from "./MainMenu";
import { OnlinePage } from "./OnlinePage";
import { PackPage } from "./PackPage";

type MenuPage = "HOME" | "ONLINE" | "PACKS" | "COLLECTION" | "LOTTERY";

export function LobbyRouter({ connectionStatus, room, error }: { connectionStatus: ConnectionStatus; room: RoomState | null; error: string }) {
  const [page, setPage] = useState<MenuPage>("HOME");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [collection, setCollection] = useState<CollectionCounts>(() => loadCollection(window.localStorage));
  const connected = connectionStatus === "CONNECTED";
  const create = async () => { if (busy) return; setBusy(true); await gameClient.createRoom(name); setBusy(false); };
  const createAi = async () => { if (busy) return; setBusy(true); await gameClient.createAiGame(name); setBusy(false); };
  const join = async () => { if (busy) return; setBusy(true); await gameClient.joinRoom(code, name); setBusy(false); };
  const collect = (cards: readonly CatalogCard[]) => setCollection((current) => { const next = addCards(current, cards); saveCollection(window.localStorage, next); return next; });

  if (room) return <main className="lobby-shell"><section className="lobby-panel waiting-panel">
    <div className="brand-mark">✦</div><p className="eyebrow">联机模式</p><h1>召集旅伴</h1>
    <p className="room-code-label">六位房间码</p><strong className="room-code">{room.roomId}</strong>
    <button className="copy-code" onClick={() => void navigator.clipboard?.writeText(room.roomId)}>复制房间码</button>
    <p className="waiting-note">将房间码告诉朋友，第二位玩家加入后牌局会自动开始。</p>
    <div className="versus-seats"><div><i>Ⅰ</i><span>{room.players[0]?.name || "玩家 1"}</span></div><b>VS</b><div className="vacant"><i>Ⅱ</i><span>等待对手…</span></div></div>
    <div className="pulse-orbit" aria-hidden="true"><i /><i /><i /></div>
  </section></main>;

  if (page === "ONLINE") return <OnlinePage name={name} code={code} busy={busy} connected={connected} error={error} onNameChange={setName} onCodeChange={setCode} onCreate={() => void create()} onJoin={() => void join()} onBack={() => setPage("HOME")} />;
  if (page === "PACKS") return <PackPage onBack={() => setPage("HOME")} onCardsAdded={collect} />;
  if (page === "COLLECTION") return <CollectionPage collection={collection} onBack={() => setPage("HOME")} />;
  if (page === "LOTTERY") return <LotteryPage onBack={() => setPage("HOME")} />;
  return <MainMenu name={name} onNameChange={setName} status={connectionStatus} busy={busy} error={error} onAi={() => void createAi()} onOnline={() => setPage("ONLINE")} onNavigate={setPage} />;
}
