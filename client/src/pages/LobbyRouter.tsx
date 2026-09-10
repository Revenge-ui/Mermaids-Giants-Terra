import { useState } from "react";
import { validateDeck, type ConnectionStatus, type DeckSubmission, type RoomState } from "@riftbound/shared";
import { gameClient } from "../gameClient";
import { CARD_CATALOG } from "../data/cardCatalog";
import { loadActiveDeckId, loadDecks, toDeckSubmission } from "../deckStorage";
import { addCards, loadCollection, saveCollection, type CollectionCounts } from "../localProgress";
import type { CatalogCard } from "../data/cardCatalog";
import { CollectionPage } from "./CollectionPage";
import { DeckSelectPage } from "./DeckSelectPage";
import { LotteryPage } from "./LotteryPage";
import { MainMenu } from "./MainMenu";
import { OnlinePage } from "./OnlinePage";
import { PackPage } from "./PackPage";

type MenuPage = "HOME" | "ONLINE" | "DECK_SELECT" | "PACKS" | "COLLECTION" | "LOTTERY";
type BattleMode = "AI" | "ONLINE";

export function LobbyRouter({ connectionStatus, room, error }: { connectionStatus: ConnectionStatus; room: RoomState | null; error: string }) {
  const [page, setPage] = useState<MenuPage>("HOME");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [collection, setCollection] = useState<CollectionCounts>(() => loadCollection(window.localStorage));
  const [battleMode, setBattleMode] = useState<BattleMode>("AI");
  const [battleDeck, setBattleDeck] = useState<DeckSubmission | null>(null);
  const [battleDeckName, setBattleDeckName] = useState("");
  const connected = connectionStatus === "CONNECTED";
  const create = async () => { if (busy || !battleDeck) return; setBusy(true); await gameClient.createRoom(name, battleDeck); setBusy(false); };
  const createAi = async (deck = battleDeck) => { if (busy || !deck) return; setBusy(true); await gameClient.createAiGame(name, deck); setBusy(false); };
  const join = async () => { if (busy || !battleDeck) return; setBusy(true); await gameClient.joinRoom(code, name, battleDeck); setBusy(false); };
  const collect = (cards: readonly CatalogCard[]) => setCollection((current) => { const next = addCards(current, cards); saveCollection(window.localStorage, next); return next; });
  const enterMode = (mode: BattleMode) => {
    const decks = loadDecks(window.localStorage);
    const selectedId = loadActiveDeckId(window.localStorage, decks);
    const selected = decks.find((deck) => deck.id === selectedId);
    setBattleMode(mode);
    if (!selected || !validateDeck(selected, CARD_CATALOG, collection).valid) { setPage("DECK_SELECT"); return; }
    const submission = toDeckSubmission(selected); setBattleDeck(submission); setBattleDeckName(selected.name);
    if (mode === "AI") void createAi(submission); else setPage("ONLINE");
  };
  const selectBattleDeck = (deck: DeckSubmission) => {
    const local = loadDecks(window.localStorage).find((candidate) => candidate.id === deck.deckId);
    setBattleDeck(deck); setBattleDeckName(local?.name ?? "本地卡组");
    if (battleMode === "AI") void createAi(deck); else setPage("ONLINE");
  };

  if (room) return <main className="lobby-shell"><section className="lobby-panel waiting-panel">
    <div className="brand-mark">✦</div><p className="eyebrow">联机模式</p><h1>召集旅伴</h1>
    <p className="room-code-label">六位房间码</p><strong className="room-code">{room.roomId}</strong>
    <button className="copy-code" onClick={() => void navigator.clipboard?.writeText(room.roomId)}>复制房间码</button>
    <p className="waiting-note">将房间码告诉朋友，第二位玩家加入后牌局会自动开始。</p>
    <div className="versus-seats"><div><i>Ⅰ</i><span>{room.players[0]?.name || "玩家 1"}{room.players[0]?.ready ? " · 已准备" : ""}</span></div><b>VS</b><div className="vacant"><i>Ⅱ</i><span>等待已准备的对手…</span></div></div>
    <div className="pulse-orbit" aria-hidden="true"><i /><i /><i /></div>
  </section></main>;

  if (page === "ONLINE") return <OnlinePage name={name} code={code} deckName={battleDeckName} busy={busy} connected={connected} error={error} onNameChange={setName} onCodeChange={setCode} onCreate={() => void create()} onJoin={() => void join()} onChangeDeck={() => { setBattleMode("ONLINE"); setPage("DECK_SELECT"); }} onBack={() => setPage("HOME")} />;
  if (page === "DECK_SELECT") return <DeckSelectPage mode={battleMode} collection={collection} busy={busy} error={error} onSelect={selectBattleDeck} onCollection={() => setPage("COLLECTION")} onBack={() => setPage("HOME")} />;
  if (page === "PACKS") return <PackPage onBack={() => setPage("HOME")} onCardsAdded={collect} />;
  if (page === "COLLECTION") return <CollectionPage collection={collection} onBack={() => setPage("HOME")} />;
  if (page === "LOTTERY") return <LotteryPage onBack={() => setPage("HOME")} />;
  return <MainMenu name={name} onNameChange={setName} status={connectionStatus} busy={busy} error={error} onAi={() => enterMode("AI")} onOnline={() => enterMode("ONLINE")} onNavigate={setPage} />;
}
