export function LotteryBadge({ onClick }: { onClick: () => void }) {
  return <button className="lottery-badge" onClick={onClick} aria-label="进入抽奖页面"><span className="badge-chain" /><i>✧</i><b>抽奖</b><small>神秘馈赠</small></button>;
}
