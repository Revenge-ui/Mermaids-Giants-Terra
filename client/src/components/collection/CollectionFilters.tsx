import { KEYWORD_LABEL, RARITY_LABEL, type CardKeyword, type CardRarity } from "../../data/cardCatalog";
import type { CardSort, CollectionFiltersState, ManaFilter } from "../../collectionModel";

const MANA: readonly ManaFilter[] = ["ALL", 0, 1, 2, 3, 4, 5, 6, "7+"];
const RARITIES: readonly CardRarity[] = ["COMMON", "RARE", "EPIC", "LEGENDARY"];
const KEYWORDS: readonly CardKeyword[] = ["DAMAGE", "HEAL", "DRAW", "BUFF", "GUARD", "CHARGE", "DRAIN", "BARRIER"];

function toggle<T>(values: readonly T[], value: T): T[] { return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]; }

export function CollectionFilters({ filters, advanced, onAdvanced, onChange }: {
  filters: CollectionFiltersState; advanced: boolean; onAdvanced: () => void; onChange: (next: CollectionFiltersState) => void;
}) {
  const update = (patch: Partial<CollectionFiltersState>) => onChange({ ...filters, ...patch });
  return <>
    {advanced && <section className="advanced-filters">
      <div><b>稀有度</b>{RARITIES.map((rarity) => <button className={filters.rarities.includes(rarity) ? "active" : ""} key={rarity} onClick={() => update({ rarities: toggle(filters.rarities, rarity) })}>{RARITY_LABEL[rarity]}</button>)}</div>
      <div><b>效果关键词</b>{KEYWORDS.map((keyword) => <button className={filters.keywords.includes(keyword) ? "active" : ""} key={keyword} onClick={() => update({ keywords: toggle(filters.keywords, keyword) })}>{KEYWORD_LABEL[keyword]}</button>)}</div>
      <button className="clear-filter" onClick={() => update({ rarities: [], keywords: [] })}>清除高级筛选</button>
    </section>}
    <footer className="collection-toolbar">
      <div className="mana-filter" aria-label="费用筛选"><span>费用</span>{MANA.map((mana) => <button className={filters.mana === mana ? "active" : ""} key={String(mana)} onClick={() => update({ mana })}>{mana === "ALL" ? "全部" : mana}</button>)}</div>
      <label className="collection-search"><i>⌕</i><input value={filters.search} onChange={(event) => update({ search: event.target.value })} placeholder="搜索卡名、描述或关键词" /></label>
      <button className={`filter-toggle ${advanced ? "active" : ""}`} onClick={onAdvanced}>☷ 筛选</button>
      <label className="owned-toggle"><input type="checkbox" checked={filters.ownedOnly} onChange={(event) => update({ ownedOnly: event.target.checked })} /><span />只显示拥有</label>
      <label className="sort-select">排序<select value={filters.sort} onChange={(event) => update({ sort: event.target.value as CardSort })}><option value="COST">费用</option><option value="NAME">名称</option><option value="RARITY">稀有度</option></select></label>
    </footer>
  </>;
}
