export type FeaturePage = "PACKS" | "COLLECTION" | "LOTTERY";

export function BottomNav({ onNavigate }: { onNavigate: (page: FeaturePage) => void }) {
  return <nav className="bottom-nav" aria-label="功能入口">
    <button onClick={() => onNavigate("PACKS")}><i>▣</i><span>开包</span></button>
    <button onClick={() => onNavigate("COLLECTION")}><i>❖</i><span>我的收藏</span></button>
  </nav>;
}
