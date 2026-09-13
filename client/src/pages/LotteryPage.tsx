import { useEffect, useRef, useState } from "react";
import { FeatureFrame } from "../components/menu/FeatureFrame";
import { drawLotteryReward, type LotteryReward } from "../localProgress";
import { GameButton } from "../ui/GameUI";
import { UIAudioManager } from "../audioManager";

export function LotteryPage({ onBack }: { onBack: () => void }) {
  const [drawing, setDrawing] = useState(false);
  const [reward, setReward] = useState<LotteryReward | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const drawingRef = useRef(false);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const draw = () => { if (drawingRef.current) return; drawingRef.current = true; setDrawing(true); setReward(null); UIAudioManager.play("click"); timer.current = window.setTimeout(() => { setReward(drawLotteryReward()); setDrawing(false); drawingRef.current = false; UIAudioManager.play("cardReveal"); }, 1100); };
  return <FeatureFrame icon="✧" eyebrow="命运仪式" title="裂隙抽奖" description="触碰命运轮盘，获得一份本地模拟奖励。" onBack={onBack}>
    <div className={`lottery-stage ${drawing ? "drawing" : ""}`}><div className="fate-wheel"><span>✦</span><i>◇</i><i>◈</i><i>✧</i><i>❖</i></div><GameButton variant="primary" onClick={draw} loading={drawing}>{drawing ? "命运正在转动…" : "唤醒命运石盘"}</GameButton><p className="simulation-note">试玩演示 · 无需消费 · 不计入真实资产</p></div>
    <div className={`lottery-result ${reward ? "visible" : ""}`} aria-live="polite">{reward && <><i>{reward.icon}</i><span>你获得了</span><h2>{reward.title}</h2><p>{reward.description}</p></>}</div>
  </FeatureFrame>;
}
