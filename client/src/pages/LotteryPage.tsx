import { useEffect, useRef, useState } from "react";
import { FeatureFrame } from "../components/menu/FeatureFrame";
import { drawLotteryReward, type LotteryReward } from "../localProgress";

export function LotteryPage({ onBack }: { onBack: () => void }) {
  const [drawing, setDrawing] = useState(false);
  const [reward, setReward] = useState<LotteryReward | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const draw = () => { if (drawing) return; setDrawing(true); setReward(null); timer.current = window.setTimeout(() => { setReward(drawLotteryReward()); setDrawing(false); }, 900); };
  return <FeatureFrame icon="✧" eyebrow="命运仪式" title="裂隙抽奖" description="触碰命运轮盘，获得一份本地模拟奖励。" onBack={onBack}>
    <div className={`lottery-stage ${drawing ? "drawing" : ""}`}><div className="fate-wheel"><span>✦</span><i>◇</i><i>◈</i><i>✧</i><i>❖</i></div><button className="feature-primary" onClick={draw} disabled={drawing}>{drawing ? "命运正在转动…" : "开始抽奖"}</button></div>
    <div className={`lottery-result ${reward ? "visible" : ""}`} aria-live="polite">{reward && <><i>{reward.icon}</i><span>你获得了</span><h2>{reward.title}</h2><p>{reward.description}</p></>}</div>
  </FeatureFrame>;
}
