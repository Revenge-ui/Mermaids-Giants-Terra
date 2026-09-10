import { useEffect, useMemo, useRef, useState } from "react";
import { type ActionTarget, type CardView, type ConnectionStatus, type GameEvent, type MinionView, type PlayerViewState, type RoomState } from "@riftbound/shared";
import { audioManager, type GameSound } from "./audioManager";
import { Board } from "./components/Board";
import { GameOverOverlay } from "./components/GameOverOverlay";
import { Hand } from "./components/Hand";
import { Hero } from "./components/Hero";
import { Mana } from "./components/Mana";
import { TurnBanner } from "./components/TurnBanner";
import { errorMessage } from "./errorMessages";
import { gameClient } from "./gameClient";
import { LobbyRouter } from "./pages/LobbyRouter";
import { emptySelection, isCardPlayable, isLegalTarget, isYourTurn, presentationFromEvents, targetModeForCard, type PendingAction, type PresentationState, type SelectionState } from "./uiModel";

const emptyPresentation: PresentationState = { nonce: 0, floatingNumbers: [], summonedIds: [], dyingMinions: [], impactedIds: [] };

function connectionText(status: ConnectionStatus): string {
  if (status === "CONNECTED") return "已连接";
  if (status === "CONNECTING") return "正在连接";
  if (status === "RECONNECTING") return "正在恢复对局";
  if (status === "FAILED") return "无法连接服务器";
  return "网络断开";
}

function playSounds(events: readonly GameEvent[], viewerId: string): void {
  const sounds = new Set<GameSound>();
  for (const event of events) {
    if (event.type === "CARD_PLAYED") sounds.add("playCard");
    if (event.type === "CARD_DRAWN" && event.playerId === viewerId) sounds.add("draw");
    if (event.type === "DAMAGE_DEALT") sounds.add("damage");
    if (event.type === "HEAL_APPLIED") sounds.add("heal");
    if (event.type === "TURN_STARTED" && event.playerId === viewerId) sounds.add("turnStart");
    if (event.type === "GAME_OVER") sounds.add(event.winnerId === viewerId ? "victory" : "defeat");
  }
  sounds.forEach((sound) => audioManager.play(sound));
}

