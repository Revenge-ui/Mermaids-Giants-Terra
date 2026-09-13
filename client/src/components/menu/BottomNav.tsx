export type FeaturePage = "PACKS" | "GIFT" | "COLLECTION" | "LOTTERY";

export function BottomNav({ giftClaimed, onNavigate }: { giftClaimed: boolean; onNavigate: (page: FeaturePage) => void }) {
  return <nav className="bottom-nav" aria-label="功能入口">
    <div className="pack-nav-group"><button onClick={() => onNavigate("PACKS")}><i>▣</i><span>开包</span></button><button className="gift-nav-link" onClick={() => onNavigate("GIFT")}>神的馈赠{!giftClaimed && <em>NEW</em>}</button></div>
    <button onClick={() => onNavigate("COLLECTION")}><i>❖</i><span>我的收藏</span></button>
  </nav>;
}
