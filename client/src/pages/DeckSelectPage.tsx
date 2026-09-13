import { useMemo, useState } from "react";
import { type DeckSubmission } from "@riftbound/shared";
import { DeckManaCurve } from "../components/collection/DeckManaCurve";
import { FeatureFrame } from "../components/menu/FeatureFrame";
import { CARD_CATALOG, FACTION_LABEL } from "../data/cardCatalog";
import { createStarterDeck, deckCardCount, deckManaCurve, loadActiveDeckId, loadDecks, saveActiveDeckId, saveDecks, toDeckSubmission, validateLocalDeck, type LocalDeck } from "../deckStorage";
import { deckValidationMessage } from "../deckValidationMessages";
import type { CollectionCounts } from "../localProgress";

export function DeckSelectPage({ mode, collection, busy, error, onSelect, onCollection, onBack }: {
  mode: "AI" | "ONLINE"; collection: CollectionCounts; busy: boolean; error: string;
  onSelect: (deck: DeckSubmission) => void; onCollection: () => void; onBack: () => void;
}) {
  const [decks, setDecks] = useState<LocalDeck[]>(() => loadDecks(window.localStorage));
  const [selectedId, setSelectedId] = useState<string | null>(() => loadActiveDeckId(window.localStorage, loadDecks(window.localStorage)));
  const rows = useMemo(() => decks.map((deck) => ({ deck, validation: validateLocalDeck(deck, CARD_CATALOG, collection) })), [collection, decks]);
  const useDeck = (deck: LocalDeck) => { setSelectedId(deck.id); saveActiveDeckId(window.localStorage, deck.id); onSelect(toDeckSubmission(deck)); };
  const addStarter = () => { const deck = createStarterDeck(); const next = [...decks, deck]; setDecks(next); saveDecks(window.localStorage, next); setSelectedId(deck.id); saveActiveDeckId(window.localStorage, deck.id); };
  return <FeatureFrame icon={mode === "AI" ? "♜" : "⚔"} eyebrow={mode === "AI" ? "石桌试炼" : "好友对战"} title="选择出战卡组" description="只有经过本地检查并由服务器再次验证的 30 张卡组才能进入对局。" onBack={onBack}>
    <div className="deck-select-list">{rows.map(({ deck, validation }) => <article className={`${selectedId === deck.id ? "selected" : ""} ${validation.valid ? "valid" : "invalid"}`} key={deck.id} onClick={() => setSelectedId(deck.id)}>
      <i>{deck.faction === "MERMAID" ? "◉" : "◆"}</i><div><h2>{deck.name}</h2><p>{FACTION_LABEL[deck.faction]}阵营 · {validation.valid ? "✓ 合法卡组" : `⚠ ${deckValidationMessage(validation.errors[0]!)}`}</p><small>{deckCardCount(deck)} / 30 张</small></div><div className="mini-curve"><DeckManaCurve curve={deckManaCurve(deck, CARD_CATALOG)} /></div><button className="feature-primary" disabled={!validation.valid || busy} onClick={(event) => { event.stopPropagation(); useDeck(deck); }}>{busy ? "正在连接…" : mode === "AI" ? "迎战守卫" : "使用此卡组"}</button>
    </article>)}</div>
    {!rows.length && <div className="no-decks"><i>♢</i><h2>你还没有卡组</h2><p>可以进入收藏亲自组建，或生成一套清晰可见的本地入门卡组。</p></div>}
    <div className="deck-select-actions"><button className="feature-primary" onClick={addStarter}>＋ 生成入门卡组</button><button onClick={onCollection}>前往我的收藏</button></div>
    {error && <p className="feature-error" role="alert">{error}</p>}
  </FeatureFrame>;
}