export function App() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(gameClient.getConnectionStatus());
  const [room, setRoom] = useState<RoomState | null>(null);
  const [game, setGame] = useState<PlayerViewState | null>(null);
  const gameRef = useRef<PlayerViewState | null>(null);
  const presentationNonce = useRef(0);
  const [error, setError] = useState("");
  const [selection, setSelection] = useState<SelectionState>(emptySelection());
  const [inspectedCard, setInspectedCard] = useState<CardView | null>(null);
  const [pending, setPending] = useState<PendingAction>(null);
  const [presentation, setPresentation] = useState<PresentationState>(emptyPresentation);
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => { if (!error) return; const timer = window.setTimeout(() => setError(""), 2600); return () => window.clearTimeout(timer); }, [error]);
  useEffect(() => { if (!presentation.nonce) return; const timer = window.setTimeout(() => setPresentation((current) => current.nonce === presentation.nonce ? { ...emptyPresentation, nonce: current.nonce } : current), 1050); return () => window.clearTimeout(timer); }, [presentation.nonce]);
  useEffect(() => { if (!showIntro) return; const timer = window.setTimeout(() => setShowIntro(false), 1250); return () => window.clearTimeout(timer); }, [showIntro]);
  useEffect(() => {
    const cancel = (event: KeyboardEvent) => { if (event.key === "Escape") { setSelection(emptySelection(gameRef.current?.gameId)); setInspectedCard(null); } };
    window.addEventListener("keydown", cancel); return () => window.removeEventListener("keydown", cancel);
  }, []);
  useEffect(() => {
    const onGame = (nextGame: PlayerViewState, events: GameEvent[]) => {
      const previous = gameRef.current;
      presentationNonce.current += 1;
      setPresentation(presentationFromEvents(events, nextGame.you.playerId, previous, presentationNonce.current));
      playSounds(events, nextGame.you.playerId);
      if (!previous || previous.gameId !== nextGame.gameId || events.some((event) => event.type === "GAME_STARTED")) setShowIntro(true);
      gameRef.current = nextGame; setGame(nextGame); setSelection(emptySelection(nextGame.gameId)); setInspectedCard(null); setPending(null);
    };
    const unsubscribers = [
      gameClient.onConnectionChange(setConnectionStatus), gameClient.onRoomState(setRoom), gameClient.onGameUpdate(onGame),
      gameClient.onError((code) => setError(errorMessage(code))),
      gameClient.onOpponentConnection((connected) => { setGame((current) => current ? { ...current, opponentConnected: connected } : current); setError(connected ? "对手已重新连接，可以继续对局。" : "对手已断开，正在等待其恢复对局……"); })
    ];
    gameClient.connect(); return () => { unsubscribers.forEach((unsubscribe) => unsubscribe()); gameClient.disconnect(); };
  }, []);

  const selectedCard = game?.you.hand.find((card) => card.instanceId === selection.cardInstanceId);
  const targetMode = targetModeForCard(selectedCard);
  const yourTurn = game ? isYourTurn(game) : false;
  const enemyTargetable = Boolean(game && pending === null && (selection.attackerId || targetMode === "ENEMY"));
  const friendlyTargetable = Boolean(game && pending === null && targetMode === "FRIENDLY_MINION");
  const targetableEnemyIds = useMemo(() => new Set(enemyTargetable && game ? game.opponent.board.map((minion) => minion.instanceId) : []), [enemyTargetable, game]);
  const targetableFriendlyIds = useMemo(() => new Set(friendlyTargetable && game ? game.you.board.map((minion) => minion.instanceId) : []), [friendlyTargetable, game]);
  const summonedIds = useMemo(() => new Set(presentation.summonedIds), [presentation.summonedIds]);
  const impactedIds = useMemo(() => new Set(presentation.impactedIds), [presentation.impactedIds]);
  if (!game) return <LobbyRouter connectionStatus={connectionStatus} room={room} error={error} />;

  const cancelSelection = () => { if (!pending) { setSelection(emptySelection(game.gameId)); setInspectedCard(null); } };
  const perform = async (kind: Exclude<PendingAction, null>, action: () => ReturnType<typeof gameClient.endTurn>) => {
    if (pending) return; setPending(kind); const result = await action();
    if (!result.ok) { setError(errorMessage(result.errorCode)); setPending(null); }
  };
  const playFromHand = (card: CardView) => {
    if (pending) return;
    if (!yourTurn) return setError("现在不是你的回合。");
    if (!isCardPlayable(game, card, pending)) return setError("法力不足，无法打出这张牌。");
    const mode = targetModeForCard(card);
    if (mode) { const same = selection.cardInstanceId === card.instanceId; setSelection(same ? emptySelection(game.gameId) : { gameId: game.gameId, cardInstanceId: card.instanceId }); setInspectedCard(same ? null : card); return; }
    void perform("PLAY_CARD", () => gameClient.playCard(card.instanceId));
  };
  const chooseFriendlyMinion = (minion: MinionView) => {
    if (pending) return;
    if (selectedCard && targetMode === "FRIENDLY_MINION") { const target: ActionTarget = { type: "MINION", playerId: game.you.playerId, instanceId: minion.instanceId }; if (!isLegalTarget(targetMode, game, target)) return setError("无法选择这个目标。"); void perform("PLAY_CARD", () => gameClient.playCard(selectedCard.instanceId, target)); return; }
    if (!yourTurn) return setError("现在不是你的回合。");
    if (!minion.canAttack) return setError("这个随从本回合不能攻击。");
    setInspectedCard(null); setSelection(selection.attackerId === minion.instanceId ? emptySelection(game.gameId) : { gameId: game.gameId, attackerId: minion.instanceId });
  };
  const chooseEnemyTarget = (target: ActionTarget) => {
    if (pending) return;
    if (selectedCard && targetMode === "ENEMY") { if (!isLegalTarget(targetMode, game, target)) return setError("无法选择这个目标。"); void perform("PLAY_CARD", () => gameClient.playCard(selectedCard.instanceId, target)); return; }
    if (selection.attackerId) void perform("ATTACK", () => gameClient.attack(selection.attackerId!, target));
  };

  const hint = pending ? "等待服务器确认…" : selectedCard ? (targetMode === "ENEMY" ? "选择一个敌方目标 · ESC 取消" : "选择一个己方随从 · ESC 取消") : selection.attackerId ? "选择攻击目标 · ESC 取消" : yourTurn ? "你的回合" : "对手正在行动";
  return (
    <main className={`game-shell ${yourTurn ? "your-turn" : "enemy-turn"} ${pending ? "is-pending" : ""}`} onClick={(event) => { if (event.target === event.currentTarget) cancelSelection(); }}>
      <header className="game-header"><div className="room-mark"><span className="tiny-label">房间</span><strong>{game.roomId}</strong></div><div className="turn-status"><span>第 {game.turn} 回合</span><b>{hint}</b></div><div className="header-actions"><div className={`server-dot ${connectionStatus === "CONNECTED" ? "online" : ""}`}><i />{connectionText(connectionStatus)}</div><button className="surrender" onClick={(event) => { event.stopPropagation(); void perform("SURRENDER", () => gameClient.surrender()); }} disabled={game.status !== "PLAYING" || pending !== null}>认输</button></div></header>
      {connectionStatus !== "CONNECTED" && <div className="network-recovery" role="status"><i />网络断开，正在尝试恢复原对局……</div>}
      <section className="battle-table" onClick={cancelSelection}>
        <div className="table-ornament top-left">◆</div><div className="table-ornament top-right">◆</div>
        <div className="enemy-zone"><div className="opponent-hand" aria-label={`对手有 ${game.opponent.handCount} 张手牌`}>{Array.from({ length: game.opponent.handCount }, (_, index) => <i key={index} style={{ "--back-i": index, "--back-count": game.opponent.handCount } as React.CSSProperties} />)}<span>对方手牌 {game.opponent.handCount}</span></div><div className="hero-row enemy-row"><Hero player={game.opponent} enemy targetable={enemyTargetable} impacted={impactedIds.has(game.opponent.playerId)} floating={presentation.floatingNumbers.filter((cue) => cue.targetId === game.opponent.playerId)} onClick={enemyTargetable ? () => chooseEnemyTarget({ type: "HERO", playerId: game.opponent.playerId }) : undefined} /><div className="opponent-resources"><span>牌库 {game.opponent.deckCount}</span><Mana current={game.opponent.mana} max={game.opponent.maxMana} compact /></div></div><Board minions={game.opponent.board} owner="OPPONENT" targetableIds={targetableEnemyIds} summonedIds={summonedIds} dying={presentation.dyingMinions} attackingId={presentation.attackingId} impactedIds={impactedIds} floating={presentation.floatingNumbers} onMinion={(minion) => chooseEnemyTarget({ type: "MINION", playerId: game.opponent.playerId, instanceId: minion.instanceId })} /></div>
        <div className="rift-line"><span>✦</span></div>
        <div className="friendly-zone"><Board minions={game.you.board} owner="YOU" selectedAttacker={selection.attackerId} targetableIds={targetableFriendlyIds} summonedIds={summonedIds} dying={presentation.dyingMinions} attackingId={presentation.attackingId} impactedIds={impactedIds} floating={presentation.floatingNumbers} onMinion={chooseFriendlyMinion} /><div className="hero-row friendly-row"><div className="local-resources"><Mana current={game.you.mana} max={game.you.maxMana} /><span>魔力源泉</span></div><Hero player={game.you} impacted={impactedIds.has(game.you.playerId)} floating={presentation.floatingNumbers.filter((cue) => cue.targetId === game.you.playerId)} /><button className="end-turn" onClick={(event) => { event.stopPropagation(); void perform("END_TURN", () => gameClient.endTurn()); }} disabled={!yourTurn || pending !== null}><span>{pending === "END_TURN" ? "确认中" : yourTurn ? "结束回合" : "对手回合"}</span><i /></button></div></div>
      </section>
      <Hand game={game} selectedId={selection.cardInstanceId} inspectedCard={inspectedCard ?? selectedCard ?? null} drawnCardId={presentation.drawnCardId} pending={pending} onInspect={setInspectedCard} onPlay={playFromHand} />
      {presentation.playedCard && <div className="played-card-flash" key={presentation.nonce}><span>{presentation.playedCard.rune}</span></div>}
      <TurnBanner kind={presentation.turnBanner} />
      {showIntro && <div className="match-intro"><div><span>{game.you.name}</span><b>VS</b><span>{game.opponent.name}</span></div></div>}
      {error && <div className="toast" role="alert"><i>!</i>{error}</div>}
      {game.status === "FINISHED" && <GameOverOverlay won={game.winnerId === game.you.playerId} turn={game.turn} health={game.you.health} onReturn={() => { gameClient.clearSession(); window.location.reload(); }} />}
    </main>
  );
}
