import { useEffect, useState } from "react";
import { translateZhCn, type DeckFaction } from "@riftbound/shared";
import { CARD_CATALOG, FACTION_LABEL } from "../../data/cardCatalog";
import { MAX_DECK_SIZE, deckCardCount, deckManaCurve, validateLocalDeck, type LocalDeck } from "../../deckStorage";
import { deckValidationMessage } from "../../deckValidationMessages";
import type { CollectionCounts } from "../../localProgress";
import { DeckManaCurve } from "./DeckManaCurve";

export function DeckPanel({ decks, editingDeckId, selectedDeckId, collection, creating, newName, newFaction, onCreating, onNewName, onNewFaction, onCreate, onOpen, onClose, onRemove, onRename, onDelete, onSetCurrent, onResolveFaction }: {
  decks: readonly LocalDeck[]; editingDeckId: string | null; selectedDeckId: string | null; collection: CollectionCounts; creating: boolean; newName: string; newFaction: DeckFaction | null;
  onCreating: (value: boolean) => void; onNewName: (value: string) => void; onNewFaction: (value: DeckFaction) => void; onCreate: () => void;
  onOpen: (id: string) => void; onClose: () => void; onRemove: (cardId: string) => void;
  onRename: (name: string) => void; onDelete: (id: string) => void; onSetCurrent: (id: string) => void; onResolveFaction: (faction: DeckFaction) => void;
}) {
  const active = decks.find((deck) => deck.id === editingDeckId);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  useEffect(() => { setRenaming(false); setRenameValue(active?.name ?? ""); }, [active?.id]);
  if (active) {
    const entries = Object.entries(active.cards).filter(([, amount]) => amount > 0).map(([cardId, amount]) => ({ cardId, amount, card: CARD_CATALOG.find((candidate) => candidate.id === cardId) })).sort((a, b) => (a.card?.cost ?? 99) - (b.card?.cost ?? 99));
    const count = deckCardCount(active);
    const validation = validateLocalDeck(active, CARD_CATALOG, collection);
    return <aside className="deck-panel editing"><header><button onClick={onClose}>‹</button><div><small>{selectedDeckId === active.id ? "当前使用 · 正在编辑" : "正在编辑"}</small><h2>{active.name}</h2></div><strong className={count >= MAX_DECK_SIZE ? "full" : ""}>{count} / {MAX_DECK_SIZE}</strong></header>
      <div className={`deck-faction-banner ${active.faction.toLowerCase()}`}><i>{active.faction === "MERMAID" ? "◉" : "◆"}</i><span><b>{FACTION_LABEL[active.faction]}阵营</b><small>阵营创建后锁定</small></span></div>
      {active.migrationIssue && <div className="legacy-faction-warning"><b>{active.migrationIssue === "NEEDS_FACTION" ? "旧卡组只有通用牌，请选择所属阵营" : "旧卡组包含多个阵营，请选择保留的阵营并移除不符卡牌"}</b><div><button onClick={() => onResolveFaction("MERMAID")}>选择鱼人</button><button onClick={() => onResolveFaction("GIANT")}>选择巨人</button></div></div>}
      <div className="deck-manage-actions"><button className={selectedDeckId === active.id ? "current" : ""} onClick={() => onSetCurrent(active.id)}>{selectedDeckId === active.id ? "✓ 当前卡组" : "设为当前卡组"}</button><button onClick={() => { setRenaming(true); setRenameValue(active.name); }}>重命名</button><button className="danger" onClick={() => onDelete(active.id)}>删除</button></div>
      {renaming && <div className="rename-deck-form"><input autoFocus maxLength={20} value={renameValue} onChange={(event) => setRenameValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { onRename(renameValue); setRenaming(false); } if (event.key === "Escape") setRenaming(false); }} /><button onClick={() => { onRename(renameValue); setRenaming(false); }}>保存</button><button onClick={() => setRenaming(false)}>取消</button></div>}
      <p className={`deck-validity-detail ${validation.valid ? "valid" : "invalid"}`}>{validation.valid ? "✓ 卡组合法，可以用于对战" : `⚠ ${deckValidationMessage(validation.errors[0]!)}`}</p>
      <p className="deck-help">点击左侧卡牌加入，点击下方条目移除。</p>
      <div className="deck-entries">{entries.length ? entries.map(({ cardId, amount, card }) => <button key={cardId} className={card ? "" : "unknown-card"} onClick={() => onRemove(cardId)}><b>{card?.cost ?? "?"}</b><span>{card ? translateZhCn(card.nameKey) : `旧版未知卡牌 ${cardId}`}</span><i>×{amount}</i></button>) : <div className="empty-deck">空卡组<br /><small>从左侧选择卡牌</small></div>}</div>
      <DeckManaCurve curve={deckManaCurve(active, CARD_CATALOG)} />
    </aside>;
  }
  return <aside className="deck-panel"><header><div><small>本地典藏</small><h2>我的卡组</h2></div><button className="new-deck" onClick={() => onCreating(true)}>＋ 新建</button></header>
    {creating && <div className="new-deck-form faction-create"><b>选择阵营</b><div className="faction-choice"><button className={newFaction === "MERMAID" ? "selected mermaid" : "mermaid"} onClick={() => onNewFaction("MERMAID")}><i>◉</i><span>鱼人阵营<small>深海、潮汐与珊瑚文明</small></span></button><button className={newFaction === "GIANT" ? "selected giant" : "giant"} onClick={() => onNewFaction("GIANT")}><i>◆</i><span>巨人阵营<small>群山、熔岩与古老石碑</small></span></button></div>{newFaction && <><input autoFocus maxLength={20} value={newName} onChange={(event) => onNewName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") onCreate(); if (event.key === "Escape") onCreating(false); }} placeholder="输入卡组名称" /><button onClick={onCreate}>创建卡组</button></>}<button onClick={() => onCreating(false)}>取消</button></div>}
    <div className="deck-list">{decks.length ? decks.map((deck) => { const validation = validateLocalDeck(deck, CARD_CATALOG, collection); return <button className={selectedDeckId === deck.id ? "selected" : ""} key={deck.id} onClick={() => onOpen(deck.id)}><i className={deck.faction.toLowerCase()}>{deck.faction === "MERMAID" ? "◉" : "◆"}</i><span><b>{deck.name}{selectedDeckId === deck.id ? " · 当前" : ""}</b><small>{FACTION_LABEL[deck.faction]} · {deckCardCount(deck)} / {MAX_DECK_SIZE} 张 · {validation.valid ? "✓ 可使用" : `⚠ ${deckValidationMessage(validation.errors[0]!)}`}</small></span><em>›</em></button>; }) : <div className="empty-deck-list"><i>♢</i><b>还没有卡组</b><span>建立第一套属于你的牌组。</span></div>}</div>
  </aside>;
}
