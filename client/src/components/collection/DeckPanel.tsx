import { translateZhCn } from "@riftbound/shared";
import { CARD_CATALOG } from "../../data/cardCatalog";
import { MAX_DECK_SIZE, deckCardCount, deckManaCurve, type LocalDeck } from "../../deckStorage";
import { DeckManaCurve } from "./DeckManaCurve";

export function DeckPanel({ decks, activeDeckId, creating, newName, onCreating, onNewName, onCreate, onOpen, onClose, onRemove }: {
  decks: readonly LocalDeck[]; activeDeckId: string | null; creating: boolean; newName: string;
  onCreating: (value: boolean) => void; onNewName: (value: string) => void; onCreate: () => void;
  onOpen: (id: string) => void; onClose: () => void; onRemove: (cardId: string) => void;
}) {
  const active = decks.find((deck) => deck.id === activeDeckId);
  if (active) {
    const entries = CARD_CATALOG.filter((card) => (active.cards[card.id] ?? 0) > 0).sort((a, b) => a.cost - b.cost);
    const count = deckCardCount(active);
    return <aside className="deck-panel editing"><header><button onClick={onClose}>‹</button><div><small>正在编辑</small><h2>{active.name}</h2></div><strong className={count >= MAX_DECK_SIZE ? "full" : ""}>{count} / {MAX_DECK_SIZE}</strong></header>
      <p className="deck-help">点击左侧卡牌加入，点击下方条目移除。</p>
      <div className="deck-entries">{entries.length ? entries.map((card) => <button key={card.id} onClick={() => onRemove(card.id)}><b>{card.cost}</b><span>{translateZhCn(card.nameKey)}</span><i>×{active.cards[card.id]}</i></button>) : <div className="empty-deck">空卡组<br /><small>从左侧选择卡牌</small></div>}</div>
      <DeckManaCurve curve={deckManaCurve(active, CARD_CATALOG)} />
    </aside>;
  }
  return <aside className="deck-panel"><header><div><small>本地典藏</small><h2>我的卡组</h2></div><button className="new-deck" onClick={() => onCreating(true)}>＋ 新建</button></header>
    {creating && <div className="new-deck-form"><input autoFocus maxLength={20} value={newName} onChange={(event) => onNewName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") onCreate(); if (event.key === "Escape") onCreating(false); }} placeholder="输入卡组名称" /><button onClick={onCreate}>创建</button><button onClick={() => onCreating(false)}>取消</button></div>}
    <div className="deck-list">{decks.length ? decks.map((deck) => <button key={deck.id} onClick={() => onOpen(deck.id)}><i>▤</i><span><b>{deck.name}</b><small>{deckCardCount(deck)} / {MAX_DECK_SIZE} 张</small></span><em>›</em></button>) : <div className="empty-deck-list"><i>♢</i><b>还没有卡组</b><span>建立第一套属于你的牌组。</span></div>}</div>
  </aside>;
}
