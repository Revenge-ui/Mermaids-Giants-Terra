import { useRef, useState } from "react";
import { SceneTransition, TransitionOverlay, GameLoading, GameToast } from "../ui/GameUI";
import { type ConnectionStatus, type DeckSubmission, type RoomState } from "@riftbound/shared";
import { gameClient } from "../gameClient";
import { withRequestTimeout } from "../ui/requestTimeout";
import { CARD_CATALOG, FACTION_LABEL } from "../data/cardCatalog";
import { loadActiveDeckId, loadDecks, toDeckSubmission, validateLocalDeck } from "../deckStorage";
import { addCards, loadCollection, saveCollection, type CollectionCounts } from "../localProgress";
import type { CatalogCard } from "../data/cardCatalog";
import { CollectionPage } from "./CollectionPage";
import { DeckSelectPage } from "./DeckSelectPage";
import { LotteryPage } from "./LotteryPage";
import { GiftPage } from "./GiftPage";
import { MainMenu } from "./MainMenu";
import { OnlinePage } from "./OnlinePage";
import { PackPage } from "./PackPage";
import { claimLrtGift, consumePacks, loadGiftState, loadPackInventory, type GiftState, type PackInventory } from "../packStorage";

type MenuPage = "HOME" | "ONLINE" | "DECK_SELECT" | "PACKS" | "GIFT" | "COLLECTION" | "LOTTERY";
type BattleMode = "AI" | "ONLINE";

export function LobbyRouter({ connectionStatus, room, error }: { connectionStatus: ConnectionStatus; room: RoomState | null; error: string }) {
  const [page, setPage] = useState<MenuPage>("HOME");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [requestError, setRequestError] = useState("");
  const [collection, setCollection] = useState<CollectionCounts>(() => loadCollection(window.localStorage));
  const [packInventory, setPackInventory] = useState<PackInventory>(() => loadPackInventory(window.localStorage));
  const [giftState, setGiftState] = useState<GiftState>(() => loadGiftState(window.localStorage));
  const [battleMode, setBattleMode] = useState<BattleMode>("AI");
  const [battleDeck, setBattleDeck] = useState<DeckSubmission | null>(null);
  const [battleDeckName, setBattleDeckName] = useState("");
  const connected = connectionStatus === "CONNECTED";
  const requestMatch = async (request: () => Promise<unknown>) => {
    if (busyRef.current || !connected) return;
    busyRef.current = true; setBusy(true); setRequestError("");
    try { await withRequestTimeout(request()); }
    catch { setRequestError("暂时无法开启牌局，请检查连接后重试。"); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const create = async () => { if (battleDeck) await requestMatch(() => gameClient.createRoom(name, battleDeck)); };
  const createAi = async (deck = battleDeck) => { if (deck) await requestMatch(() => gameClient.createAiGame(name, deck)); };
  const join = async () => { if (battleDeck) await requestMatch(() => gameClient.joinRoom(code, name, battleDeck)); };
  const claimGift = () => {
    const result = claimLrtGift(window.localStorage); setPackInventory(result.inventory); setGiftState(result.giftState); return result.claimed;
  };
  const commitPackOpening = (packId: string, amount: number, cards: readonly CatalogCard[]) => {
    if ((packInventory[packId] ?? 0) < amount) return false;
    const nextCollection = addCards(collection, cards);
    const nextInventory = consumePacks(window.localStorage, packInventory, packId, amount);
    if (!nextInventory) return false;
    saveCollection(window.localStorage, nextCollection);
    setPackInventory(nextInventory); setCollection(nextCollection); return true;
  };
  const enterMode = (mode: BattleMode) => {
    const decks = loadDecks(window.localStorage);
    const selectedId = loadActiveDeckId(window.localStorage, decks);
    const selected = decks.find((deck) => deck.id === selectedId);
    setBattleMode(mode);
    if (!selected || !validateLocalDeck(selected, CARD_CATALOG, collection).valid) { setPage("DECK_SELECT"); return; }
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
    <div className="versus-seats"><div><i>Ⅰ</i><span>{room.players[0]?.name || "玩家 1"}<small>{room.players[0] ? `${FACTION_LABEL[room.players[0].faction]}阵营` : ""}{room.players[0]?.ready ? " · 已准备" : ""}</small></span></div><b>VS</b><div className="vacant"><i>Ⅱ</i><span>等待已准备的对手…</span></div></div>
    <GameLoading label="等待旅伴加入…" />
  </section></main>;

  const renderPage = () => {
  if (page === "ONLINE") return <OnlinePage name={name} code={code} deckName={battleDeckName} busy={busy} connected={connected} error={error} onNameChange={setName} onCodeChange={setCode} onCreate={() => void create()} onJoin={() => void join()} onChangeDeck={() => { setBattleMode("ONLINE"); setPage("DECK_SELECT"); }} onBack={() => setPage("HOME")} />;
  if (page === "DECK_SELECT") return <DeckSelectPage mode={battleMode} collection={collection} busy={busy} error={error} onSelect={selectBattleDeck} onCollection={() => setPage("COLLECTION")} onBack={() => setPage("HOME")} />;
  if (page === "PACKS") return <PackPage collection={collection} inventory={packInventory} onCommitOpening={commitPackOpening} onBack={() => setPage("HOME")} onGift={() => setPage("GIFT")} />;
  if (page === "GIFT") return <GiftPage giftState={giftState} onClaim={claimGift} onPack={() => setPage("PACKS")} onBack={() => setPage("HOME")} />;
  if (page === "COLLECTION") return <CollectionPage collection={collection} onBack={() => setPage("HOME")} />;
  if (page === "LOTTERY") return <LotteryPage onBack={() => setPage("HOME")} />;
  return <MainMenu name={name} onNameChange={setName} status={connectionStatus} busy={busy} error={error} giftClaimed={giftState.lrtGiftClaimed} onAi={() => enterMode("AI")} onOnline={() => enterMode("ONLINE")} onNavigate={setPage} />;
  };
  return <SceneTransition key={page}>{renderPage()}{busy && <TransitionOverlay label="正在开启牌局…" />}<GameToast message={requestError} kind="warning" onClose={() => setRequestError("")} /></SceneTransition>;
}
