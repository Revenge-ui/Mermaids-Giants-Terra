import { useEffect, useMemo, useState } from "react";
import { validateDeck } from "@riftbound/shared";
import { CardDetailModal } from "../components/collection/CardDetailModal";
import { CollectionFilters } from "../components/collection/CollectionFilters";
import { CollectionGrid } from "../components/collection/CollectionGrid";
import { DeckPanel } from "../components/collection/DeckPanel";
import { DEFAULT_COLLECTION_FILTERS, filterCollectionCards, pageItems, type CardCategory, type CollectionFiltersState } from "../collectionModel";
import { CARD_CATALOG, type CatalogCard } from "../data/cardCatalog";
import { addCardToDeck, createLocalDeck, deleteLocalDeck, loadActiveDeckId, loadDecks, removeCardFromDeck, renameLocalDeck, saveActiveDeckId, saveDecks, type LocalDeck } from "../deckStorage";
import type { CollectionCounts } from "../localProgress";

const PAGE_SIZE = 8;
const CATEGORIES: readonly { id: CardCategory; icon: string; label: string }[] = [
  { id: "ALL", icon: "✦", label: "全部" }, { id: "MINION", icon: "♜", label: "随从" }, { id: "SPELL", icon: "✧", label: "法术" }
];

export function CollectionPage({ collection, onBack }: { collection: CollectionCounts; onBack: () => void }) {
  const [filters, setFilters] = useState<CollectionFiltersState>(DEFAULT_COLLECTION_FILTERS);
  const [advanced, setAdvanced] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<CatalogCard | null>(null);
  const [decks, setDecks] = useState<LocalDeck[]>(() => loadDecks(window.localStorage));
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(() => { const loaded = loadDecks(window.localStorage); return loadActiveDeckId(window.localStorage, loaded); });
  const [deleteDeckId, setDeleteDeckId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newDeckName, setNewDeckName] = useState("");
  const [notice, setNotice] = useState("");
  const filtered = useMemo(() => filterCollectionCards(CARD_CATALOG, collection, filters), [collection, filters]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleCards = useMemo(() => pageItems(filtered, page, PAGE_SIZE), [filtered, page]);

  useEffect(() => setPage(1), [filters]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(""), 1800); return () => window.clearTimeout(timer); }, [notice]);
  useEffect(() => { const close = (event: KeyboardEvent) => { if (event.key === "Escape") setSelected(null); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, []);

  const persist = (next: LocalDeck[]) => { setDecks(next); saveDecks(window.localStorage, next); };
  const createDeck = () => {
    if (!newDeckName.trim()) { setNotice("卡组名称不能为空"); return; }
    if ([...newDeckName.trim()].length > 20) { setNotice("卡组名称最多 20 个字符"); return; }
    const deck = createLocalDeck(newDeckName);
    const next = [...decks, deck]; persist(next); setNewDeckName(""); setCreating(false); setEditingDeckId(deck.id); setNotice("卡组已创建");
  };
  const chooseCard = (card: CatalogCard) => {
    if (!editingDeckId) { setSelected(card); return; }
    if ((collection[card.id] ?? 0) < 1) { setNotice("尚未拥有这张卡牌"); return; }
    const index = decks.findIndex((deck) => deck.id === editingDeckId);
    if (index < 0) return;
    if ((decks[index]!.cards[card.id] ?? 0) >= (collection[card.id] ?? 0)) { setNotice("拥有数量不足，无法继续加入"); return; }
    const result = addCardToDeck(decks[index]!, card);
    if (!result.changed) { setNotice(result.reason === "FULL" ? "卡组已满" : card.rarity === "LEGENDARY" ? "传说卡最多放入 1 张" : "同名卡最多放入 2 张"); return; }
    const next = [...decks]; next[index] = result.deck; persist(next); setNotice(`${card.rune} 已加入卡组`);
  };
  const removeCard = (cardId: string) => {
    const index = decks.findIndex((deck) => deck.id === editingDeckId);
    if (index < 0) return;
    const next = [...decks]; next[index] = removeCardFromDeck(decks[index]!, cardId); persist(next); setNotice("已从卡组移除");
  };
  const renameDeck = (name: string) => {
    const index = decks.findIndex((deck) => deck.id === editingDeckId);
    if (index < 0) return;
    const result = renameLocalDeck(decks[index]!, name);
    if (!result.changed) { setNotice(result.error === "EMPTY" ? "卡组名称不能为空" : result.error === "TOO_LONG" ? "卡组名称最多 20 个字符" : "名称没有变化"); return; }
    const next = [...decks]; next[index] = result.deck; persist(next); setNotice("卡组已重命名");
  };
  const setCurrentDeck = (deckId: string) => {
    const deck = decks.find((candidate) => candidate.id === deckId);
    if (!deck || !validateDeck(deck, CARD_CATALOG, collection).valid) { setNotice("卡组不合法，暂时不能设为当前卡组"); return; }
    setSelectedDeckId(deckId); saveActiveDeckId(window.localStorage, deckId); setNotice("已设为当前对战卡组");
  };
  const confirmDelete = () => {
    if (!deleteDeckId) return;
    const result = deleteLocalDeck(decks, deleteDeckId, selectedDeckId);
    persist(result.decks); setSelectedDeckId(result.activeDeckId); saveActiveDeckId(window.localStorage, result.activeDeckId);
    if (editingDeckId === deleteDeckId) setEditingDeckId(null);
    setDeleteDeckId(null); setNotice("卡组已删除");
  };

  return <main className="collection-shell">
    <div className="curtain curtain-left" /><div className="curtain curtain-right" />
    <section className="collection-workbench">
      <header className="collection-heading"><button onClick={onBack}>‹ 返回大厅</button><div><small>裂隙典藏馆</small><h1>我的收藏</h1><p>浏览完整图鉴，整理属于你的本地卡组。</p></div><span><b>{Object.values(collection).filter((count) => count > 0).length}</b> / {CARD_CATALOG.length}<small>已发现</small></span></header>
      <nav className="collection-tabs" aria-label="卡牌类型">{CATEGORIES.map((category) => <button className={filters.category === category.id ? "active" : ""} key={category.id} onClick={() => setFilters({ ...filters, category: category.id })}><i>{category.icon}</i><span>{category.label}</span></button>)}</nav>
      <div className="collection-body">
        <section className="collection-book">
          <div className="book-grain" aria-hidden="true" /><CollectionGrid cards={visibleCards} collection={collection} editing={Boolean(editingDeckId)} onSelect={chooseCard} onDetails={setSelected} />
          <div className="collection-pagination"><button onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1}>‹ 上一页</button><span>第 <b>{page}</b> / {pageCount} 页<small>共 {filtered.length} 张</small></span><button onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={page === pageCount}>下一页 ›</button></div>
        </section>
        <DeckPanel decks={decks} editingDeckId={editingDeckId} selectedDeckId={selectedDeckId} collection={collection} creating={creating} newName={newDeckName} onCreating={setCreating} onNewName={setNewDeckName} onCreate={createDeck} onOpen={setEditingDeckId} onClose={() => setEditingDeckId(null)} onRemove={removeCard} onRename={renameDeck} onDelete={setDeleteDeckId} onSetCurrent={setCurrentDeck} />
      </div>
      <CollectionFilters filters={filters} advanced={advanced} onAdvanced={() => setAdvanced((value) => !value)} onChange={setFilters} />
      <button className="collection-return" onClick={onBack}>返回主菜单</button>
    </section>
    {notice && <div className="collection-notice" role="status">{notice}</div>}
    {deleteDeckId && <div className="codex-modal-backdrop"><section className="delete-deck-dialog" role="dialog" aria-modal="true"><i>⚠</i><h2>删除卡组</h2><p>确定删除“{decks.find((deck) => deck.id === deleteDeckId)?.name}”吗？</p><small>收藏中的卡牌不会受到影响。</small><div><button className="danger" onClick={confirmDelete}>确定删除</button><button onClick={() => setDeleteDeckId(null)}>取消</button></div></section></div>}
    <CardDetailModal card={selected} count={selected ? collection[selected.id] ?? 0 : 0} onClose={() => setSelected(null)} />
  </main>;
}
