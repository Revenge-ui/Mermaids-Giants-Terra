import { FeatureFrame } from "../components/menu/FeatureFrame";
import { LRT_GIFT_PACK_COUNT, type GiftState } from "../packStorage";
import { useState } from "react";
import { GameButton, GameToast } from "../ui/GameUI";
import { FactionSigil } from "../ui/FactionSigil";
import { UIAudioManager } from "../audioManager";

export function GiftPage({ giftState, onClaim, onPack, onBack }: { giftState: GiftState; onClaim: () => boolean; onPack: () => void; onBack: () => void }) {
  const claimed = giftState.lrtGiftClaimed;
  const [freshClaim, setFreshClaim] = useState(false);
  const [error, setError] = useState("");
  const claim = () => { try { if (onClaim()) { setFreshClaim(true); UIAudioManager.play("cardReveal"); } } catch { setError("领取未能保存，请检查浏览器存储空间后重试。"); } };
  return <FeatureFrame icon="✧" eyebrow="远古盟约" title="神的馈赠" description="来自神秘存在的赠礼。" onBack={onBack}>
    <section className={`gift-page-card ${claimed ? "claimed" : ""} ${freshClaim ? "just-claimed" : ""}`}><div className="gift-halo"><FactionSigil faction="COMMON" /></div><p>赐予每一位踏入新纪元的旅者</p><strong>{LRT_GIFT_PACK_COUNT} <small>包</small></strong><h2>lrt的馈赠</h2>
      <GameButton variant="primary" disabled={claimed} onClick={claim}>{claimed ? "✓ 赐福已收下" : "接受这份馈赠"}</GameButton>
      {claimed && <><span className="gift-claimed">已领取 {LRT_GIFT_PACK_COUNT} 包 lrt的馈赠</span><button className="feature-secondary" onClick={onPack}>前往开包</button></>}
    </section>
    <GameToast message={freshClaim ? "50 包 lrt的馈赠已放入你的卡包库存" : error} kind={error ? "error" : "success"} onClose={() => { setFreshClaim(false); setError(""); }} />
  </FeatureFrame>;
}
