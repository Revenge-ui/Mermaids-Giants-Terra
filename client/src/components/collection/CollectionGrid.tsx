import { isCardAllowedInDeck, type DeckFaction } from "@riftbound/shared";
import type { CatalogCard } from "../../data/cardCatalog";
import type { CollectionCounts } from "../../localProgress";
import { CollectionCard } from "./CollectionCard";

export function CollectionGrid({ cards, collection, editing, deckFaction, onSelect, onDetails }: {
  cards: readonly CatalogCard[]; collection: CollectionCounts; editing: boolean; deckFaction?: DeckFaction;
  onSelect: (card: CatalogCard) => void; onDetails: (card: CatalogCard) => void;
}) {
  if (!cards.length) return <div className="collection-empty"><i>⌕</i><b>没有找到符合条件的卡牌</b><span>尝试清除费用、稀有度或搜索条件。</span></div>;
  return <div className="codex-grid">{cards.map((card) => <CollectionCard key={card.id} card={card} count={collection[card.id] ?? 0} editing={editing} allowed={!deckFaction || isCardAllowedInDeck(deckFaction, card)} onSelect={() => onSelect(card)} onDetails={() => onDetails(card)} />)}</div>;
}
